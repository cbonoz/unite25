

"Let me start with a real scenario that happens thousands of times daily in crypto..."

**[Show typical crypto tip jar - single chain only]**

"Here's a popular creator's tip jar. They accept ETH on Ethereum only. But look what happens when supporters try to tip them:"

Start with: https://app.1inch.io/swap?src=1:ETH

## The Three Critical Market Gaps

**[Show infographic: Current State vs Ideal State]**

**Gap #1: Chain Fragmentation**
"Users hold assets across 20+ different blockchains - Ethereum, Base, Solana, Stellar, Polygon. But most tip jars only accept one chain. This excludes 80% of potential supporters."

**Gap #2: Token Volatility Risk**
"Creators receive random tokens - memecoins, governance tokens, volatile assets. A $100 tip in some random token could be worth $20 tomorrow. Creators need **stable value**, not speculation."

**Gap #3: Gas Fee Burden**
"Every tip requires the recipient to pay gas fees to convert to usable tokens. Small tips get eaten alive by fees. A $5 tip might cost $15 in gas to convert."

**[Show current market solutions and their failures]**
- "Traditional tip jars: Single chain only"
- "Multi-chain bridges: Manual, expensive, slow"
- "Cross-chain DEXs: Still require technical knowledge"
- "Centralized solutions: Custody risk, limited token support"

## Why 1inch is the Perfect Solution (1.5 minutes)

"Here's why 1inch's technology stack is uniquely positioned to solve this..."

**[Show 1inch technology overview]**

### 1. Fusion+ Intent-Based Architecture
"Traditional swaps require users to specify exact execution paths. Fusion+ uses **intent-based execution** - users specify what they want (USDC), solvers compete to fulfill it optimally."

**[Diagram: Intent vs Transaction-based]**
- "Intent: 'I want $10 USDC' → Solvers find best path"
- "Traditional: 'Swap 0.003 ETH to USDC via this specific pool' → Often fails"

### 2. Gasless Execution for Recipients
"Fusion+ uses a **delegated execution model**. The tipper pays gas, recipient gets tokens directly. No additional transactions needed."

**[Show gas comparison]**
- "Traditional: Tip → Receive → Pay gas to swap → Final token (3 steps, recipient pays)"
- "Fusion+: Tip → Direct USDC delivery (1 step, tipper pays)"

### 3. MEV Protection & Optimal Pricing
"Fusion+ aggregates liquidity across all DEXs and protects against MEV. Recipients get better rates than any single DEX."

**[Show price comparison chart]**
- "Uniswap direct: 1 ETH = 3,245 USDC"
- "1inch Fusion+: 1 ETH = 3,267 USDC (+$22 better)"

### 4. Comprehensive API Ecosystem
"1inch provides everything needed for a complete application:"

**[Show API integration diagram]**
- **Token Metadata API**: "Every token logo, decimal, symbol across all chains"
- **Price Feeds API**: "Real-time pricing for accurate USD calculations"
- **Wallet Balances API**: "Show users what they can actually tip with"
- **Fusion+ Swap API**: "Intent-based swaps with optimal execution"
- **Web3 API**: "Reliable transaction broadcasting"

"This isn't just a swap protocol - it's a complete infrastructure for cross-chain applications."

## The SwapJar Innovation (1 minute)

"SwapJar extends 1inch Fusion+ to solve the tipping fragmentation problem by creating the first **universal, intent-based tip jar**."

**[Show SwapJar architecture diagram]**

### Core Innovation: Cross-Chain Intent Resolution
"Instead of 'send me ETH on Ethereum', creators say 'I want USDC' and supporters can fulfill that intent from ANY chain with ANY token."

### Stellar Extension
"We extended Fusion+ principles to non-EVM chains like Stellar, preserving the intent-based execution model across different blockchain architectures."

**[Show bidirectional flow diagram]**
- "ETH → USDC (same chain Fusion+)"
- "XLM → USDC (cross-chain Fusion+ extension)"
- "USDC (Base) → USDC (Ethereum) (cross-L2 Fusion+)"

## The Result: Universal Tipping (30 seconds)

"Imagine you're a creator who wants to receive tips in stable value, but your supporters have tokens scattered across different blockchains. Today I'll show you SwapJar - the first universal tip jar that accepts ANY token from ANY chain and automatically converts it to your preferred stablecoin using 1inch Fusion+."

Part 1: Creating a Tip Jar (1 minute)
[Screen: SwapJar Homepage]

"Let me start by creating a tip jar. I'll connect my wallet..."

[Connect MetaMask wallet]

"I'll set my preferred token to USDC - this is what I want to receive regardless of what people send me."

[Fill out tip jar form]

Name: "Chris's Creator Fund"
Description: "Supporting my open source work"
Preferred token: USDC
Networks: Ethereum, Base, Stellar
"Perfect! SwapJar generates a universal link that supporters can use to tip me in ANY token."

[Show generated link] https://swapjar.vercel.app/tip/bafkreie45x6lgjxn6zgdeyxsmwiaprnol3lmw4rkho2hrh6zwoxaj4354q

