import React from 'react' // eslint-disable-line
import {RunTabUI} from '@remix-ui/run-tab'
import {ViewPlugin} from '@remixproject/engine-web'
import isElectron from 'is-electron'
import {addressToString} from '@remix-ui/helper'
import {InjectedProviderDefault} from '../providers/injected-provider-default'
import {InjectedCustomProvider} from '../providers/injected-custom-provider'
import * as packageJson from '../../../../../package.json'

const EventManager = require('../../lib/events')
const Recorder = require('../tabs/runTab/model/recorder.js')
const _paq = (window._paq = window._paq || [])

const profile = {
  name: 'udapp',
  displayName: 'Deploy & run transactions',
  icon: 'assets/img/deployAndRun.webp',
  description: 'Execute, save and replay transactions',
  kind: 'udapp',
  location: 'sidePanel',
  documentation: 'https://remix-ide.readthedocs.io/en/latest/run.html',
  version: packageJson.version,
  maintainedBy: 'Remix',
  permission: true,
  events: ['newTransaction'],
  methods: [
    'createVMAccount',
    'sendTransaction',
    'getAccounts',
    'pendingTransactionsCount',
    'getSettings',
    'setEnvironmentMode',
    'clearAllInstances',
    'clearAllPinnedInstances',
    'addInstance',
    'addPinnedInstance',
    'resolveContractAndAddInstance'
  ]
}

export class RunTab extends ViewPlugin {
  constructor(blockchain, config, fileManager, editor, filePanel, compilersArtefacts, networkModule, fileProvider, engine) {
    super(profile)
    this.event = new EventManager()
    this.engine = engine
    this.config = config
    this.blockchain = blockchain
    this.fileManager = fileManager
    this.editor = editor
    this.filePanel = filePanel
    this.compilersArtefacts = compilersArtefacts
    this.networkModule = networkModule
    this.fileProvider = fileProvider
    this.recorder = new Recorder(blockchain)
    this.REACT_API = {}
    this.setupEvents()
    this.el = document.createElement('div')
  }

  setupEvents() {
    this.blockchain.events.on('newTransaction', (tx, receipt) => {
      this.emit('newTransaction', tx, receipt)
    })
  }

  getSettings() {
    return new Promise((resolve, reject) => {
      resolve({
        selectedAccount: this.REACT_API.accounts.selectedAccount,
        selectedEnvMode: this.REACT_API.selectExEnv,
        networkEnvironment: this.REACT_API.networkName
      })
    })
  }

  async setEnvironmentMode(env) {
    const canCall = await this.askUserPermission('setEnvironmentMode', 'change the environment used')
    if (canCall) {
      env = typeof env === 'string' ? {context: env} : env
      this.emit('setEnvironmentModeReducer', env, this.currentRequest.from)
    }
  }

  clearAllInstances() {
    this.emit('clearAllInstancesReducer')
  }

  clearAllPinnedInstances() {
    this.emit('clearAllPinnedInstancesReducer')
  }

  addInstance(address, abi, name, contractData) {
    this.emit('addInstanceReducer', address, abi, name, contractData)
  }

  addPinnedInstance(address, abi, name, pinnedAt, filePath) {
    this.emit('addPinnedInstanceReducer', address, abi, name, pinnedAt, filePath)
  }

  createVMAccount(newAccount) {
    return this.blockchain.createVMAccount(newAccount)
  }

  sendTransaction(tx) {
    _paq.push(['trackEvent', 'udapp', 'sendTx', 'udappTransaction'])
    return this.blockchain.sendTransaction(tx)
  }

  getAccounts(cb) {
    return this.blockchain.getAccounts(cb)
  }

  pendingTransactionsCount() {
    return this.blockchain.pendingTransactionsCount()
  }

  render() {
    return (
      <div>
        <RunTabUI plugin={this} />
      </div>
    )
  }

  onReady(api) {
    this.REACT_API = api
  }

