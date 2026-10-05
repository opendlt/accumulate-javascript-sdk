/* eslint-disable @typescript-eslint/no-namespace */
export * from "./enums_gen.js";
export * from "./types_gen.js";
export * from "./unions_gen.js";

import { registerMessageClass } from "./types_gen.js";
import { Message } from "./unions_gen.js";

// The generated message classes resolve the Message union lazily (a direct import would be circular).
registerMessageClass(Message);
