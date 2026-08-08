# web4-x402-server & CDP AgentKit Flash Loan Arbitrage Agent

Cross-DEX Atomic Arbitrage Spread & Net-Profit Oracle with CDP AgentKit Aave V3 Flash Loan Receiver on Base Mainnet.

## Protocol Architecture
- **GCP Cloud Run Service**: `web4-x402-server`
- **Live Endpoint**: `https://web4-x402-server-903824686658.us-central1.run.app/api/v1/scan-risk`
- **Payment Standard**: x402 v2 Dual Wallet (Base & Solana USDC)
- **Flash Loan Provider**: Aave V3 Pool on Base Mainnet (`0xA238Dd80C259a72e81d7e4664a9801593F98d1c5`)
- **Recipient Wallet**: `0x28303fC91d93463BcAb1611aDdC2056A490DE9BB`

## Project Modules
1. `FlashLoanActionProvider.ts`: Coinbase CDP AgentKit ActionProvider exposing `scan_x402_arbitrage_oracle` and `execute_aave_v3_flash_loan`.
2. `flashLoanArbitrageAgent.ts`: Core Flash Loan arbitrage simulation & execution orchestrator.
3. `contracts/FlashLoanReceiverBase.sol`: On-chain Aave V3 `IFlashLoanSimpleReceiver` Solidity smart contract.
4. `autonomousListener.ts`: Continuous polling daemon for automated high-frequency net-profit execution.
