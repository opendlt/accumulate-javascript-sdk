/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { ChildProcess, spawn } from "child_process";
import { createServer } from "net";
import path from "path";
import { randomBytes } from "tweetnacl";
import { URL } from "../src";
import { Client } from "../src/api_v2";
import { ED25519Key, Signer, SignerWithVersion } from "../src/signing";
export async function randomLiteIdentity(): Promise<SignerWithVersion> {
  return Signer.forLite(await ED25519Key.generate());
}

export function randomBuffer(length = 12) {
  return Buffer.from(randomBytes(length));
}

export function randomString(length = 6) {
  return randomBuffer(length * 2).toString("hex");
}

export async function addCredits(
  client: Client,
  recipient: URL | string,
  creditAmount: number,
  signer: SignerWithVersion
) {
  let res = await client.queryUrl(recipient);
  const originalBalance = BigInt(res.data.creditBalance || 0);
  const oracle = await client.queryAcmeOracle();
  const addCredits = {
    recipient,
    amount: (creditAmount * 1e8) / oracle,
    oracle,
  };
  res = await client.addCredits(signer.url.join("ACME"), addCredits, signer);
  await client.waitOnTx(res.txid);

  res = await client.queryUrl(recipient);
  expect(BigInt(res.data.creditBalance)).toStrictEqual(originalBalance + BigInt(creditAmount));
}

export async function startSim(fn: (proc: ChildProcess, port: number) => void) {
  // Only start the simulator if the caller does not specify an API endpoint
  if (process.env.ACC_ENDPOINT) return;

  const port = await getPortFree();
  const proc = spawn(
    "go",
    [
      "run",
      "-tags=testnet",
      "./tools/cmd/simulator",
      "--step=10ms",
      `--port=${port}`,
      "--log=error;sim=info;executor=info",
    ],
    { cwd: path.join(__dirname, "..", "accumulate") }
  );

  return new Promise<void>((resolve, reject) => {
    let out = "";
    let stdfn: (c: Buffer) => void;
    let errfn: (code: number | null, signal: NodeJS.Signals | null) => void;

    // eslint-disable-next-line prefer-const
    stdfn = (c: Buffer) => {
      const s = c.toString("utf-8");
      console.log(s);
      out += s;
      if (/\bNode HTTP up\b/.test(out)) {
        setTimeout(() => resolve(), 10);
      }
    };

    // eslint-disable-next-line prefer-const
    errfn = (code, signal) => {
      proc.off("exit", errfn);
      proc.stdout!.off("data", stdfn);
      proc.stderr!.off("data", stdfn);
      proc.stdout!.destroy();
      proc.stderr!.destroy();

      if (signal) {
        reject(new Error(`Stopped with signal ${signal}`));
      } else if (code) {
        reject(new Error(`Exited with code ${code}`));
      }
    };

    proc.on("exit", errfn);
    proc.stdout!.on("data", stdfn);
    proc.stderr!.on("data", stdfn);
    fn(proc, port + 4); // Accumulate API offset
  });
}

// Credit to https://stackoverflow.com/a/71178451/762175
async function getPortFree(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.listen(0, () => {
      const port = (srv as any).address().port;
      srv.close((err) => (err ? reject(err) : resolve(port)));
    });
  });
}
