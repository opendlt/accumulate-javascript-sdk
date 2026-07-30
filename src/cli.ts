/**
 * Accumulate SDK command-line interface (RB-04).
 *
 * Contract: docs/ai-agent-readiness/CLI-SPEC.md in accumulate-studio.
 *   - Under --json, stdout carries EXACTLY ONE envelope object. Logs go to stderr.
 *   - Exit codes: 0 ok · 1 operation failed · 2 usage error · 3 network unreachable.
 *   - Errors carry canonical ACC_* codes so `retryable` tells an agent whether a
 *     retry is productive instead of leaving it to guess.
 *   - Never prompts. Mainnet needs --network mainnet AND ACCUMULATE_ALLOW_MAINNET=1.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ENVELOPE_VERSION = '1';
const SDK_NAME = 'javascript';

const EXIT_OK = 0;
const EXIT_FAILED = 1;
const EXIT_USAGE = 2;
const EXIT_NETWORK = 3;

const DEFAULT_NETWORK = 'kermit';

const ENDPOINTS: Record<string, string> = {
  kermit: 'https://kermit.accumulatenetwork.io',
  testnet: 'https://testnet.accumulatenetwork.io',
  mainnet: 'https://mainnet.accumulatenetwork.io',
  local: 'http://localhost:26660',
};

interface CatalogEntry {
  category: string;
  retryable: boolean;
  protocolCodes: number[];
  patterns: string[];
  hint: string;
  remediation: string;
}

/**
 * Mirrors packages/codegen/src/manifests/errors.catalog.json. Wire codes were
 * verified against a live node by tools/agent-harness/negative-cases.mjs.
 */
const CATALOG: Record<string, CatalogEntry> = {
  ACC_ACCOUNT_NOT_FOUND: {
    category: 'not_found',
    retryable: false,
    protocolCodes: [-32807, -33404],
    patterns: ['accumulate error not found', 'not found', '-32807', '-33404'],
    hint: 'The account URL does not exist on this network.',
    remediation:
      "Verify the URL and the network. If you just created the account, wait for its creating transaction to reach 'delivered' first. Note that on the V2 API a malformed URL is also reported as not-found.",
  },
  ACC_INVALID_PARAMS: {
    category: 'validation',
    retryable: false,
    protocolCodes: [-32802, -32602],
    patterns: ['validation error', 'field validation for', 'invalid params', '-32802', '-32602'],
    hint: 'The request parameters were rejected by the node.',
    remediation: 'Check the operation\'s declared inputs. Hashes are 32-byte hex; amounts are base-unit integers.',
  },
  ACC_METHOD_NOT_FOUND: {
    category: 'validation',
    retryable: false,
    protocolCodes: [-32601],
    patterns: ['method not found', '-32601'],
    hint: 'The node does not expose the RPC method that was called.',
    remediation: 'Use the SDK\'s canonical client rather than raw RPC; it targets the right API version.',
  },
  ACC_ROUTING_FAILED: {
    category: 'validation',
    retryable: false,
    protocolCodes: [-33400],
    patterns: ['cannot route request', 'nothing to route', '-33400'],
    hint: 'The node could not determine which partition should handle the request.',
    remediation:
      'Every transaction needs a header with a valid `principal` — that URL is the routing key. Build envelopes with TxBody + SmartSigner rather than by hand.',
  },
  ACC_INSUFFICIENT_CREDITS: {
    category: 'insufficient_credits',
    retryable: false,
    protocolCodes: [],
    patterns: ['insufficientcredits', 'insufficient credits'],
    hint: 'The signing key page does not hold enough credits to pay for this transaction.',
    remediation: 'Call add_credits for the SIGNING key page, then wait for the credits to settle.',
  },
  ACC_UNAUTHORIZED_SIGNER: {
    category: 'auth',
    retryable: false,
    protocolCodes: [403],
    patterns: ['unauthorized', 'key does not belong to signer'],
    hint: 'The signing key is not on the key page that authorizes this principal.',
    remediation: 'Sign with a key on the principal\'s authorizing key page (after create_identity, `<adi>/book/1`).',
  },
  ACC_INSUFFICIENT_BALANCE: {
    category: 'insufficient_balance',
    retryable: false,
    protocolCodes: [],
    patterns: ['insufficient balance', 'insufficient funds', 'exceeds balance'],
    hint: 'The source account does not hold enough tokens for this transfer.',
    remediation: 'Confirm the balance first. 1 ACME = 1e8 base units; custom tokens carry their own precision.',
  },
  ACC_NETWORK_UNAVAILABLE: {
    category: 'network',
    retryable: true,
    protocolCodes: [],
    patterns: [
      'econnrefused', 'econnreset', 'etimedout', 'timeout', 'connection closed',
      'connection reset', 'connection refused', 'service unavailable',
      'socket hang up', 'fetch failed', 'enotfound', 'eai_again', 'network error',
    ],
    hint: 'The endpoint could not be reached, or the request timed out.',
    remediation: 'Retry with exponential backoff. This is the only class where a bare retry is productive.',
  },
  ACC_INTERNAL: {
    category: 'internal',
    retryable: true,
    protocolCodes: [-32603],
    patterns: ['internal error', '-32603'],
    hint: 'The node reported an internal error.',
    remediation: 'Retry once with backoff. If it persists, re-check the request shape.',
  },
  ACC_USAGE: {
    category: 'validation',
    retryable: false,
    protocolCodes: [],
    patterns: [],
    hint: 'The command was invoked incorrectly.',
    remediation: 'Run `accumulate --help --json` for the full command tree, flags and required arguments.',
  },
};

