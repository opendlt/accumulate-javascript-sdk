export { URL as AccURL } from "../new/url";
import { URL as AccURL } from "../new/url";

/**
 * The URL of the ACME token
 */
export const ACME_TOKEN_URL = AccURL.parse("acc://ACME");

/**
 * The URL of the DN
 */
export const DN_URL = AccURL.parse("acc://dn.acme");

/**
 * The URL of the anchors
 */
export const ANCHORS_URL = DN_URL.join("anchors");
