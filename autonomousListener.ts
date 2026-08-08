import { FlashLoanArbitrageAgent } from "./flashLoanArbitrageAgent";

export interface ListenerConfig {
  pollIntervalMs: number;
  minNetProfitUsd: number;
  borrowCapitalUsd: number;
  targetTokens: string[];
}

export class AutonomousFlashLoanListener {
  private agent: FlashLoanArbitrageAgent;
  private config: ListenerConfig;
  private isRunning: boolean = false;
  private totalProfitAccumulatedUsd: number = 0;
  private successfulCyclesCount: number = 0;

  constructor(config: ListenerConfig) {
    this.config = config;
    this.agent = new FlashLoanArbitrageAgent(config.minNetProfitUsd);
  }

  public async startListening() {
    this.isRunning = true;
    let cycleIteration = 1;

    while (this.isRunning && cycleIteration <= 3) {
      for (const tokenAddress of this.config.targetTokens) {
        await this.agent.fetchOracleSignal(tokenAddress, this.config.borrowCapitalUsd);
        const cycleResult = await this.agent.runArbitrageCycle(tokenAddress, this.config.borrowCapitalUsd);

        if (cycleResult.success) {
          this.successfulCyclesCount++;
          this.totalProfitAccumulatedUsd += cycleResult.simulation.netProfitUsd;
        }
      }
      cycleIteration++;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  public stop() {
    this.isRunning = false;
  }
}
