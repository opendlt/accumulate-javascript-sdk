export type QueryPagination = {
  start: number;
  count: number;
};

export type QueryOptions = {
  expandChains: boolean;
};

// TODO: re-do when things are stable on accumulated side

// export type QueryMultiResponse<T> = {
//   items: QueryResponse<T>[];
// };

// export type QueryResponse<T> = {
//   type: string;
//   mainChain: {
//     height: number;
//     roots: string[];
//   };
//   data: T;
//   chainId: string;
//   origin?: string;
//   keyPage?: {
//     height: number;
//     index: number;
//   };
//   txid?: string;
//   signer?: {
//     publicKey: string;
//     nonce: number;
//   };
//   sig?: string;
//   status?: {
//     remote: boolean;
//     delivered: boolean;
//     code: number;
//   };
//   syntheticTxids?: string[];
// };

// export type TransactionResponse = {
//   hash: string;
//   message?: string;
//   txod: string;
// };

// type ChainHeader = {
//   type: string;
//   url: string;
//   keyBook: string;
//   managerKeyBook: string;
// };

// export type LiteTokenAccount = ChainHeader & {
//   tokenUrl: string;
//   balance: number;
//   txCount?: number;
//   nonce?: number;
//   creditBalance: number;
// };
