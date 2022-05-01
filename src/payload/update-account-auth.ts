import { AccURL } from "../acc-url";
import { bytesMarshalBinary, stringMarshalBinary, uvarintMarshalBinary } from "../encoding";
import { TransactionType } from "../tx-types";
import { BasePayload } from "./base-payload";

export enum AccountAuthOperationType {
  Enable = 1,
  Disable,
  AddAuthority,
  RemoveAuthority,
}

export type EnableAccountAuthOperation = {
  type: AccountAuthOperationType.Enable;
  authority: string | AccURL;
};

export type DisableAccountAuthOperation = {
  type: AccountAuthOperationType.Disable;
  authority: string | AccURL;
};

export type AddAccountAuthorityOperation = {
  type: AccountAuthOperationType.AddAuthority;
  authority: string | AccURL;
};

export type RemoveAccountAuthorityOperation = {
  type: AccountAuthOperationType.RemoveAuthority;
  authority: string | AccURL;
};

export type AccountAuthOperation =
  | EnableAccountAuthOperation
  | DisableAccountAuthOperation
  | AddAccountAuthorityOperation
  | RemoveAccountAuthorityOperation;

export class UpdateAccountAuth extends BasePayload {
  private readonly _operations: AccountAuthOperation[];

  constructor(operation: AccountAuthOperation | AccountAuthOperation[]) {
    super();

    if (Array.isArray(operation)) {
      this._operations = operation;
    } else {
      this._operations = [operation];
    }
  }

  protected _marshalBinary(): Buffer {
    const forConcat = [];

    forConcat.push(uvarintMarshalBinary(TransactionType.UpdateAccountAuth, 1));

    this._operations
      .map(marshalBinaryAccountAuthOperation)
      .forEach((b) => forConcat.push(bytesMarshalBinary(b, 2)));

    return Buffer.concat(forConcat);
  }
}

function marshalBinaryAccountAuthOperation(operation: AccountAuthOperation): Buffer {
  const forConcat = [];

  forConcat.push(uvarintMarshalBinary(operation.type, 1));
  forConcat.push(stringMarshalBinary(operation.authority.toString(), 2));

  return Buffer.concat(forConcat);
}
