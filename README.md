# FHE Poker Frontend 🎰

Privacy-first blockchain poker frontend using React and Next.js. Play Texas Hold'em with encrypted cards powered by Fully Homomorphic Encryption (FHE).

**Powered by Zama's fhEVM technology.**

This dApp connects to the FHEPoker smart contract and provides a beautiful, cyberpunk-themed poker interface where all cards remain encrypted until showdown.

## Features

- **@zama-fhe/relayer-sdk**: Fully Homomorphic Encryption for Ethereum Virtual Machine
- **React**: Modern UI framework for building interactive interfaces
- **Next.js**: Next-generation frontend build tool
- **Tailwind**: Utility-first CSS framework for rapid UI development

## Requirements

- You need to have Metamask browser extension installed on your browser.

## Local Hardhat Network (to add in MetaMask)

Follow the step-by-step guide in the [Hardhat + MetaMask](https://docs.metamask.io/wallet/how-to/run-devnet/) documentation to set up your local devnet using Hardhat and MetaMask.

- Name: Hardhat
- RPC URL: http://127.0.0.1:8545
- Chain ID: 31337
- Currency symbol: ETH

## Install

1. Clone this repository.
2. From the repo root, run:

```sh
npm install
```

## Quickstart

1. Setup your hardhat environment variables:

Follow the detailed instructions in the [FHEVM documentation](https://docs.zama.ai/protocol/solidity-guides/getting-started/setup#set-up-the-hardhat-configuration-variables-optional) to setup `MNEMONIC` + `INFURA_API_KEY` Hardhat environment variables

2. Start a local Hardhat node (new terminal):

```sh
# Default RPC: http://127.0.0.1:8545  | chainId: 31337
npm run hardhat-node
```

3. Launch the frontend in mock mode:

```sh
npm run dev:mock
```

4. Start your browser with the Metamask extension installed and open http://localhost:3000

5. Open the Metamask extension to connect to the local Hardhat node
   i. Select Add network.
   ii. Select Add a network manually.
   iii. Enter your Hardhat Network RPC URL, http://127.0.0.1:8545 (or http://localhost:8545).
   iv. Enter your Hardhat Network chain ID, 31337 (or 0x539 in hexadecimal format).

## Run on Sepolia

1. Deploy your contract on Sepolia Testnet

```sh
npm run deploy:sepolia
```

2. In your browser open `http://localhost:3000`

3. Open the Metamask extension to connect to the Sepolia network

## Project Structure Overview

### Key Files/Folders

- **`<root>/packages/site/fhevm`**: This folder contains the essential hooks needed to interact with FHEVM-enabled smart contracts. It is meant to be easily copied and integrated into any FHEVM + React project.

- **`<root>/packages/site/hooks/useFHECounter.tsx`**: A simple React custom hook that demonstrates how to use the `useFhevm` hook in a basic use case, serving as an example of integration.

### Secondary Files/Folders

- **`<root>/packages/site/hooks/metamask`**: This folder includes hooks designed to manage the MetaMask Wallet provider. These hooks can be easily adapted or replaced to support other wallet providers, following the EIP-6963 standard,
- Additionally, the project is designed to be flexible, allowing developers to easily replace `ethers.js` with a more React-friendly library of their choice, such as `Wagmi`.

## Documentation

- [Hardhat + MetaMask](https://docs.metamask.io/wallet/how-to/run-devnet/): Set up your local devnet step by step using Hardhat and MetaMask.
- [FHEVM Documentation](https://docs.zama.ai/protocol/solidity-guides/)
- [FHEVM Hardhat](https://docs.zama.ai/protocol/solidity-guides/development-guide/hardhat)
- [@zama-fhe/relayer-sdk Documentation](https://docs.zama.ai/protocol/relayer-sdk-guides/)
- [Setting up MNEMONIC and INFURA_API_KEY](https://docs.zama.ai/protocol/solidity-guides/getting-started/setup#set-up-the-hardhat-configuration-variables-optional)
- [React Documentation](https://reactjs.org/)
- [FHEVM Discord Community](https://discord.com/invite/zama)
- [GitHub Issues](https://github.com/zama-ai/fhevm-react-template/issues)

## 📄 License

This project uses a **dual license** structure:

### FHE Poker Frontend Implementation
- **License**: Business Source License 1.1 (BSL 1.1)
- **Scope**: All frontend code (components, hooks, stores, app)
- **Commercial Use**: Requires separate licensing agreement
- **Non-Commercial Use**: Free for development, testing, research, and personal projects
- **Change Date**: 4 years from release → converts to MIT License

### Zama's fhEVM Technology
- **License**: BSD 3-Clause Clear License
- **Scope**: FHE libraries and operations (@fhevm/react, @zama-fhe/*)

📋 See [LICENSE-BSL](LICENSE-BSL) for complete terms.

**For commercial licensing inquiries**: rick@thekey.studio 
**For Zama fhEVM licensing**: https://www.zama.ai/contact