// Longest pattern wins, so "key does not belong to signer" beats bare "unauthorized".
const PATTERN_INDEX: Array<[string, string]> = Object.entries(CATALOG)
  .flatMap(([code, e]) => e.patterns.map((p) => [p, code] as [string, string]))
  .sort((a, b) => b[0].length - a[0].length);

/**
 * Map a raw error string onto a catalog code. An unrecognized error falls back to
 * a NON-retryable code on purpose: unknown failures are far more often malformed
 * requests than transient faults, and defaulting to retryable is how an agent
 * burns its turn budget in a loop.
 */
function classify(raw: string): string {
  const text = (raw || '').toLowerCase();
  for (const [pattern, code] of PATTERN_INDEX) {
    if (text.includes(pattern)) return code;
  }
  return 'ACC_INVALID_PARAMS';
}

class UsageError extends Error {}

interface VerbSpec {
  name: string;
  summary: string;
  network: boolean;
  signs: boolean;
  args: Array<{ name: string; type: string; required: boolean }>;
  flags: Array<{ name: string; type: string; required: boolean; default?: unknown; repeatable?: boolean }>;
}

const VERBS: VerbSpec[] = [
  { name: 'query', summary: 'Query any Accumulate account', network: true, signs: false,
    args: [{ name: 'url', type: 'string', required: true }], flags: [] },
  { name: 'balance', summary: 'Get a token account balance', network: true, signs: false,
    args: [{ name: 'url', type: 'string', required: true }], flags: [] },
  { name: 'chain', summary: 'Read chain entries for an account', network: true, signs: false,
    args: [{ name: 'url', type: 'string', required: true }],
    flags: [{ name: '--chain', type: 'string', required: false, default: 'main' },
            { name: '--start', type: 'integer', required: false, default: 0 },
            { name: '--count', type: 'integer', required: false, default: 10 }] },
  { name: 'faucet', summary: 'Request testnet ACME for a lite token account', network: true, signs: false,
    args: [{ name: 'url', type: 'string', required: true }], flags: [] },
  { name: 'credits estimate', summary: 'Estimate credits purchased for an ACME amount', network: true, signs: false,
    args: [{ name: 'url', type: 'string', required: true }],
    flags: [{ name: '--amount', type: 'number', required: true }] },
  { name: 'tx build', summary: 'Build an unsigned transaction body', network: false, signs: false,
    args: [{ name: 'op', type: 'string', required: true }],
    flags: [{ name: '--param', type: 'key=value', required: false, repeatable: true },
            { name: '--out', type: 'path', required: false }] },
  { name: 'tx sign', summary: 'Sign a transaction body into a submittable envelope',
    network: true, signs: true, args: [],
    flags: [{ name: '--body', type: 'path', required: true },
            { name: '--principal', type: 'string', required: true },
            { name: '--signer', type: 'string', required: true },
            { name: '--key-file', type: 'path', required: false },
            { name: '--key-env', type: 'string', required: false },
            { name: '--out', type: 'path', required: false }] },
  { name: 'tx submit', summary: 'Submit an ALREADY-SIGNED envelope (does not sign)',
    network: true, signs: false, args: [],
    flags: [{ name: '--envelope', type: 'path', required: true }] },
  { name: 'tx wait', summary: 'Poll a transaction until it reaches a final state', network: true, signs: false,
    args: [{ name: 'txid', type: 'string', required: true }],
    flags: [{ name: '--timeout', type: 'integer', required: false, default: 60 }] },
  { name: 'tx status', summary: "Read a transaction's current status", network: true, signs: false,
    args: [{ name: 'txid', type: 'string', required: true }], flags: [] },
  { name: 'keys generate', summary: 'Generate a keypair (never written to disk)', network: false, signs: false,
    args: [], flags: [{ name: '--algorithm', type: 'string', required: false, default: 'ed25519' }] },
  { name: 'net list', summary: 'List known networks', network: false, signs: false, args: [], flags: [] },
  { name: 'net status', summary: "Check the selected network's reachability", network: true, signs: false,
    args: [], flags: [] },
  { name: 'version', summary: 'Report SDK and envelope versions', network: false, signs: false, args: [], flags: [] },
];

