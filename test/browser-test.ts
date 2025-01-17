import { bip44 } from "../src";

// Test constants
const mnemonic =
  "yellow yellow yellow yellow yellow yellow yellow yellow yellow yellow yellow yellow";

export async function runSecp256k1Test() {
  try {
    const wallets = {
      Btc: bip44.NewWalletFromMnemonic(mnemonic, bip44.CoinType.Bitcoin),
      Eth: bip44.NewWalletFromMnemonic(mnemonic, bip44.CoinType.Ether),
    };

    const btcKey = wallets.Btc.getKey(0, 0, 0);
    const ethKey = wallets.Eth.getKey(0, 0, 0);

    return {
      bitcoin: {
        privateKey: Buffer.from(btcKey.privateKey).toString("hex"),
      },
      ethereum: {
        privateKey: Buffer.from(ethKey.privateKey).toString("hex"),
      },
    };
  } catch (error) {
    console.error("Test failed:", error);
    throw error;
  }
}

// Make the test function available globally
if (typeof window !== "undefined") {
  (window as any).runSecp256k1Test = runSecp256k1Test;
}

// Keep the Jest test suite
describe("Browser Secp256k1 Tests", () => {
  test("should derive Bitcoin and Ethereum keys correctly", async () => {
    const results = await runSecp256k1Test();
    expect(results.bitcoin.privateKey).toBeDefined();
    expect(results.ethereum.privateKey).toBeDefined();

    // Log the actual values
    console.log("Test Results:", results);

    // Verify key lengths
    expect(results.bitcoin.privateKey.length).toBe(64); // 32 bytes in hex
    expect(results.ethereum.privateKey.length).toBe(64); // 32 bytes in hex
  });
});
