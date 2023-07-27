import { AccumulateURL } from "../../address/url";
import { TransportModule } from "../hw";

/**
 * @class LedgerAppName
 * {@link LedgerAppName}
 */
export class LedgerAppName {
  constructor(name: string) {
    this.name = name
  }
  name: string;
}

/**
 * @class LedgerVersion
 * {@link LedgerVersion}
 */
export class LedgerVersion {
  constructor(major: number, minor: number, patch: number) {
    this.major = major
    this.minor = minor
    this. patch = patch
  }
  major: number;
  minor: number;
  patch: number;
}

/**
 * @class LedgerWalletInfo defines the Wallet info returned by the client
 * {@link LedgerWalletInfo:class}
 */
export declare class LedgerWalletInfo {
  ledgerVersion: LedgerVersion;
  vendorID: number;
  manufacturer: string;
  productID: number;
  product: string;
  status: string;
  walletID: AccumulateURL;
  transportModule: TransportModule;
}

/**
 * @class LedgerAddress defines the Wallet info returned by the client
 * {@link LedgerAddress:class}
 */
export class LedgerAddress {
  constructor(publicKey: string, address: string, chainCode: string) {
    this.address = address;
    this.publicKey = publicKey
    this.chainCode = chainCode
  }

  publicKey: string;
  address: string;
  chainCode: string;
}

export class rsvSig {
  constructor() {
    this.r = new Uint8Array(32)
    this.s = new Uint8Array(32)
    this.v = new Uint8Array(1)
  }

  r: Uint8Array
  s: Uint8Array
  v: Uint8Array

  fromDER(signature: Uint8Array, parityOdd: boolean) {
    if (signature.length < 72) {
      throw new Error("invalid signature length to convert der signature to rsv format")
    }
    let offset = 0;
    let xoffset = 4;  // point to r value
    // copy r
    let xlength = signature[xoffset - 1];
    if (xlength == 33) {
      xlength = 32;
      xoffset++;
    }
    this.r.set(signature.slice(offset + 32 - xlength, xoffset))

    offset += 32;
    xoffset += xlength + 2;  // move over rvalue and TagLEn
    // copy s value
    xlength = signature[xoffset - 1];
    if (xlength == 33) {
      xlength = 32;
      xoffset++;
    }
    this.s.set(signature.slice(offset + 32 - xlength, xoffset))

    // set v
    if (parityOdd == true) {
      this.v[0] = 1
    } else {
      this.v[1] = 0
    }
  }
}
/**
 * @class LedgerSignature defines the Wallet info returned by the client
 * {@link LedgerSignature:class}
 */

export class LedgerSignature {
  constructor(signature: string, v: boolean) {
    this.signature = signature;
    this.parityIsOdd = v
  }

  // the signature is 64 bytes for ED25519 (RCD & ACME types), ECDSA DER sig for eth and btc.  It is an exercise left
  // up to the user to reformat ETH ECDSA sig into the {r,s,v} format.  Parity is provided for the v
  signature: string;
  parityIsOdd: boolean
}

