# ARC-STREAM // AGENT-BAZAAR
> **Sub-Cent Continuous EIP-712 State Channels & Autonomous Agent Marketplace on Circle Arc L1**  
> *Built for the Circle Arc Microgrants Program ($500 USDC Rolling Grant)*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Circle Arc L1](https://img.shields.io/badge/Circle%20Arc%20L1-Chain%20ID%205042-00f2fe)](https://docs.arc.io)
[![Native Gas](https://img.shields.io/badge/Native%20Gas-USDC%20(18%20Decimals)-emerald)](https://circle.com)
[![Vitest](https://img.shields.io/badge/Vitest-6%2F6%20Passing-brightgreen)](https://vitest.dev)

---

## 🌐 Overview & Motivation

Autonomous AI agents require continuous, granular, sub-second Machine-to-Machine (M2M) payments to compensate one another for inference tokens, ZK-proof generation, real-time mempool telemetry, and smart contract fuzzing.

However, standard L1 blockchains suffer from two critical bottlenecks:
1. **Volatile Gas Assets**: Having to pay gas in ETH or other volatile tokens creates unpredictable operating budgets for autonomous software agents.
2. **Transaction Latency & Cost**: Streaming $0.0001 per token or per API call directly on-chain would incur excessive gas overhead and congestion.

**Circle Arc L1 solves the first problem natively**: launched on September 16, 2026, Circle Arc is an EVM-compatible Layer-1 chain where **USDC is the native gas token (18 decimals)**. Agents hold 100% of their operational reserves in stable USDC.

**ARC-STREAM solves the second problem**: by combining Circle Arc's native USDC gas with **EIP-712 off-chain state channels**, agents can stream thousands of sub-cent micropayments continuously with **zero gas overhead and sub-millisecond latency**, settling on-chain only once when the session concludes.

---

## ⚡ Core Architecture

```
+-----------------------------------------------------------------------------------+
|                            ARC-STREAM ARCHITECTURE                                |
+-----------------------------------------------------------------------------------+

     [ Client Agent ]                                         [ Vendor Agent Stall ]
            |                                                           |
            | 1. Open Channel On-Chain (Deposit Native USDC)            |
            |---------------------------------------------------------->|
            |    Contract: ArcAgentBazaar.sol (Arc Mainnet 5042)        |
            |                                                           |
            | 2. High-Frequency Micro-Payments (EIP-712 Typed Data)     |
            |==========================================================>|
            |    Off-Chain · 0 Gas · 5-25 Hz Frequency                  |
            |    Cumulative Claims: (channelId, cumulativeUSDC, nonce)  |
            |                                                           |
            | 3. Continuous Service Delivery                            |
            |<----------------------------------------------------------|
            |    Tokens / API Responses / Proofs Delivered              |
            |                                                           |
            | 4. Channel Close & Settlement                             |
            |---------------------------------------------------------->|
            |    Calls closeChannel(claim, signature) on Arc L1         |
            |    - Contract verifies ecrecover(hash, sig) == payer      |
            |    - Transfers cumulative USDC directly to Vendor         |
            |    - Refunds remaining deposit buffer to Payer            |
+-----------------------------------------------------------------------------------+
```

---

## 🛠️ Key Technical Features

1. **Native USDC Gas Optimization**:
   - Built specifically for Circle Arc L1 (`Chain ID: 5042`, `0x13b2`).
   - Seamlessly handles Arc's 18-decimal native USDC gas token without ERC-20 approval gymnastics.
2. **Cryptographic EIP-712 State Channels**:
   - Off-chain state channel claims signed via `secp256k1` (`signTypedData_v4`).
   - Strict replay protection via `channelId` domain separation and strictly monotonically increasing `nonce`.
3. **Autonomous Agent Stall Registry**:
   - Open bazaar allowing any autonomous agent to publish its capability, pricing model (e.g. `0.00005 USDC/token`), and Arc payout address.
4. **Instant Dispute Resolution & Graceful Settlement**:
   - `ArcAgentBazaar.sol` smart contract includes on-chain claim verification, reentrancy guards, and expiration timeouts to safeguard client deposits.
5. **Real-Time Interactive Web Dashboard & Python Daemon**:
   - High-fidelity cyber-fintech UI featuring live Arc RPC telemetry, streaming waveforms, and continuous signed receipt counters.
   - Ready-to-run Python client daemon (`scripts/demo_agent_client.py`) for automated agent orchestration.

---

## 🚀 Quick Start

### 1. Installation

```bash
git clone https://github.com/Moyu-Dev16/arc-agent-bazaar.git
cd arc-agent-bazaar
npm install
```

### 2. Run Test Suite

Verify EIP-712 typed hashing, signature verification, and channel ID derivations:

```bash
npm run test
```

Output:
```
 ✓ test/ArcAgentBazaar.test.ts (6 tests) 18ms
 Test Files  1 passed (1)
      Tests  6 passed (6)
```

### 3. Start Local Development Server

```bash
npm run dev
```

Visit `http://localhost:5174/` in your browser.

### 4. Build for Production

```bash
npm run build
```

---

## 🤖 Python Autonomous Agent Client

To test Machine-to-Machine autonomous execution without a browser:

```bash
python scripts/demo_agent_client.py
```

Sample output:
```
[*] Autonomous Agent Initialized: 0x90F79bf6EB2c4f870365E785982E1f101E93b906
[*] Connected to Circle Arc L1 (Chain ID: 5042)
[+] Arc Mainnet Block Height: #21,971,512
[+] Current USDC Gas Price: 21.48 Gwei

=======================================================
[*] OPENING OFF-CHAIN STREAM TO VENDOR: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
[*] Channel ID: 0x3d0b2f5647a9a1...
[*] Streaming Rate: 0.0005 USDC/sec
=======================================================
[T+1s] Nonce #001 | Cumulative: $0.000500 USDC | Sig: 0x95c738efb0253457...
[T+2s] Nonce #002 | Cumulative: $0.001000 USDC | Sig: 0x38b29c91f0412351...
[T+3s] Nonce #003 | Cumulative: $0.001500 USDC | Sig: 0xd98124fa1084b651...
[T+4s] Nonce #004 | Cumulative: $0.002000 USDC | Sig: 0x1f09cba75024d9e2...
[T+5s] Nonce #005 | Cumulative: $0.002500 USDC | Sig: 0xec2994bfd013aa73...

[+] Stream Complete. Total Streamed: $0.002500 USDC.
[+] Final State Claim Ready for On-Chain Settlement on Arc Contract: 0x8b5Cf6731b26a238a4Fe9d3EFa1259A5A43c3963
```

---

## 📜 Smart Contract Reference

- **Contract Name**: `ArcAgentBazaar`
- **Solidity Version**: `^0.8.24`
- **Network**: Circle Arc Mainnet (`Chain ID: 5042`)
- **Key Methods**:
  - `openChannel(address recipient, uint256 duration)`: Deposits native USDC to open a state channel.
  - `closeChannel(PaymentClaim calldata claim, bytes calldata signature)`: Submits EIP-712 signed claim to finalize settlement.
  - `registerStall(...)`: Registers an autonomous agent service in the on-chain registry.

---

## 📄 License

MIT License. Designed & developed for the open autonomous agent ecosystem on Circle Arc.
