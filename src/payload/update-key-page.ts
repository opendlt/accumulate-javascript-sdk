import { bytesMarshalBinary, uvarintMarshalBinary } from "../encoding";
import { TransactionType } from "../types";
import { BasePayload } from "./base-payload";

export enum KeyPageOperationType {
  Update = 1,
  Remove,
  Add,
  SetThreshold,
  UpdateAllowed,
}

export type AddKeyOperation = {
  type: KeyPageOperationType.Add;
  keyHash: string | Uint8Array;
};

export type RemoveKeyOperation = {
  type: KeyPageOperationType.Remove;
  keyHash: string | Uint8Array;
};

export type UpdateKeyOperation = {
  type: KeyPageOperationType.Update;
  oldKeyHash: string | Uint8Array;
  newKeyHash: string | Uint8Array;
};

export type SetThresholdKeyPageOperation = {
  type: KeyPageOperationType.SetThreshold;
  threshold: number;
};

export type UpdateAllowedKeyPageOperation = {
  type: KeyPageOperationType.UpdateAllowed;
  allow?: TransactionType[];
  deny?: TransactionType[];
};

export type KeyPageOperation =
  | AddKeyOperation
  | RemoveKeyOperation
  | UpdateKeyOperation
  | SetThresholdKeyPageOperation
  | UpdateAllowedKeyPageOperation;

export class UpdateKeyPage extends BasePayload {
  private readonly _operations: KeyPageOperation[];

  constructor(operation: KeyPageOperation | KeyPageOperation[]) {
    super();

    if (Array.isArray(operation)) {
      this._operations = operation;
    } else {
      this._operations = [operation];
    }
  }

  protected _marshalBinary(): Buffer {
    const forConcat = [];

    forConcat.push(uvarintMarshalBinary(TransactionType.UpdateKeyPage, 1));

    this._operations
      .map(marshalBinaryKeyPageOperation)
      .forEach((b) => forConcat.push(bytesMarshalBinary(b, 2)));

    return Buffer.concat(forConcat);
  }
}

function marshalBinaryKeyPageOperation(operation: KeyPageOperation): Buffer {
  switch (operation.type) {
    case KeyPageOperationType.Add:
    case KeyPageOperationType.Remove:
      return marshalBinaryAddRemoveKeyOperation(operation);
    case KeyPageOperationType.Update:
      return marshalBinaryUpdateKeyOperation(operation);
    case KeyPageOperationType.SetThreshold:
      return marshalBinarySetThresholdKeyPageOperation(operation);
    case KeyPageOperationType.UpdateAllowed:
      return marshalBinaryUpdateAllowedKeyPageOperation(operation);
  }
}

function marshalBinaryAddRemoveKeyOperation(
  operation: AddKeyOperation | RemoveKeyOperation
): Buffer {
  const forConcat = [];

  forConcat.push(uvarintMarshalBinary(operation.type, 1));

  const keyHash = getKeyHash(operation.keyHash);
  const entryMarshalBinary = bytesMarshalBinary(keyHash, 1);
  forConcat.push(bytesMarshalBinary(entryMarshalBinary, 2));

  return Buffer.concat(forConcat);
}

function marshalBinaryUpdateKeyOperation(operation: UpdateKeyOperation): Buffer {
  const forConcat = [];

  forConcat.push(uvarintMarshalBinary(operation.type, 1));

  const oldKeyHash = getKeyHash(operation.oldKeyHash);
  const newKeyHash = getKeyHash(operation.newKeyHash);

  const oldEntryMarshalBinary = bytesMarshalBinary(oldKeyHash, 1);
  forConcat.push(bytesMarshalBinary(oldEntryMarshalBinary, 2));
  const newEntryMarshalBinary = bytesMarshalBinary(newKeyHash, 1);
  forConcat.push(bytesMarshalBinary(newEntryMarshalBinary, 3));

  return Buffer.concat(forConcat);
}

function marshalBinarySetThresholdKeyPageOperation(
  operation: SetThresholdKeyPageOperation
): Buffer {
  const forConcat = [];

  forConcat.push(uvarintMarshalBinary(operation.type, 1));
  forConcat.push(uvarintMarshalBinary(operation.threshold, 2));

  return Buffer.concat(forConcat);
}

function marshalBinaryUpdateAllowedKeyPageOperation(
  operation: UpdateAllowedKeyPageOperation
): Buffer {
  const forConcat = [];

  forConcat.push(uvarintMarshalBinary(operation.type, 1));
  operation?.allow?.forEach((a) => forConcat.push(uvarintMarshalBinary(a, 2)));
  operation?.deny?.forEach((d) => forConcat.push(uvarintMarshalBinary(d, 3)));

  return Buffer.concat(forConcat);
}

function getKeyHash(keyHash: Uint8Array | string): Uint8Array {
  return keyHash instanceof Uint8Array ? keyHash : Buffer.from(keyHash, "hex");
}
