import { BIP32Factory } from "bip32";
import * as bip39 from "bip39";
import { derivePath } from "ed25519-hd-key";
import * as ecc from "tiny-secp256k1";
import { SignatureType } from "../core";
import * as bip44path from "./bip44path";
const bip32secp256k1 = BIP32Factory(ecc);

const HDSigCoin: Map<SignatureType, bip44path.CoinType> = new Map([
  [SignatureType.RCD1, bip44path.CoinType.FactomFactoids],
  [SignatureType.ED25519, bip44path.CoinType.Accumulate],
  [SignatureType.BTC, bip44path.CoinType.Bitcoin],
  [SignatureType.ETH, bip44path.CoinType.Ether],
]);

const HDCoinSig: Map<bip44path.CoinType, SignatureType> = new Map([
  [bip44path.CoinType.FactomFactoids, SignatureType.RCD1],
  [bip44path.CoinType.Accumulate, SignatureType.ED25519],
  [bip44path.CoinType.Bitcoin, SignatureType.BTC],
  [bip44path.CoinType.Ether, SignatureType.ETH],
]);

export { BIP44, HDWallet, randomMnemonic, validMnemonic };

function randomMnemonic(): string {
  return bip39.generateMnemonic();
}

function validMnemonic(mnemonic: string): boolean {
  return bip39.validateMnemonic(mnemonic);
}

declare type Key = {
  privateKey: Buffer;
  signatureType: SignatureType;
};

class HDWallet {
  signatureType: SignatureType;
  private seed: Buffer;

  constructor(options: {
    mnemonic?: string;
    passphrase?: string;
    seed?: string | Buffer;
    signatureType: SignatureType;
  }) {
    // Ensure TypeScript understands that 'options' is not an empty object
    if (!options || typeof options !== "object") {
      throw new Error("Options must be provided and must be an object");
    }

    this.signatureType = options.signatureType;
    this.seed = Buffer.alloc(0);
    if (options.mnemonic) {
      const passwd = options.passphrase || "";
      this.seed = bip39.mnemonicToSeedSync(options.mnemonic, passwd);
    } else if (options.seed) {
      if (typeof options.seed === "string") {
        this.seed = Buffer.from(options.seed, "hex");
      } else {
        this.seed = options.seed;
      }
    }
  }

  // derive a key for a specific path for the particular coin type
  deriveKey(path: string): Key {
    const d = new bip44path.Derivation(inferDerivationCurve(this.signatureType));
    d.fromPath(path);
    if (d.getCoinType() !== GetCoinTypeFromSigType(this.signatureType)) {
      throw new Error(
        `error path coin type ${d.getCoinType()} does not match expected for signature type ${
          this.signatureType
        }`
      );
    }
    d.validate();
    if (this.signatureType === SignatureType.ED25519) {
      const bipkey = derivePath(path, this.seed.toString("hex"));
      return {
        privateKey: bipkey.key,
        signatureType: this.signatureType,
      };
    } else {
      //for all other secp256k1 derivations:
      const hdWallet = bip32secp256k1.fromSeed(this.seed);
      const bipkey = hdWallet.derivePath(path);
      return {
        privateKey: bipkey.privateKey as Buffer,
        signatureType: this.signatureType,
      };
    }
  }
}

class BIP44 extends HDWallet {
  constructor(signatureType: SignatureType, mnemonic: string, passphrase?: string) {
    super({ mnemonic, passphrase, signatureType });
  }

  //getKey: account will be hardened if it isn't. Change and Address will be hardened only if slip-10 derivation is needed
  getKey(account: number, change: number, address: number): Key {
    const coin = GetCoinTypeFromSigType(this.signatureType);
    return this.deriveKey(bip44path.makePath(coin, account, change, address));
  }

  getKeyFromPath(path: string): Key {
    return this.deriveKey(path);
  }
}

function inferDerivationCurve(sigType: SignatureType): bip44path.Curve {
  return sigType === SignatureType.ED25519
    ? bip44path.Curve.CurveEd25519
    : bip44path.Curve.CurveSecp256k1;
}

export function GetCoinTypeFromSigType(sigType: number | SignatureType): bip44path.CoinType {
  // Ensure the numeric value corresponds to a valid enum value
  if (typeof sigType === "number" && sigType in SignatureType) {
    // Retrieve the corresponding CoinType using the enum value
    const ret = HDSigCoin.get(sigType as SignatureType);
    if (ret === undefined) {
      throw new Error(`coin type ${sigType} not found in signature mapping`);
    }
    return ret;
  } else {
    throw new Error(`Invalid value for SignatureType: ${sigType}`);
  }
}

export function GetSigTypeFromCoinType(coin: number | bip44path.CoinType): SignatureType {
  if (coin in bip44path.CoinType) {
    const ret = HDCoinSig.get(coin as bip44path.CoinType);
    if (ret === undefined) {
      throw new Error(`coin type ${coin} not found in signature mapping`);
    }
    return ret;
  } else {
    throw new Error(`Invalid value for CoinType: ${coin}`);
  }
}

export function NewWalletFromMnemonic(
  mnemonic: string,
  coin: bip44path.CoinType,
  passphrase?: string
): BIP44 {
  return new BIP44(GetSigTypeFromCoinType(coin), mnemonic, passphrase);
}
