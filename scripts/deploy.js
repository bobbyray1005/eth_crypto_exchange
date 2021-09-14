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

	// We get the contract to deploy
	const Exchange = await hre.ethers.getContractFactory("Exchange")
	console.log("Deploying Contract...")

	let network = process.env.NETWORK ? process.env.NETWORK : "rinkeby"

	console.log(">-> Network is set to " + network)

	// ethers is avaialble in the global scope
	const [deployer] = await ethers.getSigners()
	const deployerAddress = await deployer.getAddress()
	const account = await web3.utils.toChecksumAddress(deployerAddress)
	const balance = await web3.eth.getBalance(account)

	console.log(
		"Deployer Account " + deployerAddress + " has balance: " + web3.utils.fromWei(balance, "ether"),
		"ETH"
	)

	let spiToken = "0x9b02dd390a603add5c07f9fd9175b7dabe8d63b7" // SPI
	let usdToken = "0xdac17f958d2ee523a2206206994597c13d831ec7" //USDT

	if (network === "rinkeby") {
		spiToken = "0xc8638185bD8734E17fB54CCc8360fC85BbC96aAD" //rinkeby
		usdToken = "0x26b1aC844bBabF9D61bd5d4BAEde65D3b9C6e557" //rinkeby
	}

	const deployed = await Exchange.deploy(spiToken, usdToken)
	let dep = await deployed.deployed()

	console.log("Contract deployed to:", dep.address)

	sleepTime = 30000 // 30 seconds sleep
	await sleep(sleepTime)
	await hre.run("verify:verify", {
		address: dep.address,
		constructorArguments: [spiToken, usdToken],
	})
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error)
		process.exit(1)
	})
