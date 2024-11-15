import { expect } from "chai";
import { getBytes } from "ethers";
import hre from "hardhat";

import {
  CallEvm,
  ChainVmType,
  Commitment,
  getCommitmentId,
  Input,
  InputPayment,
  Output,
  OutputPayment,
  RefundPayment,
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

  const createCommitment = (data: Commitment) =>
    new Commitment(
      data.solver,
      data.salt,
      data.inputs.map(
        (input) =>
          new Input(
            input.chain,
            new InputPayment(
              input.payment.to,
              input.payment.currency,
              input.payment.amount,
              input.payment.weight
            ),
            input.refunds.map(
              (refund) =>
                new RefundPayment(
                  refund.to,
                  refund.currency,
                  refund.minimumAmount
                )
            )
          )
      ),
      new Output(
        data.output.chain,
        new OutputPayment(
          data.output.payment.to,
          data.output.payment.currency,
          data.output.payment.minimumAmount,
          data.output.payment.expectedAmount
        ),
        data.output.calls.map(
          (call) =>
            new CallEvm(
              (call as CallEvm).from,
              (call as CallEvm).to,
              (call as CallEvm).data,
              (call as CallEvm).value
            )
        )
      )
    );

  it("success case", async () => {
    const [user, solver] = await hre.ethers.getSigners();

    const commitment = createCommitment({
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
