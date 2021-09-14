const { expect } = require("chai")
const { ethers } = require("hardhat")
const { balance, expectRevert } = require("@openzeppelin/test-helpers")
const ether = require("@openzeppelin/test-helpers/src/ether")

let exchange
let owner, acc1, acc2, acc3
let spi
let usdToken

describe("Deploy Exchange", function () {
	beforeEach(async function () {
		let ExchangeC = await ethers.getContractFactory("Exchange")

		signers = await ethers.getSigners()
		owner = signers[0]
		acc1 = signers[1]
		acc2 = signers[2]
		acc3 = signers[3]

		//deploy an spi token for
		let SPIMockContract = await ethers.getContractFactory("ERC20Mock")
		spi = await SPIMockContract.deploy("ShoppingIO", "SPI", toSPI("100000"))
		await spi.deployed()

		let USDCMockContract = await ethers.getContractFactory("USDCMock")
		usdToken = await USDCMockContract.deploy("USDC", "USDC", 6, toSPI("100000"), toSPI("100000"))
		await usdToken.deployed()

		exchange = await ExchangeC.deploy(spi.address, usdToken.address)
		await exchange.deployed()
		await spi.increaseAllowance(exchange.address, toSPI("100000"))

		//transfer SPI & USDC to acc1, acc2 & allowances
		await spi.transfer(acc1.address, toSPI("1000")) //1000 SPI
		await spi.transfer(acc2.address, toSPI("2000")) //2000 SPI
		await spi.connect(acc1).increaseAllowance(exchange.address, toSPI("1000"))
		await spi.connect(acc2).increaseAllowance(exchange.address, toSPI("2000"))

		await usdToken.transfer(acc1.address, toSPI("1000")) //1000 USDC
		await usdToken.transfer(acc2.address, toSPI("2000")) //2000 USDC
		await usdToken.increaseAllowance(exchange.address, toSPI("9999999"))
		await usdToken.connect(acc1).increaseAllowance(exchange.address, toSPI("9999999"))
		await usdToken.connect(acc2).increaseAllowance(exchange.address, toSPI("9999999"))
	})

	it("deploys ok", async function () {
		expect(await spi.balanceOf(exchange.address)).to.equal(0)
	})

	it("can add funds", async function () {
		expect(await spi.balanceOf(exchange.address)).to.equal(0)
		await exchange.addFunds(toSPI("1000"))
		expect(await spi.balanceOf(exchange.address)).to.equal(toSPI("1000"))
		//can't add more than it has
		await await expectRevert.unspecified(exchange.addFunds(toSPI("1000000000000")))
	})

	it("owner can set min - max", async function () {
		expect(await exchange.minAmount()).to.equal(toSPI("1"))
		expect(await exchange.maxAmount()).to.equal(toSPI("1000"))
		await exchange.setMinAmount(2)
		await exchange.setMaxAmount(5)
		expect(await exchange.minAmount()).to.equal(2)
		expect(await exchange.maxAmount()).to.equal(5)
	})

	it("owner can withdraw tokens", async function () {
		await exchange.addFunds(toSPI("1000"))
		expect(await spi.balanceOf(exchange.address)).to.equal(toSPI("1000"))
		expect(await spi.balanceOf(owner.address)).to.equal(toSPI("96000"))
		await exchange.withdrawTokens(spi.address, toSPI("1000"))
		expect(await spi.balanceOf(owner.address)).to.equal(toSPI("97000"))
	})

	it("owner can change the price oracle address", async function () {
		expect(await exchange.priceOracle()).to.equal(owner.address)
		await exchange.setPriceOracle(acc1.address)
		expect(await exchange.priceOracle()).to.equal(acc1.address)
	})

	it("owner can change the address of usd token", async function () {
		expect(await exchange.usdToken()).to.equal(usdToken.address)
		await exchange.setUSDToken(acc1.address)
		expect(await exchange.usdToken()).to.equal(acc1.address)
	})

	it("price oracle can change the prices", async function () {
		await exchange.setPriceForTokenInWei(11)
		expect(await exchange.priceForTokenInWei()).to.equal(11)
		expect(await exchange.priceOracle()).to.equal(owner.address)
		await exchange.setPriceOracle(acc1.address)
		await exchange.connect(acc1).setPriceForTokenInWei(100)
		expect(await exchange.priceForTokenInWei()).to.equal(100)
		await exchange.connect(acc1).setPriceForTokenInUSD(101)
		expect(await exchange.priceForTokenInUSD()).to.equal(101)
	})

	it("simple buy ETH process", async function () {
		await exchange.addFunds(toSPI("1000")) //100 spi
		await exchange.setPriceForTokenInWei(web3.utils.toWei("0.001", "ether")) //1 spi = 0.001 ether
		await exchange
			.connect(acc3)
			.buyWithWei(toSPI("3"), { value: web3.utils.toWei("0.003", "ether") })
		expect(await spi.balanceOf(acc3.address)).to.equal(toSPI("3"))
	})

	it("simple buy USD process", async function () {
		await exchange.addFunds(toSPI("1000")) //100 spi

		await usdToken.transfer(acc3.address, toSPI("1000")) //1000 USDC
		expect(await usdToken.balanceOf(acc3.address)).to.equal(toSPI("1000"))
		await usdToken.connect(acc3).increaseAllowance(exchange.address, toSPI("9999999"))
		await exchange.setPriceForTokenInUSD(toSPI("10"))

		await exchange.connect(acc3).buyWithUSD(toSPI("3"))
		expect(await spi.balanceOf(acc3.address)).to.equal(toSPI("3"))
	})

	it("simple buy USD process should transfer the correct amount", async function () {
		await exchange.addFunds(toSPI("1000")) //100 spi
		await exchange.setPriceForTokenInUSD(toSPI("10")) //1 spi = 10 USD

		await usdToken.transfer(acc3.address, toSPI("1000")) //1000 USDC
		expect(await usdToken.balanceOf(acc3.address)).to.equal(toSPI("1000"))
		await usdToken.connect(acc3).increaseAllowance(exchange.address, toSPI("9999999"))

		//starts with 1000 USDC and buys 3 SPI at 10 USD per SPI
		await exchange.connect(acc3).buyWithUSD(toSPI("3"))
		expect(await spi.balanceOf(acc3.address)).to.equal(toSPI("3"))

		//after
		expect(await usdToken.balanceOf(acc3.address)).to.equal(toSPI("970"))
	})

	it("can't buy with less money", async function () {
		await exchange.addFunds(toSPI("1000")) //100 spi
		await exchange.setPriceForTokenInWei(web3.utils.toWei("0.001", "ether")) //1 spi = 0.001 ether
		await exchange.setPriceForTokenInUSD(300) //1 spi = 300 USD
		await await expectRevert.unspecified(
			exchange.connect(acc3).buyWithWei(toSPI("3"), { value: web3.utils.toWei("0.0029", "ether") })
		)

		//acc3 doesn't own any usdc
		await await expectRevert.unspecified(exchange.connect(acc3).buyWithUSD(toSPI("3")))
	})

	it("owner can withdraw eth", async function () {
		await exchange.addFunds(toSPI("1000"))
		expect(await spi.balanceOf(exchange.address)).to.equal(toSPI("1000"))
		expect(await spi.balanceOf(owner.address)).to.equal(toSPI("96000"))

		//buy 10 tokens
		await exchange.setPriceForTokenInWei(web3.utils.toWei("0.001", "ether")) //1 spi = 0.001 ether
		await exchange
			.connect(acc3)
			.buyWithWei(toSPI("10"), { value: web3.utils.toWei("0.01", "ether") })
		expect(await spi.balanceOf(acc3.address)).to.equal(toSPI("10"))

		const tracker = await balance.tracker(owner.address)
		let ownerInitialBalance = Number(await tracker.get("wei"))
		await exchange.withdraw()
		let ownerFinalBalance = Number(await tracker.get("wei"))
		expect(ownerFinalBalance).to.be.greaterThan(
			ownerInitialBalance + Number(web3.utils.toWei("0.0099", "ether"))
		)
	})

	function toSPI(amount) {
		//since SPI has 18 decimals...
		return ethers.utils.parseEther(amount)
	}
})
