const hre = require("hardhat")
require("@nomiclabs/hardhat-web3")
const fs = require("fs-extra")

function sleep(ms) {
	return new Promise((resolve) => {
		setTimeout(resolve, ms)
	})
}

async function main() {
	fs.removeSync("cache")
	fs.removeSync("artifacts")
	await hre.run("compile")

	//Mock Shopping IO
	const ShoppingIO = await hre.ethers.getContractFactory("ERC20Mock")
	let deployed = await ShoppingIO.deploy("Shopping.io", "SPI", "1000000000000000000000000")
	let dep = await deployed.deployed()
	console.log("Mock SPI Contract deployed to:", dep.address)

	await sleep(30000) // 30 seconds sleep
	await hre.run("verify:verify", {
		address: dep.address,
		constructorArguments: ["Shopping.io", "SPI", "1000000000000000000000000"],
	})

	//Mock USDC
	const USDCMock = await hre.ethers.getContractFactory("USDCMock")
	deployed = await USDCMock.deploy("USDC", "USDC", 6, "10000000000", "10000000000")
	dep = await deployed.deployed()
	console.log("Mock USDC Contract deployed to:", dep.address)

	await sleep(30000) // 30 seconds sleep
	await hre.run("verify:verify", {
		address: dep.address,
		constructorArguments: ["USDC", "USDC", 6, "10000000000", "10000000000"],
	})
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error)
		process.exit(1)
	})
