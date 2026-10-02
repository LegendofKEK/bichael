// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {RulesetRegistry} from "../src/RulesetRegistry.sol";

contract RulesetRegistryTest is Test {
    RulesetRegistry reg;
    address admin = makeAddr("admin");
    address proposer = makeAddr("proposer");
    address emergency = makeAddr("emergency");
    address other = makeAddr("other");
    bytes32 constant V1 = keccak256("v1");
    bytes32 constant V2 = keccak256("v2");

    function setUp() public {
        vm.warp(1_700_000_000);
        reg = RulesetRegistry(
            address(
                new ERC1967Proxy(address(new RulesetRegistry()), abi.encodeCall(RulesetRegistry.initialize, (admin, 48 hours)))
            )
        );
        vm.startPrank(admin);
        reg.grantRole(reg.PROPOSER_ROLE(), proposer);
        reg.grantRole(reg.EMERGENCY_ROLE(), emergency);
        vm.stopPrank();
    }

    function test_propose_activatesAfterTimelock() public {
        vm.prank(proposer);
        reg.propose(V1, 48 hours, "ipfs://v1");
        assertFalse(reg.isAccepted(V1));
        vm.warp(block.timestamp + 48 hours - 1);
        assertFalse(reg.isAccepted(V1));
        vm.warp(block.timestamp + 1);
        assertTrue(reg.isAccepted(V1));
        (uint64 at,,, string memory uri) = reg.rulesets(V1);
        assertEq(at, block.timestamp);
        assertEq(uri, "ipfs://v1");
    }

    function test_propose_normalRequiresMinDelay() public {
        vm.prank(proposer);
        vm.expectRevert(RulesetRegistry.DelayTooShort.selector);
        reg.propose(V1, 48 hours - 1, "x");
    }

    function test_propose_emergencySkipsDelay_andIsLogged() public {
        vm.expectEmit(true, false, false, true, address(reg));
        emit RulesetRegistry.RulesetProposed(V1, uint64(block.timestamp), "hotfix", true);
        vm.prank(emergency);
        reg.propose(V1, 0, "hotfix");
        assertTrue(reg.isAccepted(V1));
    }

    function test_propose_onlyRoles() public {
        bytes32 role = reg.PROPOSER_ROLE(); // read before pranking: the prank applies to the next external call
        vm.prank(other);
        vm.expectRevert(abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, other, role));
        reg.propose(V1, 48 hours, "x");
    }

    function test_propose_zeroAndDuplicate() public {
        vm.startPrank(proposer);
        vm.expectRevert(RulesetRegistry.ZeroHash.selector);
        reg.propose(bytes32(0), 48 hours, "x");
        reg.propose(V1, 48 hours, "x");
        vm.expectRevert(RulesetRegistry.AlreadyProposed.selector);
        reg.propose(V1, 72 hours, "y");
        vm.stopPrank();
    }

    function test_cancel_beforeActivationOnly() public {
        vm.prank(proposer);
        reg.propose(V1, 48 hours, "x");
        vm.prank(admin);
        reg.cancel(V1);
        vm.warp(block.timestamp + 49 hours);
        assertFalse(reg.isAccepted(V1), "cancelled never activates");

        vm.prank(proposer);
        reg.propose(V2, 48 hours, "x");
        vm.warp(block.timestamp + 49 hours);
        vm.prank(admin);
        vm.expectRevert(RulesetRegistry.AlreadyActive.selector);
        reg.cancel(V2);

        vm.prank(admin);
        vm.expectRevert(RulesetRegistry.UnknownRuleset.selector);
        reg.cancel(keccak256("nope"));
        vm.prank(other);
        vm.expectRevert();
        reg.cancel(V2);
    }

    function test_retire_gracePeriod() public {
        vm.prank(emergency);
        reg.propose(V1, 0, "x");
        vm.prank(admin);
        reg.retire(V1, uint64(block.timestamp + 1 days));
        assertTrue(reg.isAccepted(V1));
        vm.warp(block.timestamp + 1 days);
        assertFalse(reg.isAccepted(V1));
    }

    function test_retire_rejections() public {
        vm.startPrank(admin);
        vm.expectRevert(RulesetRegistry.UnknownRuleset.selector);
        reg.retire(V1, uint64(block.timestamp + 1));
        vm.stopPrank();
        vm.prank(emergency);
        reg.propose(V1, 0, "x");
        vm.prank(admin);
        vm.expectRevert(RulesetRegistry.BadTime.selector);
        reg.retire(V1, uint64(block.timestamp - 1));
        vm.prank(other);
        vm.expectRevert();
        reg.retire(V1, uint64(block.timestamp + 1));
    }

    function test_unknownIsNeverAccepted() public view {
        assertFalse(reg.isAccepted(V1));
        assertFalse(reg.isAccepted(bytes32(0)));
    }

    function test_setMinDelay_adminOnly() public {
        vm.prank(other);
        vm.expectRevert();
        reg.setMinDelay(0);
        vm.prank(admin);
        reg.setMinDelay(1 hours);
        assertEq(reg.minDelay(), 1 hours);
    }

    function test_upgrade_adminOnly_andPreservesState() public {
        vm.prank(proposer);
        reg.propose(V1, 48 hours, "x");
        address impl = address(new RulesetRegistry());
        vm.prank(other);
        vm.expectRevert();
        UUPSUpgradeable(address(reg)).upgradeToAndCall(impl, "");
        vm.prank(admin);
        UUPSUpgradeable(address(reg)).upgradeToAndCall(impl, "");
        (uint64 at,,,) = reg.rulesets(V1);
        assertGt(at, 0);
    }

    function test_implementation_cannotBeInitialized() public {
        RulesetRegistry impl = new RulesetRegistry();
        vm.expectRevert();
        impl.initialize(admin, 1 hours);
    }
}
