export type QueryPagination = {
  start: number;
  count: number;
};

export type QueryOptions = {
  expand?: boolean;
  height?: number;
  scratch?: boolean;
  prove?: boolean;
};

export type TxQueryOptions = {
  wait?: number;
  ignorePending?: boolean;
} & QueryOptions;

export type TxHistoryQueryOptions = {
  scratch?: boolean;
};

export type MinorBlocksQueryOptions = {
  txFetchMode?: string;
  blockFilterMode?: string;
};

/**
 * Options for waiting on transaction delivering.
 */
export type WaitTxOptions = {
  /**
   * Timeout after which status polling is aborted. Duration in ms.
   * Default: 30000ms (30s)
   */
  timeout?: number;
  /**
   * Interval between each tx status poll. Duration in ms.
   * Default: 500ms.
   */
  pollInterval?: number;
  /**
   * If set to true, only the user tx status is checked.
   * If set to false, will also wait on the associated synthetic txs to be delivered.
   * Default: false
   */
  ignoreSyntheticTxs?: boolean;
};

export class TxError extends Error {
  readonly txId: string;
  readonly status: any;

  constructor(txId: string, status: any) {
    super(`Failed transaction ${txId}: ${JSON.stringify(status, null, 4)}`);
    this.txId = txId;
    this.status = status;
  }
}
