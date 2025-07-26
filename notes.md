<p align='center'>
  <img src="" width=400 />
</p>


# 🪙 SwapJar

**Receive tips in *any* token from *any* chain, automatically swapped to your favorite stablecoin via 1inch Fusion+.**

SwapJar is a crypto-native tip jar generator for creators, freelancers, and DAOs. With one simple link, anyone can send tips in any token — even from non-EVM chains like **Stellar** — and the receiver will automatically get their chosen **stablecoin** (USDC, DAI, etc.) using **1inch Fusion+** swaps.

<!-- ### Discussion of existing solutions and why they fall short -->

Current tipping solutions in crypto face several critical limitations:

- **Single-chain constraint**: Most tip jars only accept tokens from one blockchain, forcing users to hold specific assets or pay bridge fees manually
- **Token volatility risk**: Recipients often receive volatile tokens (ETH, random memecoins) instead of stable value, creating unwanted exposure
- **High gas costs**: Traditional swaps require recipients to pay gas fees to convert tips to stablecoins, eating into small tip amounts
- **Poor UX for non-crypto users**: Supporters need to understand specific tokens, networks, and wallet management
- **Limited cross-chain support**: No seamless way for users on non-EVM chains (like Stellar) to tip EVM users
- **Manual conversion overhead**: Recipients must manually swap each tip, creating friction and ongoing maintenance

### Solution

SwapJar solves these problems by creating a **universal, gasless tipping experience** powered by 1inch Fusion+:

**🎯 One Link, Any Token**: Recipients create a single shareable link that accepts tips in ANY token from multiple chains (Ethereum, Base, Optimism, Stellar), removing blockchain complexity for supporters.

**⚡ Gasless Auto-Swaps**: Using 1inch Fusion+, all incoming tips are automatically swapped to the recipient's preferred stablecoin without them paying any gas fees, ensuring they keep 100% of the tip value.

**🌉 Cross-Chain Bridge Integration**: We extended Fusion+ capabilities to support Stellar by integrating Circle CCTP and Allbridge, allowing XLM and Stellar USDC holders to seamlessly tip EVM users.

**💰 Stable Value Guarantee**: Recipients always receive stablecoins (USDC, DAI, USDT), eliminating volatility risk and providing predictable value.

**🔄 Intent-Based Architecture**: Leveraging Fusion+ intent-based swaps means better prices, MEV protection, and no failed transactions due to slippage.

### Challenges we ran into

**Cross-Chain Complexity**: Integrating Stellar with EVM chains required building custom bridge monitoring and CCTP integration. We had to handle different transaction finality models and ensure atomic cross-chain operations.

**Fusion+ Integration**: Working with intent-based swaps required understanding the order flow and properly handling order settlement timing. We needed to build robust monitoring to track order status and handle edge cases.

**Gas Optimization**: Even though Fusion+ is gasless for users, our backend relay service needed to optimize gas costs for posting intents and bridging operations while maintaining profitability.

**Wallet UX**: Supporting both EVM (WalletConnect) and Stellar (Freighter) wallets in a single interface required careful state management and error handling for different wallet connection patterns.

**Real-time Updates**: Building a responsive UI that shows swap progress across multiple chains and APIs required implementing WebSocket connections and proper state synchronization.

---


## 🚀 Live Demo

[https://swapjar.xyz](https://swapjar.xyz) *(placeholder)*

Try sending a tip → watch it get swapped → recipient receives a stablecoin in real time.

---

## 🎯 Project Goals

- Create a production-ready **tip jar app** powered by 1inch
- Use as many **1inch APIs** as possible: Fusion+ Swap, Price Feeds, Token Metadata, Wallet Balances, Web3
- **Extend Fusion+ cross-chain swap support** to **Stellar**
- Offer a simple and gas-efficient tipping experience for both EVM and non-EVM users

---


## 🏆 Prize Tracks

- ✅ **1inch – Full dApp using APIs**
- ✅ **1inch – Fusion+ Extension (non-EVM chain: Stellar)**

---

## 🧱 Tech Stack

| Layer       | Tech                              |
|-------------|-----------------------------------|
| Frontend    | React + Tailwind                  |
| Backend     | Node.js / Fastify                 |
| Blockchain  | Ethereum (Base, Optimism), Stellar |
| API Integration | 1inch Fusion+, Price Feeds, Metadata, Balances, Web3 |
| Cross-chain Bridge | Circle CCTP (USDC), Allbridge |
| Wallet      | EVM WalletConnect + Stellar Freighter |
| Infra       | Vercel + Express backend relay    |

---

## 🔄 How It Works

### ✨ 1. User Creates a Tip Jar
- Sets wallet address, preferred stablecoin
- Generates shareable link (e.g., `https://swapjar.xyz/j/chris`)

### 💸 2. Supporter Sends Tip
- Supports *any* ERC-20 token from Ethereum, Optimism, Base
- Supports **USDC or XLM from Stellar**

### 🔁 3. Tokens Swapped Automatically
- **EVM tokens** are swapped via **1inch Fusion+** into stablecoin
- **Stellar payments** are bridged to EVM (via Circle CCTP), then swapped via Fusion+

### ✅ 4. Receiver Gets Stablecoin
- Recipient receives stablecoin (e.g., USDC) in their wallet

---

## 🔌 1inch APIs Used

| API                  | Use                                                |
|----------------------|-----------------------------------------------------|
| `Fusion+ Swap API`   | Used to create gasless, intent-based swaps          |
| `Token Metadata API` | Shows logos, symbols, decimals                      |
| `Price Feeds API`    | Used to calculate tip equivalent (e.g., $10 in any token) |
| `Wallet Balances API`| Display real-time wallet status                    |
| `Web3 API`           | Submit Fusion+ swap transactions from backend or relayer |

---

## 🌉 Fusion+ Extension: Stellar Integration

We built a **Fusion+ extension** that allows users on **Stellar** to tip EVM users with XLM or USDC. Our backend:

- Monitors Stellar wallets for incoming payments
- Bridges to Ethereum using **Circle CCTP** (USDC) or **Allbridge**
- Posts swap intents via **1inch Fusion+**
- Confirms swap and notifies the recipient

---

## 📁 Project Structure

```bash
/apps
  /swap-jar    # Next.js dApp
  # /backend     # Fastify backend for relayer + monitoring
/libs
  /1inch       # Abstractions for API integration
  /stellar     # Stellar SDK integration
/scripts
  /bridge-watcher.js
```

### Useful links
* https://ethglobal.com/events/unite/prizes#1inch
* https://portal.1inch.dev/documentation/overview

### Screenshots
