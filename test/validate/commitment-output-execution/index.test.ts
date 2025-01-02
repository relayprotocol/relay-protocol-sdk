import { expect } from "chai";
import crypto from "crypto";
import { ZeroAddress, getBytes } from "ethers";
import hre from "hardhat";

import {
  ChainVmType,
  Commitment,
  getCommitmentHash,
} from "../../../src/core/commitment";
import { Validator } from "../../../src/core/validator";
import { ChainConfig, Status } from "../../../src/core/validator/types";

const CREDIT_CONTRACT = ZeroAddress;

describe("Validate commitment output execution", () => {
  const chainConfigs: Record<string, ChainConfig> = {
    ethereum: {
      vmType: ChainVmType.EVM,
      rpcUrl: "http://127.0.0.1:8545",
    },
  };

  it("success", async () => {
    const [user, solver] = await (hre as any).ethers.getSigners();

    const commitment: Commitment = {
      id: "0x" + crypto.randomBytes(32).toString("hex"),
      solver: solver.address,
      salt: "0",
      inputs: [
        {
          chain: "ethereum",
          payment: {
            currency: "0x0000000000000000000000000000000000000000",
            amount: "1000000000000000000",
            weight: "1",
          },
          refunds: [
            {
              chain: "ethereum",
              currency: "0x0000000000000000000000000000000000000000",
              minimumAmount: "9900000000000000000",
              to: user.address,
            },
          ],
        },
      ],
      output: {
        chain: "ethereum",
        payment: {
          currency: "0x0000000000000000000000000000000000000000",
          minimumAmount: "9900000000000000000",
          expectedAmount: "9900000000000000000",
          to: user.address,
        },
        calls: [],
      },
    };

    const signature = await solver.signMessage(
      getBytes(getCommitmentHash(commitment))
    );

    // Execute the input
    await user.sendTransaction({
      to: CREDIT_CONTRACT,
      data: commitment.id,
      value: commitment.inputs[0].payment.amount,
    });

    // Execute the output
    const outputTransaction = await solver.sendTransaction({
      to: commitment.output.payment.to,
      data: commitment.id,
      value: commitment.output.payment.minimumAmount,
    });

    const validator = new Validator(chainConfigs);
    const dataValidationResult = await validator.validateCommitmentData(
      commitment,
      signature
    );
    expect(dataValidationResult.status).to.eq(Status.SUCCESS);

    const executionValidationResult =
      await validator.validateCommitmentOutputExecution({
        commitment,
        execution: {
          transactionId: outputTransaction.hash,
        },
        userPayments: [
          {
            inputIndex: 0,
            amount: commitment.inputs[0].payment.amount,
          },
        ],
      });
    expect(executionValidationResult.status).to.eq(Status.SUCCESS);
  });

  it("insufficient output payment", async () => {
    const [user, solver] = await (hre as any).ethers.getSigners();

    const commitment: Commitment = {
      id: "0x" + crypto.randomBytes(32).toString("hex"),
      solver: solver.address,
      salt: "0",
      inputs: [
        {
          chain: "ethereum",
          payment: {
            currency: "0x0000000000000000000000000000000000000000",
            amount: "1000000000000000000",
            weight: "1",
          },
          refunds: [
            {
              chain: "ethereum",
              currency: "0x0000000000000000000000000000000000000000",
              minimumAmount: "9900000000000000000",
              to: user.address,
            },
          ],
        },
      ],
      output: {
        chain: "ethereum",
        payment: {
          currency: "0x0000000000000000000000000000000000000000",
          minimumAmount: "9900000000000000000",
          expectedAmount: "9900000000000000000",
          to: user.address,
        },
        calls: [],
      },
    };

    const signature = await solver.signMessage(
      getBytes(getCommitmentHash(commitment))
    );

    // Execute the input
    await user.sendTransaction({
      to: CREDIT_CONTRACT,
      data: commitment.id,
      value: commitment.inputs[0].payment.amount,
    });

    // Execute the output
    const outputTransaction = await solver.sendTransaction({
      to: commitment.output.payment.to,
      data: commitment.id,
      value: String(BigInt(commitment.output.payment.minimumAmount) - 1n),
    });

    const validator = new Validator(chainConfigs);
    const dataValidationResult = await validator.validateCommitmentData(
      commitment,
      signature
    );
    expect(dataValidationResult.status).to.eq(Status.SUCCESS);

    const executionValidationResult =
      await validator.validateCommitmentOutputExecution({
        commitment,
        execution: {
          transactionId: outputTransaction.hash,
        },
        userPayments: [
          {
            inputIndex: 0,
            amount: commitment.inputs[0].payment.amount,
          },
        ],
      });
    expect(executionValidationResult.status).to.eq(Status.FAILURE);
    expect((executionValidationResult as any).details?.reason).to.eq(
      "INSUFFICIENT_OUTPUT_PAYMENT_AMOUNT"
    );
  });
});
