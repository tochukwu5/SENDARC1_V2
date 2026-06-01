import { createContext, useContext, useState, useCallback } from 'react'

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
  const [backendOnline, setBackendOnline] = useState(false)

  const recordTransaction = useCallback(async (tx, walletAddress) => {
    const newTx = {
      ...tx,
      id: `TXN-ARC-${Date.now()}`,
      walletAddress,
      createdAt: new Date().toISOString(),
    }

    setTransactions(prev => [newTx, ...prev])

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

    try {
      const res = await fetch(`${API_BASE}/testnet/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newTx, walletAddress }),
      })
      if (res.ok) {
        setBackendOnline(true)
        console.log('✅ Transaction saved to MongoDB')
      }
    } catch {
      setBackendOnline(false)
      console.warn('Backend sync failed — transaction saved locally')
    }

    return newTx
  }, [transactions])

  const loadTransactions = useCallback(async (walletAddress) => {
    if (!walletAddress) return
    setIsSyncing(true)
    try {
      const res = await fetch(`${API_BASE}/testnet/transactions/${walletAddress}`)
      if (res.ok) {
        const data = await res.json()
        setTransactions(data.transactions || [])
        if (data.stats) {
          setStats({
            totalTransactions: data.stats.totalTransactions || 0,
            totalVolume: data.stats.totalVolume || 0,
            totalGasPaid: data.stats.totalGasPaid || 0,
            avgSettlementTime: data.stats.avgSettlementTime || 0,
            successRate: data.stats.successRate ?? 100,
            uniqueRecipients: data.stats.uniqueRecipients || 0,
            lastActivity: data.stats.lastActivity || null,
          })
        }
        setBackendOnline(true)
      }
    } catch {
      setBackendOnline(false)
    } finally {
      setIsSyncing(false)
    }
  }, [])

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
      backendOnline,
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