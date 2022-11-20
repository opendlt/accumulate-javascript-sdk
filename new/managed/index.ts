export * from "./enums_gen";
export * from "./types_gen";

export class MerkleState {
  public count: number;
  public pending: Uint8Array[];
  public hashList: Uint8Array[];
}
