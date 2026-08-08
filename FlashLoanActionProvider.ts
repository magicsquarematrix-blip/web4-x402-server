import { ActionProvider, CreateAction, WalletProvider } from "@coinbase/agentkit";
import { z } from "zod";
import { FlashLoanArbitrageAgent } from "./flashLoanArbitrageAgent";

export const ScanArbitrageOracleSchema = z.object({
  tokenAddress: z.string().describe("Target EVM (0x...) token contract on Base Mainnet"),
  tradeSizeUsd: z.number().default(10000).describe("Trade size in USD for arbitrage simulation")
});

export const ExecuteFlashLoanSchema = z.object({
  tokenAddress: z.string().describe("Target token contract address on Base Mainnet"),
  borrowAmountUsd: z.number().default(10000).describe("Flash loan capital amount in USD"),
  recipientWallet: z.string().default("0x28303fC91d93463BcAb1611aDdC2056A490DE9BB").describe("Recipient wallet for net profit")
});

export class FlashLoanActionProvider extends ActionProvider<WalletProvider> {
  private agent: FlashLoanArbitrageAgent;

  constructor() {
    super("flash_loan_action_provider", []);
    this.agent = new FlashLoanArbitrageAgent(5.0);
  }

  public supportsNetwork = (network: any) => network.chainId === "8453" || network.protocolFamily === "evm";

  @CreateAction({
    name: "scan_x402_arbitrage_oracle",
    description: "Queries the web4-x402-server oracle endpoint with x402 payment headers for real-time net-profit spreads.",
    schema: ScanArbitrageOracleSchema
  })
  public async scanOracle(walletProvider: WalletProvider, args: z.infer<typeof ScanArbitrageOracleSchema>): Promise<string> {
    const signal = await this.agent.fetchOracleSignal(args.tokenAddress, args.tradeSizeUsd);
    return JSON.stringify(signal, null, 2);
  }

  @CreateAction({
    name: "execute_aave_v3_flash_loan",
    description: "Simulates and triggers an atomic Aave V3 Flash Loan arbitrage transaction on Base Mainnet.",
    schema: ExecuteFlashLoanSchema
  })
  public async executeFlashLoan(walletProvider: WalletProvider, args: z.infer<typeof ExecuteFlashLoanSchema>): Promise<string> {
    const result = await this.agent.runArbitrageCycle(args.tokenAddress, args.borrowAmountUsd);
    return JSON.stringify(result, null, 2);
  }
}

export const flashLoanActionProvider = () => new FlashLoanActionProvider();
