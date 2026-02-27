"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable @typescript-eslint/no-non-null-assertion */
var accumulate_js_1 = require("accumulate.js");
var api_v3_1 = require("accumulate.js/api_v3");
var core_1 = require("accumulate.js/core");
var errors_1 = require("accumulate.js/errors");
// Connect to Accumulate testnet
var client = new accumulate_js_1.api_v3.JsonRpcClient("https://kermit.accumulatenetwork.io/v3");
var waitTime = 500;
var waitLimit = 30000 / waitTime;
function comprehensiveExample() {
    return __awaiter(this, void 0, void 0, function () {
        var lid, lta, res, balanceQuery, oracle, acmeAmount, txn, sig, submitRes, _i, submitRes_1, r, creditsQuery, identitySigner, timestamp, identityUrl, bookUrl, _a, submitRes_2, r, identityQuery, keyPageUrl, keyPageCreditsAmount, _b, submitRes_3, r, keyPageCreditsQuery, adiSigner, dataAccountUrl, _c, submitRes_4, r, dataAccountQuery, exampleData, _d, submitRes_5, r, dataQuery;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    console.log("=== Comprehensive Accumulate API v3 Example ===\n");
                    // Step 1: Create a Lite Token Account (LTA) and Lite Identity (LID)
                    console.log("Step 1: Creating Lite Identity and Token Account...");
                    lid = accumulate_js_1.Signer.forLite(accumulate_js_1.ED25519Key.generate());
                    lta = lid.url.join("ACME");
                    console.log("Lite Identity: ".concat(lid.url.toString()));
                    console.log("Lite Token Account: ".concat(lta.toString(), "\n"));
                    // Step 2: Fund LTA with test tokens from testnet faucet
                    console.log("Step 2: Funding from testnet faucet...");
                    return [4 /*yield*/, client.faucet(lta)];
                case 1:
                    res = _e.sent();
                    return [4 /*yield*/, waitForAll(res.status.txID)];
                case 2:
                    _e.sent();
                    return [4 /*yield*/, client.query(lta)];
                case 3:
                    balanceQuery = _e.sent();
                    console.log("Funded balance: ".concat(balanceQuery.data.balance, " ACME tokens\n"));
                    // Step 3: Purchase credits for the LID using test tokens
                    console.log("Step 3: Purchasing credits for LID...");
                    return [4 /*yield*/, client.networkStatus()];
                case 4:
                    oracle = (_e.sent()).oracle;
                    acmeAmount = ((1000 * Math.pow(10, 2)) / oracle.price) * Math.pow(10, 8);
                    txn = new core_1.Transaction({
                        header: {
                            principal: lta,
                        },
                        body: {
                            type: "addCredits",
                            recipient: lid.url,
                            amount: acmeAmount,
                            oracle: oracle.price,
                        },
                    });
                    return [4 /*yield*/, lid.sign(txn, { timestamp: Date.now() })];
                case 5:
                    sig = _e.sent();
                    return [4 /*yield*/, client.submit({ transaction: [txn], signatures: [sig] })];
                case 6:
                    submitRes = _e.sent();
                    _i = 0, submitRes_1 = submitRes;
                    _e.label = 7;
                case 7:
                    if (!(_i < submitRes_1.length)) return [3 /*break*/, 10];
                    r = submitRes_1[_i];
                    if (!r.success) {
                        throw new Error("Submission failed: ".concat(r.message));
                    }
                    return [4 /*yield*/, waitForAll(r.status.txID)];
                case 8:
                    _e.sent();
                    _e.label = 9;
                case 9:
                    _i++;
                    return [3 /*break*/, 7];
                case 10: return [4 /*yield*/, client.query(lid.url)];
                case 11:
                    creditsQuery = _e.sent();
                    console.log("Credits balance: ".concat(creditsQuery.data.creditBalance, " credits\n"));
                    // Step 4: Create an ADI (Accumulate Digital Identity)
                    console.log("Step 4: Creating ADI identity...");
                    identitySigner = accumulate_js_1.ED25519Key.generate();
                    timestamp = Date.now().toString();
                    identityUrl = "acc://example-adi-".concat(timestamp, ".acme");
                    bookUrl = identityUrl + "/book";
                    console.log("Creating ADI: ".concat(identityUrl));
                    txn = new core_1.Transaction({
                        header: {
                            principal: lid.url,
                        },
                        body: {
                            type: "createIdentity",
                            url: identityUrl,
                            keyHash: identitySigner.address.publicKeyHash,
                            keyBookUrl: bookUrl,
                        },
                    });
                    return [4 /*yield*/, lid.sign(txn, { timestamp: Date.now() })];
                case 12:
                    sig = _e.sent();
                    return [4 /*yield*/, client.submit({ transaction: [txn], signatures: [sig] })];
                case 13:
                    submitRes = _e.sent();
                    _a = 0, submitRes_2 = submitRes;
                    _e.label = 14;
                case 14:
                    if (!(_a < submitRes_2.length)) return [3 /*break*/, 17];
                    r = submitRes_2[_a];
                    if (!r.success) {
                        throw new Error("Submission failed: ".concat(r.message));
                    }
                    return [4 /*yield*/, waitForAll(r.status.txID)];
                case 15:
                    _e.sent();
                    _e.label = 16;
                case 16:
                    _a++;
                    return [3 /*break*/, 14];
                case 17:
                    console.log("ADI created successfully!");
                    return [4 /*yield*/, client.query(identityUrl)];
                case 18:
                    identityQuery = _e.sent();
                    console.log("Identity type: ".concat(identityQuery.type, "\n"));
                    // Step 5: Purchase credits for the ADI's key page
                    console.log("Step 5: Purchasing credits for ADI key page...");
                    keyPageUrl = bookUrl + "/1";
                    keyPageCreditsAmount = ((500 * Math.pow(10, 2)) / oracle.price) * Math.pow(10, 8);
                    txn = new core_1.Transaction({
                        header: {
                            principal: lta,
                        },
                        body: {
                            type: "addCredits",
                            recipient: keyPageUrl,
                            amount: keyPageCreditsAmount,
                            oracle: oracle.price,
                        },
                    });
                    return [4 /*yield*/, lid.sign(txn, { timestamp: Date.now() })];
                case 19:
                    sig = _e.sent();
                    return [4 /*yield*/, client.submit({ transaction: [txn], signatures: [sig] })];
                case 20:
                    submitRes = _e.sent();
                    _b = 0, submitRes_3 = submitRes;
                    _e.label = 21;
                case 21:
                    if (!(_b < submitRes_3.length)) return [3 /*break*/, 24];
                    r = submitRes_3[_b];
                    if (!r.success) {
                        throw new Error("Submission failed: ".concat(r.message));
                    }
                    return [4 /*yield*/, waitForAll(r.status.txID)];
                case 22:
                    _e.sent();
                    _e.label = 23;
                case 23:
                    _b++;
                    return [3 /*break*/, 21];
                case 24: return [4 /*yield*/, client.query(keyPageUrl)];
                case 25:
                    keyPageCreditsQuery = _e.sent();
                    console.log("Key page credits: ".concat(keyPageCreditsQuery.data.creditBalance, " credits\n"));
                    adiSigner = accumulate_js_1.Signer.forPage(keyPageUrl, identitySigner).withVersion(1);
                    // Step 6: Create a data account using ADI credits
                    console.log("Step 6: Creating data account...");
                    dataAccountUrl = identityUrl + "/my-data-account";
                    txn = new core_1.Transaction({
                        header: {
                            principal: keyPageUrl,
                        },
                        body: {
                            type: "createDataAccount",
                            url: dataAccountUrl,
                        },
                    });
                    return [4 /*yield*/, adiSigner.sign(txn, { timestamp: Date.now() })];
                case 26:
                    sig = _e.sent();
                    return [4 /*yield*/, client.submit({ transaction: [txn], signatures: [sig] })];
                case 27:
                    submitRes = _e.sent();
                    _c = 0, submitRes_4 = submitRes;
                    _e.label = 28;
                case 28:
                    if (!(_c < submitRes_4.length)) return [3 /*break*/, 31];
                    r = submitRes_4[_c];
                    if (!r.success) {
                        throw new Error("Submission failed: ".concat(r.message));
                    }
                    return [4 /*yield*/, waitForAll(r.status.txID)];
                case 29:
                    _e.sent();
                    _e.label = 30;
                case 30:
                    _c++;
                    return [3 /*break*/, 28];
                case 31:
                    console.log("Data account created: ".concat(dataAccountUrl));
                    return [4 /*yield*/, client.query(dataAccountUrl)];
                case 32:
                    dataAccountQuery = _e.sent();
                    console.log("Data account type: ".concat(dataAccountQuery.type, "\n"));
                    // Step 7: Write data to the data account
                    console.log("Step 7: Writing data to data account...");
                    exampleData = [
                        Buffer.from("Hello Accumulate!", "utf8"),
                        Buffer.from("This is example data written via API v3", "utf8"),
                        Buffer.from(JSON.stringify({ timestamp: Date.now(), message: "Test data entry" }), "utf8")
                    ];
                    txn = new core_1.Transaction({
                        header: {
                            principal: keyPageUrl,
                        },
                        body: {
                            type: "writeData",
                            entry: {
                                type: "accumulate",
                                data: exampleData,
                            },
                        },
                    });
                    return [4 /*yield*/, adiSigner.sign(txn, { timestamp: Date.now() })];
                case 33:
                    sig = _e.sent();
                    return [4 /*yield*/, client.submit({ transaction: [txn], signatures: [sig] })];
                case 34:
                    submitRes = _e.sent();
                    _d = 0, submitRes_5 = submitRes;
                    _e.label = 35;
                case 35:
                    if (!(_d < submitRes_5.length)) return [3 /*break*/, 38];
                    r = submitRes_5[_d];
                    if (!r.success) {
                        throw new Error("Submission failed: ".concat(r.message));
                    }
                    return [4 /*yield*/, waitForAll(r.status.txID)];
                case 36:
                    _e.sent();
                    _e.label = 37;
                case 37:
                    _d++;
                    return [3 /*break*/, 35];
                case 38:
                    console.log("Data written successfully!");
                    return [4 /*yield*/, client.query(dataAccountUrl, { queryType: "data" })];
                case 39:
                    dataQuery = _e.sent();
                    console.log("Data entry created:", dataQuery);
                    console.log("\n=== Example completed successfully! ===");
                    console.log("\nSummary:");
                    console.log("- Lite Identity: ".concat(lid.url.toString()));
                    console.log("- Lite Token Account: ".concat(lta.toString()));
                    console.log("- ADI Identity: ".concat(identityUrl));
                    console.log("- ADI Key Page: ".concat(keyPageUrl));
                    console.log("- Data Account: ".concat(dataAccountUrl));
                    return [2 /*return*/];
            }
        });
    });
}
function waitForAll(txid) {
    return __awaiter(this, void 0, void 0, function () {
        var r, _i, _a, record;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, waitForSingle(txid)];
                case 1:
                    r = _b.sent();
                    if (!r.produced || !r.produced.records) {
                        return [2 /*return*/];
                    }
                    _i = 0, _a = r.produced.records.filter(function (x) { return !!x; });
                    _b.label = 2;
                case 2:
                    if (!(_i < _a.length)) return [3 /*break*/, 5];
                    record = _a[_i];
                    if (!(record && record.value)) return [3 /*break*/, 4];
                    return [4 /*yield*/, waitForAll(record.value)];
                case 3:
                    _b.sent();
                    _b.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5: return [2 /*return*/, r];
            }
        });
    });
}
function waitForSingle(txid) {
    return __awaiter(this, void 0, void 0, function () {
        var i, r, error_1, err2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("Waiting for ".concat(txid));
                    i = 0;
                    _a.label = 1;
                case 1:
                    if (!(i < waitLimit)) return [3 /*break*/, 9];
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 5, , 8]);
                    return [4 /*yield*/, client.query(txid)];
                case 3:
                    r = (_a.sent());
                    if (r.status === errors_1.Status.Delivered) {
                        return [2 /*return*/, r];
                    }
                    // Status is pending or unknown
                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, waitTime); })];
                case 4:
                    // Status is pending or unknown
                    _a.sent();
                    return [3 /*break*/, 8];
                case 5:
                    error_1 = _a.sent();
                    err2 = isClientError(error_1);
                    if (!(err2.code === errors_1.Status.NotFound)) return [3 /*break*/, 7];
                    // Not found
                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, waitTime); })];
                case 6:
                    // Not found
                    _a.sent();
                    return [3 /*break*/, 8];
                case 7: throw new Error("Transaction failed: ".concat(err2.message));
                case 8:
                    i++;
                    return [3 /*break*/, 1];
                case 9: throw new Error("Transaction still missing or pending after ".concat((waitTime * waitLimit) / 1000, " seconds"));
            }
        });
    });
}
function isClientError(error) {
    if (!(error instanceof api_v3_1.RpcError))
        throw error;
    if (error.code > -33000)
        throw error;
    var err2;
    try {
        err2 = new errors_1.Error(error.data);
    }
    catch (_) {
        throw error;
    }
    if (err2.code && err2.code >= 500) {
        throw err2;
    }
    return err2;
}
// Run the example
comprehensiveExample().catch(console.error);
