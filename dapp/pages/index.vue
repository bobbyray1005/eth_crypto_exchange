<template>
  <v-layout align-center justify-center>
    <p v-if="isPaused" style="max-width: 600px" class="red white--text pa-5">
      Attention! The DAPP is Paused for the moment.<br />
      You cannot buy any SPI/GSPI!
    </p>
    <v-flex v-if="!isPaused" style="max-width: 500px">
      <p class="title">Buy SPI with ETH or USDT</p>

      <v-card class="mt-5" outlined style="max-width: 450px">
        <v-card-text>
          <v-container>
            <v-row>
              <v-col cols="12" sm="12" md="12">
                <v-text-field
                  v-model="amountToExchangeForETH"
                  outlined
                  label="Number of SPI Tokens*"
                  required
                ></v-text-field>
                <p class="headline">Price: {{ totalAmountInETH }} ETH</p>
                <p v-if="priceOneSPIInETH" class="caption">
                  1 SPI = {{ priceOneSPIInETH }} ETH
                </p>
              </v-col>
              <v-col cols="12" sm="12" md="12">
                <v-btn
                  rounded
                  large
                  block
                  outlined
                  class="success white--text"
                  @click="buyETH()"
                >
                  BUY WITH ETH
                </v-btn>
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>
      </v-card>

      <v-card v-if="!isPaused" class="mt-5" outlined style="max-width: 450px">
        <v-card-text>
          <v-container>
            <v-row>
              <v-col cols="12" sm="12" md="12">
                <v-text-field
                  v-model="amountToExchangeForUSD"
                  outlined
                  label="Number of SPI Tokens*"
                  required
                ></v-text-field>
                <p class="headline">Price: {{ totalAmountInUSD }} USDT</p>
                <p v-if="priceOneSPIInUSD" class="caption">
                  1 SPI = {{ priceOneSPIInUSD }} USDT
                </p>
                <p v-if="userAllowanceUSD">
                  Your USDT allowance: {{ userAllowanceUSD }} USDT
                </p>
              </v-col>
              <v-col cols="12" sm="12" md="12">
                <v-btn
                  rounded
                  large
                  block
                  outlined
                  class="info white--text"
                  @click="buyUSD()"
                >
                  BUY WITH USDT
                </v-btn>
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>
      </v-card>

      <v-dialog
        v-model="loadingDialog"
        max-width="500px"
        align-center
        justify-center
      >
        <v-card class="pa-5">
          transaction sent to the blockchain. please stand by...
          <v-progress-circular
            indeterminate
            class="ma-5"
            height="100"
            color="success"
          ></v-progress-circular>
        </v-card>
      </v-dialog>
    </v-flex>
  </v-layout>
</template>

<script>
import { ethers } from 'ethers'
import {
  EXCHANGE_CONTRACT_ADDR,
  SPI_CONTRACT_ADDR,
  USD_CONTRACT_ADDR,
} from '../constants'
import { EXCHANGE_ABI } from '../exchange_abi'
import { ERC20_ABI } from '../erc20_abi'

const EthersUtils = require('ethers').utils

