import { ethers } from "ethers";

export const BASE_RPC_ENDPOINTS = [
  "https://base.gateway.tenderly.co",
  "https://1rpc.io/base",
  "https://base.drpc.org",
  "https://mainnet.base.org"
];

export const AAVE_V3_POOL = "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5";
export const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
export const RECIPIENT_WALLET = "0x28303fC91d93463BcAb1611aDdC2056A490DE9BB";

export const AERODROME_ROUTER = "0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43";
export const UNISWAP_V3_ROUTER = "0x2626664c2603336E57B271c5C0b26F421741e481";

export class LiveArbitrageExecutor {
  private privateKey?: string;

  constructor(privateKey?: string) {
    this.privateKey = privateKey;
  }

  private async getWorkingProvider(): Promise<{ provider: ethers.JsonRpcProvider; wallet: ethers.Wallet }> {
    for (const rpcUrl of BASE_RPC_ENDPOINTS) {
      try {
        const provider = new ethers.JsonRpcProvider(rpcUrl, 8453, { staticNetwork: true });
        await provider.getBlockNumber();
        if (this.privateKey) {
          const wallet = new ethers.Wallet(this.privateKey, provider);
          return { provider, wallet };
        }
      } catch (e) {
        continue;
      }
    }
    throw new Error("ALL_BASE_RPC_ENDPOINTS_FAILED");
  }

  public async executeLiveOnChainArbitrage(
    contractAddress: string,
    tokenAddress: string,
    borrowAmountUsdc: number = 1000
  ) {
    if (!this.privateKey) {
      return {
        success: false,
        status: "NO_PRIVATE_KEY",
        message: "No Private Key configured."
      };
    }

    try {
      const { provider, wallet } = await this.getWorkingProvider();
      const ethBalance = await provider.getBalance(wallet.address);

      if (ethBalance === 0n) {
        return {
          success: false,
          status: "INSUFFICIENT_GAS_BALANCE",
          walletAddress: wallet.address,
          ethBalance: "0.0 ETH",
          message: `Execution wallet ${wallet.address} needs Base ETH for L2 gas.`
        };
      }

      const abiCoder = ethers.AbiCoder.defaultAbiCoder();
      const params = abiCoder.encode(
        ["address", "address", "address", "uint256", "uint256"],
        [tokenAddress, AERODROME_ROUTER, UNISWAP_V3_ROUTER, 0, 0]
      );

      const receiverAbi = [
        "function requestFlashLoan(address asset, uint256 amount, bytes calldata params) external"
      ];

      const receiverContract = new ethers.Contract(contractAddress, receiverAbi, wallet);
      const borrowAmountWei = ethers.parseUnits(borrowAmountUsdc.toString(), 6);

      console.log(`⚡ [LIVE BROADCAST] Submitting $${borrowAmountUsdc} USDC Flash Loan onto Base Mainnet via RPC...`);
      const tx = await receiverContract.requestFlashLoan(USDC_BASE, borrowAmountWei, params, {
        gasLimit: 800000
      });
      const receipt = await tx.wait();

      return {
        success: true,
        status: "MAINNET_TRANSACTION_CONFIRMED",
        txHash: receipt.hash,
        baseScanUrl: `https://basescan.org/tx/${receipt.hash}`,
        blockNumber: receipt.blockNumber,
        recipientProfitWallet: RECIPIENT_WALLET
      };
    } catch (err: any) {
      console.warn("⚠️ Live Execution Notice:", err.message);
      return {
        success: false,
        status: "SAFETY_REVERT_OR_RPC_NOTICE",
        message: err.message
      };
    }
  }
}
