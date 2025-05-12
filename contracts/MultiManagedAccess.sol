//SPDX-License-Identifier:MIT
pragma solidity ^0.8.28;

abstract contract MultiManagedAccess {
    uint constant MANAGER_NUMBERS = 5;
    uint immutable BACKUP_MANAGER_NUMBERS;

    address public owner;
    address[MANAGER_NUMBERS] public managers;
    bool[MANAGER_NUMBERS] public confirmed;

    constructor(address _owner, address[5] memory _managers, uint _manager_numberes) {
        require((_manager_numberes == _managers.length), "size unmatched");
        owner = _owner;
        for (uint i = 0; i < _managers.length; i++) {
            managers[i] = _managers[i];
        }
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "You are not authorized");
        _;
    }

    function allConfirmed() internal view returns (bool) {
        for (uint i = 0; i < MANAGER_NUMBERS; i++) {
            if (!confirmed[i]) {
                return false;
            }
        }
        return true;
    }

    function reset() internal {
        for (uint i = 0; i < MANAGER_NUMBERS; i++) {
            confirmed[i] = false;
        }
    }
    
    modifier onlyAllConfirmed() {
        //과제 require 조건
        require(allConfirmed(), "Not all confirmed yet");
        reset();
        _;
    }

    function confirm() external {
        bool found = false;
        for (uint i = 0; i < MANAGER_NUMBERS; i++) {
            if (managers[i] == msg.sender) {
                found = true;
                confirmed[i] = true;
                break;
            }
        }
        //과제 require 조건
        require (found, "You are not a manager");
    }
}