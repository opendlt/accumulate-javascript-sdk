import { URL } from "../new/url";

/**
 * The URL of the ACME token
 */
export const ACME_TOKEN_URL = URL.parse("acc://ACME");

/**
 * The URL of the DN
 */
export const DN_URL = URL.parse("acc://dn.acme");

/**
 * The URL of the anchors
 */
export const ANCHORS_URL = DN_URL.join("anchors");
