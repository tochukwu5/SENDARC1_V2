// Arc Testnet official configuration
export const ARC_TESTNET = {
  id: 5042002,
  name: 'Arc Testnet',
  rpcUrl: 'https://rpc.testnet.arc.network',
  explorerUrl: 'https://testnet.arcscan.app',
  faucetUrl: 'https://faucet.circle.com',
  usdcAddress: '0x3600000000000000000000000000000000000000',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
}

// EVM chains that work with MetaMask — all have real USDC contracts
// Users stay in MetaMask, we just switch the network automatically
export const EVM_CHAINS = {
  arc: {
    id: 5042002,
    chainIdHex: '0x4CEF52',
    name: 'Arc Testnet',
    symbol: 'ARC',
    rpcUrl: 'https://rpc.testnet.arc.network',
    explorerUrl: 'https://testnet.arcscan.app',
    // USDC is the native gas token on Arc
    usdcAddress: '0x3600000000000000000000000000000000000000',
    nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
    icon: '⬡',
    color: '#00D4FF',
    live: true,
    note: 'Native — real on-chain transaction',
  },
  ethereum: {
    id: 1,
    chainIdHex: '0x1',
    name: 'Ethereum',
    symbol: 'ETH',
    rpcUrl: 'https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
    explorerUrl: 'https://etherscan.io',
    // Official USDC contract on Ethereum mainnet (Circle)
    usdcAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    icon: '⟠',
    color: '#627EEA',
    live: true,
    note: 'Real USDC send on Ethereum',
  },
  base: {
    id: 8453,
    chainIdHex: '0x2105',
    name: 'Base',
    symbol: 'BASE',
    rpcUrl: 'https://mainnet.base.org',
    explorerUrl: 'https://basescan.org',
    // Official USDC contract on Base (Circle native USDC)
    usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    icon: '🔵',
    color: '#0052FF',
    live: true,
    note: 'Real USDC send on Base',
  },
  arbitrum: {
    id: 42161,
    chainIdHex: '0xA4B1',
    name: 'Arbitrum',
    symbol: 'ARB',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    explorerUrl: 'https://arbiscan.io',
    // Official USDC contract on Arbitrum One (Circle native USDC)
    usdcAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    icon: '🔷',
    color: '#28A0F0',
    live: true,
    note: 'Real USDC send on Arbitrum',
  },
}

// Switch MetaMask to any EVM chain by chain key
export async function switchToChain(chainKey) {
  if (!window.ethereum) throw new Error('MetaMask not found')
  const chain = EVM_CHAINS[chainKey]
  if (!chain) throw new Error('Unknown chain: ' + chainKey)

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: chain.chainIdHex }],
    })
  } catch (err) {
    // Chain not added to MetaMask yet — add it automatically
    if (err.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: chain.chainIdHex,
          chainName: chain.name,
          nativeCurrency: chain.nativeCurrency,
          rpcUrls: [chain.rpcUrl],
          blockExplorerUrls: [chain.explorerUrl],
        }],
      })
    } else {
      throw err
    }
  }
}

