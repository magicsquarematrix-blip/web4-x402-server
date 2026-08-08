import { ethers } from "ethers";

export const BASE_RPC = "https://mainnet.base.org";
export const AAVE_V3_POOL = "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5";
export const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
export const WETH_BASE = "0x4200000000000000000000000000000000000006";
export const RECIPIENT_WALLET = "0x28303fC91d93463BcAb1611aDdC2056A490DE9BB";

export const AERODROME_ROUTER = "0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43";
export const UNISWAP_V3_ROUTER = "0x2626664c2603336E57B271c5C0b26F421741e481";

export class LiveArbitrageExecutor {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet | null = null;

  constructor(privateKey?: string) {
    this.provider = new ethers.JsonRpcProvider(BASE_RPC);
    if (privateKey) {
      this.wallet = new ethers.Wallet(privateKey, this.provider);
    }
  }

  public async executeLiveOnChainArbitrage(
    contractAddress: string,
    tokenAddress: string,
    borrowAmountUsdc: number = 1000
  ) {
    if (!this.wallet) {
      throw new Error("CANNOT_EXECUTE_LIVE: No Private Key configured.");
    }

    const ethBalance = await this.provider.getBalance(this.wallet.address);
    if (ethBalance === 0n) {
      return {
        success: false,
        status: "INSUFFICIENT_GAS_BALANCE",
        walletAddress: this.wallet.address,
        ethBalance: "0.0 ETH",
        message: `Execution wallet ${this.wallet.address} needs Base ETH for L2 gas.`
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

    const receiverContract = new ethers.Contract(contractAddress, receiverAbi, this.wallet);
    const borrowAmountWei = ethers.parseUnits(borrowAmountUsdc.toString(), 6);

    try {
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
      return {
        success: false,
        status: "SAFETY_REVERT_PREVENTED_LOSS",
        message: err.message
      };
    }
  }
}
