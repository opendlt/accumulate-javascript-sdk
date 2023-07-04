/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck

export const hasher: Promise<(data: Uint8Array) => Promise<Uint8Array>> = (async () => {
  if ("crypto" in globalThis) {
    // Browser
    return async (data) => Uint8Array.from(await crypto.subtle.digest("SHA-256", data));
  }

  // Node
  const { createHash } = await import("crypto");
  return (data) => Promise.resolve(createHash("sha256").update(data).digest());
})();
