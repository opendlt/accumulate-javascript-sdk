import nacl from "tweetnacl";
import { ED25519Signature, KeySignature, SignatureType } from ".././core";
import { sha256 } from "../crypto";
import { Signer } from "./signer";
import { Ed25519Keypair } from "./ed25519-keypair";

export abstract class BaseEd25519KeypairSigner implements Signer {
  protected readonly _keypair: Ed25519Keypair;

  constructor(keypair: Ed25519Keypair) {
    this._keypair = keypair;
  }

  get type(): SignatureType {
    return SignatureType.ED25519;
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

  abstract newSignature(): KeySignature
}

export class ED25519KeypairSigner extends BaseEd25519KeypairSigner {
  static generate(): ED25519KeypairSigner {
    return new ED25519KeypairSigner(new Ed25519Keypair());
  }

  newSignature(): ED25519Signature {
    return new ED25519Signature({
      publicKey: this.publicKey,
    })
  }
}