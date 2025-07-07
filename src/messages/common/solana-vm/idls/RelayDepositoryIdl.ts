export const RelayDepositoryIdl = {
  address: "",
  metadata: {
    name: "relay_depository",
    version: "0.1.0",
    spec: "0.1.0",
    description: "Relay depository program",
  },
  instructions: [
    {
      name: "deposit_native",
      discriminator: [13, 158, 13, 223, 95, 213, 28, 6],
      accounts: [
        {
          name: "relay_depository",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  114, 101, 108, 97, 121, 95, 100, 101, 112, 111, 115, 105, 116,
                  111, 114, 121,
                ],
              },
            ],
          },
        },
        {
          name: "sender",
          writable: true,
          signer: true,
        },
        {
          name: "depositor",
        },
        {
          name: "vault",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [118, 97, 117, 108, 116],
              },
            ],
          },
        },
        {
          name: "system_program",
          address: "11111111111111111111111111111111",
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
      name: "deposit_token",
      discriminator: [11, 156, 96, 218, 39, 163, 180, 19],
      accounts: [
        {
          name: "relay_depository",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  114, 101, 108, 97, 121, 95, 100, 101, 112, 111, 115, 105, 116,
                  111, 114, 121,
                ],
              },
            ],
          },
        },
        {
          name: "sender",
          writable: true,
          signer: true,
        },
        {
          name: "depositor",
        },
        {
          name: "vault",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [118, 97, 117, 108, 116],
              },
            ],
          },
        },
        {
          name: "mint",
        },
        {
          name: "sender_token_account",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "account",
                path: "sender",
              },
              {
                kind: "account",
                path: "token_program",
              },
              {
                kind: "account",
                path: "mint",
              },
            ],
            program: {
              kind: "const",
              value: [
                140, 151, 37, 143, 78, 36, 137, 241, 187, 61, 16, 41, 20, 142,
                13, 131, 11, 90, 19, 153, 218, 255, 16, 132, 4, 142, 123, 216,
                219, 233, 248, 89,
              ],
            },
          },
        },
        {
          name: "vault_token_account",
          writable: true,
        },
        {
          name: "token_program",
        },
        {
          name: "associated_token_program",
          address: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
        },
        {
          name: "system_program",
          address: "11111111111111111111111111111111",
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
      name: "execute_transfer",
      discriminator: [233, 126, 160, 184, 235, 206, 31, 119],
      accounts: [
        {
          name: "relay_depository",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  114, 101, 108, 97, 121, 95, 100, 101, 112, 111, 115, 105, 116,
                  111, 114, 121,
                ],
              },
            ],
          },
        },
        {
          name: "executor",
          writable: true,
          signer: true,
        },
        {
          name: "recipient",
          writable: true,
        },
        {
          name: "vault",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [118, 97, 117, 108, 116],
              },
            ],
          },
        },
        {
          name: "mint",
          optional: true,
        },
        {
          name: "recipient_token_account",
          writable: true,
          optional: true,
          pda: {
            seeds: [
              {
                kind: "account",
                path: "recipient",
              },
              {
                kind: "account",
                path: "token_program",
              },
              {
                kind: "account",
                path: "mint",
              },
            ],
            program: {
              kind: "const",
              value: [
                140, 151, 37, 143, 78, 36, 137, 241, 187, 61, 16, 41, 20, 142,
                13, 131, 11, 90, 19, 153, 218, 255, 16, 132, 4, 142, 123, 216,
                219, 233, 248, 89,
              ],
            },
          },
        },
        {
          name: "vault_token_account",
          writable: true,
          optional: true,
          pda: {
            seeds: [
              {
                kind: "account",
                path: "vault",
              },
              {
                kind: "account",
                path: "token_program",
              },
              {
                kind: "account",
                path: "mint",
              },
            ],
            program: {
              kind: "const",
              value: [
                140, 151, 37, 143, 78, 36, 137, 241, 187, 61, 16, 41, 20, 142,
                13, 131, 11, 90, 19, 153, 218, 255, 16, 132, 4, 142, 123, 216,
                219, 233, 248, 89,
              ],
            },
          },
        },
        {
          name: "used_request",
          writable: true,
        },
        {
          name: "ix_sysvar",
        },
        {
          name: "token_program",
        },
        {
          name: "associated_token_program",
          address: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
        },
        {
          name: "system_program",
          address: "11111111111111111111111111111111",
        },
      ],
      args: [
        {
          name: "request",
          type: {
            defined: {
              name: "TransferRequest",
            },
          },
        },
      ],
    },
    {
      name: "initialize",
      discriminator: [175, 175, 109, 31, 13, 152, 155, 237],
      accounts: [
        {
          name: "relay_depository",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  114, 101, 108, 97, 121, 95, 100, 101, 112, 111, 115, 105, 116,
                  111, 114, 121,
                ],
              },
            ],
          },
        },
        {
          name: "vault",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [118, 97, 117, 108, 116],
              },
            ],
          },
        },
        {
          name: "owner",
          writable: true,
          signer: true,
        },
        {
          name: "allocator",
        },
        {
          name: "system_program",
          address: "11111111111111111111111111111111",
        },
      ],
      args: [],
    },
    {
      name: "set_allocator",
      discriminator: [92, 128, 130, 234, 227, 249, 182, 17],
      accounts: [
        {
          name: "relay_depository",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  114, 101, 108, 97, 121, 95, 100, 101, 112, 111, 115, 105, 116,
                  111, 114, 121,
                ],
              },
            ],
          },
        },
        {
          name: "owner",
          signer: true,
        },
      ],
      args: [
        {
          name: "new_allocator",
          type: "pubkey",
        },
      ],
    },
    {
      name: "set_owner",
      discriminator: [72, 202, 120, 52, 77, 128, 96, 197],
      accounts: [
        {
          name: "relay_depository",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  114, 101, 108, 97, 121, 95, 100, 101, 112, 111, 115, 105, 116,
                  111, 114, 121,
                ],
              },
            ],
          },
        },
        {
          name: "owner",
          signer: true,
        },
      ],
      args: [
        {
          name: "new_owner",
          type: "pubkey",
        },
      ],
    },
  ],
  accounts: [
    {
      name: "RelayDepository",
      discriminator: [128, 53, 156, 189, 243, 83, 245, 107],
    },
    {
      name: "UsedRequest",
      discriminator: [135, 134, 110, 77, 150, 98, 180, 107],
    },
  ],
  events: [
    {
      name: "DepositEvent",
      discriminator: [120, 248, 61, 83, 31, 142, 107, 144],
    },
    {
      name: "TransferExecutedEvent",
      discriminator: [92, 10, 178, 184, 18, 44, 120, 124],
    },
  ],
  errors: [
    {
      code: 6000,
      name: "TransferRequestAlreadyUsed",
      msg: "Transfer request has already been executed",
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
    {
      code: 6008,
      name: "InvalidRecipient",
      msg: "Invalid recipient",
    },
    {
      code: 6009,
      name: "InvalidVaultTokenAccount",
      msg: "Invalid vault token account",
    },
    {
      code: 6010,
      name: "InsufficientVaultBalance",
      msg: "Vault has insufficient balance to remain rent-exempt after transfer",
    },
  ],
  types: [
    {
      name: "DepositEvent",
      type: {
        kind: "struct",
        fields: [
          {
            name: "depositor",
            type: "pubkey",
          },
          {
            name: "token",
            type: {
              option: "pubkey",
            },
          },
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
    },
    {
      name: "RelayDepository",
      type: {
        kind: "struct",
        fields: [
          {
            name: "owner",
            type: "pubkey",
          },
          {
            name: "allocator",
            type: "pubkey",
          },
          {
            name: "vault_bump",
            type: "u8",
          },
        ],
      },
    },
    {
      name: "TransferExecutedEvent",
      type: {
        kind: "struct",
        fields: [
          {
            name: "request",
            type: {
              defined: {
                name: "TransferRequest",
              },
            },
          },
          {
            name: "executor",
            type: "pubkey",
          },
          {
            name: "id",
            type: "pubkey",
          },
        ],
      },
    },
    {
      name: "TransferRequest",
      type: {
        kind: "struct",
        fields: [
          {
            name: "recipient",
            type: "pubkey",
          },
          {
            name: "token",
            type: {
              option: "pubkey",
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
    {
      name: "UsedRequest",
      type: {
        kind: "struct",
        fields: [
          {
            name: "is_used",
            type: "bool",
          },
        ],
      },
    },
  ],
};
