// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract ContentAccessControl is AccessControl {
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
    }

    function addRegistrar(address account) external onlyRole(ADMIN_ROLE) {
        _grantRole(REGISTRAR_ROLE, account);
    }

    function removeRegistrar(address account) external onlyRole(ADMIN_ROLE) {
        _revokeRole(REGISTRAR_ROLE, account);
    }
}
