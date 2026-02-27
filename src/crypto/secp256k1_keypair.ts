/**
 * Secp256k1KeyPair — First-class secp256k1 key pair supporting both
 * BTC and ETH signature types.
 *
 * Uses @noble/secp256k1 (already a devDependency in the project).
 *
 * Aligned with:
 *   - Dart:  Secp256k1KeyPair
 *   - Rust:  secp256k1 via k256 crate
 *   - Python: BTCSigner / ETHSigner
 */

import { Buffer, sha256 } from "../common/index.js";
import { keccak256 } from "../common/keccak.js";
import { PrivateKeyAddress } from "../address/address.js";
import { SignatureType, type Signature } from "../core/index.js";
import { BaseKey, type PublicKey, type Signable } from "../signing/key.js";
import { encode } from "../encoding/index.js";

/**
 * Secp256k1 key pair for BTC and ETH signing.
 *
 * This class extends BaseKey so it implements the full Key interface
 * and can be used directly with Signer, SmartSigner, etc.
 */
export class Secp256k1KeyPair extends BaseKey {
  private readonly _privateKeyBytes: Uint8Array;
  private readonly _publicKeyCompressed: Uint8Array;
  private readonly _publicKeyUncompressed: Uint8Array;
  private readonly _signatureType: SignatureType;

  private constructor(
    address: PublicKey,
    privateKeyBytes: Uint8Array,
    publicKeyCompressed: Uint8Array,
    publicKeyUncompressed: Uint8Array,
    signatureType: SignatureType,
  ) {
    super(address);
    this._privateKeyBytes = privateKeyBytes;
    this._publicKeyCompressed = publicKeyCompressed;
    this._publicKeyUncompressed = publicKeyUncompressed;
    this._signatureType = signatureType;
  }

  // ── Static Factories ───────────────────────────────────────────────────

  /**
   * Generate a new random secp256k1 key pair for BTC signing.
   */
  static async generateBTC(): Promise<Secp256k1KeyPair> {
    const secp = await importSecp();
    const privateKey = secp.utils.randomPrivateKey();
    return Secp256k1KeyPair.fromPrivateKeyBTC(privateKey);
  }

  /**
   * Generate a new random secp256k1 key pair for ETH signing (V2 / Baikonur).
   */
  static async generateETH(): Promise<Secp256k1KeyPair> {
    const secp = await importSecp();
    const privateKey = secp.utils.randomPrivateKey();
    return Secp256k1KeyPair.fromPrivateKeyETH(privateKey);
  }

  /**
   * Create a BTC key pair from a 32-byte private key.
   * BTC public key = compressed 33-byte point.
   * BTC key hash = SHA256(compressed_pubkey_33).
   */
  static async fromPrivateKeyBTC(privateKey: Uint8Array): Promise<Secp256k1KeyPair> {
    const secp = await importSecp();
    const compressed = secp.getPublicKey(privateKey, true);     // 33 bytes
    const uncompressed = secp.getPublicKey(privateKey, false);  // 65 bytes

    const address = PrivateKeyAddress.from(SignatureType.BTC, compressed, privateKey);
    // Override the address's publicKeyHash since Address.keyHash doesn't support BTC yet
    // We use the PrivateKeyAddress with the compressed key directly
    return new Secp256k1KeyPair(
      address,
      privateKey,
      compressed,
      uncompressed,
      SignatureType.BTC,
    );
  }

  /**
   * Create an ETH key pair from a 32-byte private key (V2 / Baikonur).
   * ETH public key = uncompressed 64 bytes (no 0x04 prefix).
   * ETH key hash = Keccak256(uncompressed_64_no_prefix).
   */
  static async fromPrivateKeyETH(privateKey: Uint8Array): Promise<Secp256k1KeyPair> {
    const secp = await importSecp();
    const compressed = secp.getPublicKey(privateKey, true);
    const uncompressed = secp.getPublicKey(privateKey, false);  // 65 bytes with 0x04 prefix
    const uncompressedNoPrefix = uncompressed.slice(1);          // 64 bytes

    const address = PrivateKeyAddress.from(SignatureType.ETH, uncompressedNoPrefix, privateKey);
    return new Secp256k1KeyPair(
      address,
      privateKey,
      compressed,
      uncompressed,
      SignatureType.ETH,
    );
  }

  // ── Accessors ──────────────────────────────────────────────────────────

  /** 32-byte private key. */
  privateKeyBytes(): Uint8Array {
    return this._privateKeyBytes;
  }

  /** 33-byte compressed public key. */
  publicKeyCompressed(): Uint8Array {
    return this._publicKeyCompressed;
  }

  /** 65-byte uncompressed public key (with 0x04 prefix). */
  publicKeyUncompressed(): Uint8Array {
    return this._publicKeyUncompressed;
  }

  /** The signature type this key pair is configured for (BTC or ETH). */
  get signatureType(): SignatureType {
    return this._signatureType;
  }

  /** BTC key hash: SHA256(compressed_pubkey_33). */
  publicKeyHashBTC(): Uint8Array {
    return sha256(this._publicKeyCompressed);
  }

  /** ETH key hash: Keccak256(uncompressed_pubkey_64_no_prefix). */
  publicKeyHashETH(): Uint8Array {
    return keccak256(this._publicKeyUncompressed.slice(1));
  }

  // ── Signing ────────────────────────────────────────────────────────────

  async signRaw(signature: Signature, message: Signable): Promise<Uint8Array> {
    const secp = await importSecp();
    const sigMdHash = sha256(encode(signature));
    const hash = sha256(Buffer.concat([sigMdHash, message.hash()]));

    const sig = await secp.signAsync(hash, this._privateKeyBytes, {
      lowS: true,
    });

    // R (32 bytes) + S (32 bytes) + recovery byte
    const r = sig.r.toString(16).padStart(64, "0");
    const s = sig.s.toString(16).padStart(64, "0");
    const recovery = sig.recovery ?? 0;

    const rBytes = Buffer.from(r, "hex")!;
    const sBytes = Buffer.from(s, "hex")!
    const result = new Uint8Array(65);
    result.set(rBytes, 0);
    result.set(sBytes, 32);
    result[64] = recovery;
    return result;
  }
}

// ── Lazy loader ──────────────────────────────────────────────────────────

let _secp: any = null;

async function importSecp() {
  if (!_secp) {
    _secp = await import("@noble/secp256k1");
  }
  return _secp;
}
