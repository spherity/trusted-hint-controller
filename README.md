# Trusted Hint Controller

This repository contains a TypeScript library for creating and managing trusted hints in accordance to 
[ERC-7506](https://eips.ethereum.org/EIPS/eip-7506). A hint refers to a small piece of information that provides 
insights, aiding in the interpretation, reliability, or verifiability of decentralized ecosystem data. This library
is a light wrapper around the Viem API to make it easier to create and manage trusted hints.

## Installation

```bash
npm i @spherity/trusted-hint-controller
```

## Development

To build the library, run:

```bash
npm run build
```

This will create a `dist` folder with the compiled JavaScript for CommonJS and ES modules.

To run the tests, run:

```bash
npm run test
npm run test:integration
```

## Usage

If you just want to read data from the Trusted Hint Registry, you only need to initialize the `TrustedHintController`
with a read client. On how to create and use the clients, please refer to the [Viem documentation](https://viem.sh/docs/getting-started).

```typescript
import {TrustedHintController} from '@spherity/trusted-hint-controller';
import {createPublicClient, createWalletClient} from "viem";

const aliceAccount = privateKeyToAccount('0x...')
const bobAccount  = privateKeyToAccount('0x...')

const readClient = createPublicClient({
  chain: mainnet,
  transport: http()
})

const controller = new TrustedHintController({ readClient })

const namespace = '0x...' // address of namespace owner
const list = '0x...' // bytes32 list
const key = '0x...' // bytes32 key
const hintValue = await controller.getHint(namespace, list, key)
```

If you actually want to create or update hints, you need to initialize the `TrustedHintController` with a write client.

```typescript
import {TrustedHintController} from '@spherity/trusted-hint-controller';
import {createWalletClient} from "viem";

const aliceAccount = privateKeyToAccount('0x...')

const writeClient = createWalletClient({
  account: aliceAccount,
  chain: mainnet,
  transport: http()
})

const controller = new TrustedHintController({
  writeClient
})

const namespace = aliceAccount.address
const list = '0x...' // bytes32 list
const key = '0x...' // bytes32 key
const hintValue = '0x...' // bytes32 value

await controller.setHint(namespace, list, key, hintValue)
```

If you want to use meta transactions, you can use the `TrustedHintController` with a wallet and meta transaction client.

```typescript
import {TrustedHintController} from '@spherity/trusted-hint-controller';
import {createWalletClient} from "viem";

const aliceAccount = privateKeyToAccount('0x...')
const bobAccount = privateKeyToAccount('0x...')

const walletClient = createWalletClient({
  account: aliceAccount,
  chain: mainnet,
  transport: http()
})

const metaTransactionClient = createMetaTransactionClient({
  account: bobAccount,
  chain: mainnet,
  transport: http()
})

const controller = new TrustedHintController({
  walletClient,
  metaTransactionClient
})

const namespace = bobAccount.address
const list = '0x...' // bytes32 list
const key = '0x...' // bytes32 key
const hintValue = '0x...' // bytes32 value

// Bob signs a payload that allows alice to set a hint for him
await controller.setHintSigned(namespace, list, key, hintValue)
```
