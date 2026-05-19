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
      // Use fetch to call RPC directly — no ethers needed for balance check
      const response = await fetch(ARC_TESTNET.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_call',
          params: [{
            to: ARC_TESTNET.usdcAddress,
            data: `0x70a08231000000000000000000000000${address.slice(2).padStart(64, '0')}`,
          }, 'latest'],
          id: 1,
        }),
      })
      const data = await response.json()
      if (data.result && data.result !== '0x') {
        const raw = BigInt(data.result)
        setBalance(formatUsdc(raw))
      } else {
        setBalance('0.000000')
      }
    } catch {
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

      // Encode ERC-20 transfer(address, uint256)
      const rawAmount = parseUsdc(amount)
      const amountHex = rawAmount.toString(16).padStart(64, '0')
      const toHex = to.slice(2).padStart(64, '0')
      const data = `0xa9059cbb${toHex}${amountHex}`

      // Estimate gas
      const gasEstimate = await window.ethereum.request({
        method: 'eth_estimateGas',
        params: [{
          from: account,
          to: ARC_TESTNET.usdcAddress,
          data,
        }],
      })

      // Get gas price (USDC-denominated on Arc)
      const gasPrice = await window.ethereum.request({ method: 'eth_gasPrice' })

      // Send transaction
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: account,
          to: ARC_TESTNET.usdcAddress,
          data,
          gas: gasEstimate,
          gasPrice,
        }],
      })

      // Wait for receipt by polling
      let receipt = null
      let attempts = 0
      while (!receipt && attempts < 30) {
        await new Promise(r => setTimeout(r, 500))
        const result = await fetch(ARC_TESTNET.rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_getTransactionReceipt',
            params: [txHash],
            id: 1,
          }),
        })
        const data = await result.json()
        if (data.result) receipt = data.result
        attempts++
      }

      const settlementTime = Date.now() - startTime

      // Get gas used cost in USDC
      const gasUsed = receipt ? parseInt(receipt.gasUsed, 16) : 0
      const gasPriceNum = parseInt(gasPrice, 16)
      const gasCostRaw = BigInt(gasUsed) * BigInt(gasPriceNum)
      const gasCostUsdc = formatUsdc(gasCostRaw)

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