const GLOBAL_FLAGS = [
  { name: '--json', type: 'boolean', summary: 'Emit one envelope object on stdout' },
  { name: '--network', type: 'string', default: DEFAULT_NETWORK,
    summary: 'Target network; mainnet also requires ACCUMULATE_ALLOW_MAINNET=1' },
  { name: '--help', type: 'boolean', summary: 'Show help; with --json returns the command tree' },
];

const GROUPS = new Set(['credits', 'tx', 'keys', 'net']);

function sdkVersion(): string {
  // The package is ESM ("type": "module"), so `require` does not exist here.
  for (const rel of ['../package.json', '../../package.json']) {
    try {
      const url = new URL(rel, import.meta.url);
      return JSON.parse(readFileSync(url, 'utf-8')).version as string;
    } catch {
      /* try the next candidate */
    }
  }
  return '0.0.0';
}


/**
 * JSON replacer for BigInt. Amounts are base-unit integers that exceed 2^53, so
 * the SDK models them as BigInt, and JSON.stringify throws on those outright.
 * Emitted as strings, which is also the shape the node expects on the wire.
 */
function bigintSafe(_k: string, v: unknown): unknown {
  return typeof v === 'bigint' ? v.toString() : v;
}

class Emitter {
  private emitted = false;
  constructor(private asJson: boolean, private network: string | null, private started: number) {}

  private meta() {
    return {
      network: this.network,
      sdk: SDK_NAME,
      version: sdkVersion(),
      durationMs: Math.round((Date.now() - this.started) * 1000) / 1000,
    };
  }

  ok(data: unknown): number {
    if (this.emitted) throw new Error('envelope emitted twice');
    const text = this.asJson
      ? JSON.stringify({ envelope: ENVELOPE_VERSION, ok: true, data, meta: this.meta() }, bigintSafe)
      : JSON.stringify(data, bigintSafe, 2);
    // Set the guard only AFTER serialization succeeds. Setting it first turned a
    // serialization failure into a misleading "envelope emitted twice" from the
    // outer catch, hiding the real cause (a BigInt amount).
    this.emitted = true;
    process.stdout.write(text + '\n');
    return EXIT_OK;
  }

