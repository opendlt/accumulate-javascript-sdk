/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { ChildProcess, spawn } from "child_process";
import path from "path";
import { Client } from "../src";
import kill from "tree-kill";

const client = new Client(process.env.ACC_ENDPOINT || "http://127.0.1.1:26660/v2");

describe("Basic client test", () => {
  let proc: ChildProcess;
  beforeAll(async () => {

    proc = spawn('go', ['run', './tools/cmd/simulator', '--step=10ms'], { cwd: path.join(__dirname, '..', 'accumulate') });

    await new Promise<void>((resolve, reject) => {
      let out = '';
      let stdfn: (c: Buffer) => void;
      let errfn: (code: number | null, signal: NodeJS.Signals | null) => void;

      // eslint-disable-next-line prefer-const
      stdfn = (c: Buffer) => {
        out += c.toString('utf-8')
        if (/\bNode HTTP up\b/.test(out)) {
          setTimeout(() => resolve(), 10);
          proc.stdout!.off('data', stdfn);
          proc.stderr!.off('data', stdfn);
          proc.stdout!.destroy();
          proc.stderr!.destroy();
        }
      }

      // eslint-disable-next-line prefer-const
      errfn = (code, signal) => {
        proc.off('exit', errfn);
        if (code || signal) {
          reject({ code, signal });
        }
      }

      proc.on('exit', errfn);
      proc.stdout!.on('data', stdfn);
      proc.stderr!.on('data', stdfn);
    })
  });

  afterAll(() => {
    kill(proc.pid!);
  })

  test("describe", async () => {
    const res = await client.describe();
    console.log(res.network?.id);
  });
});
