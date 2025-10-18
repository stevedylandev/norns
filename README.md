# Norns

![cover](site/og.png)

Interoperable web components for decentralized applications

## Overview and Reasoning
Some of the first crypto apps we build were in React, and it's possible we might be able to resurrect some of them if we tried. However the unfortunate reality is that web dev frameworks accelerate at an alarming rate, and that goes for blockchain related libraries as well (shudders at the memory of viem v1 -> v2 and ethers v5 -> v6). It doesn't have to be like that though.

Web components are independant pieces of Javascript that can be imported to plain HTML but also frameworks as well. They're atomic, existing on their own and able to out-last any framework as long as we keep using Javscript (unfortunately I think that is the case). Some notable existing web component libraries include [Material Web](https://github.com/material-components/material-web) and [Web Awesome](https://github.com/shoelace-style/webawesome).

The goal of Norns is to provide the Ethereum ecosystem a set of simple yet powerful web components for building decentralized applications. The advantage we have today is that we've experienced good DX from modern frameworks, so we have the ability to build components that feel familiar to devs building UIs for smart contracts.

>[!NOTE]
> This project is still in early development, so if you have ideas, bugs, or feature requests, just open an issue!

## Quickstart

### 1. Initialize `norns` with your package manager of choice

```bash
npx norns-ui@latest init
```

Provide the following information as prompted:
- Path to where the components will be stored (will use `src/components` by default)
- If you want to include type definitions
  - Select framework for type defintions: `typescript`, `react`, `svelte`, `vue`

This will create a `norns.json` file in the root of your project with your selections

### 2. Add components

Using the `norns.json` the CLI will install them to the provided path in the config.

```bash
npx norns-ui@latest add connect-wallet
npx norns-ui@latest add contract-call
npx norns-ui@latest add contract-read
```

### 3. Use components

These web components should work in virtually any framework setup, whether you're in React, Vue, Svelte, or just plain HTML.

**HTML/Vanilla JS**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Norns Example</title>
</head>
<body>
  <div class="container">
    <connect-wallet chain-id="1"></connect-wallet>
  </div>
  <script src="./components/connect-wallet.js"></script>
</body>
</html>
```

**React**

```tsx
import { useEffect, useRef } from "react";
import "./components/connect-wallet";

function App() {
  const walletRef = useRef<any>(null);

  useEffect(() => {
    const walletElement = walletRef.current;
    if (!walletElement) return;

    walletElement.onWalletConnected = (detail: any) => {
      console.log("connected: ", detail);
    };
  }, []);

  return (
    <div>
      <connect-wallet chain-id="1" ref={walletRef}></connect-wallet>
    </div>
  );
}
```

**Vue**

```vue
<script setup lang="ts">
import './components/connect-wallet'
</script>

<template>
  <div>
    <connect-wallet chain-id="1"></connect-wallet>
  </div>
</template>
```

**Svelte**

```svelte
<script lang="ts">
import "./components/connect-wallet";
</script>

<main>
  <connect-wallet chain-id="1"></connect-wallet>
</main>
```

**TypeScript**

```typescript
import "./components/connect-wallet";

const wallet = document.querySelector('connect-wallet');
wallet?.addEventListener('wallet-connected', (event) => {
  console.log('Wallet connected:', event.detail);
});

document.body.innerHTML = `
  <connect-wallet chain-id="1"></connect-wallet>
`;
```

## Usage

Each component has multiple parameters that can be passed in to designate properties like chain ID, contract address, ABI, and more.

### `connect-wallet`

A Web3 wallet connection component that supports Ethereum wallet integration with ENS resolution, balance display, and multi-chain support.

**Attributes:**
- `chain-id` - Ethereum chain ID in hex or decimal format (default: `"1"` for mainnet)
- `background` - Background color (default: `"#232323"`)
- `foreground` - Text color (default: `"#ffffff"`)
- `primary` - Primary button color (default: `"#5F8787"`)
- `secondary` - Secondary/hover color (default: `"#6F9797"`)
- `border-radius` - Border radius for UI elements (default: `"4px"`)

**Events:**
- `wallet-connected` - Fired when wallet is successfully connected
- `wallet-disconnected` - Fired when wallet is disconnected
- `wallet-error` - Fired when wallet connection fails

**Example:**
```html
<connect-wallet
  chain-id="11155111"
  primary="#4F46E5"
  background="#1F2937"
  border-radius="8px">
