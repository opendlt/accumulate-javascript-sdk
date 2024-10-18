/*
Copyright (c) 2009 The Go Authors. All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are
met:

   * Redistributions of source code must retain the above copyright
notice, this list of conditions and the following disclaimer.
   * Redistributions in binary form must reproduce the above
copyright notice, this list of conditions and the following disclaimer
in the documentation and/or other materials provided with the
distribution.
   * Neither the name of Google Inc. nor the names of its
contributors may be used to endorse or promote products derived from
this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
"AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

export function sha512(data: Uint8Array): Uint8Array {
  const d = new Digest();
  d.write(data);
  return d.digest();
}

const chunk = 128;

const _K = new BigUint64Array([
  0x428a2f98d728ae22n,
  0x7137449123ef65cdn,
  0xb5c0fbcfec4d3b2fn,
  0xe9b5dba58189dbbcn,
  0x3956c25bf348b538n,
  0x59f111f1b605d019n,
  0x923f82a4af194f9bn,
  0xab1c5ed5da6d8118n,
  0xd807aa98a3030242n,
  0x12835b0145706fben,
  0x243185be4ee4b28cn,
  0x550c7dc3d5ffb4e2n,
  0x72be5d74f27b896fn,
  0x80deb1fe3b1696b1n,
  0x9bdc06a725c71235n,
  0xc19bf174cf692694n,
  0xe49b69c19ef14ad2n,
  0xefbe4786384f25e3n,
  0x0fc19dc68b8cd5b5n,
  0x240ca1cc77ac9c65n,
  0x2de92c6f592b0275n,
  0x4a7484aa6ea6e483n,
  0x5cb0a9dcbd41fbd4n,
  0x76f988da831153b5n,
  0x983e5152ee66dfabn,
  0xa831c66d2db43210n,
  0xb00327c898fb213fn,
  0xbf597fc7beef0ee4n,
  0xc6e00bf33da88fc2n,
  0xd5a79147930aa725n,
  0x06ca6351e003826fn,
  0x142929670a0e6e70n,
  0x27b70a8546d22ffcn,
  0x2e1b21385c26c926n,
  0x4d2c6dfc5ac42aedn,
  0x53380d139d95b3dfn,
  0x650a73548baf63den,
  0x766a0abb3c77b2a8n,
  0x81c2c92e47edaee6n,
  0x92722c851482353bn,
  0xa2bfe8a14cf10364n,
  0xa81a664bbc423001n,
  0xc24b8b70d0f89791n,
  0xc76c51a30654be30n,
  0xd192e819d6ef5218n,
  0xd69906245565a910n,
  0xf40e35855771202an,
  0x106aa07032bbd1b8n,
  0x19a4c116b8d2d0c8n,
  0x1e376c085141ab53n,
  0x2748774cdf8eeb99n,
  0x34b0bcb5e19b48a8n,
  0x391c0cb3c5c95a63n,
  0x4ed8aa4ae3418acbn,
  0x5b9cca4f7763e373n,
  0x682e6ff3d6b2b8a3n,
  0x748f82ee5defb2fcn,
  0x78a5636f43172f60n,
  0x84c87814a1f0ab72n,
  0x8cc702081a6439ecn,
  0x90befffa23631e28n,
  0xa4506cebde82bde9n,
  0xbef9a3f7b2c67915n,
  0xc67178f2e372532bn,
  0xca273eceea26619cn,
  0xd186b8c721c0c207n,
  0xeada7dd6cde0eb1en,
  0xf57d4f7fee6ed178n,
  0x06f067aa72176fban,
  0x0a637dc5a2c898a6n,
  0x113f9804bef90daen,
  0x1b710b35131c471bn,
  0x28db77f523047d84n,
  0x32caab7b40c72493n,
  0x3c9ebe0a15c9bebcn,
  0x431d67c49c100d4cn,
  0x4cc5d4becb3e42b6n,
  0x597f299cfc657e2an,
  0x5fcb6fab3ad6faecn,
  0x6c44198c4a475817n,
]);

class Digest {
  x = new Uint8Array(chunk);
  nx = 0;
  len = 0;
  h = new BigUint64Array([
    0x6a09e667f3bcc908n,
    0xbb67ae8584caa73bn,
    0x3c6ef372fe94f82bn,
    0xa54ff53a5f1d36f1n,
    0x510e527fade682d1n,
    0x9b05688c2b3e6c1fn,
    0x1f83d9abfb41bd6bn,
    0x5be0cd19137e2179n,
  ]);

  write(p: Uint8Array) {
    this.len += p.length;
    if (this.nx > 0) {
      const n = copy(this.x.subarray(Number(this.nx)), p);
      this.nx += n;
      if (this.nx == chunk) {
        this.#block(this.x);
        this.nx = 0;
      }
      p = p.subarray(n);
    }
    if (p.length >= chunk) {
      const n = p.length & ~(chunk - 1);
      this.#block(p.subarray(0, n));
      p = p.subarray(n);
    }
    if (p.length > 0) {
      this.nx = copy(this.x, p);
    }
  }

  #block(p: Uint8Array) {
    const w = new BigUint64Array(80);
    let h0 = this.h[0],
      h1 = this.h[1],
      h2 = this.h[2],
      h3 = this.h[3],
      h4 = this.h[4],
      h5 = this.h[5],
      h6 = this.h[6],
      h7 = this.h[7];
    while (p.length >= chunk) {
      for (let i = 0; i < 16; i++) {
        const j = i * 8;
        w[i] =
          (BigInt(p[j]) << 56n) |
          (BigInt(p[j + 1]) << 48n) |
          (BigInt(p[j + 2]) << 40n) |
          (BigInt(p[j + 3]) << 32n) |
          (BigInt(p[j + 4]) << 24n) |
          (BigInt(p[j + 5]) << 16n) |
          (BigInt(p[j + 6]) << 8n) |
          BigInt(p[j + 7]);
      }
      for (let i = 16; i < 80; i++) {
        const v1 = w[i - 2];
        const t1 = rotateLeft64(v1, -19) ^ rotateLeft64(v1, -61) ^ (v1 >> 6n);
        const v2 = w[i - 15];
        const t2 = rotateLeft64(v2, -1) ^ rotateLeft64(v2, -8) ^ (v2 >> 7n);

        w[i] = t1 + w[i - 7] + t2 + w[i - 16];
      }

      let a = h0,
        b = h1,
        c = h2,
        d = h3,
        e = h4,
        f = h5,
        g = h6,
        h = h7;

      for (let i = 0; i < 80; i++) {
        const t1 = uint64(
          h +
            (rotateLeft64(e, -14) ^ rotateLeft64(e, -18) ^ rotateLeft64(e, -41)) +
            ((e & f) ^ (~e & g)) +
            _K[i] +
            w[i],
        );

        const t2 = uint64(
          (rotateLeft64(a, -28) ^ rotateLeft64(a, -34) ^ rotateLeft64(a, -39)) +
            ((a & b) ^ (a & c) ^ (b & c)),
        );

        h = g;
        g = f;
        f = e;
        e = uint64(d + t1);
        d = c;
        c = b;
        b = a;
        a = uint64(t1 + t2);
      }

      h0 = uint64(h0 + a);
      h1 = uint64(h1 + b);
      h2 = uint64(h2 + c);
      h3 = uint64(h3 + d);
      h4 = uint64(h4 + e);
      h5 = uint64(h5 + f);
      h6 = uint64(h6 + g);
      h7 = uint64(h7 + h);

      p = p.subarray(chunk);
    }

    (this.h[0] = h0),
      (this.h[1] = h1),
      (this.h[2] = h2),
      (this.h[3] = h3),
      (this.h[4] = h4),
      (this.h[5] = h5),
      (this.h[6] = h6),
      (this.h[7] = h7);
  }

  digest(): Uint8Array {
    // Padding. Add a 1 bit and 0 bits until 112 bytes mod 128.
    let len = this.len;
    const tmp = new Uint8Array(128 + 16); // padding + length buffer
    tmp[0] = 0x80;
    let t: number;
    if (len % 128 < 112) {
      t = 112 - (len % 128);
    } else {
      t = 128 + 112 - (len % 128);
    }

    // Length in bits.
    len <<= 3;
    const padlen = tmp.subarray(0, t + 16);
    // Upper 64 bits are always zero, because len variable has type uint64,
    // and tmp is already zeroed at that index, so we can skip updating it.
    // binary.BigEndian.PutUint64(padlen[t+0:], 0)
    putUint64(padlen.subarray(t + 8), BigInt(len));
    this.write(padlen);

    if (this.nx != 0) {
      throw new Error("this.nx != 0");
    }

    const digest = new Uint8Array(64);
    putUint64(digest.subarray(0), this.h[0]);
    putUint64(digest.subarray(8), this.h[1]);
    putUint64(digest.subarray(16), this.h[2]);
    putUint64(digest.subarray(24), this.h[3]);
    putUint64(digest.subarray(32), this.h[4]);
    putUint64(digest.subarray(40), this.h[5]);
    putUint64(digest.subarray(48), this.h[6]);
    putUint64(digest.subarray(56), this.h[7]);

    return digest;
  }
}

function copy(a: Uint8Array, b: Uint8Array) {
  a.set(b);
  if (a.length < b.length) {
    return a.length;
  }
  return b.length;
}

function rotateLeft64(x: bigint, k: number): bigint {
  const n = BigInt(64);
  const s = BigInt(k & 63);
  return uint64(x << s) | uint64(x >> (n - s));
}

function putUint64(b: Uint8Array, v: bigint) {
  b[0] = Number(uint8(v >> 56n));
  b[1] = Number(uint8(v >> 48n));
  b[2] = Number(uint8(v >> 40n));
  b[3] = Number(uint8(v >> 32n));
  b[4] = Number(uint8(v >> 24n));
  b[5] = Number(uint8(v >> 16n));
  b[6] = Number(uint8(v >> 8n));
  b[7] = Number(uint8(v));
}

function uint64(v: bigint): bigint {
  return v & ((1n << 64n) - 1n);
}

function uint8(v: bigint): bigint {
  return v & ((1n << 8n) - 1n);
}
