import nacl from "tweetnacl";

export type Keypair = {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
};

/**
 * An Ed25519 keypair used for signing transactions.
 */
export class Ed25519Keypair {
  private readonly _keypair: Keypair;

  /**
   * Create a new keypair instance.
   * Generate random keypair if no {@link Keypair} is provided.
   *
   * @param keypair ed25519 keypair
   */
  constructor(keypair?: Keypair) {
    if (keypair) {
      this._keypair = keypair;
    } else {
      this._keypair = nacl.sign.keyPair();
    }
  }

  /**
   * Generate a new random keypair
   */
  static generate(): Ed25519Keypair {
    return new Ed25519Keypair(nacl.sign.keyPair());
  }

  /**
   * Create a keypair from a raw secret key byte array.
   *
   * This method should only be used to recreate a keypair from a previously
   * generated secret key. Generating keypairs from a random seed should be done
   * with the {@link Ed25519Keypair.fromSeed} method.
   *
   * @throws error if the provided secret key is invalid and validation is not skipped.
   *
   * @param secretKey secret key byte array
   * @param options: skip secret key validation
   */
  static fromSecretKey(
    secretKey: Uint8Array,
    options?: { skipValidation?: boolean }
  ): Ed25519Keypair {
    const keypair = nacl.sign.keyPair.fromSecretKey(secretKey);
    if (!options || !options.skipValidation) {
      const encoder = new TextEncoder();
      const signData = encoder.encode("@accumulate/accumulate.js-validation-v1");
      const signature = nacl.sign.detached(signData, keypair.secretKey);
      if (!nacl.sign.detached.verify(signData, signature, keypair.publicKey)) {
        throw new Error("provided secretKey is invalid");
      }
    }
    return new Ed25519Keypair(keypair);
  }

  /**
   * Generate a keypair from a 32 byte seed.
   *
   * @param seed seed byte array
   */
  static fromSeed(seed: Uint8Array): Ed25519Keypair {
    return new Ed25519Keypair(nacl.sign.keyPair.fromSeed(seed));
  }

  /**
   * The raw public key for this keypair
   */
  get publicKey(): Uint8Array {
    return this._keypair.publicKey;
  }

  /**
   * The raw secret key for this keypair
   */
  get secretKey(): Uint8Array {
    return this._keypair.secretKey;
  }
}
