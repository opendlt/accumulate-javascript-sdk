/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-debugger */

import "reflect-metadata";
import { Buffer } from "../common/buffer";
import {
  BigInt,
  Bool,
  Bytes,
  Duration,
  Encodable,
  Enum,
  Hash,
  Int,
  RawJson,
  Reference,
  String,
  Time,
  TxID,
  Uint,
  Union,
  Url,
} from "./encodable";
import { bytesMarshalBinary, uvarintMarshalBinary as uintMarshalBinary } from "./encoding";

export * from "./encodable";
export * from "./encoding";
export const FieldNumber = new Uint();
export const Length = new Uint();

export function encode(target: any) {
  const parts: Uint8Array[] = [];
  consume(target, (field, value) => {
    parts.push(uintMarshalBinary(field.number));
    parts.push(field.type.encode(value));
  });

  return Buffer.concat(parts);
}

export type Consumer = (field: Field, value: any) => void;

export function consume(target: any, consume: Consumer) {
  const enc = Encoding.get(target);
  if (!enc) throw new Error("cannot encode object: no metadata");

  for (const field of enc.fields) {
    encodeField(target, field, consume);
  }
}

function encodeField(target: any, field: Field, consume: Consumer) {
  const value = field.type instanceof Embedded ? target : target[field.name];
  if (!field.repeatable) {
    encodeValue(value, field, consume);
    return;
  }

  if (value) for (const item of value) encodeValue(item, field, consume);
}

function encodeValue(value: any, field: Field, consume: Consumer) {
  switch (true) {
    case field.type instanceof Hash:
      if (!field.keepEmpty && isZeroHash(value)) return;
      break;

    case field.type instanceof Embedded:
      break;

    default:
      if (!field.keepEmpty && !value) return;
      break;
  }

  consume(field, value);
}

function isZeroHash(value: any) {
  if (!value) return true;
  for (const v of value) {
    if (v !== 0) return false;
  }
  return true;
}

export interface Field {
  name: PropertyKey;
  number: number;
  type: Encodable;
  repeatable: boolean;
  embedded?: Field[];
  keepEmpty: boolean;
}

class Embedded {
  embedding = true;
  constructor(private readonly field: Field) {}

  encode(value: any) {
    const parts: Uint8Array[] = [];
    this.consume(value, (field, value) => {
      parts.push(uintMarshalBinary(field.number));
      parts.push(field.type.encode(value));
    });
    return bytesMarshalBinary(Buffer.concat(parts));
  }

  consume(value: any, consumer: Consumer) {
    for (const item of this.field.embedded!) {
      encodeField(value, item, consumer);
    }
  }
}

export class Encoding {
  public readonly fields: Field[] = [];

  static get(target: any) {
    const proto = Object.getPrototypeOf(target);
    if (Reflect.hasOwnMetadata("encoding", proto))
      return <Encoding>Reflect.getMetadata("encoding", proto);
    return;
  }

  static forClass<T, C extends abstract new (...args: any) => T>(target: C) {
    if (Reflect.hasOwnMetadata("encoding", target.prototype))
      return <Encoding>Reflect.getMetadata("encoding", target.prototype);
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
        type: {
          encode() {
            throw new Error("placeholder");
          },
        },
        name: "",
        repeatable: false,
        keepEmpty: false,
        embedded: [],
      };
      (field.type = new Embedded(field)), this.fields.push(field);
    }

    field.embedded!.push({ number: number[1], ...props });
  }
}

export const encodeAs = {
  field(...number: number[]) {
    return new Annotator(number);
  },
};

export class Annotator {
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
    const add = (target: any, key: PropertyKey, type?: any) =>
      Encoding.set(target).addField(this.number, {
        name: key,
        type: new Enum(type),
        ...this.field,
      });
    const annotator = (target: any, key: PropertyKey) => add(target, key);
    annotator.of = (type: any) => (target: any, key: PropertyKey) => add(target, key, type);
    return annotator;
  }
  get reference() {
    return (target: any, key: PropertyKey) => {
      Encoding.set(target).addField(this.number, {
        name: key,
        type: new Reference(),
        ...this.field,
      });
    };
  }
  get union() {
    return (target: any, key: PropertyKey) => {
      Encoding.set(target).addField(this.number, { name: key, type: new Union(), ...this.field });
    };
  }

  get int() {
    return (target: any, key: PropertyKey) => {
      Encoding.set(target).addField(this.number, { name: key, type: new Int(), ...this.field });
    };
  }
  get uint() {
    return (target: any, key: PropertyKey) => {
      Encoding.set(target).addField(this.number, { name: key, type: new Uint(), ...this.field });
    };
  }
  get bool() {
    return (target: any, key: PropertyKey) => {
      Encoding.set(target).addField(this.number, { name: key, type: new Bool(), ...this.field });
    };
  }
  get string() {
    return (target: any, key: PropertyKey) => {
      Encoding.set(target).addField(this.number, { name: key, type: new String(), ...this.field });
    };
  }
  get hash() {
    return (target: any, key: PropertyKey) => {
      Encoding.set(target).addField(this.number, { name: key, type: new Hash(), ...this.field });
    };
  }
  get bytes() {
    return (target: any, key: PropertyKey) => {
      Encoding.set(target).addField(this.number, { name: key, type: new Bytes(), ...this.field });
    };
  }
  get url() {
    return (target: any, key: PropertyKey) => {
      Encoding.set(target).addField(this.number, { name: key, type: new Url(), ...this.field });
    };
  }
  get time() {
    return (target: any, key: PropertyKey) => {
      Encoding.set(target).addField(this.number, { name: key, type: new Time(), ...this.field });
    };
  }
  get duration() {
    return (target: any, key: PropertyKey) => {
      Encoding.set(target).addField(this.number, {
        name: key,
        type: new Duration(),
        ...this.field,
      });
    };
  }
  get bigInt() {
    return (target: any, key: PropertyKey) => {
      Encoding.set(target).addField(this.number, { name: key, type: new BigInt(), ...this.field });
    };
  }
  // asAny(target: any, key: PropertyKey) {
  //   Encoding.set(target).addField(this.number, { name: key, type: new Any, ...this.field });
  // }
  get rawJson() {
    return (target: any, key: PropertyKey) => {
      Encoding.set(target).addField(this.number, { name: key, type: new RawJson(), ...this.field });
    };
  }
  // asFloat(target: any, key: PropertyKey) {
  //   Encoding.set(target).addField(this.number, { name: key, type: new Float, ...this.field });
  // }
  get txid() {
    return (target: any, key: PropertyKey) => {
      Encoding.set(target).addField(this.number, { name: key, type: new TxID(), ...this.field });
    };
  }
}
