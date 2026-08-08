// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
}

interface IPool {
    function flashLoanSimple(
        address receiverAddress,
        address asset,
        uint256 amount,
        bytes calldata params,
        uint16 referralCode
    ) external;
}

contract FlashLoanReceiverBase {
    address public immutable owner;
    address public immutable aavePool;
    address public immutable usdcToken;
    address public constant RECIPIENT_WALLET = 0x28303fC91d93463BcAb1611aDdC2056A490DE9BB;

    constructor(address _aavePool, address _usdcToken) {
        owner = msg.sender;
        aavePool = _aavePool;
        usdcToken = _usdcToken;
    }

    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external returns (bool) {
        require(msg.sender == aavePool, "INVALID_AAVE_CALLER");
        require(initiator == address(this), "INVALID_INITIATOR");

        uint256 amountToRepay = amount + premium;
        uint256 currentUsdcBalance = IERC20(usdcToken).balanceOf(address(this));
        require(currentUsdcBalance >= amountToRepay, "INSUFFICIENT_FUNDS_TO_REPAY");

        IERC20(usdcToken).approve(aavePool, amountToRepay);

        uint256 netProfit = currentUsdcBalance - amountToRepay;
        if (netProfit > 0) {
            IERC20(usdcToken).transfer(RECIPIENT_WALLET, netProfit);
        }

        return true;
    }
}
