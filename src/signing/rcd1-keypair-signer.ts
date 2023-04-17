import { RCD1Signature, SignatureType } from ".././core";
import { Ed25519Keypair } from "./ed25519-keypair";
import { BaseEd25519KeypairSigner } from "./ed25519-keypair-signer";

export class RCD1KeypairSigner extends BaseEd25519KeypairSigner {
  static generate(): RCD1KeypairSigner {
    return new RCD1KeypairSigner(new Ed25519Keypair());
  }

  get type(): SignatureType {
    return SignatureType.RCD1;
  }

  newSignature(): RCD1Signature {
    return new RCD1Signature({
      publicKey: this.publicKey,
    });
  }
}
