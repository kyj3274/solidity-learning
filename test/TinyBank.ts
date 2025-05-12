import hre from "hardhat"
import { expect } from "chai"
import { DECIMALS, MINTING_AMOUNT} from "./constant"
import { MyToken, TinyBank } from "../typechain-types"
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers"

describe("TinyBank", () => {
    let signers: HardhatEthersSigner[];
    let myTokenC: MyToken;
    let tinyBankC: TinyBank;
    beforeEach(async () => {
    signers = await hre.ethers.getSigners();
    //생성자 변경한 것 반영 -> owner와 managers에 signer삽입
    myTokenC = await hre.ethers.deployContract("MyToken", [
        "MyToken",
        "MT",
        DECIMALS,
        MINTING_AMOUNT,
    ]);

    const owner = signers[0].address;
    const managers = [
        signers[0].address, 
        signers[1].address,
        signers[2].address,
        signers[3].address,
        signers[4].address
    ];

    tinyBankC = await hre.ethers.deployContract("TinyBank", [
        owner,
        managers,
        await myTokenC.getAddress()
    ]);

    await myTokenC.setManager(await tinyBankC.getAddress());
});


    describe("Initialized state check", () => {
        it("should return totalStaked 0", async () => {
            expect(await tinyBankC.totalStaked()).to.equal(0)
        });
        it("should return staked 0 amount of signer 0", async() => {
            const signer0 = signers[0];
            expect (await tinyBankC.staked(signer0.address)).to.equal(0);
        });
    });
    describe("Staking", async() => {
        it ("should return staked amount", async() => {
            const signer0 = signers[0];
            const stakingAmount = hre.ethers.parseUnits("50", DECIMALS);
            await myTokenC.approve(await tinyBankC.getAddress(), stakingAmount);
            await tinyBankC.stake(stakingAmount);
            expect(await tinyBankC.staked(signer0.address)).equal(stakingAmount);
            expect(await myTokenC.balanceOf(tinyBankC)).equal(await tinyBankC.totalStaked());
            expect(await tinyBankC.totalStaked()).equal(stakingAmount);
        });
    });
    
    describe("Withdraw", () => {
        it("should return 0 staked after withdrawing total token", async () => {
            const signer0 = signers[0];
            const stakingAmount = hre.ethers.parseUnits("50", DECIMALS);
            await myTokenC.approve(await tinyBankC.getAddress(), stakingAmount);
            await tinyBankC.stake(stakingAmount);
            await tinyBankC.withdraw(stakingAmount);
            expect(await tinyBankC.staked(signer0.address)).equal(0);
        });
    })

    describe("reward", () => {
        it("should reward 1MT every blocks", async () => {
            const signer0 = signers[0];
            const stakingAmount = hre.ethers.parseUnits("50", DECIMALS);
            await myTokenC.approve(await tinyBankC.getAddress(), stakingAmount);
            await tinyBankC.stake(stakingAmount);

            const BLOCKS = 5n;
            const transferAmount = hre.ethers.parseUnits("1", DECIMALS);
            for (var i = 0; i < BLOCKS; i++) {
                await myTokenC.transfer(transferAmount, signer0.address);
            }
            
            await tinyBankC.withdraw(stakingAmount);
            expect(await myTokenC.balanceOf(signer0.address)).equal(hre.ethers.parseUnits((BLOCKS + MINTING_AMOUNT + 1n).toString()));
        });
        // it("Should revert when changing rewardPerBlock by hacker", async () => {
        //     const hacker = signers[3];
        //     const rewardToChange = hre.ethers.parseUnits("10000", DECIMALS);
        //     await expect(
        //         tinyBankC.connect(hacker).setRewardPerBlock(rewardToChange)
        //     ).to.be.revertedWith("You are not authorized to manage this contract");
        // })
    });

    describe("All Managers Confirm", () => {
        it("Should rewardPerBlock update", async () => {
            const confirmedReward = hre.ethers.parseUnits("1", DECIMALS);

            for (let i = 0; i < 5; i++) {
                await tinyBankC.connect(signers[i]).confirm();
            }
            await tinyBankC.setRewardPerBlock(confirmedReward);
            expect(await tinyBankC.rewardPerBlock()).to.equal(confirmedReward);
        });

        it("Should non-manager allow to confirm", async () => {
            const hacker = signers[5];
            await expect(
                tinyBankC.connect(hacker).confirm()
            ).to.be.revertedWith("You are not a manager");
        })

        it("Should all manager do not allow to confirm", async () => {
            for (let i = 0; i < 4; i++) {
                await tinyBankC.connect(signers[i]).confirm();
            }
            const rewardToChange = hre.ethers.parseUnits("10000", DECIMALS);

            await expect(
                tinyBankC.setRewardPerBlock(rewardToChange)
            ).to.be.revertedWith("Not all confirmed yet");
        })
    });
});