// Send USDC on any EVM chain using the ERC-20 transfer method
// For Arc: uses native transfer (gas is USDC itself)
// For Ethereum/Base/Arbitrum: calls USDC contract transfer()
export async function sendUsdcOnChain(chainKey, { to, amount }) {
  if (!window.ethereum) throw new Error('MetaMask not found')
  const chain = EVM_CHAINS[chainKey]
  if (!chain) throw new Error('Unknown chain')

  const accounts = await window.ethereum.request({ method: 'eth_accounts' })
  const from = accounts[0]
  if (!from) throw new Error('No account connected')

  const start = Date.now()

  if (chainKey === 'arc') {
    // Arc: USDC is native token — use eth_sendTransaction directly
    const rawAmount = BigInt(Math.round(parseFloat(amount) * 1e6)) * BigInt(1e12)
    const amountHex = '0x' + rawAmount.toString(16)

    const txHash = await window.ethereum.request({
      method: 'eth_sendTransaction',
      params: [{ from, to, value: amountHex, gas: '0x5208' }],
    })

    // Wait for confirmation
    let receipt = null
    let attempts = 0
    while (!receipt && attempts < 30) {
      await new Promise(r => setTimeout(r, 1000))
      receipt = await window.ethereum.request({
        method: 'eth_getTransactionReceipt',
        params: [txHash],
      })
      attempts++
    }

    const gasUsed = receipt ? parseInt(receipt.gasUsed, 16) : 21000
    const gasPrice = await window.ethereum.request({ method: 'eth_gasPrice' })
    const gasPriceNum = parseInt(gasPrice, 16)
    const gasCostRaw = BigInt(gasUsed) * BigInt(gasPriceNum)
    const gasCost = (Number(gasCostRaw) / 1e18).toFixed(9)
    const settlementTime = Date.now() - start

    return {
      hash: txHash,
      amount: parseFloat(amount),
      gasCost,
      gasUsed,
      blockNumber: receipt ? parseInt(receipt.blockNumber, 16) : 0,
      settlementTime,
      status: 'confirmed',
      sourceChain: 'Arc Testnet',
      simulated: false,
    }
  } else {
    // Ethereum/Base/Arbitrum: call USDC ERC-20 transfer(to, amount)
    // USDC uses 6 decimals on all these chains
    const rawAmount = BigInt(Math.round(parseFloat(amount) * 1_000_000))
    const amountHex = rawAmount.toString(16).padStart(64, '0')
    const toHex = to.slice(2).padStart(64, '0')
    // ERC-20 transfer(address,uint256) selector = 0xa9059cbb
    const data = '0xa9059cbb' + toHex + amountHex

    const txHash = await window.ethereum.request({
      method: 'eth_sendTransaction',
      params: [{
        from,
        to: chain.usdcAddress,
        data,
        gas: '0x186A0', // 100000 gas limit for ERC-20 transfer
      }],
    })

    // Wait for confirmation
    let receipt = null
    let attempts = 0
    while (!receipt && attempts < 60) {
      await new Promise(r => setTimeout(r, 2000))
      receipt = await window.ethereum.request({
        method: 'eth_getTransactionReceipt',
        params: [txHash],
      })
      attempts++
    }

    const gasUsed = receipt ? parseInt(receipt.gasUsed, 16) : 65000
    const gasPrice = await window.ethereum.request({ method: 'eth_gasPrice' })
    const gasPriceNum = parseInt(gasPrice, 16)
    const gasCostRaw = BigInt(gasUsed) * BigInt(gasPriceNum)
    const gasCost = (Number(gasCostRaw) / 1e18).toFixed(9)
    const settlementTime = Date.now() - start

    return {
      hash: txHash,
      amount: parseFloat(amount),
      gasCost,
      gasUsed,
      blockNumber: receipt ? parseInt(receipt.blockNumber, 16) : 0,
      settlementTime,
      status: 'confirmed',
      sourceChain: chain.name,
      simulated: false,
    }
  }
}

// Get USDC balance on any EVM chain
export async function getUsdcBalance(chainKey, address) {
  if (!window.ethereum) return '0'
  const chain = EVM_CHAINS[chainKey]
  if (!chain) return '0'

  try {
    if (chainKey === 'arc') {
      // Arc: USDC is native, use eth_getBalance
      const raw = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [address, 'latest'],
      })
      return (parseInt(raw, 16) / 1e18).toFixed(6)
    } else {
      // ERC-20 balanceOf(address) selector = 0x70a08231
      const paddedAddr = address.slice(2).padStart(64, '0')
      const result = await window.ethereum.request({
        method: 'eth_call',
        params: [{
          to: chain.usdcAddress,
          data: '0x70a08231' + paddedAddr,
        }, 'latest'],
      })
      const raw = parseInt(result, 16)
      return (raw / 1_000_000).toFixed(6) // USDC = 6 decimals
    }
  } catch {
    return '0'
  }
}

// Minimal ERC-20 ABI for USDC balance + transfer
export const USDC_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
]

// Add Arc Testnet to MetaMask helper
export async function addArcTestnetToWallet() {
  if (!window.ethereum) throw new Error('MetaMask not found')
  await window.ethereum.request({
    method: 'wallet_addEthereumChain',
    params: [{
      chainId: '0x4CEF52', // 5042002 in hex
      chainName: 'Arc Testnet',
      nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
      rpcUrls: ['https://rpc.testnet.arc.network'],
      blockExplorerUrls: ['https://testnet.arcscan.app'],
    }],
  })
}

// Switch wallet to Arc Testnet
export async function switchToArcTestnet() {
  if (!window.ethereum) throw new Error('MetaMask not found')
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x4CEF52' }],
    })
  } catch (err) {
    // chain not added yet — add it
    if (err.code === 4902) await addArcTestnetToWallet()
    else throw err
  }
}

// Format USDC (6 decimals)
export function formatUsdc(raw) {
  if (!raw) return '0.000000'
  const num = typeof raw === 'bigint' ? Number(raw) : Number(raw)
  return (num / 1_000_000).toFixed(6)
}

// Parse USDC to raw (6 decimals)
export function parseUsdc(amount) {
  return BigInt(Math.round(parseFloat(amount) * 1_000_000))
}

// Shorten address
export function shortAddr(addr) {
  if (!addr) return ''
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

// ArcScan tx link
export function arcScanTx(hash) {
  return `${ARC_TESTNET.explorerUrl}/tx/${hash}`
}

// ArcScan address link
export function arcScanAddr(addr) {
  return `${ARC_TESTNET.explorerUrl}/address/${addr}`
}

// Format settlement time
export function formatSettlement(ms) {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}