/* eslint-disable @typescript-eslint/no-unused-vars */

type Encoding = "hex" | "utf-8" | "base64";

export class BufferCls extends Uint8Array {
  toString(encoding?: Encoding): string;
}

export namespace Buffer {
  function from(v: string | Iterable<number>, typ?: Encoding): BufferCls;
  function concat(v: Iterable<number>[]): BufferCls;
}
