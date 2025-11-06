export * from "./address/index.js";
export * as api_v2 from "./api_v2/index.js";
export * as api_v3 from "./api_v3/index.js";
export * as bip44 from "./bip44/index.js";
export * as core from "./core/index.js";
export * as errors from "./errors/index.js";
export * as ledger from "./ledger/deferred.js"; // SEE BELOW
export * as merkle from "./merkle/index.js";
export * as messaging from "./messaging/index.js";
export * as network from "./network/index.js";
export * from "./signing/index.js";

import { Buffer } from "buffer";

// Ensure global Buffer is available
if (typeof window !== "undefined") {
  window.Buffer = window.Buffer || Buffer;
}

// DO NOT IMPORT ledger UNCONDITIONALLY
//
// ./ledger/deferred intentionally A) only imports types and B) only
// conditionally imports the actual code, to avoid pulling in dependencies to
// rxjs and ledger libraries unless it's actually used.
