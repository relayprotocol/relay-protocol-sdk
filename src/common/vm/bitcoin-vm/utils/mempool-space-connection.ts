import axios from "axios";

import { UtxoItem, GetBlockReturn, GetRawTransactionReturn, IConnection } from "./types";

export class MempoolSpaceConnection implements IConnection {
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  private async request(endpoint: string, method: "GET" | "POST" = "GET", data?: any) {
    const { data: responseData } = await axios({
      url: `${this.url}${endpoint}`,
      method,
      data,
      validateStatus: () => true,
    });

    return responseData;
  }

  async getBalance(address: string): Promise<number> {
    return this.request(`/address/${address}`).then(
      (result) =>
        Number(result.chain_stats.funded_txo_sum) - Number(result.chain_stats.spent_txo_sum)
    );
  }

  async getBlockCount(): Promise<number> {
    const height = await this.request("/blocks/tip/height");
    return parseInt(height);
  }

  async getBlockHash(height: number): Promise<string> {
    const hash = await this.request(`/block-height/${height}`);
    return hash;
  }

  async getBlock(blockHash: string): Promise<GetBlockReturn> {
    const mempoolBlock = await this.request(`/block/${blockHash}`);
    const txIds = await this.request(`/block/${blockHash}/txids`);
    return {
      hash: mempoolBlock.id,
      confirmations: 1,
      strippedsize: mempoolBlock.size,
      size: mempoolBlock.size,
      weight: mempoolBlock.weight,
      height: mempoolBlock.height,
      version: mempoolBlock.version,
      versionHex: mempoolBlock.version.toString(16).padStart(8, "0"),
      merkleroot: mempoolBlock.merkle_root,
      tx: txIds,
      time: mempoolBlock.timestamp,
      // The median time is not returned by this provider
      mediantime: mempoolBlock.timestamp,
      nonce: mempoolBlock.nonce,
      bits: mempoolBlock.bits,
      difficulty: parseFloat(mempoolBlock.difficulty),
      chainwork: mempoolBlock.chainwork,
      nTx: mempoolBlock.tx_count,
      previousblockhash: mempoolBlock.previousblockhash,
    };
  }

  async getRawTransaction(txid: string): Promise<GetRawTransactionReturn> {
    const mempoolTx = await this.request(`/tx/${txid}`);
    if (typeof mempoolTx === "string") {
      throw new Error(mempoolTx);
    }

    return {
      txid: mempoolTx.txid,
      hash: mempoolTx.txid,
      version: mempoolTx.version,
      size: mempoolTx.size,
      vsize: mempoolTx.vsize,
      weight: mempoolTx.weight,
      locktime: mempoolTx.locktime,
      vin: mempoolTx.vin.map((input: any) => ({
        txid: input.txid,
        vout: input.vout,
        scriptSig: {
          asm: input.scriptsig,
          hex: input.scriptsig_asm,
        },
        sequence: input.sequence,
        txinwitness: input.witness,
      })),
      vout: mempoolTx.vout.map((output: any) => ({
        value: output.value,
        n: output.n,
        scriptPubKey: {
          asm: output.scriptpubkey_asm,
          hex: output.scriptpubkey,
          type: output.scriptpubkey_type,
          address: output.scriptpubkey_address,
        },
      })),
      blockhash: mempoolTx.status.block_hash,
      confirmations: mempoolTx.status.confirmed ? 1 : 0,
      blocktime: mempoolTx?.status?.block_time ?? undefined,
    };
  }

  async getUtxos(address: string, confirmed = true): Promise<UtxoItem[]> {
    const utxos = await this.request(`/address/${address}/utxo`);
    return (confirmed ? utxos.filter((utxo: any) => utxo.status.confirmed) : utxos).map(
      (c: any) => {
        return {
          txid: c.txid,
          vout: c.vout,
          value: String(c.value),
          height: c.status.block_height,
          confirmations: c.status.confirmed ? 1 : 0,
        };
      }
    );
  }

  async sendRawTransaction(hex: string) {
    return this.request("/tx", "POST", hex);
  }

  async estimateSmartFee(blocks: number) {
    const fees = await this.request("/v1/fees/recommended");

    let feerate: number;
    if (blocks <= 1) {
      feerate = fees.fastestFee;
    } else if (blocks <= 6) {
      feerate = fees.halfHourFee;
    } else if (blocks <= 24) {
      feerate = fees.hourFee;
    } else {
      feerate = fees.economyFee;
    }

    // Convert from sat/vB to btc/kB
    feerate = (feerate / 1e8) * 1e3;

    return {
      feerate,
      blocks,
    };
  }

  async isUTXOSpent(txid: string, vout: number) {
    const result = await this.request(`/tx/${txid}/outspend/${vout}`);
    return result.spent ? true : false;
  }
}
