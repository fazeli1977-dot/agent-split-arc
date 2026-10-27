# AgentSplit — USDC Micropayment Protocol on Arc Network

AgentSplit is an autonomous, instant fee-splitting and micropayment distribution protocol tailored for AI agents, multi-agent workflows, and programmatic micro-settlements, built on **Arc Network**.

---

## ⚡ Overview

- **Direct Splits**: Programmatic 95% recipient / 5% platform protocol-level revenue share.
- **USDC Micropayments**: Optimized for Arc's native sub-second finality and deterministic execution.
- **Traceable Events**: Real-time on-chain telemetry emitted on every settlement (`Settled`).
- **Autonomous Ready**: Designed for agent-to-agent (A2A) microtransactions, API gating, and autonomous services.

---

## 📍 Deployed Contract Details

| Network | Arc Testnet |
| :--- | :--- |
| **Chain ID** | `5042002` |
| **Contract Address** | [`0xa0baaAc2751d95fB59566ADbf6Ca447F7745c0a4`](https://testnet.arcscan.io/address/0xa0baaAc2751d95fB59566ADbf6Ca447F7745c0a4) |
| **Native Token** | USDC (18 decimals) |

---

## 🛠 Tech Stack

- **Smart Contract**: Solidity 0.8.28, Foundry framework
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS
- **Web3 Integration**: wagmi v2, viem v2

---

## 🚀 Quickstart & Local Development

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/fazeli1977-dot/agent-split-arc.git
cd agent-split-arc
npm install

### 2. Configure Environment
Copy `.env.example` to `.env.local` and set your deployed contract address:
bash
VITE_CONTRACT_ADDRESS=0xa0baaAc2751d95fB59566ADbf6Ca447F7745c0a4

### 3. Run Foundry Tests
bash
forge test

### 4. Run Development Server
bash
npm run dev
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📄 License
MIT
