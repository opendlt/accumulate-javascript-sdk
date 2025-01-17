import { Buffer } from "buffer";
import { TextDecoder, TextEncoder } from "util";

(global as any).TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder;

// Add any other browser globals you might need
(global as any).Buffer = (global as any).Buffer || Buffer;
