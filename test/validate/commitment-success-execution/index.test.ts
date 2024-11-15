import { expect } from "chai";
import { getBytes } from "ethers";
import hre from "hardhat";

import {
  ChainVmType,
  Commitment,
  getCommitmentId,
} from "../../../src/core/commitment";
import { Validator } from "../../../src/core/validator";
import { ChainConfig, Status } from "../../../src/core/validator/types";

describe("Validate commitment execution", () => {
  const chainConfigs: Record<string, ChainConfig> = {
    ethereum: {
      vmType: ChainVmType.EVM,
      rpcUrl: "http://127.0.0.1:8545",
    },
  };

  it("success case", async () => {
    const [user, solver] = await hre.ethers.getSigners();

    const commitment = Commitment.from({
      solver: solver.address,
      salt: 0n,
      inputs: [
        {
          chain: "ethereum",
          payment: {
            currency: "0x0000000000000000000000000000000000000000",
            amount: 1000000000000000000n,
            to: solver.address,
            weight: 1n,
          },
          refunds: [
            {
              currency: "0x0000000000000000000000000000000000000000",
              minimumAmount: 9900000000000000000n,
              to: user.address,
            },
          ],
        },
      ],
      output: {
        chain: "ethereum",
        payment: {
          currency: "0x0000000000000000000000000000000000000000",
          minimumAmount: 9900000000000000000n,
          expectedAmount: 9900000000000000000n,
          to: user.address,
        },
        calls: [],
      },
    });

    const commitmentId = getCommitmentId(commitment);
    const signature = await solver.signMessage(getBytes(commitmentId));

    // Execute the input
    const inputTransaction = await user.sendTransaction({
      to: commitment.inputs[0].payment.to,
      data: commitmentId,
      value: commitment.inputs[0].payment.amount,
    });

    // Execute the output
    const outputTransaction = await solver.sendTransaction({
      to: commitment.output.payment.to,
      data: commitmentId,
      value: commitment.output.payment.minimumAmount,
    });

    const validator = new Validator(chainConfigs);
    const dataValidationResult = await validator.validateCommitmentData(
      commitment,
      signature
    );
    expect(dataValidationResult.status).to.eq(Status.SUCCESS);

    const executionValidationResult =
      await validator.validateCommitmentSuccessExecution(
        commitment,
        [
          {
            inputIndex: 0,
            transactionId: inputTransaction.hash,
          },
        ],
        {
          transactionId: outputTransaction.hash,
        }
      );
    expect(executionValidationResult.status).to.eq(Status.SUCCESS);
  });
});
