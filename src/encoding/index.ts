/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-debugger */

import "reflect-metadata";
import {
  bigNumberMarshalBinary as bigIntMarshalBinary,
  booleanMarshalBinary,
  bytesMarshalBinary,
  hashMarshalBinary,
  stringMarshalBinary,
  uvarintMarshalBinary as uintMarshalBinary,
  varintMarshalBinary as intMarshalBinary,
} from "./encoding";

export function encode(target: any) {
  const enc = Encoding.get(target);
  if (!enc) throw new Error("cannot encode object: no metadata");

  const parts: Buffer[] = [];
  for (const field of enc.fields) {
    encodeField(target, field, parts);
  }

  return Buffer.concat(parts);
}

function encodeField(target: any, field: Field, parts: Buffer[]) {
  const value = field.type == Embedded ? target : target[field.name];
  if (!field.repeatable) {
    encodeValue(value, field, parts);
    return;
  }

  if (value) for (const item of value) encodeValue(item, field, parts);
}

function encodeValue(value: any, field: Field, parts: Buffer[]) {
  switch (field.type) {
    case Hash:
      if (!field.keepEmpty && isZeroHash(value)) return;
      break;

    case Embedded:
      break;

    default:
      if (!field.keepEmpty && !value) return;
      break;
  }

  parts.push(uintMarshalBinary(field.number));

  switch (field.type) {
    case Int:
      parts.push(intMarshalBinary(value));
      break;

    case Uint:
      parts.push(uintMarshalBinary(value));
      break;

    case Bool:
      parts.push(booleanMarshalBinary(value));
      break;

    case String:
      parts.push(stringMarshalBinary(value));
      break;

    case Hash:
      parts.push(hashMarshalBinary(value));
      break;

    case Bytes:
      parts.push(bytesMarshalBinary(value));
      break;

    case Url:
      parts.push(stringMarshalBinary(value.toString()));
      break;

    case Time:
      parts.push(uintMarshalBinary((<Date>value).getTime() / 1000));
      break;

    case Duration:
      throw new Error("cannot marshal duration to binary");

    case BigInt:
      parts.push(bigIntMarshalBinary(value));
      break;

    case Any:
      throw new Error("cannot marshal type any to binary");

    case RawJson:
      {
        const bytes = Buffer.from(JSON.stringify(value), "utf-8");
        parts.push(bytesMarshalBinary(bytes));
      }
      break;

    case Float:
      throw new Error("cannot marshal float to binary");

    case Txid:
      parts.push(stringMarshalBinary(value.toString()));
      break;

    case Enum:
      parts.push(uintMarshalBinary(value));
      break;

    case Union:
    case Reference:
      parts.push(bytesMarshalBinary(encode(value)));
      break;

    case Embedded:
      {
        const sub: Buffer[] = [];
        for (const item of field.embedded!) {
          encodeField(value, item, sub);
        }
        parts.push(bytesMarshalBinary(Buffer.concat(sub)));
      }
      break;

    default:
      throw new Error("internal error - invalid type code");
  }
}

function isZeroHash(value: any) {
  if (!value) return true;
  for (const v of value) {
    if (v !== 0) return false;
  }
  return true;
}

const Int = 1;
const Uint = 2;
const Bool = 3;
const String = 4;
const Hash = 5;
const Bytes = 6;
const Url = 7;
const Time = 8;
const Duration = 9;
const BigInt = 10;
const Any = 11;
const RawJson = 12;
const Float = 13;
const Txid = 14;

const Reference = 1001;
const Enum = 1002;
const Union = 1003;
const Embedded = 1004;

interface Field {
  name: PropertyKey;
  number: number;
  type: number;
  repeatable: boolean;
  embedded?: Field[];
  keepEmpty: boolean;
}

class Encoding {
  public fields: Field[] = [];

  static get(target: any) {
    const proto = Object.getPrototypeOf(target);
    if (Reflect.hasOwnMetadata("encoding", proto))
      return <Encoding>Reflect.getMetadata("encoding", proto);
    return;
  }

