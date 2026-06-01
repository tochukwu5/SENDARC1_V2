import { useState, useEffect, useCallback } from 'react'
import { ARC_TESTNET, switchToArcTestnet } from '../utils/arcTestnet'

export function useArcTestnet() {
  const [account, setAccount] = useState(null)
  const [balance, setBalance] = useState('0.000000')
  const [network, setNetwork] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isAutoConnecting, setIsAutoConnecting] = useState(true)
  const [error, setError] = useState(null)

  const hasMetaMask = typeof window !== 'undefined' && !!window.ethereum

  // Fetch native USDC balance from Arc Testnet RPC
  const fetchBalance = useCallback(async (address) => {
    if (!address) return
    try {
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

  // Internal function to set all wallet state at once
  const setWalletState = useCallback(async (address) => {
    const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' })
    const chainId = parseInt(chainIdHex, 16)
    setAccount(address)
    setNetwork(chainId)
    setIsConnected(true)
    setIsCorrectNetwork(chainId === ARC_TESTNET.id)
    await fetchBalance(address)
  }, [fetchBalance])

  // AUTO-RECONNECT on page load — this is the key fix
  // Checks if MetaMask is already connected and restores the session silently
  useEffect(() => {
    const autoReconnect = async () => {
      if (!window.ethereum) {
        setIsAutoConnecting(false)
        return
      }
      try {
        // eth_accounts does NOT prompt the user — it just checks if already connected
        const accounts = await window.ethereum.request({ method: 'eth_accounts' })
        if (accounts && accounts.length > 0) {
          // Wallet was already connected — restore session silently
          await setWalletState(accounts[0])
        }
      } catch (err) {
        console.warn('Auto-reconnect failed:', err.message)
      } finally {
        setIsAutoConnecting(false)
      }
    }
    autoReconnect()
  }, [setWalletState])

  // Manual connect — called when user clicks Connect MetaMask button
  const connect = useCallback(async () => {
    if (!hasMetaMask) {
      setError('MetaMask not found. Please install MetaMask to use the testnet.')
      return false
    }
    setIsLoading(true)
    setError(null)
    try {
      // eth_requestAccounts WILL prompt the user if not connected
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      if (!accounts.length) throw new Error('No accounts found')

      // Switch to Arc Testnet
      await switchToArcTestnet()

      await setWalletState(accounts[0])
      return accounts[0]
    } catch (err) {
      setError(err.message || 'Failed to connect wallet')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [hasMetaMask, setWalletState])

  // Send USDC on Arc Testnet as native transfer
  const sendUsdc = useCallback(async ({ to, amount }) => {
    if (!account || !isCorrectNetwork) throw new Error('Not connected to Arc Testnet')
    setIsLoading(true)
    setError(null)

    try {
      const startTime = Date.now()

      const rawAmount = BigInt(Math.round(parseFloat(amount) * 1_000_000))
      const amountHex = '0x' + rawAmount.toString(16)

      const gasPrice = await window.ethereum.request({ method: 'eth_gasPrice' })

      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: account,
          to: to,
          value: amountHex,
          gasPrice,
          gas: '0x5208',
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

      const gasUsed = receipt ? parseInt(receipt.gasUsed, 16) : 21000
      const gasPriceNum = parseInt(gasPrice, 16)
      const gasCostRaw = BigInt(gasUsed) * BigInt(gasPriceNum)
      const gasCostUsdc = (Number(gasCostRaw) / 1_000_000).toFixed(6)

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

  const refreshBalance = useCallback(() => {
    if (account) fetchBalance(account)
  }, [account, fetchBalance])

  // Listen to MetaMask account and network changes
  useEffect(() => {
    if (!window.ethereum) return

    const onAccountsChanged = async (accounts) => {
      if (accounts.length) {
        await setWalletState(accounts[0])
      } else {
        setAccount(null)
        setIsConnected(false)
        setIsCorrectNetwork(false)
        setBalance('0.000000')
        setNetwork(null)
      }
    }

    const onChainChanged = (chainIdHex) => {
      const chainId = parseInt(chainIdHex, 16)
      setNetwork(chainId)
      setIsCorrectNetwork(chainId === ARC_TESTNET.id)
      // Refresh balance on chain change
      if (account) fetchBalance(account)
    }

    window.ethereum.on('accountsChanged', onAccountsChanged)
    window.ethereum.on('chainChanged', onChainChanged)

    return () => {
      window.ethereum.removeListener('accountsChanged', onAccountsChanged)
      window.ethereum.removeListener('chainChanged', onChainChanged)
    }
  }, [account, fetchBalance, setWalletState])

  return {
    account,
    balance,
    network,
    isConnected,
    isCorrectNetwork,
    isLoading,
    isAutoConnecting,
    error,
    hasMetaMask,
    connect,
    sendUsdc,
    refreshBalance,
    arcTestnet: ARC_TESTNET,
  }
}