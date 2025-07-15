// Inspired from:
// https://github.com/me-foundation/runestone-lib/blob/main/src/rpcclient.ts

export type Vin = {
  txid: string;
  vout: number;
  scriptSig: {
    asm: string;
    hex: string;
  };
  txinwitness: string[];
  sequence: number;
};

export type Vout = {
  value: number;
  n: number;
  scriptPubKey: {
    asm: string;
    desc: string;
    hex: string;
    type: string;
    address?: string;
  };
};

export type GetBlockReturn = {
  tx: string[];
  hash: string;
  confirmations: number;
  size: number;
  strippedsize: number;
  weight: number;
  height: number;
  version: number;
  versionHex: string;
  merkleroot: string;
  time: number;
  mediantime: number;
  nonce: number;
  bits: string;
  difficulty: number;
  chainwork: string;
  nTx: number;
  previousblockhash: string;
};

export type GetRawTransactionReturn = {
  txid: string;
  hash: string;
  version: number;
  size: number;
  vsize: number;
  weight: number;
  locktime: number;
  vin: Vin[];
  vout: Vout[];
  blocktime?: number;
  confirmations?: number;
  blockhash: string;
};

export type EstimateSmartFeeReturn = {
  // Denominated in btc/kB
  feerate: number;
  blocks: number;
};

export type UtxoItem = {
  txid: string;
  vout: number;
  value: string;
  height: number;
  confirmations: number;
};

export type UtxoItemInput = {
  hash: string;
  index: number;
  value: string;
  witnessUtxo: {
    script: string;
    value: number;
  };
};

export interface IConnection {
  getBalance(address: string): Promise<number>;
  getBlockCount(): Promise<number>;
  getBlockHash(height: number): Promise<string>;
  getBlock(blockHash: string): Promise<GetBlockReturn>;
  getRawTransaction(txid: string): Promise<GetRawTransactionReturn>;
  getUtxos(address: string, confirmed?: boolean): Promise<UtxoItem[]>;
  sendRawTransaction(hex: string): Promise<string>;
  estimateSmartFee(
    blocks: number,
    mode: "conservative" | "economical"
  ): Promise<EstimateSmartFeeReturn>;
  isUTXOSpent(txid: string, vout: number): Promise<boolean>;
}
