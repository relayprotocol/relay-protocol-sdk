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
} from "./messages/v2.1/depository-deposit";

import {
  DecodedBitcoinVmWithdrawal,
  DecodedEthereumVmWithdrawal,
  DecodedSolanaVmWithdrawal,
  DecodedSuiVmWithdrawal,
  DecodedHyperliquidVmWithdrawal,
  DepositoryWithdrawalMessage,
  DepositoryWithdrawalStatus,
  getDepositoryWithdrawalMessageId,
  encodeWithdrawal,
  decodeWithdrawal,
  getDecodedWithdrawalId,
  getDecodedWithdrawalCurrency,
  getDecodedWithdrawalAmount,
  getDecodedWithdrawalRecipient,
} from "./messages/v2.1/depository-withdrawal";

import {
  SolverRefundMessage,
  SolverRefundStatus,
  getSolverRefundMessageId,
} from "./messages/v2.1/solver-refund";

import {
  SolverFillMessage,
  SolverFillStatus,
  getSolverFillMessageId,
} from "./messages/v2.1/solver-fill";

import {
  ActionType,
  ExecutionMessage,
  ExecutionMessageMetadata,
  getExecutionMessageId,
  encodeAction,
  decodeAction,
} from "./messages/v2.2/execution";

import {
  VmType,
  decodeAddress,
  decodeTransactionId,
  encodeAddress,
  encodeBytes,
  encodeTransactionId,
  getVmTypeNativeCurrency,
} from "./utils";

import {
  SubmitWithdrawRequest,
  getSubmitWithdrawRequestHash,
  getWithdrawalAddress,
} from "./messages/v2.2/allocator";

export {
  // Order
  Order,
  encodeOrderCall,
  decodeOrderCall,
  encodeOrderExtraData,
  decodeOrderExtraData,
  getOrderId,

  // Utils
  VmType,
  decodeAddress,
  decodeTransactionId,
  encodeAddress,
  encodeBytes,
  encodeTransactionId,
  getVmTypeNativeCurrency,

  // Messages v2.1

  // DepositoryDeposit
  DepositoryDepositMessage,
  getDepositoryDepositMessageId,

  // DepositoryWithdrawal
  DecodedBitcoinVmWithdrawal,
  DecodedEthereumVmWithdrawal,
  DecodedSolanaVmWithdrawal,
  DecodedSuiVmWithdrawal,
  DecodedHyperliquidVmWithdrawal,
  DepositoryWithdrawalMessage,
  DepositoryWithdrawalStatus,
  getDepositoryWithdrawalMessageId,
  encodeWithdrawal,
  decodeWithdrawal,
  getDecodedWithdrawalId,
  getDecodedWithdrawalCurrency,
  getDecodedWithdrawalAmount,
  getDecodedWithdrawalRecipient,

  // SolverRefund
  SolverRefundMessage,
  SolverRefundStatus,
  getSolverRefundMessageId,

  // SolverFill
  SolverFillMessage,
  SolverFillStatus,
  getSolverFillMessageId,

  // Messages v2.2

  // Execution
  ExecutionMessage,
  ExecutionMessageMetadata,
  ActionType,
  getExecutionMessageId,
  encodeAction,
  decodeAction,

  // Allocator
  SubmitWithdrawRequest,
  getSubmitWithdrawRequestHash,
  getWithdrawalAddress,
};
