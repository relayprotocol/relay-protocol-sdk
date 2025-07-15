import {
  Order,
  encodeOrderCall,
  decodeOrderCall,
  encodeOrderExtraData,
  decodeOrderExtraData,
  getOrderId,
} from "./order";

import {
  DepositoryDepositMessage,
  getDepositoryDepositMessageId,
} from "./messages/depository-deposit";

import {
  DepositoryWithdrawalMessage,
  DepositoryWithdrawalStatus,
  getDepositoryWithdrawalMessageId,
  encodeWithdrawal,
  decodeWithdrawal,
  getDecodedWithdrawalId,
} from "./messages/depository-withdrawal";

import {
  SolverRefundMessage,
  SolverRefundStatus,
  getSolverRefundMessageId,
} from "./messages/solver-refund";

import {
  SolverFillMessage,
  SolverFillStatus,
  getSolverFillMessageId,
} from "./messages/solver-fill";

import {
  VmType,
  decodeAddress,
  decodeTransactionId,
  encodeAddress,
  encodeBytes,
  encodeTransactionId,
} from "./utils";

import * as bitcoin from "./common/vm/bitcoin-vm";

export {
  // Order
  Order,
  encodeOrderCall,
  decodeOrderCall,
  encodeOrderExtraData,
  decodeOrderExtraData,
  getOrderId,

  // DepositoryDeposit
  DepositoryDepositMessage,
  getDepositoryDepositMessageId,

  // DepositoryWithdrawal
  DepositoryWithdrawalMessage,
  DepositoryWithdrawalStatus,
  getDepositoryWithdrawalMessageId,
  encodeWithdrawal,
  decodeWithdrawal,
  getDecodedWithdrawalId,

  // SolverRefund
  SolverRefundMessage,
  SolverRefundStatus,
  getSolverRefundMessageId,

  // SolverFill
  SolverFillMessage,
  SolverFillStatus,
  getSolverFillMessageId,

  // Utils
  VmType,
  decodeAddress,
  decodeTransactionId,
  encodeAddress,
  encodeBytes,
  encodeTransactionId,

  // VM SDK
  bitcoin,
};
