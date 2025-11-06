import { api_v3, ED25519Key, Signer } from "accumulate.js";
import { Transaction } from "accumulate.js/core";
import { encode } from "accumulate.js/encoding";

// Create a simple sendTokens transaction for marshaling test
const lid = Signer.forLite(ED25519Key.generate());
const lta = lid.url.join("ACME");
const tokenAccountUrl = "acc://test-token-account/tokens";

// Create transaction
const txn = new Transaction({
    header: {
        principal: lta,
    },
    body: {
        type: "sendTokens",
        to: [{
            url: tokenAccountUrl,
            amount: 600000000,
        }],
    },
});

// Debug the body creation
console.log('=== DEBUG BODY CREATION ===');
console.log('Body.to array:', txn.body.to);
console.log('Body.to length:', txn.body.to?.length);
console.log('Body.to[0]:', txn.body.to?.[0]);
console.log('Body.to[0] is TokenRecipient?', txn.body.to?.[0]?.constructor.name);
if (txn.body.to?.[0]) {
    console.log('Body.to[0].url:', txn.body.to[0].url);
    console.log('Body.to[0].amount:', txn.body.to[0].amount);
    console.log('Body.to[0].amount type:', typeof txn.body.to[0].amount);
}

// Sign transaction
const sig = await lid.sign(txn, { timestamp: Date.now() });

// Marshal components
console.log('=== MARSHALED HEX DATA ===');

const marshaledHeader = encode(txn.header);
console.log(`Header (${marshaledHeader.length} bytes): ${Buffer.from(marshaledHeader).toString('hex')}`);

const marshaledBody = encode(txn.body);
console.log(`Body (${marshaledBody.length} bytes): ${Buffer.from(marshaledBody).toString('hex')}`);

const marshaledSignature = encode(sig);
console.log(`Signature (${marshaledSignature.length} bytes): ${Buffer.from(marshaledSignature).toString('hex')}`);

const txnHash = txn.hash();
console.log(`Transaction Hash (${txnHash.length} bytes): ${Buffer.from(txnHash).toString('hex')}`);

// Also show JSON for comparison
console.log('\n=== JSON FOR COMPARISON ===');
console.log('Transaction.asObject():', JSON.stringify(txn.asObject(), null, 2));
console.log('Signature.asObject():', JSON.stringify(sig.asObject(), null, 2));