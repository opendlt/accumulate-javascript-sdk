import { AccURL } from "../acc-url";
import { bytesMarshalBinary, stringMarshalBinary, uvarintMarshalBinary } from "../encoding";
import { TransactionType } from "../tx-types";
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
  key: KeySpec;
};

export type RemoveKeyOperation = {
  type: KeyPageOperationType.Remove;
  key: KeySpec;
};

export type UpdateKeyOperation = {
  type: KeyPageOperationType.Update;
  oldKey: KeySpec;
  newKey: KeySpec;
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

export type KeySpec = {
  keyHash: string | Uint8Array;
  delegate?: string | AccURL;
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

function marshalBinaryKeySpec(keySpec: KeySpec): Buffer {
  const forConcat = [];

  forConcat.push(bytesMarshalBinary(getKeyHash(keySpec.keyHash), 1));
  if (keySpec.delegate) {
    forConcat.push(stringMarshalBinary(keySpec.delegate.toString(), 2));
  }

  return Buffer.concat(forConcat);
}

function marshalBinaryAddRemoveKeyOperation(
  operation: AddKeyOperation | RemoveKeyOperation
): Buffer {
  const forConcat = [];

  forConcat.push(uvarintMarshalBinary(operation.type, 1));

  forConcat.push(bytesMarshalBinary(marshalBinaryKeySpec(operation.key), 2));

  return Buffer.concat(forConcat);
}

function marshalBinaryUpdateKeyOperation(operation: UpdateKeyOperation): Buffer {
  const forConcat = [];

  forConcat.push(uvarintMarshalBinary(operation.type, 1));

  forConcat.push(bytesMarshalBinary(marshalBinaryKeySpec(operation.oldKey), 2));
  forConcat.push(bytesMarshalBinary(marshalBinaryKeySpec(operation.newKey), 3));

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
