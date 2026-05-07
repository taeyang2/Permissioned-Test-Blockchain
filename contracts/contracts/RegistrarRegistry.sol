// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ContentAccessControl.sol";

contract RegistrarRegistry {
    ContentAccessControl private _acl;

    struct Registrar {
        string name;
        bool isActive;
    }

    mapping(address => Registrar) public registrars;

    event RegistrarAdded(address indexed account, string name);
    event RegistrarRemoved(address indexed account);

    constructor(address aclAddress) {
        _acl = ContentAccessControl(aclAddress);
    }

    modifier onlyAdmin() {
        require(_acl.hasRole(_acl.ADMIN_ROLE(), msg.sender), "Not admin");
        _;
    }

    function addRegistrar(address account, string calldata name) external onlyAdmin {
        registrars[account] = Registrar(name, true);
        _acl.addRegistrar(account);
        emit RegistrarAdded(account, name);
    }

    function removeRegistrar(address account) external onlyAdmin {
        registrars[account].isActive = false;
        _acl.removeRegistrar(account);
        emit RegistrarRemoved(account);
    }

    function getRegistrarName(address account) external view returns (string memory) {
        return registrars[account].name;
    }
}
