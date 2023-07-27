/* eslint-disable @typescript-eslint/ban-ts-comment */
import { scan as rxScan } from "rxjs/operators";
import { AccumulateURL } from "../address/url";
import { Buffer } from "../common/buffer";
import Bip32Path from "./common/bip32-path";
import { discoverDevices, Transport } from "./hw";
import {
  LedgerAddress,
  LedgerAppName,
  LedgerSignature,
  LedgerVersion,
  LedgerWalletInfo,
} from "./model/results";
import { foreach, splitPath } from "./utils";

const BIPPath = new Bip32Path();

const ledgerOpGetApplicationVersion = 0x03; // Returns the application version
const ledgerOpGetAppName = 0x04; // Signs a transaction after having the user validate the parameters
const ledgerOpGetPublicKey = 0x05; // Returns the public key and chainCode for a given BIP 32 path
const ledgerOpSignTransaction = 0x06; // Returns specific wallet application configuration

//P1 parameters
const ledgerP1Display = 0x01;
const ledgerP1InitTransactionData = 0x00; // First transaction data block for signing
const ledgerP1ContTransactionData = 0x01; // Subsequent transaction data block for signing

//P2 parameters
const ledgerP2MoreTransactionData = 0x80; // More data to follow for transaction data
const ledgerP2LastTransactionData = 0x00; // The last  data to follow for transaction data
const ledgerP2DiscardAddressChainCode = 0x00; // Do not return the chain code along with the address

/**
 * {@link LedgerApi}
 */
export class LedgerApi {
  transport: Transport; //<*>;

  constructor(transport: Transport) {
    this.transport = transport;
    transport.decorateAppAPIMethods(
      this,
      ["getPublicKey", "signTransaction", "getAppName", "getVersion"],
      "TFA"
    );
  }

  /**
   * get Factom address for a given BIP 32 path.
   * @param path a path in BIP 32 format (note: all paths muth be hardened (e.g. .../0'/0' )
   * @param boolDisplay if true, optionally display the address on the device, default = false
   * @param boolChainCode, if true, return the chain code, default = false
   * @param alias, a named key alias that is provided by the client to appear on the display, default = ""
   * @return an object with a publicKey and address with optional chainCode and chainid
   * @example
   * const fctaddr = await fct.getAddress("44'/131'/0'/0/0")
   * const accumulateaddr = await fct.getAddress("44'/281'/0'/0/0")
   */
  getPublicKey(
    path: string,
    boolDisplay: boolean,
    boolChainCode: boolean,
    alias: string
  ): Promise<LedgerAddress> {
    const bipPath = BIPPath.fromString(path, false).toPathArray();

    const buffer = new Writable(1 + bipPath.length * 4);

    buffer.writeUInt8(bipPath.length, 0);
    bipPath.forEach((segment, index) => {
      buffer.writeUInt32BE(segment, 1 + index * 4);
    });
    if (alias.length > 0) {
      buffer.writeUInt8(alias.length);
      // @ts-ignore
      buffer.write(Buffer.from(alias, "utf-8"));
    }
    return this.transport
      .send(
        0xe0,
        ledgerOpGetPublicKey,
        boolDisplay || false ? ledgerP1Display : 0x00,
        boolChainCode || false ? ledgerP2DiscardAddressChainCode : 0x00,
        buffer
      )
      .then((response) => {
        const result = new LedgerAddress("", "", "");
        let offset = 0;
        const publicKeyLength = response[offset++];
        result.publicKey = Buffer.from(
          response.subarray(offset, offset + publicKeyLength)
        ).toString("hex");
        offset += publicKeyLength;
        const chainCodeLength = response[offset++];
        result.chainCode = Buffer.from(
          response.subarray(offset, offset + chainCodeLength)
        ).toString("hex");
        offset += chainCodeLength;
        const addressLength = response[offset++];
        result.address = Buffer.from(response.subarray(offset, offset + addressLength)).toString(
          "utf-8"
        );

        return result;
      });
  }