  fail(raw: string, code?: string, exitCode?: number): number {
    if (this.emitted) throw new Error('envelope emitted twice');
    this.emitted = true;
    const resolved = code || classify(raw);
    const entry = CATALOG[resolved];
    const error: Record<string, unknown> = {
      code: resolved,
      category: entry.category,
      retryable: entry.retryable,
      hint: entry.hint,
      remediation: entry.remediation,
      raw: raw ?? '',
    };
    if (entry.protocolCodes.length) error.protocolCodes = entry.protocolCodes;

    let ec = exitCode;
    if (ec === undefined) {
      ec = resolved === 'ACC_USAGE' ? EXIT_USAGE
        : resolved === 'ACC_NETWORK_UNAVAILABLE' ? EXIT_NETWORK
          : EXIT_FAILED;
    }
    if (this.asJson) {
      process.stdout.write(JSON.stringify({ envelope: ENVELOPE_VERSION, ok: false, error, meta: this.meta() }) + '\n');
    } else {
      process.stderr.write(`error: ${resolved}: ${entry.hint}\n`);
      process.stderr.write(`  retryable: ${entry.retryable ? 'yes' : 'no'}\n`);
      process.stderr.write(`  fix: ${entry.remediation}\n`);
    }
    return ec;
  }
}


/**
 * Resolve the signing key from an EXPLICIT source only.
 *
 * Never falls back to an ambient default: a CLI that quietly finds a key is a
 * CLI that signs something the caller did not intend. Keys are never positional
 * either, so they stay out of shell history.
 */
async function loadPrivateKey(a: Record<string, unknown>): Promise<string> {
  const keyFile = a.key_file as string | undefined;
  const keyEnv = a.key_env as string | undefined;
  if (keyFile && keyEnv) throw new UsageError('pass only one of --key-file or --key-env');
  if (keyFile) {
    const { readFileSync } = await import('node:fs');
    try {
      return readFileSync(keyFile, 'utf-8').trim();
    } catch (e) {
      throw new UsageError(`could not read --key-file: ${(e as Error).message}`);
    }
  }
  if (keyEnv) {
    const v = process.env[keyEnv];
    if (!v) throw new UsageError(`--key-env '${keyEnv}' is not set or empty`);
    return v.trim();
  }
  throw new UsageError(
    'signing requires an explicit key source: --key-file <path> or --key-env <VAR>. ' +
      'No ambient default key is ever used.',
  );
}



/** Case- and underscore-insensitive lookup, so snake_case and camelCase both work. */
function matchKey(keys: string[], wanted: string): string | undefined {
  const norm = (x: string) => x.replace(/_/g, '').toLowerCase();
  const target = norm(wanted);
  return keys.find((k) => norm(k) === target);
}

/** Parameter names of a builder, read from its source so --param can be by-name. */
function builderArgNames(fn: (...args: unknown[]) => unknown): string[] {
  const src = Function.prototype.toString.call(fn);
  const open = src.indexOf('(');
  const close = src.indexOf(')', open);
  if (open < 0 || close < 0) return [];
  return src
    .slice(open + 1, close)
    .split(',')
    .map((p) => p.split('=')[0].trim())
    .filter((p) => p && !p.startsWith('...'));
}

function resolveEndpoint(network: string): string {
  if (network === 'mainnet' && process.env.ACCUMULATE_ALLOW_MAINNET !== '1') {
    throw new UsageError(
      'refusing to target mainnet: pass --network mainnet AND set ACCUMULATE_ALLOW_MAINNET=1. Both are required, deliberately.',
    );
  }
  const ep = ENDPOINTS[network];
  if (!ep) throw new UsageError(`unknown network '${network}' — known: ${Object.keys(ENDPOINTS).join(', ')}`);
  return ep;
}

