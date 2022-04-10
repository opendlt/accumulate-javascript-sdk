import nacl from "tweetnacl";
import { sha256 } from "../crypto";
import { Signer } from "../signer";
import { Ed25519Keypair } from "./ed25519-keypair";

export class Ed25519KeypairSigner implements Signer {
  protected readonly _keypair: Ed25519Keypair;

  constructor(keypair: Ed25519Keypair) {
    this._keypair = keypair;
  }

  static generate(): Ed25519KeypairSigner {
    return new Ed25519KeypairSigner(new Ed25519Keypair());
  }

  async signRaw(data: Uint8Array): Promise<Uint8Array> {
    return nacl.sign.detached(data, this._keypair.secretKey);
  }

  get publicKey(): Uint8Array {
    return this._keypair.publicKey;
  }

  get publicKeyHash(): Uint8Array {
    return sha256(this._keypair.publicKey);
  }
}
