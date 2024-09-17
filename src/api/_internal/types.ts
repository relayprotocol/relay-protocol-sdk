import { z } from "zod";

const inputPaymentSchema = z.object({
  to: z.string(),
  currency: z.string(),
  amount: z.string(),
});

const outputPaymentSchema = z.object({
  to: z.string(),
  currency: z.string(),
  minAmount: z.string(),
});

const callSchema = {
  evm: z.object({
    from: z.string(),
    to: z.string(),
    data: z.string(),
    value: z.string(),
  }),
};

export const commitmentSchema = z.object({
  solver: z.string(),
  inputs: z.array(
    z.object({
      chain: z.string(),
      payment: inputPaymentSchema,
      refund: z.array(outputPaymentSchema),
    })
  ),
  output: z.object({
    chain: z.string(),
    payment: outputPaymentSchema,
    calls: z.array(callSchema.evm).optional(),
  }),
  salt: z.string(),
});
