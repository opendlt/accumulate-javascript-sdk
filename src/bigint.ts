// import assert from "assert";
import BN from "bn.js";

export class u64 extends BN {
    // toBuffer(): Buffer {
    //   const a = super.toArray().reverse();
    //   const b = Buffer.from(a);
    //   if (b.length === 8) {
    //     return b;
    //   }
    //   assert(b.length < 8, "Numberu64 too large");
  
    //   const zeroPad = Buffer.alloc(8);
    //   b.copy(zeroPad);
    //   return zeroPad;
    // }
  
    // static fromBuffer(buffer: Buffer): u64 {
    //   assert(buffer.length === 8, `Invalid buffer length: ${buffer.length}`);
    //   return new u64(
    //     [...buffer]
    //       .reverse()
    //       .map((i) => `00${i.toString(16)}`.slice(-2))
    //       .join(""),
    //     16
    //   );
    // }
  }