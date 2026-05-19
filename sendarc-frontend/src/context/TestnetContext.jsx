import { createContext, useContext, useState, useCallback } from 'react'

// Backend API base — update when backend is deployed
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const TestnetContext = createContext(null)

export function TestnetProvider({ children }) {
  const [transactions, setTransactions] = useState([])
  const [stats, setStats] = useState({
    totalTransactions: 0,
    totalVolume: 0,
    totalGasPaid: 0,
    avgSettlementTime: 0,
    successRate: 100,
    uniqueRecipients: 0,
    lastActivity: null,
  })
  const [leaderboard, setLeaderboard] = useState([])
  const [isSyncing, setIsSyncing] = useState(false)

  // Save a new transaction (local + backend)
  const recordTransaction = useCallback(async (tx, walletAddress) => {
    const newTx = {
      ...tx,
      id: `TXN-ARC-${Date.now()}`,
      walletAddress,
      createdAt: new Date().toISOString(),
    }

    // Add to local state immediately
    setTransactions(prev => [newTx, ...prev])

    // Update local stats
    setStats(prev => {
      const allTxs = [newTx, ...transactions]
      const confirmed = allTxs.filter(t => t.status === 'confirmed')
      const totalVol = allTxs.reduce((s, t) => s + (t.amount || 0), 0)
      const totalGas = allTxs.reduce((s, t) => s + parseFloat(t.gasCost || 0), 0)
      const avgTime = confirmed.length
        ? confirmed.reduce((s, t) => s + (t.settlementTime || 0), 0) / confirmed.length
        : 0
      const recipients = new Set(allTxs.map(t => t.to)).size

      return {
        totalTransactions: allTxs.length,
        totalVolume: totalVol,
        totalGasPaid: totalGas,
        avgSettlementTime: avgTime,
        successRate: allTxs.length ? Math.round((confirmed.length / allTxs.length) * 100) : 100,
        uniqueRecipients: recipients,
        lastActivity: new Date().toISOString(),
      }
    })

    // Sync to backend (non-blocking)
    try {
      await fetch(`${API_BASE}/testnet/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newTx, walletAddress }),
      })
    } catch {
      // Backend offline — local state persists
      console.warn('Backend sync failed — transaction saved locally')
    }

    return newTx
  }, [transactions])

  // Load transactions from backend for a wallet
  const loadTransactions = useCallback(async (walletAddress) => {
    if (!walletAddress) return
    setIsSyncing(true)
    try {
      const res = await fetch(`${API_BASE}/testnet/transactions/${walletAddress}`)
      if (res.ok) {
        const data = await res.json()
        setTransactions(data.transactions || [])
        setStats(data.stats || stats)
      }
    } catch {
      // Backend offline — use local state
    } finally {
      setIsSyncing(false)
    }
  }, [])

  // Load global leaderboard
  const loadLeaderboard = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/testnet/leaderboard`)
      if (res.ok) {
        const data = await res.json()
        setLeaderboard(data.leaderboard || [])
      }
    } catch {
      // offline
    }
  }, [])

  return (
    <TestnetContext.Provider value={{
      transactions,
      stats,
      leaderboard,
      isSyncing,
      recordTransaction,
      loadTransactions,
      loadLeaderboard,
    }}>
      {children}
    </TestnetContext.Provider>
  )
}

export const useTestnet = () => {
  const ctx = useContext(TestnetContext)
  if (!ctx) throw new Error('useTestnet must be inside TestnetProvider')
  return ctx
}