  async onInitDone() {
    const udapp = this // eslint-disable-line

    const addProvider = async (position, name, displayName, isInjected, isVM, fork = '', dataId = '', title = '') => {
      await this.call('blockchain', 'addProvider', {
        position,
        options: {},
        dataId,
        name,
        displayName,
        fork,
        isInjected,
        isVM,
        title,
        init: async function () {
          const options = await udapp.call(name, 'init')
          if (options) {
            this.options = options
            if (options['fork']) this.fork = options['fork']
          }
        },
        provider: {
          sendAsync (payload) {
            return udapp.call(name, 'sendAsync', payload)
          }
        }
      })
    }

    const addCustomInjectedProvider = async (position, event, name, displayName, networkId, urls, nativeCurrency) => {
      // name = `${name} through ${event.detail.info.name}`
      await this.engine.register([new InjectedCustomProvider(event.detail.provider, name, networkId, urls, nativeCurrency)])
      await addProvider(position, name, displayName, true, false, false)
    }
    const registerInjectedProvider = async (event) => {
      console.log('registerInjectedProvider', event)
      const name = 'injected-' + event.detail.info.name
      const displayName = 'Injected Provider - ' + event.detail.info.name
      await this.engine.register([new InjectedProviderDefault(event.detail.provider, name)])
      await addProvider(0, name, displayName, true, false, false)

      if (event.detail.info.name === 'MetaMask') {
        await addCustomInjectedProvider(7, event, 'injected-metamask-optimism', 'L2 - Optimism', '0xa', ['https://mainnet.optimism.io'])
        await addCustomInjectedProvider(8, event, 'injected-metamask-arbitrum', 'L2 - Arbitrum', '0xa4b1', ['https://arb1.arbitrum.io/rpc'])    
        await addCustomInjectedProvider(5, event, 'injected-metamask-sepolia', 'Testnet - Sepolia', '0xaa36a7', [],
          {
            "name": "Sepolia ETH",
            "symbol": "ETH",
            "decimals": 18
          })    
        await addCustomInjectedProvider(9, event, 'injected-metamask-ephemery', 'Ephemery Testnet', '', ['https://otter.bordel.wtf/erigon', 'https://eth.ephemeral.zeus.fyi'],
          {
            "name": "Ephemery ETH",
            "symbol": "ETH",
            "decimals": 18
          })
        /*
        await addCustomInjectedProvider(9, event, 'SKALE Chaos Testnet', '0x50877ed6', ['https://staging-v3.skalenodes.com/v1/staging-fast-active-bellatrix'],
          {
            "name": "sFUEL",
            "symbol": "sFUEL",
            "decimals": 18
          })
        */
      }      
    }

    // VM
    const titleVM = 'Execution environment is local to Remix.  Data is only saved to browser memory and will vanish upon reload.'
    await addProvider(1, 'vm-cancun', 'Remix VM (Cancun)', false, true, 'cancun', 'settingsVMCancunMode', titleVM)
    await addProvider(50, 'vm-shanghai', 'Remix VM (Shanghai)', false, true, 'shanghai', 'settingsVMShanghaiMode', titleVM)
    await addProvider(51, 'vm-paris', 'Remix VM (Paris)', false, true, 'paris', 'settingsVMParisMode', titleVM)
    await addProvider(52, 'vm-london', 'Remix VM (London)', false, true, 'london', 'settingsVMLondonMode', titleVM)
    await addProvider(53, 'vm-berlin', 'Remix VM (Berlin)', false, true, 'berlin', 'settingsVMBerlinMode', titleVM)
    await addProvider(2, 'vm-mainnet-fork', 'Remix VM - Mainnet fork', false, true, 'cancun', 'settingsVMMainnetMode', titleVM)
    await addProvider(3, 'vm-sepolia-fork', 'Remix VM - Sepolia fork', false, true, 'cancun', 'settingsVMSepoliaMode', titleVM)
    await addProvider(4, 'vm-custom-fork', 'Remix VM - Custom fork', false, true, '', 'settingsVMCustomMode', titleVM)

    // wallet connect
    await addProvider(6, 'walletconnect', 'WalletConnect', false, false)

    // external provider
    await addProvider(10, 'basic-http-provider', 'Custom - External Http Provider', false, false)
    await addProvider(20, 'hardhat-provider', 'Dev - Hardhat Provider', false, false)
    await addProvider(21, 'ganache-provider', 'Dev - Ganache Provider', false, false)
    await addProvider(22, 'foundry-provider', 'Dev - Foundry Provider', false, false)

    // register injected providers
    
    window.addEventListener(
      "eip6963:announceProvider",
      (event) => {
        registerInjectedProvider(event)
      }
    )
    if (!isElectron()) window.dispatchEvent(new Event("eip6963:requestProvider"))
  }

  writeFile(fileName, content) {
    return this.call('fileManager', 'writeFile', fileName, content)
  }

  readFile(fileName) {
    return this.call('fileManager', 'readFile', fileName)
  }

  async resolveContractAndAddInstance(contractObject, address) {
    const data = await this.compilersArtefacts.getCompilerAbstract(contractObject.contract.file)

    this.compilersArtefacts.addResolvedContract(addressToString(address), data)
    this.addInstance(address, contractObject.abi, contractObject.name)
  }
}
