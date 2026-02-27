import { TxBody } from '../../src/index.js';
import { encode } from '../../src/encoding/index.js';
import { Buffer } from '../../src/common/index.js';
import { Transaction } from '../../src/core/index.js';

const body = TxBody.createTokenAccount('acc://test.acme/tokens', 'acc://ACME');
console.log('body type:', body.type);
console.log('body url:', String(body.url));
console.log('body tokenUrl:', String(body.tokenUrl));

const encoded = encode(body);
console.log('encoded body length:', encoded.length, 'bytes');
console.log('encoded body hex:', Buffer.from(encoded).toString('hex'));

const txn = new Transaction({
  header: { principal: 'acc://test.acme' },
  body,
});
const encodedTxn = encode(txn);
console.log('encoded txn length:', encodedTxn.length, 'bytes');
console.log('txn hash:', Buffer.from(txn.hash()).toString('hex'));
