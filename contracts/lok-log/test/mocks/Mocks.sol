// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {IERC1155Receiver} from "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

contract MockKEK is ERC20 {
    constructor() ERC20("KEK", "KEK") {}

    function mint(address to, uint256 amt) external {
        _mint(to, amt);
    }
}

contract MockItems is ERC1155 {
    mapping(address => bool) public minters;

    constructor() ERC1155("") {
        minters[msg.sender] = true;
    }

    function setMinter(address m, bool ok) external {
        minters[m] = ok;
    }

    function mint(address to, uint256 id, uint256 amt) external {
        require(minters[msg.sender], "not minter");
        _mint(to, id, amt, "");
    }

    function burn(address from, uint256 id, uint256 amt) external {
        require(minters[msg.sender], "not minter");
        _burn(from, id, amt);
    }
}

/// Charges a 1% fee on every transfer: must be rejected by the vault (would desync custody from the in-game counter).
contract MockFeeToken is ERC20 {
    constructor() ERC20("FEE", "FEE") {}

    function mint(address to, uint256 amt) external {
        _mint(to, amt);
    }

    function _update(address from, address to, uint256 value) internal override {
        if (from != address(0) && to != address(0)) {
            uint256 fee = value / 100;
            super._update(from, address(0), fee);
            value -= fee;
        }
        super._update(from, to, value);
    }
}

/// Owns a character and re-enters Crafting from the 1155 receive hook.
contract ReentrantPlayer is IERC1155Receiver {
    address public target;
    bytes public reenterData;

    function arm(address target_, bytes calldata data) external {
        target = target_;
        reenterData = data;
    }

    function call(address to, uint256 value, bytes calldata data) external payable returns (bytes memory) {
        (bool ok, bytes memory ret) = to.call{value: value}(data);
        if (!ok) {
            assembly {
                revert(add(ret, 32), mload(ret))
            }
        }
        return ret;
    }

    function onERC1155Received(address, address, uint256, uint256, bytes calldata) external returns (bytes4) {
        if (target != address(0)) {
            (bool ok, bytes memory ret) = target.call(reenterData);
            if (!ok) {
                assembly {
                    revert(add(ret, 32), mload(ret))
                }
            }
        }
        return IERC1155Receiver.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(address, address, uint256[] calldata, uint256[] calldata, bytes calldata)
        external
        pure
        returns (bytes4)
    {
        return IERC1155Receiver.onERC1155BatchReceived.selector;
    }

    function supportsInterface(bytes4 id) external pure returns (bool) {
        return id == type(IERC1155Receiver).interfaceId || id == type(IERC165).interfaceId;
    }

    receive() external payable {}
}
