export const RelayEscrowIdl = {
  version: "0.1.0",
  name: "relay_escrow",
  instructions: [
    {
      name: "initialize",
      accounts: [
        {
          name: "relayEscrow",
          isMut: true,
          isSigner: false,
        },
        {
          name: "vault",
          isMut: true,
          isSigner: false,
        },
        {
          name: "owner",
          isMut: true,
          isSigner: true,
        },
        {
          name: "allocator",
          isMut: false,
          isSigner: false,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [],
    },
    {
      name: "setAllocator",
      accounts: [
        {
          name: "relayEscrow",
          isMut: true,
          isSigner: false,
        },
        {
          name: "owner",
          isMut: false,
          isSigner: true,
        },
      ],
      args: [
        {
          name: "newAllocator",
          type: "publicKey",
        },
      ],
    },
    {
      name: "depositSol",
      accounts: [
        {
          name: "relayEscrow",
          isMut: false,
          isSigner: false,
        },
        {
          name: "depositor",
          isMut: true,
          isSigner: true,
        },
        {
          name: "vault",
          isMut: true,
          isSigner: false,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "amount",
          type: "u64",
        },
        {
          name: "id",
          type: {
            array: ["u8", 32],
          },
        },
      ],
    },
    {
      name: "depositToken",
      accounts: [
        {
          name: "relayEscrow",
          isMut: false,
          isSigner: false,
        },
        {
          name: "depositor",
          isMut: true,
          isSigner: true,
        },
        {
          name: "mint",
          isMut: false,
          isSigner: false,
        },
        {
          name: "depositorTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "vaultTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "vault",
          isMut: false,
          isSigner: false,
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "associatedTokenProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "amount",
          type: "u64",
        },
        {
          name: "id",
          type: {
            array: ["u8", 32],
          },
        },
      ],
    },
    {
      name: "executeTransfer",
      accounts: [
        {
          name: "relayEscrow",
          isMut: false,
          isSigner: false,
        },
        {
          name: "executor",
          isMut: true,
          isSigner: true,
        },
        {
          name: "recipient",
          isMut: true,
          isSigner: false,
        },
        {
          name: "vault",
          isMut: true,
          isSigner: false,
        },
        {
          name: "mint",
          isMut: false,
          isSigner: false,
          isOptional: true,
        },
        {
          name: "vaultTokenAccount",
          isMut: true,
          isSigner: false,
          isOptional: true,
        },
        {
          name: "recipientTokenAccount",
          isMut: true,
          isSigner: false,
          isOptional: true,
        },
        {
          name: "usedRequest",
          isMut: true,
          isSigner: false,
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "associatedTokenProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "ixSysvar",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "request",
          type: {
            defined: "TransferRequest",
          },
        },
      ],
    },
  ],
  accounts: [
    {
      name: "relayEscrow",
      type: {
        kind: "struct",
        fields: [
          {
            name: "owner",
            type: "publicKey",
          },
          {
            name: "allocator",
            type: "publicKey",
          },
          {
            name: "vaultBump",
            type: "u8",
          },
        ],
      },
    },
    {
      name: "usedRequest",
      type: {
        kind: "struct",
        fields: [
          {
            name: "isUsed",
            type: "bool",
          },
        ],
      },
    },
  ],
  types: [
    {
      name: "TransferRequest",
      type: {
        kind: "struct",
        fields: [
          {
            name: "recipient",
            type: "publicKey",
          },
          {
            name: "token",
            type: {
              option: "publicKey",
            },
          },
          {
            name: "amount",
            type: "u64",
          },
          {
            name: "nonce",
            type: "u64",
          },
          {
            name: "expiration",
            type: "i64",
          },
        ],
      },
    },
  ],
  events: [
    {
      name: "TransferExecutedEvent",
      fields: [
        {
          name: "request",
          type: {
            defined: "TransferRequest",
          },
          index: false,
        },
        {
          name: "executor",
          type: "publicKey",
          index: false,
        },
        {
          name: "id",
          type: "publicKey",
          index: false,
        },
      ],
    },
    {
      name: "DepositEvent",
      fields: [
        {
          name: "depositor",
          type: "publicKey",
          index: false,
        },
        {
          name: "token",
          type: {
            option: "publicKey",
          },
          index: false,
        },
        {
          name: "amount",
          type: "u64",
          index: false,
        },
        {
          name: "id",
          type: {
            array: ["u8", 32],
          },
          index: false,
        },
      ],
    },
  ],
  errors: [
    {
      code: 6000,
      name: "RequestAlreadyUsed",
      msg: "Request has already been executed",
    },
    {
      code: 6001,
      name: "InvalidMint",
      msg: "Invalid mint",
    },
    {
      code: 6002,
      name: "Unauthorized",
      msg: "Unauthorized",
    },
    {
      code: 6003,
      name: "AllocatorSignerMismatch",
      msg: "Allocator signer mismatch",
    },
    {
      code: 6004,
      name: "MessageMismatch",
      msg: "Message mismatch",
    },
    {
      code: 6005,
      name: "MalformedEd25519Data",
      msg: "Malformed Ed25519 data",
    },
    {
      code: 6006,
      name: "MissingSignature",
      msg: "Missing signature",
    },
    {
      code: 6007,
      name: "SignatureExpired",
      msg: "Signature expired",
    },
  ],
};
