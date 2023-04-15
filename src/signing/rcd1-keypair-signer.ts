import { RCD1Signature, SignatureType } from ".././core";
import { sha256 } from "../crypto";
import { Ed25519Keypair } from "./ed25519-keypair";
import { BaseEd25519KeypairSigner } from "./ed25519-keypair-signer";

export class RCD1KeypairSigner extends BaseEd25519KeypairSigner {
  private _rcd1Hash?: Uint8Array;

  get publicKeyHash(): Uint8Array {
    if (this._rcd1Hash) {
      return this._rcd1Hash;
    }
    this._rcd1Hash = sha256(sha256(Buffer.concat([Buffer.from([1]), this.publicKey])));
    return this._rcd1Hash;
  }

  static generate(): RCD1KeypairSigner {
    return new RCD1KeypairSigner(new Ed25519Keypair());
  }

  get type(): SignatureType {
    return SignatureType.RCD1;
  }

  newSignature(): RCD1Signature {
    return new RCD1Signature({
      publicKey: this.publicKey,
    })
  }
}