Part 2: EVM Chain Demo - ETH to USDC (2 minutes)
[Open tip jar link in new tab]

"Now let's simulate a supporter who wants to tip me $10 worth of ETH from Ethereum mainnet."

[Connect different MetaMask account]

"I'll select ETH as my tip token and enter $10 worth..."

[Select ETH, enter amount]

Token: ETH (Ethereum)
Amount: 0.003 ETH (~$10)
Recipient will receive: ~$10 USDC
"Notice how SwapJar automatically calculates the USDC equivalent using 1inch price feeds. The magic happens when I click 'Send Tip' - this creates a Fusion+ order."

[Click Send Tip, show MetaMask popup]

"This single transaction uses 1inch Fusion+ to swap my ETH to USDC and send it directly to Chris's wallet. No gas fees for the recipient, no manual swapping needed."

[Complete transaction]

"Let's check the transaction on Etherscan..."

[Open Etherscan]

Show transaction hash
Point out: "ETH went in, USDC came out to recipient's address"
Demonstrate: "This used Fusion+ intent-based swaps for better prices and MEV protection"
Part 3: Stellar Integration Demo (2.5 minutes)
[Switch to Stellar wallet/browser]

"Now here's where SwapJar really shines - cross-chain tipping. Let's say I have a supporter on Stellar who wants to tip me using XLM."

[Open same tip jar link]

"I'll connect my Freighter Stellar wallet..."

[Connect Freighter wallet]

"I can send XLM from Stellar directly to this Ethereum tip jar. SwapJar automatically detects I'm on Stellar and shows Stellar assets."

[Select XLM, enter amount]

Token: XLM (Stellar)
Amount: 25 XLM (~$10)
Will convert to: ~$10 USDC on Ethereum
"This is revolutionary - we're extending Fusion+ to work with non-EVM chains. When I send this XLM..."

[Complete Stellar transaction]

"Let's check this on the Stellar blockchain..."

[Open StellarExpert or Stellar Laboratory]

Show XLM transaction from tipper to SwapJar's Stellar address
Transaction hash: [actual hash]
Amount: 25 XLM
"Now watch the magic - SwapJar's backend detects this Stellar payment and automatically:"

[Switch to backend logs/monitoring dashboard]

"Monitors the Stellar transaction confirmation"
"Bridges the value to Ethereum using Circle CCTP"
"Creates a Fusion+ swap order to convert to USDC"
"Delivers USDC to the recipient's Ethereum wallet"
[Open Etherscan for bridge transaction]

Show the resulting USDC transfer to recipient
Transaction hash: [actual hash]
Demonstrate: "XLM went in on Stellar, USDC came out on Ethereum"
Part 4: Real-time Tracking (1 minute)
[Back to tip jar interface]

"The recipient can track all tips in real-time through their dashboard..."

[Show tip jar analytics]

Recent tips: ETH tip ($10 → $10 USDC)
Recent tips: XLM tip (25 XLM → $10 USDC)
Total received: $20 USDC
Success rate: 100%
"Notice both tips, despite coming from different blockchains and different tokens, resulted in exactly the stable value the creator wanted."

Part 5: 1inch API Integration Showcase (1 minute)
[Open developer tools/API calls]

"Under the hood, SwapJar leverages multiple 1inch APIs:"

Token Metadata API: "Powers our token selection with logos and decimals"
Price Feeds API: "Real-time USD conversions for any token"
Fusion+ Swap API: "Gasless, intent-based swaps with MEV protection"
Wallet Balances API: "Shows supporter's available tokens"
Web3 API: "Our backend submits transactions through 1inch infrastructure"
[Show network requests in dev tools] "Every swap uses Fusion+ for optimal execution and no failed transactions."

Closing Impact (30 seconds)
"SwapJar solves the biggest pain points in crypto tipping:

✅ Universal compatibility - any token, any chain
✅ Stable value guarantee - no volatility risk
✅ Gasless for recipients - powered by Fusion+
✅ Cross-chain support - including non-EVM chains like Stellar
This is the future of frictionless crypto payments, powered by 1inch."

[Show final tip jar with both transactions confirmed]

Technical Deep Dive (Optional - 1 minute)
If time permits:

"For the technical audience - our Stellar integration preserves Fusion+ principles:

✅ Intent-based execution
✅ Atomic settlement guarantees
✅ Time-locked cross-chain operations
✅ Bidirectional flow (you can tip Stellar users too)
We built this as a true Fusion+ extension, not just a bridge wrapper."

Demo URLs to have ready:
Tip Jar: https://swapjar.vercel.app/tip/bafkreie45x6lgjxn6zgdeyxsmwiaprnol3lmw4rkho2hrh6zwoxaj4354q
Etherscan TX: Have actual transaction hashes ready
StellarExpert TX: Have actual Stellar transaction hashes ready
Dashboard: Recipient's view of all tips received
Total Demo Time: ~8 minutes Key Message: Universal, gasless, cross-chain tipping powered by 1inch Fusion+
