// Arc Testnet official configuration
export const ARC_TESTNET = {
  id: 5042002,
  name: 'Arc Testnet',
  rpcUrl: 'https://rpc.testnet.arc.network',
  explorerUrl: 'https://testnet.arcscan.app',
  faucetUrl: 'https://faucet.circle.com',
  usdcAddress: '0x3600000000000000000000000000000000000000',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 6 },
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
      nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 6 },
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