export default {
  auth: false,
  data() {
    return {
      loadingDialog: false,
      id: null,
      priceInETH: null,
      priceInUSD: null,
      showexchangeCard: true,
      exchangeContract: null,
      minSPIAmount: null,
      maxSPIAmount: null,
      spiContract: null,
      usdContract: null,
      isPaused: false,
      yourAllowance: 0,
      ethers: null,
      signer: null,
      provider: null,
      userAllowanceUSD: null,
      isLoaded: false,
      amountToExchangeForETH: 1,
      amountToExchangeForUSD: 1,
      pricePerTokenInWei: null,
      pricePerTokenInUSD: null,
      priceOneSPIInETH: null,
      priceOneSPIInUSD: null,
    }
  },
  computed: {
    totalAmountInETH() {
      return this.priceOneSPIInETH * this.amountToExchangeForETH
    },
    totalAmountInUSD() {
      return this.priceOneSPIInUSD * this.amountToExchangeForUSD
    },
  },
  mounted() {
    this.isLoaded = true
    this.checkMetamaskConnected()
  },
  methods: {
    async buyETH() {
      if (this.priceOneSPIInETH == null) {
        this.$toast.error('please connect your metamask wallet')
        return
      }

      // check balance
      const accountWeiBalance = String(
        await this.ethers.getBalance(this.account)
      )
      const accountETHBalance = EthersUtils.parseEther(accountWeiBalance)

      if (Number(accountETHBalance) < Number(this.totalAmountInETH)) {
        this.$toast.error(
          'not enough ETH/BNB in your wallet for this operation'
        )
      }

      try {
        const numTokens = EthersUtils.parseEther(
          String(this.amountToExchangeForETH)
        )

        // check min / max
        if (numTokens < Number(this.minSPIAmount)) {
          this.$toast.error(
            'minimum amount of SPI you can buy is ' +
              String(EthersUtils.formatUnits(String(this.minSPIAmount), 18)) +
              ' SPI'
          )
          return
        }
        if (numTokens > Number(this.maxSPIAmount)) {
          this.$toast.error(
            'maximum amount of SPI you can buy is ' +
              String(EthersUtils.formatUnits(this.maxSPIAmount, 18)) +
              ' SPI'
          )
          return
        }

        this.$toast.info('please open metamask and accept the transaction')
        console.log('numTokens to buy :>> ', numTokens)
        const overrides = {
          gasLimit: 70000,
          value: EthersUtils.parseEther(String(this.totalAmountInETH)),
        }
        const tx = await this.exchangeContract.buyWithWei(
          String(numTokens),
          overrides
        )
        this.loadingDialog = true
        await this.ethers.waitForTransaction(tx.hash)
        this.loadingDialog = false
        this.$toast.success('you successfully bought SPI')
      } catch (err) {
        if (err.message.includes('denied')) {
          this.$toast.info('you canceled the transaction')
        } else {
          this.$toast.error(err.message)
        }
      }
    },

    async buyUSD() {
      if (this.priceOneSPIInUSD == null) {
        this.$toast.error('please connect your metamask wallet')
        return
      }

      const usdBalanceWei = await this.usdContract.balanceOf(this.account)
      const usdBalance = Number(usdBalanceWei) / 1000000
      console.log('usdBalance  :>> ', usdBalance)

      if (Number(usdBalance) < Number(this.totalAmountInUSD)) {
        this.$toast.error('not enough USDT in your wallet for this operation')
      }

      // load user allowance
      const userAllowanceUSDWei = await this.usdContract.allowance(
        this.account,
        EXCHANGE_CONTRACT_ADDR
      )
      this.userAllowanceUSD = 0
      if (userAllowanceUSDWei.eq(0)) {
        this.userAllowanceUSD = 0
      } else {
        this.userAllowanceUSD = EthersUtils.formatUnits(userAllowanceUSDWei, 6)
      }
      console.log('userAllowanceUSD :>> ', this.userAllowanceUSD)

      if (Number(this.userAllowanceUSD) < Number(this.totalAmountInUSD)) {
        console.log('we need more allowance')
        this.$toast.info('creating the allowance transaction')
        const overrides = {} // const overrides = { gasLimit: 200000 }
        try {
          const tx = await this.usdContract.increaseAllowance(
            EXCHANGE_CONTRACT_ADDR,
            this.totalAmountInUSD * 1000000 - userAllowanceUSDWei,
            overrides
          )
          this.loadingDialog = true
          await this.ethers.waitForTransaction(tx.hash)
          this.loadingDialog = false
          this.buyUSDPart2()
        } catch (err) {
          if (err.message.includes('denied')) {
            this.$toast.info('you canceled the transaction')
          } else {
            this.$toast.error(err.message)
          }
        }
      } else {
        console.log('we should have now enough allowance')
        this.buyUSDPart2()
      }
    },
    async buyUSDPart2() {
      console.log('buy USD part 2')
      try {
        const numTokens = EthersUtils.parseEther(
          String(this.amountToExchangeForUSD)
        )
        console.log('numTokens to buy for USD:>> ', numTokens)

        // check min / max
        if (numTokens < Number(this.minSPIAmount)) {
          this.$toast.error(
            'minimum amount of SPI you can buy is ' +
              String(EthersUtils.formatUnits(String(this.minSPIAmount), 18)) +
              ' SPI'
          )
          return
        }
        if (numTokens > Number(this.maxSPIAmount)) {
          this.$toast.error(
            'maximum amount of SPI you can buy is ' +
              String(EthersUtils.formatUnits(this.maxSPIAmount, 18)) +
              ' SPI'
          )
          return
        }

        const overrides = {
          gasLimit: 90000,
        }
        const tx = await this.exchangeContract.buyWithUSD(
          String(numTokens),
          overrides
        )
        this.loadingDialog = true
        await this.ethers.waitForTransaction(tx.hash)
        this.loadingDialog = false
        this.$toast.success('you successfully bought SPI')
      } catch (err) {
        if (err.message.includes('denied')) {
          this.$toast.info('you canceled the transaction')
        } else {
          this.$toast.error(err.message)
        }
      }
    },

    // async exchangeIt() {
    //   console.log('staking starting...')
    //   this.$toast.info('Creating the staking transaction')
    //   const overrides = { gasLimit: 200000 }
    //   try {
    //     const numTokens = EthersUtils.parseEther(this.exchangeNumberTokens)
    //     const tx = await this.exchangeContract.exchange(numTokens, overrides)
    //     if (tx.hash) {
    //       this.$toast.info('exchange Transaction submitted successfully')
    //     }
    //   } catch (err) {
    //     if (err.message.includes('denied')) {
    //       this.$toast.info('you canceled the transaction')
    //     } else {
    //       this.$toast.error(err.message)
    //     }
    //   }
    // },
    // async claim() {
    //   // 60k gas
    //   console.log('claim button pressed')
    //   const overrides = { gasLimit: 200000 }

    //   try {
    //     const tx = await this.exchangeContract.claim(overrides)
    //     if (tx.hash) {
    //       this.$toast.info('Claim Transaction submitted successfully')
    //     }
    //   } catch (err) {
    //     if (err.message.includes('denied')) {
    //       this.$toast.info('you canceled the transaction')
    //     } else {
    //       this.$toast.error(err.message)
    //     }
    //   }
    // },
    // async unexchange() {
    //   console.log('unexchange button pressed')
    //   const overrides = { gasLimit: 200000 }

    //   try {
    //     const tx = await this.exchangeContract.unexchange(overrides)
    //     if (tx.hash) {
    //       this.$toast.info('Unexchange Transaction submitted successfully')
    //     }
    //   } catch (err) {
    //     if (err.message.includes('denied')) {
    //       this.$toast.info('you canceled the transaction')
    //     } else {
    //       this.$toast.error(err.message)
    //     }
    //   }
    // },
    async loadExchangeInfo() {
      if (window.ethereum) {
        await window.ethereum.enable()
        this.ethers = new ethers.providers.Web3Provider(window.ethereum)

        this.signer = this.ethers.getSigner()
        this.account = await this.signer.getAddress()

        this.pricePerTokenInWei =
          await this.exchangeContract.priceForTokenInWei()

        this.pricePerTokenInUSD =
          await this.exchangeContract.priceForTokenInUSD()

        console.log('pricePerTokenInWei :>> ', this.pricePerTokenInWei)
        console.log('pricePerTokenInUSD :>> ', this.pricePerTokenInUSD)

        this.priceOneSPIInETH = EthersUtils.formatUnits(
          this.pricePerTokenInWei,
          18
        )

        this.priceOneSPIInUSD = EthersUtils.formatUnits(
          this.pricePerTokenInUSD,
          6
        )

        this.isPaused = Boolean(await this.exchangeContract.paused())

        this.minSPIAmount = await this.exchangeContract.minAmount()
        this.maxSPIAmount = await this.exchangeContract.maxAmount()

        console.log('minSPIAmount :>> ', this.minSPIAmount)
        console.log('maxSPIAmount :>> ', this.maxSPIAmount)

        // load user allowance
        const userAllowanceUSDWei = await this.usdContract.allowance(
          this.account,
          EXCHANGE_CONTRACT_ADDR
        )
        if (userAllowanceUSDWei.eq(0)) {
          this.userAllowanceUSD = 0
        } else {
          this.userAllowanceUSD = EthersUtils.formatUnits(
            String(userAllowanceUSDWei),
            6
          )
        }

        // this.emissionRate = await this.exchangeContract.emissionRate()

        // this.isPaused = await this.exchangeContract.paused()
        // this.spiRewardsBalance = await this.spiContract.balanceOf(
        //   exchange_CONTRACT_ADDR
        // )
        // this.spiRewardsBalance = EthersUtils.formatUnits(
        //   this.spiRewardsBalance,
        //   18
        // )

        // this.balanceSPI = await this.spiContract.balanceOf(this.account)
        // this.balanceSPI = EthersUtils.formatUnits(this.balanceSPI, 18)

        // not needed ?
        // if (this.userInfo.pointsDebt.eq(0)) {
        //   this.pointsDebt = 0
        // } else {
        //   this.pointsDebt = EthersUtils.formatUnits(this.userInfo.amount, 18)
        // }
      }
    },

    // async updateClaimableAmount() {
    //   const pBalance = await this.exchangeContract.pointsBalance(this.account)
    //   if (pBalance.eq(0)) {
    //     this.pointsBalance = 0
    //     return
    //   }
    //   this.pointsBalance = EthersUtils.formatUnits(pBalance, 18)
    // },

    async checkMetamaskConnected() {
      if (window.ethereum) {
        await window.ethereum.enable()
        this.ethers = new ethers.providers.Web3Provider(window.ethereum)

        this.signer = this.ethers.getSigner()
        this.account = await this.signer.getAddress()
        this.balance = await this.signer.getBalance()
        this.ethBalance = await ethers.utils.formatEther(this.balance)
        this.signer = this.ethers.getSigner()

        this.exchangeContract = new ethers.Contract(
          EXCHANGE_CONTRACT_ADDR,
          EXCHANGE_ABI,
          this.signer
        )
        this.spiContract = new ethers.Contract(
          SPI_CONTRACT_ADDR,
          ERC20_ABI,
          this.signer
        )
        this.usdContract = new ethers.Contract(
          USD_CONTRACT_ADDR,
          ERC20_ABI,
          this.signer
        )

        const chainId = this.ethers._network.chainId
        this.$store.commit('setNetworkID', Number(chainId))

        if (chainId !== 1) {
          this.showNonMainnetWarning = true
        }
        this.loadExchangeInfo()
      } else {
        this.$router.push('/other/install_metamask')
      }
    },
  },
}
</script>

<style lang="scss" scoped>
.container {
  max-width: 1500px;
}
.black-text {
  color: black i !important;
}
</style>
