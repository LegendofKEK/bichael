// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IRulesetRegistry {
    /// True if the ruleset bundle hash is registered, past its timelock, and not retired.
    function isAccepted(bytes32 rulesetHash) external view returns (bool);
}