  static set(target: any) {
    if (Reflect.hasOwnMetadata("encoding", target))
      return <Encoding>Reflect.getMetadata("encoding", target);

    const encoding = new Encoding();
    Reflect.defineMetadata("encoding", encoding, target);
    return encoding;
  }

  addField(number: number[], props: Omit<Field, "number">) {
    if (number.length > 2) throw new Error("multiply nested fields are not supported");

    if (number.length == 1) {
      this.fields.push({ number: number[0], ...props });
      return;
    }

    let field = this.fields.find((x) => x.number === number[0]);
    if (!field) {
      field = {
        number: number[0],
        type: Embedded,
        name: "",
        repeatable: false,
        keepEmpty: false,
        embedded: [],
      };
      this.fields.push(field);
    }

    field.embedded!.push({ number: number[1], ...props });
  }
}

export const encodeAs = new (class {
  field(...number: number[]) {
    return new Annotator(number);
  }
})();

class Annotator {
  private field: Omit<Field, "name" | "type" | "number">;

  constructor(private number: number[]) {
    this.field = {
      repeatable: false,
      keepEmpty: false,
    };
  }

  get repeatable() {
    this.field.repeatable = true;
    return this;
  }

  get keepEmpty() {
    this.field.keepEmpty = true;
    return this;
  }

  get enum() {
    return (target: any, key: PropertyKey) => {
      Encoding.set(target).addField(this.number, { name: key, type: Enum, ...this.field });
    };
  }
  get reference() {
    return (target: any, key: PropertyKey) => {
      Encoding.set(target).addField(this.number, { name: key, type: Reference, ...this.field });
    };
  }
  get union() {
    return (target: any, key: PropertyKey) => {
      Encoding.set(target).addField(this.number, { name: key, type: Union, ...this.field });
    };
  }

  get int() {
    return (target: any, key: PropertyKey) => {
      Encoding.set(target).addField(this.number, { name: key, type: Int, ...this.field });
    };
  }
  get uint() {
    return (target: any, key: PropertyKey) => {
      Encoding.set(target).addField(this.number, { name: key, type: Uint, ...this.field });
    };
  }
  get bool() {
    return (target: any, key: PropertyKey) => {
      Encoding.set(target).addField(this.number, { name: key, type: Bool, ...this.field });
    };
  }
  get string() {
    return (target: any, key: PropertyKey) => {
      Encoding.set(target).addField(this.number, { name: key, type: String, ...this.field });
    };
  }
  get hash() {
    return (target: any, key: PropertyKey) => {
      Encoding.set(target).addField(this.number, { name: key, type: Hash, ...this.field });
    };
  }
  get bytes() {
    return (target: any, key: PropertyKey) => {
      Encoding.set(target).addField(this.number, { name: key, type: Bytes, ...this.field });
    };
  }
  get url() {
    return (target: any, key: PropertyKey) => {
      Encoding.set(target).addField(this.number, { name: key, type: Url, ...this.field });
    };
  }
  get time() {
    return (target: any, key: PropertyKey) => {
      Encoding.set(target).addField(this.number, { name: key, type: Time, ...this.field });
    };
  }
  // asDuration(target: any, key: PropertyKey) {
  //   Encoding.set(target).addField(this.number, { name: key, type: Duration, ...this.field });
  // }
  get bigInt() {
    return (target: any, key: PropertyKey) => {
      Encoding.set(target).addField(this.number, { name: key, type: BigInt, ...this.field });
    };
  }
  // asAny(target: any, key: PropertyKey) {
  //   Encoding.set(target).addField(this.number, { name: key, type: Any, ...this.field });
  // }
  get rawJson() {
    return (target: any, key: PropertyKey) => {
      Encoding.set(target).addField(this.number, { name: key, type: RawJson, ...this.field });
    };
  }
  // asFloat(target: any, key: PropertyKey) {
  //   Encoding.set(target).addField(this.number, { name: key, type: Float, ...this.field });
  // }
  get txid() {
    return (target: any, key: PropertyKey) => {
      Encoding.set(target).addField(this.number, { name: key, type: Txid, ...this.field });
    };
  }
}