  /**
   * You can sign a transaction and retrieve v, r, s given the raw transaction and the BIP 32 path of the account to sign
   * @param path a path in BIP 32 format (note: all paths muth be hardened (e.g. .../0'/0' )
   * @param unsignedEnvelopeHex The binary Marshaled Transaction Envelope with unsigned Signature struct in Hex
   * @example
   const result = await fct.signTransaction("44'/131'/0'/0/0", "02016253dfaa7301010087db406ff65cb9dd72a1e99bcd51da5e03b0ccafc237dbf1318a8d7438e22371c892d6868d20f02894db071e2eb38fdc56c697caaeba7dc19bddae2c6e7084cc3120d667b49f")
   */
  signTransaction(
    path: string,
    unsignedEnvelopeHex: string /* Marshaled Transaction Envelope with unsigned Signature struct in Hex */
  ): Promise<LedgerSignature> {
    const paths = splitPath(path);
    let offset = 0;
    const rawTransaction = Buffer.from(unsignedEnvelopeHex, "hex");
    const toSend = [];
    let response: any;

    const headerLen = 1 + 4 * paths.length;
    while (offset !== rawTransaction.length + headerLen) {
      const maxChunkSize = offset === 0 ? 255 - headerLen : 255;
      const chunkSize =
        offset + maxChunkSize - headerLen > rawTransaction.length
          ? rawTransaction.length
          : maxChunkSize;
      const buffer = new Writable(offset === 0 ? 1 + paths.length * 4 /*+ chunkSize*/ : chunkSize);
      if (offset === 0) {
        buffer[0] = paths.length;
        paths.forEach((element, index) => {
          buffer.writeUInt32BE(element, 1 + 4 * index);
        });
        offset += headerLen;
        //rawTransaction.copy(buffer, 1 + 4 * paths.length, offset, offset + chunkSize);
      } else {
        const start = offset - headerLen;
        buffer.set(rawTransaction.slice(start, start + chunkSize));
        offset += chunkSize;
      }
      toSend.push(buffer);
    }
    return foreach(toSend, (data, i) =>
      this.transport
        .send(
          0xe0,
          ledgerOpSignTransaction,
          i === 0 ? ledgerP1InitTransactionData : ledgerP1ContTransactionData,
          i === toSend.length - 1 ? ledgerP2LastTransactionData : ledgerP2MoreTransactionData,
          data
        )
        .then((apduResponse) => {
          response = apduResponse;
        })
    ).then(() => {
      const signatureLen = response[0];
      const ret = new LedgerSignature(
        response.slice(1, signatureLen).toString("hex"),
        response[1 + signatureLen] == 1
      );

      //find out what signature type we used. if eth then return rsv

      return ret;
    });
  }

  /**
   */
  getVersion(): Promise<LedgerVersion> {
    return this.transport.send(0xe0, ledgerOpGetApplicationVersion, 0x00, 0x00).then((response) => {
      const result = new LedgerVersion(response[0], response[1], response[2]);
      return result;
    });
  }

  /**
   */
  getAppName(): Promise<LedgerAppName> {
    return this.transport.send(0xe0, ledgerOpGetAppName, 0x00, 0x00).then((resp) => {
      const result = new LedgerAppName(resp.subarray(0, resp.length - 2).toString());
      return result;
    });
  }
}
/**
 * {@link queryWallets:function}
 * @returns LedgerWalletInfo array
 */
export async function queryHidWallets(): Promise<Array<LedgerWalletInfo>> {
  const module = "hid";
  const devices = new Array<LedgerWalletInfo>();

  const events = discoverDevices((m) => {
    console.log(m.id);

    if (module.split(",").includes(m.id)) {
      const wi = new LedgerWalletInfo();
      wi.transportModule = m;
      devices.push(wi);
      return true;
    }

    return false;
  });
  await events
    .pipe(
      rxScan((acc: any[], value) => {
        let copy;

        if (value.type === "remove") {
          copy = acc.filter((a) => a.id === value.id);
        } else {
          const existing = acc.find((o) => o.id === value.id);

          if (existing) {
            const i = acc.indexOf(existing);
            copy = [...acc];

            if (value.name) {
              copy[i] = value;
            }
          } else {
            copy = acc.concat({
              id: value.id,
              name: value.name,
            });
          }
        }

        return copy;
      }, [])
    )
    .subscribe((value) => {
      console.log(value);
    });

  for (let i = 0; i < devices.length; i++) {
    const transportRet = await devices[i].transportModule.open(devices[i].transportModule.id);
    if (typeof transportRet === "undefined" || !transportRet) {
      continue;
    }
    const transport = transportRet as Transport;
    const acc = new LedgerApi(transport);
    devices[i].ledgerVersion = await acc.getVersion();
    const addrRet = await acc.getPublicKey("m/44'/281'/0'/0'/0'", false, false, "");
    const addr = addrRet as LedgerAddress;
    devices[i].walletID = AccumulateURL.parse(addr.address);
  }

  return devices;
}

class Writable extends Uint8Array {
  offset = 0;

  writeUInt8(value: number, offset: number = this.offset) {
    this[offset] = value & 0xff;
    this.offset = offset;
  }

  writeUInt32BE(value: number, offset: number = this.offset) {
    for (let i = 0; i < 4; i++) {
      this.writeUInt8(value >> (8 * (3 - i)), offset + i);
    }
  }

  write(value: Uint8Array, offset: number = this.offset) {
    if (offset + value.length > this.length) throw new Error("insufficient space allocated");
    this.set(value, offset);
  }
}