/** JSON-RPC round trip. A protocol error is returned, not thrown; transport failures throw. */
async function rpc(endpoint: string, method: string, params: unknown): Promise<{ result?: unknown; error?: { code?: number; message?: string; data?: unknown } }> {
  const res = await fetch(`${endpoint}/v2`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const text = await res.text();
  try {
    return JSON.parse(text) as { result?: unknown; error?: { code?: number; message?: string } };
  } catch {
    throw new Error(`non-JSON response (HTTP ${res.status}): ${text.slice(0, 160)}`);
  }
}

function rpcErrorText(e: { code?: number; message?: string; data?: unknown }): string {
  const data = e.data ? (typeof e.data === 'string' ? e.data : JSON.stringify(e.data)) : '';
  return `${e.message ?? 'rpc error'}${data ? ` ${data}` : ''}${e.code !== undefined ? ` (${e.code})` : ''}`;
}

function parseVerb(tokens: string[]): [string, string[]] {
  if (!tokens.length) throw new UsageError('no verb given — run `accumulate --help --json` for the command tree');
  const head = tokens[0];
  if (GROUPS.has(head)) {
    if (tokens.length < 2) throw new UsageError(`'${head}' is a command group; it needs a subcommand`);
    const verb = `${head} ${tokens[1]}`;
    if (!VERBS.some((v) => v.name === verb)) throw new UsageError(`unknown subcommand '${tokens[1]}' for group '${head}'`);
    return [verb, tokens.slice(2)];
  }
  if (!VERBS.some((v) => v.name === head)) {
    throw new UsageError(`unknown verb '${head}' — run \`accumulate --help --json\` for the command tree`);
  }
  return [head, tokens.slice(1)];
}

function parseVerbArgs(verb: string, tokens: string[]): Record<string, unknown> {
  const spec = VERBS.find((v) => v.name === verb)!;
  const out: Record<string, unknown> = {};
  for (const f of spec.flags) {
    const key = f.name.replace(/^--/, '').replace(/-/g, '_');
    if (f.default !== undefined) out[key] = f.default;
    if (f.repeatable) out[key] = [];
  }
  const positional: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.startsWith('--')) {
      const f = spec.flags.find((x) => x.name === t);
      if (!f) throw new UsageError(`unknown flag '${t}' for '${verb}'`);
      const key = t.replace(/^--/, '').replace(/-/g, '_');
      const raw = tokens[++i];
      if (raw === undefined) throw new UsageError(`flag '${t}' expects a value`);
      if (f.repeatable) (out[key] as string[]).push(raw);
      else if (f.type === 'integer') out[key] = parseInt(raw, 10);
      else if (f.type === 'number') out[key] = Number(raw);
      else out[key] = raw;
    } else {
      positional.push(t);
    }
  }
  spec.args.forEach((a, i) => { if (positional[i] !== undefined) out[a.name] = positional[i]; });
  if (positional.length > spec.args.length) {
    throw new UsageError(`unexpected arguments for '${verb}': ${positional.slice(spec.args.length).join(' ')}`);
  }
  for (const a of spec.args) {
    if (a.required && (out[a.name] === undefined || out[a.name] === '')) throw new UsageError(`'${verb}' requires <${a.name}>`);
  }
  for (const f of spec.flags) {
    const key = f.name.replace(/^--/, '').replace(/-/g, '_');
    if (f.required && out[key] === undefined) throw new UsageError(`'${verb}' requires ${f.name}`);
  }
  return out;
}

