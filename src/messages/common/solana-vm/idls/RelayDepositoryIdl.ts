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
      docs: [
        "Deposit native SOL tokens into the vault",
        "",
        "Transfers SOL from the sender to the vault and emits a deposit event.",
        "",
        "# Parameters",
        "* `ctx` - The context containing the accounts",
        "* `amount` - The amount of SOL to deposit",
        "* `id` - A unique identifier for the deposit",
        "",
        "# Returns",
        "* `Ok(())` on success",
      ],
      discriminator: [13, 158, 13, 223, 95, 213, 28, 6],
      accounts: [
        {
          name: "relay_depository",
          docs: ["The relay depository account"],
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
          docs: ["The sender of the deposit"],
          writable: true,
          signer: true,
        },
        {
          name: "depositor",
          docs: ["The account credited for the deposit"],
        },
        {
          name: "vault",
          docs: ["The vault PDA that will receive the SOL"],
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
          docs: ["The system program"],
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
      docs: [
        "Deposit SPL tokens into the vault",
        "",
        "Creates the vault's token account if needed, transfers tokens from the sender,",
        "and emits a deposit event.",
        "",
        "# Parameters",
        "* `ctx` - The context containing the accounts",
        "* `amount` - The amount of tokens to deposit",
        "* `id` - A unique identifier for the deposit",
        "",
        "# Returns",
        "* `Ok(())` on success",
      ],
      discriminator: [11, 156, 96, 218, 39, 163, 180, 19],
      accounts: [
        {
          name: "relay_depository",
          docs: ["The relay depository account"],
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
          docs: ["The sender of the deposit"],
          writable: true,
          signer: true,
        },
        {
          name: "depositor",
          docs: ["The account credited for the deposit"],
        },
        {
          name: "vault",
          docs: ["The vault PDA that will receive the tokens"],
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
          docs: ["The mint of the token being deposited"],
        },
        {
          name: "sender_token_account",
          docs: ["The sender's token account"],
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
          docs: ["The token program"],
        },
        {
          name: "associated_token_program",
          docs: ["The associated token program"],
          address: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
        },
        {
          name: "system_program",
          docs: ["The system program"],
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
      docs: [
        "Execute a transfer with allocator signature",
        "",
        "Verifies the allocator's signature, transfers tokens to the recipient,",
        "and marks the request as used.",
        "",
        "# Parameters",
        "* `ctx` - The context containing the accounts",
        "* `request` - The transfer request details and signature",
        "",
        "# Returns",
        "* `Ok(())` on success",
        "* `Err(error)` if signature is invalid or request can't be processed",
      ],
      discriminator: [233, 126, 160, 184, 235, 206, 31, 119],
      accounts: [
        {
          name: "relay_depository",
          docs: ["The relay depository account"],
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
          docs: ["The executor of the transfer"],
          writable: true,
          signer: true,
        },
        {
          name: "recipient",
          docs: ["The recipient of the transfer"],
          writable: true,
        },
        {
          name: "vault",
          docs: ["The vault PDA that will receive the tokens"],
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
          docs: ["The mint of the token being transferred"],
          optional: true,
        },
        {
          name: "recipient_token_account",
          docs: ["The recipient's token account"],
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
          docs: ["The vault's token account"],
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
          docs: [
            "The account that tracks whether a transfer request has been used",
            "",
            "This account is created for each transfer request to prevent replay attacks.",
          ],
          writable: true,
        },
        {
          name: "ix_sysvar",
          docs: ["The instruction sysvar for ed25519 verification"],
        },
        {
          name: "token_program",
          docs: ["The token program"],
        },
        {
          name: "associated_token_program",
          docs: ["The associated token program"],
          address: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
        },
        {
          name: "system_program",
          docs: ["The system program"],
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
      docs: [
        "Initialize the relay depository program with owner and allocator",
        "",
        "Creates and initializes the relay depository account with the specified",
        "owner, allocator, and calculates the domain separator for cross-chain security.",
        "",
        "# Parameters",
        "* `ctx` - The context containing the accounts",
        '* `chain_id` - The chain identifier (e.g., "solana-mainnet")',
        "",
        "# Returns",
        "* `Ok(())` on success",
      ],
      discriminator: [175, 175, 109, 31, 13, 152, 155, 237],
      accounts: [
        {
          name: "relay_depository",
          docs: [
            "The relay depository account to be initialized",
            "This is a PDA derived from the RELAY_DEPOSITORY_SEED",
          ],
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
          docs: ["PDA that will hold SOL deposits"],
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
          docs: [
            "The owner account that pays for initialization",
            "Must match the AUTHORIZED_PUBKEY",
          ],
          writable: true,
          signer: true,
        },
        {
          name: "allocator",
          docs: [
            "The allocator account that will be authorized to sign transfer requests",
          ],
        },
        {
          name: "system_program",
          address: "11111111111111111111111111111111",
        },
      ],
      args: [
        {
          name: "chain_id",
          type: "string",
        },
      ],
    },
    {
      name: "migrate_domain_separator",
      docs: [
        "Migrate an existing RelayDepository account to include the `domain_separator` field.",
        "",
        "Reallocates legacy RelayDepository accounts to add the `domain_separator` field.",
        "The existing data is preserved, and only this new field is appended in place.",
        "Only the account owner can call this once, provided sufficient SOL for rent.",
        "",
        "# Parameters",
        "* `ctx` - The context containing the accounts",
        '* `chain_id` - The chain identifier (e.g., "solana-mainnet")',
        "",
        "# Returns",
        "* `Ok(())` on success",
        "* `Err(error)` if not authorized or domain separator already set",
      ],
      discriminator: [125, 28, 21, 67, 230, 227, 107, 79],
      accounts: [
        {
          name: "relay_depository",
          docs: ["The relay depository account to migrate in-place"],
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
          docs: [
            "The owner of the relay depository (also pays for reallocation)",
          ],
          writable: true,
          signer: true,
        },
        {
          name: "system_program",
          docs: ["System program for reallocation"],
          address: "11111111111111111111111111111111",
        },
        {
          name: "ix_sysvar",
          docs: ["The instruction sysvar for reentrancy protection"],
        },
      ],
      args: [
        {
          name: "chain_id",
          type: "string",
        },
      ],
    },
    {
      name: "set_allocator",
      docs: [
        "Update the allocator public key",
        "",
        "Allows the owner to change the authorized allocator that can sign transfer requests.",
        "",
        "# Parameters",
        "* `ctx` - The context containing the accounts",
        "* `new_allocator` - The public key of the new allocator",
        "",
        "# Returns",
        "* `Ok(())` on success",
        "* `Err(error)` if not authorized",
      ],
      discriminator: [92, 128, 130, 234, 227, 249, 182, 17],
      accounts: [
        {
          name: "relay_depository",
          docs: ["The relay depository account to update"],
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
          docs: ["The owner of the relay depository"],
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
      docs: [
        "Update the owner public key",
        "",
        "Allows the current owner to transfer ownership to a new address.",
        "",
        "# Parameters",
        "* `ctx` - The context containing the accounts",
        "* `new_owner` - The public key of the new owner",
        "",
        "# Returns",
        "* `Ok(())` on success",
        "* `Err(error)` if not authorized",
      ],
      discriminator: [72, 202, 120, 52, 77, 128, 96, 197],
      accounts: [
        {
          name: "relay_depository",
          docs: ["The relay depository account to update"],
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
          docs: ["The current owner of the relay depository"],
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
      name: "InvalidTokenProgram",
      msg: "Invalid token program",
    },
    {
      code: 6003,
      name: "Unauthorized",
      msg: "Unauthorized",
    },
    {
      code: 6004,
      name: "AllocatorSignerMismatch",
      msg: "Allocator signer mismatch",
    },
    {
      code: 6005,
      name: "MessageMismatch",
      msg: "Message mismatch",
    },
    {
      code: 6006,
      name: "MalformedEd25519Data",
      msg: "Malformed Ed25519 data",
    },
    {
      code: 6007,
      name: "MissingSignature",
      msg: "Missing signature",
    },
    {
      code: 6008,
      name: "SignatureExpired",
      msg: "Signature expired",
    },
    {
      code: 6009,
      name: "InvalidRecipient",
      msg: "Invalid recipient",
    },
    {
      code: 6010,
      name: "InvalidVaultTokenAccount",
      msg: "Invalid vault token account",
    },
    {
      code: 6011,
      name: "InsufficientVaultBalance",
      msg: "Vault has insufficient balance to remain rent-exempt after transfer",
    },
    {
      code: 6012,
      name: "InvalidDomainSeparator",
      msg: "Invalid domain separator",
    },
    {
      code: 6013,
      name: "DomainSeparatorAlreadySet",
      msg: "Domain separator already set",
    },
    {
      code: 6014,
      name: "InvalidVaultAddress",
      msg: "Invalid vault address",
    },
    {
      code: 6015,
      name: "AccountWriteFailed",
      msg: "Failed to write account data",
    },
    {
      code: 6016,
      name: "InvalidRelayDepositoryPDA",
      msg: "Invalid RelayDepository PDA",
    },
    {
      code: 6017,
      name: "MalformedAccount",
      msg: "Malformed account data",
    },
    {
      code: 6018,
      name: "InvalidAccountDiscriminator",
      msg: "Invalid account discriminator",
    },
    {
      code: 6019,
      name: "ReentrancyDetected",
      msg: "Reentrancy detected",
    },
    {
      code: 6020,
      name: "InvalidAccountSize",
      msg: "Invalid account size for migration",
    },
  ],
  types: [
    {
      name: "DepositEvent",
      docs: ["Event emitted when a deposit is made"],
      type: {
        kind: "struct",
        fields: [
          {
            name: "depositor",
            docs: ["The public key of the depositor"],
            type: "pubkey",
          },
          {
            name: "token",
            docs: [
              "The token mint (None for native SOL, Some(mint) for SPL tokens)",
            ],
            type: {
              option: "pubkey",
            },
          },
          {
            name: "amount",
            docs: ["The amount deposited"],
            type: "u64",
          },
          {
            name: "id",
            docs: ["A unique identifier for the deposit"],
            type: {
              array: ["u8", 32],
            },
          },
        ],
      },
    },
    {
      name: "RelayDepository",
      docs: [
        "Relay depository account that stores configuration and state",
        "",
        "This account is a PDA derived from the `RELAY_DEPOSITORY_SEED` and",
        "contains the ownership and allocation information.",
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "owner",
            docs: ["The owner of the relay depository who can update settings"],
            type: "pubkey",
          },
          {
            name: "allocator",
            docs: ["The authorized allocator that can sign transfer requests"],
            type: "pubkey",
          },
          {
            name: "vault_bump",
            docs: [
              "The bump seed for the vault PDA, used for deriving the vault address",
            ],
            type: "u8",
          },
          {
            name: "domain_separator",
            docs: [
              "Expected domain separator hash for this deployment (Optional for upgrade compatibility)",
            ],
            type: {
              option: {
                array: ["u8", 32],
              },
            },
          },
        ],
      },
    },
    {
      name: "TransferExecutedEvent",
      docs: ["Event emitted when a transfer is executed"],
      type: {
        kind: "struct",
        fields: [
          {
            name: "request",
            docs: ["The transfer request that was executed"],
            type: {
              defined: {
                name: "TransferRequest",
              },
            },
          },
          {
            name: "executor",
            docs: ["The public key of the executor who processed the transfer"],
            type: "pubkey",
          },
          {
            name: "id",
            docs: ["The unique identifier for the used request account"],
            type: "pubkey",
          },
        ],
      },
    },
    {
      name: "TransferRequest",
      docs: [
        "Structure representing a transfer request signed by the allocator",
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "domain",
            docs: ["Domain separator"],
            type: {
              array: ["u8", 32],
            },
          },
          {
            name: "recipient",
            docs: ["The recipient of the transfer"],
            type: "pubkey",
          },
          {
            name: "token",
            docs: [
              "The token mint (None for native SOL, Some(mint) for SPL tokens)",
            ],
            type: {
              option: "pubkey",
            },
          },
          {
            name: "amount",
            docs: ["The amount to transfer"],
            type: "u64",
          },
          {
            name: "nonce",
            docs: ["A unique nonce"],
            type: "u64",
          },
          {
            name: "expiration",
            docs: ["The expiration timestamp for the request"],
            type: "i64",
          },
          {
            name: "vault_address",
            docs: ["The vault address that funds will be withdrawn from"],
            type: "pubkey",
          },
        ],
      },
    },
    {
      name: "UsedRequest",
      docs: [
        "Account that tracks whether a transfer request has been used",
        "",
        "This account is created for each transfer request to prevent replay attacks.",
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "is_used",
            docs: ["Flag indicating whether the request has been processed"],
            type: "bool",
          },
        ],
      },
    },
  ],
};
