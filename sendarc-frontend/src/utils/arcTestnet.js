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

// EVM chains that work with MetaMask — all TESTNETS, no real money
export const EVM_CHAINS = {
  arc: {
    id: 5042002,
    chainIdHex: '0x4CEF52',
    name: 'Arc Testnet',
    symbol: 'ARC',
    rpcUrl: 'https://rpc.testnet.arc.network',
    explorerUrl: 'https://testnet.arcscan.app',
    usdcAddress: '0x3600000000000000000000000000000000000000',
    nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
    faucetUrl: 'https://faucet.circle.com',
    icon: '⬡',
    color: '#00D4FF',
    live: true,
    note: 'Native — real on-chain transaction',
  },
  ethereum: {
    id: 11155111,
    chainIdHex: '0xAA36A7',
    name: 'Ethereum Sepolia',
    symbol: 'ETH',
    rpcUrl: 'https://rpc.sepolia.org',
    explorerUrl: 'https://sepolia.etherscan.io',
    // USDC on Ethereum Sepolia (Circle official)
    usdcAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
    faucetUrl: 'https://faucet.circle.com',
    icon: '⟠',
    color: '#627EEA',
    live: true,
    note: 'Testnet — Ethereum Sepolia',
  },
  base: {
    id: 84532,
    chainIdHex: '0x14A34',
    name: 'Base Sepolia',
    symbol: 'ETH',
    rpcUrl: 'https://sepolia.base.org',
    explorerUrl: 'https://sepolia.basescan.org',
    // USDC on Base Sepolia (Circle official)
    usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
    faucetUrl: 'https://faucet.circle.com',
    icon: '🔵',
    color: '#0052FF',
    live: true,
    note: 'Testnet — Base Sepolia',
  },
  arbitrum: {
    id: 421614,
    chainIdHex: '0x66EEE',
    name: 'Arbitrum Sepolia',
    symbol: 'ETH',
    rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    explorerUrl: 'https://sepolia.arbiscan.io',
    // USDC on Arbitrum Sepolia (Circle official)
    usdcAddress: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
    nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
    faucetUrl: 'https://faucet.circle.com',
    icon: '🔷',
    color: '#28A0F0',
    live: true,
    note: 'Testnet — Arbitrum Sepolia',
  },
}

// Switch MetaMask to any EVM chain by chain key
// Always tries to add the chain if switching fails — handles all MetaMask versions
export async function switchToChain(chainKey) {
  if (!window.ethereum) throw new Error('MetaMask not found')
  const chain = EVM_CHAINS[chainKey]
  if (!chain) throw new Error('Unknown chain: ' + chainKey)

  // Always try to add/update the chain first, then switch
  // This handles users who don't have the chain added yet (any MetaMask version)
  try {
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
  } catch (addErr) {
    // wallet_addEthereumChain can throw code 4001 if user rejects
    if (addErr.code === 4001) throw new Error('User rejected adding the network.')
    // If already added, wallet_addEthereumChain sometimes errors — that's fine, try switching
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chain.chainIdHex }],
      })
    } catch (switchErr) {
      if (switchErr.code === 4001) throw new Error('User rejected the network switch.')
      throw switchErr
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
      from,
      to,
      amount: parseFloat(amount),
      gasCost,
      gasUsed,
      blockNumber: receipt ? parseInt(receipt.blockNumber, 16) : 0,
      settlementTime,
      status: 'confirmed',
      sourceChain: 'Arc Testnet',
      network: 'Arc Testnet',
      chainId: 5042002,
      simulated: false,
    }
  } else {
    // Ethereum Sepolia / Base Sepolia / Arbitrum Sepolia:
    // Call USDC ERC-20 transfer(to, amount) — all Sepolia USDC uses 6 decimals
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
      from,
      to,
      amount: parseFloat(amount),
      gasCost,
      gasUsed,
      blockNumber: receipt ? parseInt(receipt.blockNumber, 16) : 0,
      settlementTime,
      status: 'confirmed',
      sourceChain: chain.name,
      network: chain.name,
      chainId: chain.id,
      simulated: false,
    }
  }
}

// Get USDC balance on any EVM chain
// Arc: USDC is native token (18 decimals via eth_getBalance)
// Sepolia chains: ERC-20 USDC (6 decimals via balanceOf call)
export async function getUsdcBalance(chainKey, address) {
  if (!window.ethereum) return '0'
  const chain = EVM_CHAINS[chainKey]
  if (!chain) return '0'

  try {
    if (chainKey === 'arc') {
      const raw = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [address, 'latest'],
      })
      return (parseInt(raw, 16) / 1e18).toFixed(6)
    } else {
      // ERC-20 balanceOf(address) — USDC uses 6 decimals on all Sepolia chains
      const paddedAddr = address.slice(2).padStart(64, '0')
      const result = await window.ethereum.request({
        method: 'eth_call',
        params: [{
          to: chain.usdcAddress,
          data: '0x70a08231' + paddedAddr,
        }, 'latest'],
      })
      if (!result || result === '0x') return '0.000000'
      const raw = parseInt(result, 16)
      return (raw / 1_000_000).toFixed(6)
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