async function runVerb(verb: string, a: Record<string, unknown>, network: string, em: Emitter): Promise<number> {
  if (verb === 'version') return em.ok({ sdk: SDK_NAME, version: sdkVersion(), envelope: ENVELOPE_VERSION });

  if (verb === 'net list') {
    return em.ok({
      networks: Object.entries(ENDPOINTS).map(([id, endpoint]) => ({
        id, endpoint, faucet: id !== 'mainnet', default: id === DEFAULT_NETWORK,
        ...(id === 'mainnet' ? { requiresOptIn: true } : {}),
      })),
    });
  }

  if (verb === 'keys generate') {
    const algorithm = String(a.algorithm ?? 'ed25519').toLowerCase();
    if (algorithm !== 'ed25519') throw new UsageError(`unsupported algorithm '${algorithm}' — only ed25519 is supported`);
    // Uses the SDK's own derivation (sha256 -> 20 bytes + 4-byte checksum) rather
    // than a hand-rolled version: an address missing the checksum looks right and
    // is rejected on chain.
    const nacl = (await import('tweetnacl')).default;
    const { createHash } = await import('node:crypto');
    const { deriveLiteIdentityUrl, deriveLiteTokenAccountUrl } = await import('./helpers/lite_url.js');
    const pair = nacl.sign.keyPair();
    const pubHash = new Uint8Array(createHash('sha256').update(Buffer.from(pair.publicKey)).digest());
    return em.ok({
      algorithm: 'ed25519',
      publicKey: Buffer.from(pair.publicKey).toString('hex'),
      publicKeyHash: Buffer.from(pubHash).toString('hex'),
      liteIdentity: deriveLiteIdentityUrl(pubHash),
      liteTokenAccount: deriveLiteTokenAccountUrl(pubHash, 'ACME'),
      // Returned because the caller asked to generate one; never written to disk
      // and never logged.
      privateKey: Buffer.from(pair.secretKey).toString('hex'),
    });
  }

  if (verb === 'tx build') {
    const params: Record<string, string> = {};
    for (const raw of (a.param as string[]) ?? []) {
      if (!raw.includes('=')) throw new UsageError(`--param must be key=value, got '${raw}'`);
      const idx = raw.indexOf('=');
      params[raw.slice(0, idx)] = raw.slice(idx + 1);
    }

    const { TxBody } = await import('./index.js');
    const op = String(a.op);
    const builders = TxBody as unknown as Record<string, (...args: unknown[]) => unknown>;
    // Accept either casing. Op names differ per SDK (send_tokens_single vs
    // sendTokensSingle); making an agent learn each one defeats having a single
    // CLI spec, so match on the case-and-underscore-insensitive form.
    const builder = op.startsWith('_') ? undefined : (builders[op] ?? builders[matchKey(Object.getOwnPropertyNames(TxBody), op) ?? '']);
    if (typeof builder !== 'function') {
      const ops = Object.getOwnPropertyNames(TxBody)
        .filter((x) => !['length', 'name', 'prototype'].includes(x)).sort();
      throw new UsageError(`unknown transaction op '${op}' — available: ${ops.join(', ')}`);
    }
    // Builders take positional args, so map the declared parameter names onto
    // them. Echoing {op, params} back instead (the old stub) meant a typo exited
    // 0 and only surfaced at submit, or never.
    const argNames = builderArgNames(builder);
    // Same normalization for parameter names (to_url vs toUrl).
    for (const n of argNames) {
      if (params[n] === undefined) {
        const k = matchKey(Object.keys(params), n);
        if (k) params[n] = params[k];
      }
    }
    const missing = argNames.filter((n) => params[n] === undefined);
    if (missing.length) {
      throw new UsageError(`'${op}' requires --param for: ${missing.join(', ')} (order: ${argNames.join(', ')})`);
    }
    let body: unknown;
    try {
      body = builder(...argNames.map((n) => params[n]));
      // Builders return SDK class instances whose JSON form is the INTERNAL
      // object graph (nested Url objects), not the wire shape. Round-tripping
      // that through a file and back gives "Invalid scheme: undefined" at sign
      // time. asObject() is the wire serializer.
      const maybe = body as { asObject?: () => unknown };
      if (typeof maybe?.asObject === 'function') body = maybe.asObject();
    } catch (e) {
      throw new UsageError(`bad parameters for '${op}(${argNames.join(', ')})': ${(e as Error).message}`);
    }

    const outPath = a.out as string | undefined;
    if (outPath) {
      const { writeFileSync } = await import('node:fs');
      writeFileSync(outPath, JSON.stringify(body, bigintSafe));
    }
    return em.ok({ op, params, body, signed: false, out: outPath ?? null,
      note: 'unsigned body; sign it with `tx sign --body <file>`, then `tx submit`' });
  }

  const endpoint = resolveEndpoint(network);

  if (verb === 'tx sign') {
    // The ONLY verb that signs. Delegates to the SDK signer: signing bytes are
    // consensus-visible and a second implementation is how they drift.
    const privateHex = await loadPrivateKey(a);
    const { Accumulate, SmartSigner } = await import('./index.js');
    const { ED25519Key } = await import('./signing/ed25519.js');
    const body = JSON.parse(readFileSync(String(a.body), 'utf-8'));
    const seed = Uint8Array.from(Buffer.from(privateHex, 'hex'));
    const keypair = (ED25519Key as unknown as { from: (s: Uint8Array) => unknown }).from(seed);
    const client = (Accumulate as unknown as { forEndpoint?: (u: string) => unknown }).forEndpoint
      ? (Accumulate as unknown as { forEndpoint: (u: string) => unknown }).forEndpoint(endpoint)
      : (Accumulate as unknown as { forKermit: () => unknown }).forKermit();
    const signer = new (SmartSigner as unknown as new (c: unknown, k: unknown, u: string) => {
      sign: (p: string, b: unknown) => Promise<{ envelope: unknown }>;
    })(client, keypair, String(a.signer));
    const { envelope: envObj } = await signer.sign(String(a.principal), body);
    // Same reason as tx build: the Envelope class serializes to the internal
    // graph (signature Type as a number), and the node wants the wire form.
    const envMaybe = envObj as { asObject?: () => unknown };
    const envelope = typeof envMaybe?.asObject === 'function' ? envMaybe.asObject() : envObj;
    const outPath = a.out as string | undefined;
    if (outPath) {
      const { writeFileSync } = await import('node:fs');
      writeFileSync(outPath, JSON.stringify(envelope, bigintSafe));
    }
    return em.ok({ signed: true, principal: a.principal, signer: a.signer, envelope, out: outPath ?? null });
  }

  if (verb === 'tx submit') {
    // Deliberately does NOT sign, and no longer pretends to: it used to accept
    // --key-file/--key-env and never use them.
    const envelope = JSON.parse(readFileSync(String(a.envelope), 'utf-8'));
    const r = await rpc(endpoint, 'execute-direct', { envelope });
    if (r.error) return em.fail(rpcErrorText(r.error));
    return em.ok({ submitted: true, result: r.result });
  }

  if (verb === 'query' || verb === 'balance') {
    const r = await rpc(endpoint, 'query', { url: a.url });
    if (r.error) return em.fail(rpcErrorText(r.error));
    if (verb === 'balance') {
      const data = (r.result as { data?: { balance?: unknown } })?.data;
      return em.ok({ url: a.url, balance: data?.balance ?? null, raw: r.result });
    }
    return em.ok({ url: a.url, account: r.result });
  }

  if (verb === 'chain') {
    const r = await rpc(endpoint, 'query-chain', { url: a.url, start: a.start, count: a.count });
    if (r.error) return em.fail(rpcErrorText(r.error));
    return em.ok({ url: a.url, chain: a.chain, start: a.start, count: a.count, entries: r.result });
  }

  if (verb === 'faucet') {
    const r = await rpc(endpoint, 'faucet', { url: a.url });
    if (r.error) return em.fail(rpcErrorText(r.error));
    return em.ok({ url: a.url, result: r.result });
  }

  if (verb === 'credits estimate') {
    const r = await rpc(endpoint, 'query', { url: 'acc://dn.acme/oracle' });
    if (r.error) return em.fail(rpcErrorText(r.error));
    const data = (r.result as { data?: { price?: unknown } })?.data;
    return em.ok({ url: a.url, acme: a.amount, oraclePrice: data?.price ?? null,
      note: 'credits = acme * oraclePrice / 1e8 (oracle is unscaled)' });
  }

  if (verb === 'tx status') {
    const r = await rpc(endpoint, 'query-tx', { txid: a.txid });
    if (r.error) return em.fail(rpcErrorText(r.error));
    return em.ok({ txid: a.txid, status: r.result });
  }

  if (verb === 'tx wait') {
    const deadline = Date.now() + Math.max(1, Number(a.timeout)) * 1000;
    let last: unknown = null;
    while (Date.now() < deadline) {
      const r = await rpc(endpoint, 'query-tx', { txid: a.txid });
      if (r.error) return em.fail(rpcErrorText(r.error));
      last = r.result;
      const status = (last as { status?: { code?: string } })?.status?.code;
      if (status === 'delivered' || status === 'failed') {
        return em.ok({ txid: a.txid, final: true, status, raw: last });
      }
      await new Promise((res) => setTimeout(res, 1000));
    }
    return em.fail(`timed out waiting for ${a.txid} to reach a final state`, 'ACC_NETWORK_UNAVAILABLE', EXIT_FAILED);
  }

  if (verb === 'net status') {
    // A protocol rejection still proves the node answered, so only a transport
    // failure counts as unreachable — that distinction is what exit 3 means.
    const r = await rpc(endpoint, 'query', { url: 'acc://dn.acme' });
    return em.ok({ network, endpoint, reachable: true, ...(r.error ? { probeError: rpcErrorText(r.error) } : { probe: r.result }) });
  }

  throw new UsageError(`unknown verb '${verb}'`);
}

