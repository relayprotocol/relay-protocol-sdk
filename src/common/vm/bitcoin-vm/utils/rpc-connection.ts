import { parseUnits } from "viem";
import axios from "axios";

import { UtxoItem, GetBlockReturn, GetRawTransactionReturn, IConnection } from "./types";

// This depends on the Quicknode Blockbook add-on for Bitcoin
// https://marketplace.quicknode.com/add-on/blockbook-rpc-add-on
export class RpcConnection implements IConnection {
  private rpcUrl: string;

  constructor(rpcUrl: string) {
    this.rpcUrl = rpcUrl;
  }

  private async rpc(method: string, params: any[]) {
    const { data } = await axios.post(
      `${this.rpcUrl}`,
      {
        jsonrpc: "1.0",
        id: 1,
        method,
        params,
      },
      {
        validateStatus: () => true,
      }
    );
    if (data.error || data.result?.errors) {
      throw new Error(JSON.stringify(data.error || data.result?.errors));
    }

    return data.result;
  }

  async getBalance(address: string): Promise<number> {
    if (!this.rpcUrl.includes("quiknode.pro")) {
      // When testing, we don't have access to the "bb_getaddress" rpc method
      const utxos = await this.getUtxos(address, true);
      return utxos.map((utxo) => Number(utxo.value)).reduce((a, b) => a + b, 0);
    } else {
      return this.rpc("bb_getaddress", [address, { details: "basic" }]).then((result) =>
        Number(result.balance)
      );
    }
  }

  async getBlockCount(): Promise<number> {
    return this.rpc("getblockcount", []);
  }

  async getBlockHash(height: number): Promise<string> {
    return this.rpc("getblockhash", [height]);
  }

  async getBlock(blockHash: string): Promise<GetBlockReturn> {
    return this.rpc("getblock", [blockHash]);
  }

  async getRawTransaction(txid: string): Promise<GetRawTransactionReturn> {
    const result = await this.rpc("getrawtransaction", [txid, true]);
    return {
      txid: result.txid,
      hash: result.txid,
      version: result.version,
      size: result.size,
      vsize: result.vsize,
      weight: result.weight,
      locktime: result.locktime,
      vin: result.vin.map((input: any) => ({
        txid: input.txid,
        vout: input.vout,
        scriptSig: input.scriptSig
          ? {
              asm: input.scriptSig.asm,
              hex: input.scriptSig.hex,
            }
          : undefined,
        sequence: input.sequence,
        txinwitness: input.txinwitness,
      })),
      vout: result.vout.map((output: any) => ({
        // Convert from btc to sat
        value: Number(parseUnits(Number(output.value).toFixed(8).toString(), 8).toString()),
        n: output.n,
        scriptPubKey: {
          asm: output.scriptPubKey.asm,
          hex: output.scriptPubKey.hex,
          type: output.scriptPubKey.type,
          address: output.scriptPubKey.address,
        },
      })),
      blockhash: result.blockhash,
      confirmations: result.confirmations,
      blocktime: result.blocktime,
    };
  }

  async getUtxos(address: string, confirmed = true): Promise<UtxoItem[]> {
    if (!this.rpcUrl.includes("quiknode.pro")) {
      try {
        // When testing, we don't have access to the "bb_getutxos" rpc method
        const rawResult = await this.rpc("scantxoutset", ["start", [`addr(${address})`]]);
        return rawResult.unspents.map((unspent: any) => {
          return {
            txid: unspent.txid,
            vout: unspent.vout,
            // Convert from btc to sat
            value: parseUnits(Number(unspent.amount).toFixed(8).toString(), 8).toString(),
            height: unspent.height,
            confirmations: 1,
          };
        });
      } catch (error: any) {
        if (error.message?.includes("Scan already in progres")) {
          await new Promise((resolve) => setTimeout(resolve, 3000));
          return this.getUtxos(address, confirmed);
        }

        throw error;
      }
    } else {
      return this.rpc("bb_getutxos", [
        address,
        {
          confirmed,
        },
      ]);
    }
  }

  async sendRawTransaction(hex: string) {
    return this.rpc("sendrawtransaction", [hex]);
  }

  async estimateSmartFee(blocks: number, mode: "conservative" | "economical") {
    return this.rpc("estimatesmartfee", [blocks, mode]);
  }

  async isUTXOSpent(txid: string, vout: number) {
    const result = await this.rpc("gettxout", [txid, vout]);
    return result ? false : true;
  }
}
