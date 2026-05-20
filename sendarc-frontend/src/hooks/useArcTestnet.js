import { useState, useEffect, useCallback } from 'react'
import { ARC_TESTNET, USDC_ABI, switchToArcTestnet, formatUsdc, parseUsdc } from '../utils/arcTestnet'

// We use ethers v6 via CDN-compatible dynamic import pattern
// In production this uses the ethers package installed via npm
let ethers = null
async function getEthers() {
  if (ethers) return ethers
  // ethers is installed as a dependency
  ethers = await import('https://cdn.jsdelivr.net/npm/ethers@6.13.4/dist/ethers.min.js')
  return ethers
}

export function useArcTestnet() {
  const [account, setAccount] = useState(null)
  const [balance, setBalance] = useState('0.000000')
  const [network, setNetwork] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [provider, setProvider] = useState(null)

  // Check if MetaMask is available
  const hasMetaMask = typeof window !== 'undefined' && !!window.ethereum

  // Fetch USDC balance from Arc Testnet RPC
 const fetchBalance = useCallback(async (address) => {
  if (!address) return
  try {
    // On Arc Testnet, USDC is the NATIVE token — use eth_getBalance
    const response = await fetch(ARC_TESTNET.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getBalance',
        params: [address, 'latest'],
        id: 1,
      }),
    })

    const json = await response.json()

    if (json.result && json.result !== '0x0' && json.result !== '0x') {
      const raw = BigInt(json.result)
      // Arc native USDC has 6 decimals
      const formatted = (Number(raw) / 1_000_000).toFixed(6)
      setBalance(formatted)
    } else {
      setBalance('0.000000')
    }
  } catch (err) {
    console.error('Balance fetch error:', err)
    setBalance('0.000000')
  }
}, [])

  // Connect wallet
  const connect = useCallback(async () => {
    if (!hasMetaMask) {
      setError('MetaMask not found. Please install MetaMask to use the testnet.')
      return false
    }
    setIsLoading(true)
    setError(null)
    try {
      // Request accounts
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      if (!accounts.length) throw new Error('No accounts found')

      const address = accounts[0]

      // Switch to Arc Testnet
      await switchToArcTestnet()

      // Get current chain
      const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' })
      const chainId = parseInt(chainIdHex, 16)

      setAccount(address)
      setNetwork(chainId)
      setIsConnected(true)
      setIsCorrectNetwork(chainId === ARC_TESTNET.id)

      // Fetch balance
      await fetchBalance(address)

      return address
    } catch (err) {
      setError(err.message || 'Failed to connect wallet')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [hasMetaMask, fetchBalance])

  // Send USDC on Arc Testnet
 const sendUsdc = useCallback(async ({ to, amount }) => {
  if (!account || !isCorrectNetwork) throw new Error('Not connected to Arc Testnet')
  setIsLoading(true)
  setError(null)

  try {
    const startTime = Date.now()

    // Convert amount to hex — Arc USDC is native with 6 decimals
    const rawAmount = BigInt(Math.round(parseFloat(amount) * 1_000_000))
    const amountHex = '0x' + rawAmount.toString(16)

    // Get gas price
    const gasPrice = await window.ethereum.request({ method: 'eth_gasPrice' })

    // Send as native transfer (value transfer, no data)
    const txHash = await window.ethereum.request({
      method: 'eth_sendTransaction',
      params: [{
        from: account,
        to: to,
        value: amountHex,
        gasPrice,
        gas: '0x5208', // 21000 — standard native transfer gas
      }],
    })

    // Poll for receipt
    let receipt = null
    let attempts = 0
    while (!receipt && attempts < 30) {
      await new Promise(r => setTimeout(r, 500))
      const res = await fetch(ARC_TESTNET.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getTransactionReceipt',
          params: [txHash],
          id: 1,
        }),
      })
      const data = await res.json()
      if (data.result) receipt = data.result
      attempts++
    }

    const settlementTime = Date.now() - startTime

    // Calculate gas cost
    const gasUsed = receipt ? parseInt(receipt.gasUsed, 16) : 21000
    const gasPriceNum = parseInt(gasPrice, 16)
    const gasCostRaw = BigInt(gasUsed) * BigInt(gasPriceNum)
    const gasCostUsdc = (Number(gasCostRaw) / 1_000_000).toFixed(6)

    // Refresh balance
    await fetchBalance(account)

    return {
      hash: txHash,
      from: account,
      to,
      amount: parseFloat(amount),
      gasCost: gasCostUsdc,
      gasUsed,
      settlementTime,
      blockNumber: receipt ? parseInt(receipt.blockNumber, 16) : null,
      status: receipt?.status === '0x1' ? 'confirmed' : 'failed',
      timestamp: new Date().toISOString(),
      network: 'Arc Testnet',
      chainId: ARC_TESTNET.id,
    }
  } catch (err) {
    setError(err.message || 'Transaction failed')
    throw err
  } finally {
    setIsLoading(false)
  }
}, [account, isCorrectNetwork, fetchBalance])

  // Refresh balance
  const refreshBalance = useCallback(() => {
    if (account) fetchBalance(account)
  }, [account, fetchBalance])

  // Listen to account/network changes
  useEffect(() => {
    if (!window.ethereum) return
    const onAccountsChanged = (accounts) => {
      if (accounts.length) {
        setAccount(accounts[0])
        fetchBalance(accounts[0])
      } else {
        setAccount(null)
        setIsConnected(false)
        setBalance('0.000000')
      }
    }
    const onChainChanged = (chainIdHex) => {
      const chainId = parseInt(chainIdHex, 16)
      setNetwork(chainId)
      setIsCorrectNetwork(chainId === ARC_TESTNET.id)
    }
    window.ethereum.on('accountsChanged', onAccountsChanged)
    window.ethereum.on('chainChanged', onChainChanged)
    return () => {
      window.ethereum.removeListener('accountsChanged', onAccountsChanged)
      window.ethereum.removeListener('chainChanged', onChainChanged)
    }
  }, [fetchBalance])

  return {
    account,
    balance,
    network,
    isConnected,
    isCorrectNetwork,
    isLoading,
    error,
    hasMetaMask,
    connect,
    sendUsdc,
    refreshBalance,
    arcTestnet: ARC_TESTNET,
  }
}