</connect-wallet>
```

### `contract-call`

A custom HTML element for interacting with Ethereum smart contracts. Supports both read-only (view/pure) and write operations through wallet integration.

**Attributes:**
- `contract-address` (required) - The Ethereum contract address
- `method-name` (required) - The contract method to call
- `method-args` - JSON array of method arguments (default: `[]`)
- `abi` - JSON string of the contract ABI
- `abi-url` - URL to fetch the contract ABI from
- `chain-id` - Ethereum chain ID in decimal or hex format (default: `"1"` for mainnet)
- `button-text` - Text displayed on the call button (default: `"Call Contract"`)
- `background` - Background color (default: `"#232323"`)
- `foreground` - Text color (default: `"#ffffff"`)
- `primary` - Primary button color (default: `"#5F8787"`)
- `secondary` - Secondary/hover color (default: `"#6F9797"`)
- `border-radius` - Border radius for UI elements (default: `"4px"`)
- `error-color` - Color for error messages (default: `"#E78A53"`)
- `success-color` - Color for success messages (default: `"#5F8787"`)

**Events:**
- `abi-loaded` - Fired when ABI is successfully loaded from URL
- `abi-error` - Fired when ABI loading fails
- `contract-call-success` - Fired when contract call succeeds
- `contract-call-error` - Fired when contract call fails

**Example:**
```html
<contract-call
  contract-address="0x8C9EC9c13812C7F9F26AB934d4bF36206240dDA8"
  chain-id="11155111"
  method-name="increment"
  abi='[{"inputs":[],"name":"increment","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"number","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"newNumber","type":"uint256"}],"name":"setNumber","outputs":[],"stateMutability":"nonpayable","type":"function"}]'
  button-text="Increment">
</contract-call>
```

### `contract-read`

A custom HTML element for reading state from Ethereum smart contracts. Automatically loads and displays read-only contract state on mount. Supports both wallet integration and direct RPC calls.

**Attributes:**
- `contract-address` (required) - The Ethereum contract address
- `method-name` (required) - The contract method to call
- `method-args` - JSON array of method arguments (default: `[]`)
- `abi` - JSON string of the contract ABI
- `abi-url` - URL to fetch the contract ABI from
- `rpc-url` - RPC URL for direct calls (used when wallet is not available)
- `chain-id` - Ethereum chain ID in decimal or hex format (default: `"1"` for mainnet)
- `background` - Background color (default: `"#232323"`)
- `foreground` - Text color (default: `"#ffffff"`)
- `primary` - Primary color (default: `"#5F8787"`)
- `border-radius` - Border radius for UI elements (default: `"4px"`)
- `error-color` - Color for error messages (default: `"#E78A53"`)
- `success-color` - Color for success messages (default: `"#5F8787"`)

**Events:**
- `abi-loaded` - Fired when ABI is successfully loaded from URL
- `abi-error` - Fired when ABI loading fails
- `contract-read-success` - Fired when contract read succeeds
- `contract-read-error` - Fired when contract read fails

**Example:**
```html
<contract-read
  contract-address="0x8C9EC9c13812C7F9F26AB934d4bF36206240dDA8"
  chain-id="11155111"
  method-name="number"
  rpc-url="https://sepolia.drpc.org"
  abi='[{"inputs":[],"name":"increment","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"number","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"newNumber","type":"uint256"}],"name":"setNumber","outputs":[],"stateMutability":"nonpayable","type":"function"}]'
  button-text="Current Count">
</contract-read>
```

## Local Development Setup

1. Clone and install dependencies with [Bun](https://bun.sh)

```bash
git clone https://github.com/stevedylandev/norns
cd norns
bun install
```

2. Run the dev server

```bash
bun dev
```

This will run a simple server for `site/index.html` which imports components from `src/component/`

3. Build

```bash
bun run build
```

After editing components and testing them in the dev server you can run the `build` command to generate the CLI from `src/index.ts` that will create a `dist` folder. This enables users to run something like `npx norns-ui@latest init` to setup a project and add components, similar to shadcn/ui.

Examples can be found under the `examples` directory, containing pre-installed components for multiple frameworks.

## Contributing

Norns is still in early development but definitely open to contributions! Just open an issue to get the ball rolling :)

## Contact

Feel free to reach out to any of my [socials](https://stevedylan.dev/links) or [shoot me an email](mailto:contact@stevedylan.dev)
