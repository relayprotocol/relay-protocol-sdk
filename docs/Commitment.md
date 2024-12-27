## Commitment

The "commitment" represents an obligation from a solver to fulfill the request of a user. Amongst other pieces of information, this includes details such as the payment(s) the solver expects on specific input chain(s), the output payment the user expects, and the deadline for the user to make the input payment(s). The commitment data is going to be used by the offchain verification logic (eg. making sure the user payment(s) and the solver fill were correctly executed in a protocol-compliant way) and also by onchain logic in case of disputes. In order to be enforceable, every commitment must be signed by the solver it references.

Here's the full order format (with corresponding Solidity type information added as a comment to every field):

```typescript
type Commitment = {
  // The onchain identifier for the commitment, MUST be specified in the user's deposit transaction(s) and the solver's fill transaction
  // This value MUST be unique amongst all the commitments signed by any given solver
  id: string /* solidity type: bytes32 */;

  // The EVM address of the solver which will insure the request
  solver: string /* solidity type: address */;

  // The bond / insurance amount for this commitment (denominated in the currency the solver holds in escrow)
  bond: string /* solidity type: uint256 */;

  // Random salt value to ensure commitment uniqueness (not strictly needed since the above id also guarantees uniqueness)
  salt: string /* solidity type: uint256 */;

  // Deadline for the user to execute all input payments
  deadline: number /* solidity type: uint32 */;

  // A commitment can have multiple inputs, each specifying:
  inputs: {
    // - the chain of the input payment
    chain: string /* solidity type: string */;
    // - the input payment details
    payment: {
      to: string /* solidity type: string */;
      currency: string /* solidity type: string */;
      amount: string /* solidity type: uint256 */;
      weight: string /* solidity type: uint256 */;
    };
    // - a list of refund options for when the payment was sent but the solver is unable to fulfill the request
    refunds: {
      chain: string /* solidity type: string */;
      to: string /* solidity type: string */;
      currency: string /* solidity type: string */;
      minimumAmount: string /* solidity type: uint256 */;
    }[];
  }[];

  // A commitment can have a single output, specifying:
  output: {
    // - the chain of the output fill
    chain: string /* solidity type: string */;
    // - the output payment details
    payment: {
      to: string /* solidity type: string */;
      currency: string /* solidity type: string */;
      minimumAmount: string /* solidity type: uint256 */;
      expectedAmount: string /* solidity type: uint256 */;
    };
    // - a list of calls to be executed
    calls: string[] /* solidity type: string[] */;
  };

  // Extra data associated to the commitment
  extraData: string;
};
```

One detail that stands out in the above commitment format is that some of the fields have a generic `string` as their corresponding Solidity type. The explanation for that differs depending on the field:

- `to` / `currency`: the Relay protocol is compatible with any VM type, not just EVM - this means that we need to cover multiple address formats
- `chain`: same as above, in order to cover non-EVM chains, the Relay protocol uses unique chain names instead of chain ids (which are only standardized for EVM chains)
- `calls`: the format of the call is different depending on the chain's VM type, and so the calls are to be specified in a VM-specific encoding, represented as a generic `string`
  - at the moment, `calls` are only supported for EVM chains, encoded in the following way :`solidityAbiEncode((from: address, to: address, data: bytes, value: uint256)[] calls)`
