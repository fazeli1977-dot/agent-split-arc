// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import {AgentSplit} from "../AgentSplit.sol";

contract DeployAgentSplit is Script {
    function run() external returns (AgentSplit agentSplit) {
        address usdcAddress = address(0x3600000000000000000000000000000000000000);
        address treasuryAddress = address(0xf3ddb743b4f1BD8b59Bf5Bf22905555Fe5c4B7C1);
        address ownerAddress = address(0xf3ddb743b4f1BD8b59Bf5Bf22905555Fe5c4B7C1);

        vm.startBroadcast();
        agentSplit = new AgentSplit(usdcAddress, treasuryAddress, ownerAddress);
        vm.stopBroadcast();
    }
}