export async function main(argv: string[] = process.argv.slice(2)): Promise<number> {
  const started = Date.now();
  const asJson = argv.includes('--json');
  let network = DEFAULT_NETWORK;
  const ni = argv.indexOf('--network');
  if (ni > -1) {
    if (!argv[ni + 1]) return new Emitter(asJson, null, started).fail("flag '--network' expects a value", 'ACC_USAGE');
    network = argv[ni + 1];
  }
  const em = new Emitter(asJson, network, started);

  const tokens = argv.filter((t, i) => t !== '--json' && t !== '--network' && !(ni > -1 && i === ni + 1));
  const wantsHelp = tokens.includes('--help') || tokens.includes('-h');
  const verbTokens = tokens.filter((t) => t !== '--help' && t !== '-h' && t !== '--version');

  if (wantsHelp || verbTokens.length === 0) {
    if (asJson) {
      return em.ok({ command: 'accumulate', envelopeVersion: ENVELOPE_VERSION, globalFlags: GLOBAL_FLAGS, verbs: VERBS });
    }
    process.stdout.write('accumulate — Accumulate SDK CLI\n\n');
    for (const v of VERBS) process.stdout.write(`  ${v.name.padEnd(20)} ${v.summary}\n`);
    process.stdout.write('\nRun with --json --help for the machine-readable command tree.\n');
    return EXIT_OK;
  }

  try {
    const [verb, rest] = parseVerb(verbTokens);
    const a = parseVerbArgs(verb, rest);
    return await runVerb(verb, a, network, em);
  } catch (e) {
    if (e instanceof UsageError) return em.fail(e.message, 'ACC_USAGE');
    const raw = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    const code = classify(raw);
    return em.fail(raw, code, code === 'ACC_NETWORK_UNAVAILABLE' ? EXIT_NETWORK : EXIT_FAILED);
  }
}

// Executed directly (bin shim) rather than imported. ESM has no `require.main`,
// so compare the entry path with this module's own path.
const invokedDirectly = (() => {
  try {
    return process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
  } catch {
    return false;
  }
})();

if (invokedDirectly) {
  main().then((code) => process.exit(code)).catch((e) => {
    process.stderr.write(`fatal: ${e}\n`);
    process.exit(EXIT_FAILED);
  });
}
