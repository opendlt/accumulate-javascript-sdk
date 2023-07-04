import { Buffer } from "../src/common/buffer";
import { hashTree } from "../src/common/crypto";

test("should hash tree", async () => {
  let h = await hashTree([Buffer.from("00", "hex")]);
  expect(Buffer.from(h).toString("hex")).toStrictEqual(
    "6e340b9cffb37a989ca544e6bb780a2c78901d3fb33738768511a30617afa01d"
  );
  h = await hashTree([Buffer.from("00", "hex"), Buffer.from("00", "hex")]);
  expect(Buffer.from(h).toString("hex")).toStrictEqual(
    "b289dea92ca5aba5f2e1891a1af11be27914c48854db0fe5b4bb95c137e0f2d6"
  );
  h = await hashTree([
    Buffer.from("00", "hex"),
    Buffer.from("00", "hex"),
    Buffer.from("00", "hex"),
  ]);
  expect(Buffer.from(h).toString("hex")).toStrictEqual(
    "9b7acd621ea3d4a735a2ec4109cb6a8e10b84106cc37a8b278220a431f2717cb"
  );
});
