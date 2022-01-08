export type QueryPagination = {
  start: number;
  count: number;
};

export type QueryOptions = {
  expandChains: boolean;
};

export type QueryMultiResponse<T> = {
  items: QueryResponse<T>[];
};

export type QueryResponse<T> = {
  type: string;
  merkleState: {
    count: number;
    roots: Uint8Array[];
  };
  data: T;
  origin?: string;
  keyPage?: {
    height: number;
    index: number;
  };
  txid?: string;
  signer?: {
    publicKey: string;
    nonce: number;
  };
  sig?: string;
  status?: {
    remote: boolean;
    delivered: boolean;
    code: number;
  };
  syntheticTxids?: string[];
};
