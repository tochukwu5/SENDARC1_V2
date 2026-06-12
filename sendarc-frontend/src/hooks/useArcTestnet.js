import { useState, useEffect, useCallback } from 'react'
import { ARC_TESTNET, switchToArcTestnet } from '../utils/arcTestnet'

const DISCONNECTED_KEY = 'sendarc_disconnected'

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

  // Clear all wallet state
  const clearWalletState = useCallback(() => {
    setAccount(null)
    setIsConnected(false)
    setIsCorrectNetwork(false)
    setBalance('0.000000')
    setNetwork(null)
    setError(null)
  }, [])

  // AUTO-RECONNECT on page load
  // Only runs if user did NOT explicitly disconnect in this session
  useEffect(() => {
    const autoReconnect = async () => {
      if (!window.ethereum) {
        setIsAutoConnecting(false)
        return
      }

      // If user explicitly disconnected, do not auto-reconnect
      // They must click Connect again manually
      const userDisconnected = sessionStorage.getItem(DISCONNECTED_KEY)
      if (userDisconnected === 'true') {
        console.log('User previously disconnected — skipping auto-reconnect')
        setIsAutoConnecting(false)
        return
      }

      try {
        // eth_accounts does NOT prompt the user
        // It only returns accounts if the site already has permission
        const accounts = await window.ethereum.request({ method: 'eth_accounts' })
        if (accounts && accounts.length > 0) {
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

  // Manual connect — always prompts MetaMask for authorization
  const connect = useCallback(async () => {
    if (!hasMetaMask) {
      setError('MetaMask not found. Please install MetaMask to use the testnet.')
      return false
    }
    setIsLoading(true)
    setError(null)
    try {
      // First revoke any existing permissions so MetaMask
      // always shows the account selection popup
      try {
        await window.ethereum.request({
          method: 'wallet_revokePermissions',
          params: [{ eth_accounts: {} }],
        })
      } catch {
        // wallet_revokePermissions may not be supported on older MetaMask
        // That is fine — we continue and request accounts anyway
      }

      // eth_requestAccounts always prompts the user to select and approve
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      })
      if (!accounts.length) throw new Error('No accounts selected')

      // Switch to Arc Testnet
      await switchToArcTestnet()

      // Clear disconnected flag — user has now explicitly connected
      sessionStorage.removeItem(DISCONNECTED_KEY)

      await setWalletState(accounts[0])
      return accounts[0]
    } catch (err) {
      // User rejected the connection prompt
      if (err.code === 4001) {
        setError('Connection rejected. Please approve the MetaMask prompt to continue.')
      } else {
        setError(err.message || 'Failed to connect wallet')
      }
      return false
    } finally {
      setIsLoading(false)
    }
  }, [hasMetaMask, setWalletState])

  // Disconnect — revokes MetaMask permissions and sets session flag
  const disconnect = useCallback(async () => {
    try {
      // Revoke MetaMask site permissions so it won't auto-connect next visit
      if (window.ethereum) {
        await window.ethereum.request({
          method: 'wallet_revokePermissions',
          params: [{ eth_accounts: {} }],
        })
      }
    } catch (err) {
      console.warn('wallet_revokePermissions failed:', err.message)
      // Continue with disconnect even if revoke fails
    } finally {
      // Set session flag — prevents auto-reconnect until user manually connects
      sessionStorage.setItem(DISCONNECTED_KEY, 'true')
      clearWalletState()
    }
  }, [clearWalletState])

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
        // Only auto-update if user did not explicitly disconnect
        const userDisconnected = sessionStorage.getItem(DISCONNECTED_KEY)
        if (userDisconnected !== 'true') {
          await setWalletState(accounts[0])
        }
      } else {
        clearWalletState()
      }
    }

    const onChainChanged = (chainIdHex) => {
      const chainId = parseInt(chainIdHex, 16)
      setNetwork(chainId)
      setIsCorrectNetwork(chainId === ARC_TESTNET.id)
      if (account) fetchBalance(account)
    }

    window.ethereum.on('accountsChanged', onAccountsChanged)
    window.ethereum.on('chainChanged', onChainChanged)

    return () => {
      window.ethereum.removeListener('accountsChanged', onAccountsChanged)
      window.ethereum.removeListener('chainChanged', onChainChanged)
    }
  }, [account, fetchBalance, setWalletState, clearWalletState])

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
    disconnect,
    sendUsdc,
    refreshBalance,
    arcTestnet: ARC_TESTNET,
  }
}