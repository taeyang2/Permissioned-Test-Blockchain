// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ContentAccessControl.sol";
import "./RegistrarRegistry.sol";

contract ContentRegistry {
    ContentAccessControl private _acl;
    RegistrarRegistry private _registrarRegistry;

    struct ContentRecord {
        bytes32 manifestHash;
        string ipfsCid;
        string signerIdentifier;
        address registrar;
        uint256 timestamp;
        uint256 blockNumber;
    }

    mapping(bytes32 => ContentRecord[]) private _records;
    mapping(bytes32 => bool) private _registered;

    event ContentRegistered(
        bytes32 indexed contentHash,
        bytes32 indexed manifestHash,
        string ipfsCid,
        string signerIdentifier,
        address indexed registrar,
        uint256 timestamp
    );

    constructor(address aclAddress, address registrarRegistryAddress) {
        _acl = ContentAccessControl(aclAddress);
        _registrarRegistry = RegistrarRegistry(registrarRegistryAddress);
    }

    modifier onlyRegistrar() {
        require(_acl.hasRole(_acl.REGISTRAR_ROLE(), msg.sender), "Not a registrar");
        _;
    }

    function registerContent(
        bytes32 contentHash,
        bytes32 manifestHash,
        string calldata ipfsCid,
        string calldata signerIdentifier
    ) external onlyRegistrar {
        _records[contentHash].push(
            ContentRecord({
                manifestHash: manifestHash,
                ipfsCid: ipfsCid,
                signerIdentifier: signerIdentifier,
                registrar: msg.sender,
                timestamp: block.timestamp,
                blockNumber: block.number
            })
        );
        _registered[contentHash] = true;

        emit ContentRegistered(
            contentHash,
            manifestHash,
            ipfsCid,
            signerIdentifier,
            msg.sender,
            block.timestamp
        );
    }

    function isRegistered(bytes32 contentHash) external view returns (bool) {
        return _registered[contentHash];
    }

    function getLatestRecord(bytes32 contentHash) external view returns (ContentRecord memory) {
        require(_registered[contentHash], "Content not registered");
        ContentRecord[] storage recs = _records[contentHash];
        return recs[recs.length - 1];
    }

    function getAllRecords(bytes32 contentHash) external view returns (ContentRecord[] memory) {
        return _records[contentHash];
    }
}
