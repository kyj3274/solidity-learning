import hre from "hardhat";
import { expect } from "chai";
import { MyToken } from "../typechain-types"; 
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

const mintingAmount = 100;
const decimals = 18;
describe("My Token", () => {
    let myTokenC: MyToken;
    let signers: HardhatEthersSigner[];
    beforeEach("should deploy", async () => {
        signers = await hre.ethers.getSigners();
        myTokenC = await hre.ethers.deployContract("MyToken", [
            "MyToken",
            "MT",
            decimals,
            mintingAmount,
        ]);
    });
    
    describe("Basic state value check", () => {
        it("should return name", async () => {
            expect(await myTokenC.name()).to.equal("MyToken");
        });
        it("should return symbol", async () => {
            expect(await myTokenC.symbol()).to.equal("MT");
        });
        it("should return decimals", async () => {
            expect(await myTokenC.decimals()).to.equal(decimals);
        });
        it("should return 100 totalSupply", async () => {
            expect(await myTokenC.totalSupply()).to.equal(BigInt(mintingAmount*10**decimals));
        });
    });
    // 1MT = 1*10^18
    describe("Mint", () => {
        it("should return 1MT balance for signer 0", async () => {
            const signer0 = signers[0];
            expect(await myTokenC.balanceOf(signers[0].address)).to.equal(BigInt(mintingAmount*10**decimals));
        });

        it("should return or revert when minting infinitly", async () => {
            const hacker = signers[2];
            const mintingAgainAmount = hre.ethers.parseUnits("100", decimals);
            await expect(
                myTokenC.connect(hacker).mint(mintingAgainAmount, hacker.address)
            ).to.be.revertedWith("You are not authorized to manage this contract");
        });
    });
    describe("Transfer", () => {
        it("should have 0.5MT balance for signer 1", async () => {
            const signer0 = signers[0];
            const signer1 = signers[1];
            await expect(myTokenC.transfer(hre.ethers.parseUnits("0.5", decimals), signer1.address)).to.emit(myTokenC, "Transfer").withArgs(signer0.address, signer1.address, hre.ethers.parseUnits("0.5", decimals));
            expect(await myTokenC.balanceOf(signer1)).to.equal(hre.ethers.parseUnits("0.5", decimals));
        });
        it("should be reverted with insufficient balance error", async () => {
            const signer1 = signers[1];
            await expect(
                myTokenC.transfer(hre.ethers.parseUnits((BigInt(mintingAmount + 1)).toString(), decimals), signer1.address)
            ).to.be.revertedWith("insufficient balance");
        });
    });

    describe("TransferFrom", () => { 
        it("should emit Approval event", async () => {
            const signer1 = signers[1];
            await expect(
                myTokenC.approve(signer1.address, hre.ethers.parseUnits("10", decimals))
            )
                .to.emit(myTokenC, "Approval")
                .withArgs(signer1.address, hre.ethers.parseUnits("10", decimals));
        });
        it("should be reverted with insufficient allowance error", async () => {
            const signer0 = signers[0];
            const signer1 = signers[1];
            await expect(
                myTokenC
                .connect(signer1)
                .transferFrom(
                    signer0.address, 
                    signer1.address, 
                    hre.ethers.parseUnits("1", decimals)
                )
            ).to.be.revertedWith("insufficient allowance");
        });
    });
    //     1. approve: signer1에게 signer0의 자산 이동권한 부여
    //     2. transferFrom: signer1이 signer0의 MT토큰을 자신의 주소(signer1)에게 전송
    //     3. balance 확인
    //     TestCase
    it("should approve and transferFrom and check balance", async () => {
        const signer0 = signers[0];
        const signer1 = signers[1];
        //approve : signer0의 자산 이동 권한 -> signer1
        await expect(
            myTokenC
                .connect(signer0)
                .approve(signer1.address, hre.ethers.parseUnits("10", decimals))
        )
            .to.emit(myTokenC, "Approval")
            .withArgs(signer1.address, hre.ethers.parseUnits("10", decimals));
        //transferFrom : signer0의 3MT토큰을 signer1(자신)로 전송
        await expect(
            myTokenC
                .connect(signer1)
                .transferFrom(
                    signer0.address,
                    signer1.address,
                    hre.ethers.parseUnits("3", decimals) // signer0의 3MT signer1로 전송
                )
        ).to.emit(myTokenC, "Transfer").withArgs(signer0.address, signer1.address, hre.ethers.parseUnits("3", decimals));
        //balanceOf
        expect(await myTokenC.balanceOf(signer0.address)).to.equal(hre.ethers.parseUnits("97", decimals));
        expect(await myTokenC.balanceOf(signer1.address)).to.equal(hre.ethers.parseUnits("3", decimals));
    });
});
