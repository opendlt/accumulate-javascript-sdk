import { CreateToken, Transaction, TransactionHeader } from "./core";
import { hashBody } from "./core/base";
import { URL } from "./url";
import { Client } from "./client";
import { sha256 } from "./crypto";
import { combineReceipts, Receipt } from "./merkle";
import { encode } from "./encoding";

export async function sleep(millis: number) {
  return new Promise((resolve) => setTimeout(resolve, millis));
}

export async function constructIssuerProof(
  client: Client,
  issuer: string | URL
): Promise<{ receipt: Receipt; transaction: CreateToken }> {
  // The first transaction of a token issuer must be the one that created it
  const txn0url = `${issuer}#txn/0`;
  const { receipts, transaction } = await client.queryUrl(txn0url, { prove: true });

  // Get a chain proof (from any chain, ends in a BVN anchor)
  if (receipts.length === 0) {
    throw new Error(`Asked for proofs but got none`);
  }
  const proof2 = receipts[0].proof;

  // Convert the response to a Transaction
  if (transaction.body.type != "createToken") {
    throw new Error(
      `Expected first transaction of ${issuer} to be createToken but got ${transaction.body.type}`
    );
  }
  const header = new TransactionHeader({
    principal: transaction.header.principal,
    initiator: Buffer.from(transaction.header.initiator, "hex"),
    memo: transaction.header.memo,
    metadata: transaction.header.metadata
      ? Buffer.from(transaction.header.metadata, "hex")
      : undefined,
  });
  const body = new CreateToken(transaction.body);
  const txn = new Transaction({ body, header });

  // Prove that the body is part of the transaction
  const proof1: Receipt.Args = {
    start: hashBody(body),
    startIndex: 0,
    end: hashBody(body),
    endIndex: 0,
    anchor: txn.hash(),
    entries: [
      {
        hash: sha256(encode(header)),
        right: false,
      },
    ],
  };

  // Prove the BVN anchor
  const anchorRes = await client.queryAnchor(proof2.anchor);
  const proof3 = anchorRes.receipt.proof;

  // Assemble the full proof
  const receipt = combineReceipts(combineReceipts(new Receipt(proof1), new Receipt(proof2)), proof3);
  return { receipt, transaction: body };
}
