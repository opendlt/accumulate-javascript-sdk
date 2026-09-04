import { Address } from "../src/address";
import { SignatureType } from "../src/core";

/**
 * ECDSA (ecdsaSha256, 15) and RSA (rsaSha256, 14) addresses.
 *
 * These types are what let an organisation's existing PKI — smartcards, PIV/CAC, HSM- or KMS-held
 * certificates — sign directly, so every path that turns one into a key hash or a display address
 * has to work. Previously `keyHash` handled them but `toString` and `fromSignature` did not, which
 * is enough to break any UI that renders a signer: the explorer fails to render an ecdsaSha256
 * transaction with "15 is not a key signature type", thrown from `toString`.
 *
 * The expected strings below were produced by Go's own implementation
 * (`pkg/types/address`: FormatAC1 / FormatAC2 / FormatAC3) over the same input, so these are
 * cross-implementation vectors rather than a restatement of what this code already does.
 */
describe("PKI addresses (ECDSA / RSA)", () => {
  // A deterministic stand-in for a PKIX/SPKI DER public key: 91 bytes, the length a P-256 SPKI is.
  const pub = Buffer.from(
    Array.from({ length: 91 }, (_, i) => (i * 7) % 256),
  );
  const keyHash = "7bc0ae87bb2ba277a95abd81f5fd905147a6b5a3f1e35cf968cad3b2a3471b72";
  const AC1 = "AC1wW6YtSNfkSYzYQa5HHSsb3nHihBnFjJje38SFbKzBvdKbLc4x";
  const AC2 = "AC2wW6YtSNfkSYzYQa5HHSsb3nHihBnFjJje38SFbKzBvdJxSCTv";
  const AC3 = "AC3wW6YtSNfkSYzYQa5HHSsb3nHihBnFjJje38SFbKzBvdNgE7Cq";

  describe("key hash", () => {
    // sha256 of the DER blob — NOT of a raw EC point or a raw modulus. Getting this wrong produces
    // a key page entry that never matches the signature, with no error to say so.
    it.each([
      ["ecdsaSha256", SignatureType.EcdsaSha256],
      ["rsaSha256", SignatureType.RsaSha256],
    ])("hashes the DER public key for %s", (_name, type) => {
      expect(Buffer.from(Address.keyHash(type, pub)).toString("hex")).toStrictEqual(keyHash);
    });
  });

  describe("display address", () => {
    it("formats ecdsaSha256 as AC2", () => {
      expect(Address.fromKey(SignatureType.EcdsaSha256, pub).toString()).toStrictEqual(AC2);
    });

    it("formats rsaSha256 as AC3", () => {
      expect(Address.fromKey(SignatureType.RsaSha256, pub).toString()).toStrictEqual(AC3);
    });

    it("keeps ed25519 on AC1, so the prefixes stay distinct", () => {
      const hash = Buffer.from(keyHash, "hex");
      expect(Address.fromKeyHash(SignatureType.ED25519, hash).toString()).toStrictEqual(AC1);
      expect(new Set([AC1, AC2, AC3]).size).toBe(3);
    });

    it("does not throw for either type — the regression that broke the explorer", () => {
      const hash = Buffer.from(keyHash, "hex");
      expect(() => Address.fromKeyHash(SignatureType.EcdsaSha256, hash).toString()).not.toThrow();
      expect(() => Address.fromKeyHash(SignatureType.RsaSha256, hash).toString()).not.toThrow();
    });
  });

  describe("from a signature", () => {
    it.each([
      ["ecdsaSha256", SignatureType.EcdsaSha256, AC2],
      ["rsaSha256", SignatureType.RsaSha256, AC3],
    ])("builds an address from a %s signature", (_name, type, expected) => {
      const addr = Address.fromSignature({ type, publicKey: pub } as any);
      expect(addr.toString()).toStrictEqual(expected);
      expect(Buffer.from(addr.publicKeyHash).toString("hex")).toStrictEqual(keyHash);
    });
  });

  it("still rejects a type that really is not a key signature", () => {
    expect(() => Address.keyHash(SignatureType.Delegated, pub)).toThrowError(
      /not a key signature type/,
    );
  });
});
