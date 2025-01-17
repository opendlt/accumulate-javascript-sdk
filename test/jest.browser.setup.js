/* eslint-disable @typescript-eslint/no-var-requires */
const { TextEncoder, TextDecoder } = require("util");

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Add any other browser globals you might need
global.Buffer = global.Buffer || require("buffer").Buffer;
