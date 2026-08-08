import express from "express";
import { FlashLoanArbitrageAgent } from "./flashLoanArbitrageAgent";
import { LiveArbitrageExecutor } from "./liveArbitrageExecutor";

export interface ListenerConfig {
  pollIntervalMs: number;
  minNetProfitUsd: number;
  borrowCapitalUsd: number;
  targetTokens: string[];
}

export class AutonomousFlashLoanListener {
  private agent: FlashLoanArbitrageAgent;
  private executor: LiveArbitrageExecutor;
  private config: ListenerConfig;
  private isRunning: boolean = false;
  private totalProfitAccumulatedUsd: number = 0;
  private successfulCyclesCount: number = 0;
  private liveTxHashes: string[] = [];

  constructor(config: ListenerConfig, privateKey?: string) {
    this.config = config;
    this.agent = new FlashLoanArbitrageAgent(config.minNetProfitUsd);
    this.executor = new LiveArbitrageExecutor(privateKey || process.env.PRIVATE_KEY);
  }

  public async startListening() {
    this.isRunning = true;
    let cycleIteration = 1;

    while (this.isRunning) {
      for (const tokenAddress of this.config.targetTokens) {
        await this.agent.fetchOracleSignal(tokenAddress, this.config.borrowCapitalUsd);
        const cycleResult = await this.agent.runArbitrageCycle(tokenAddress, this.config.borrowCapitalUsd);

        if (cycleResult.success) {
          this.successfulCyclesCount++;
          this.totalProfitAccumulatedUsd += cycleResult.simulation.netProfitUsd;

          if (process.env.LIVE_MODE === "true" && process.env.CONTRACT_ADDRESS) {
            const liveRes = await this.executor.executeLiveOnChainArbitrage(
              process.env.CONTRACT_ADDRESS,
              tokenAddress,
              this.config.borrowCapitalUsd
            );
            if (liveRes.success && liveRes.txHash) {
              this.liveTxHashes.push(liveRes.txHash);
            }
          }
        }
      }
      cycleIteration++;
      await new Promise((resolve) => setTimeout(resolve, this.config.pollIntervalMs));
    }
  }

  public stop() {
    this.isRunning = false;
  }

  public getStatus() {
    return {
      status: this.isRunning ? "RUNNING" : "STOPPED",
      mode: process.env.LIVE_MODE === "true" ? "LIVE_MAINNET_EXECUTION" : "PRE_FLIGHT_SIMULATION",
      successfulCyclesCount: this.successfulCyclesCount,
      totalProfitAccumulatedUsd: this.totalProfitAccumulatedUsd,
      liveTxHashesCount: this.liveTxHashes.length,
      liveTxHashes: this.liveTxHashes,
      botExecutionWallet: "0xF2208d857a843A50340465a31899AE3E8eB694b2",
      recipientProfitWallet: "0x28303fC91d93463BcAb1611aDdC2056A490DE9BB",
      timestamp: new Date().toISOString()
    };
  }
}

const app = express();
const port = process.env.PORT || 8080;

const listener = new AutonomousFlashLoanListener({
  pollIntervalMs: 5000,
  minNetProfitUsd: 5.0,
  borrowCapitalUsd: 10000,
  targetTokens: [
    "0x4200000000000000000000000000000000000006",
    "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
  ]
}, process.env.PRIVATE_KEY);

app.get("/health", (req, res) => {
  res.status(200).json(listener.getStatus());
});

app.get("/", (req, res) => {
  res.status(200).json(listener.getStatus());
});

app.listen(port, () => {
  listener.startListening().catch(console.error);
});
