export type QueryPagination = {
  start: number;
  count: number;
};

export type QueryOptions = {
  expand?: boolean;
  height?: number;
  prove?: boolean;
};

export type TxQueryOptions = {
  wait?: number;
  ignorePending?: boolean;
} & QueryOptions;

export type MinorBlocksQueryOptions = {
  txFetchMode?: number;
  filterSynthAnchorsOnlyBlocks?: boolean;
};
