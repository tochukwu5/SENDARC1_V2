import express from 'express'
import Transaction from '../models/Transaction.js'
import WalletStats from '../models/WalletStats.js'

const router = express.Router()

// ─── POST /api/testnet/transactions ──────────────────────────────────
// Record a new testnet transaction
router.post('/transactions', async (req, res) => {
  try {
    const {
      id, hash, from, to, amount, gasCost, gasUsed,
      settlementTime, blockNumber, timestamp, status,
      network, chainId, memo, walletAddress,
    } = req.body

    if (!id || !hash || !from || !to || !amount || !walletAddress) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Check for duplicate
    const existing = await Transaction.findOne({ id })
    if (existing) return res.status(409).json({ error: 'Transaction already recorded', transaction: existing })

    // Save transaction
    const tx = await Transaction.create({
      id, hash, from: from.toLowerCase(), to: to.toLowerCase(),
      amount: parseFloat(amount),
      gasCost: gasCost || '0.000000',
      gasUsed: gasUsed || 0,
      settlementTime: settlementTime || 0,
      blockNumber,
      timestamp,
      status: status || 'confirmed',
      network: network || 'Arc Testnet',
      chainId: chainId || 5042002,
      memo: memo || '',
      selfTransfer: from.toLowerCase() === to.toLowerCase(),
      walletAddress: walletAddress.toLowerCase(),
    })

    // Update or create wallet stats
    await updateWalletStats(walletAddress.toLowerCase(), tx)

    res.status(201).json({ success: true, transaction: tx })
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Duplicate transaction' })
    console.error('Record transaction error:', err)
    res.status(500).json({ error: 'Failed to record transaction' })
  }
})

// ─── GET /api/testnet/transactions/:walletAddress ─────────────────────
// Get all transactions + stats for a wallet
router.get('/transactions/:walletAddress', async (req, res) => {
  try {
    const wallet = req.params.walletAddress.toLowerCase()
    const { page = 1, limit = 50, status } = req.query

    const query = { walletAddress: wallet }
    if (status && status !== 'all') query.status = status

    const [transactions, total, stats] = await Promise.all([
      Transaction.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .lean(),
      Transaction.countDocuments(query),
      WalletStats.findOne({ walletAddress: wallet }).lean(),
    ])

    res.json({
      success: true,
      transactions,
      total,
      page: parseInt(page),
      stats: stats ? {
        totalTransactions: stats.totalTransactions,
        totalVolume: stats.totalVolume,
        totalGasPaid: stats.totalGasPaid,
        avgSettlementTime: stats.avgSettlementTime,
        successRate: stats.totalTransactions
          ? Math.round((stats.confirmedTransactions / stats.totalTransactions) * 100)
          : 100,
        uniqueRecipients: stats.uniqueRecipients,
        lastActivity: stats.lastActivity,
        fastestSettlement: stats.fastestSettlement,
      } : null,
    })
  } catch (err) {
    console.error('Get transactions error:', err)
    res.status(500).json({ error: 'Failed to fetch transactions' })
  }
})

// ─── GET /api/testnet/stats/:walletAddress ────────────────────────────
// Get stats only for a wallet
router.get('/stats/:walletAddress', async (req, res) => {
  try {
    const wallet = req.params.walletAddress.toLowerCase()
    const stats = await WalletStats.findOne({ walletAddress: wallet }).lean()

    if (!stats) {
      return res.json({
        success: true,
        stats: {
          totalTransactions: 0, totalVolume: 0, totalGasPaid: 0,
          avgSettlementTime: 0, successRate: 100, uniqueRecipients: 0,
          lastActivity: null,
        }
      })
    }

    res.json({
      success: true,
      stats: {
        totalTransactions: stats.totalTransactions,
        confirmedTransactions: stats.confirmedTransactions,
        failedTransactions: stats.failedTransactions,
        totalVolume: stats.totalVolume,
        totalGasPaid: stats.totalGasPaid,
        avgSettlementTime: stats.avgSettlementTime,
        fastestSettlement: stats.fastestSettlement,
        successRate: stats.totalTransactions
          ? Math.round((stats.confirmedTransactions / stats.totalTransactions) * 100)
          : 100,
        uniqueRecipients: stats.uniqueRecipients,
        lastActivity: stats.lastActivity,
        firstActivity: stats.firstActivity,
      }
    })
  } catch (err) {
    console.error('Get stats error:', err)
    res.status(500).json({ error: 'Failed to fetch stats' })
  }
})

// ─── GET /api/testnet/leaderboard ─────────────────────────────────────
// Get global leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const { limit = 50 } = req.query

    const leaders = await WalletStats.find({})
      .sort({ totalVolume: -1, totalTransactions: -1 })
      .limit(parseInt(limit))
      .lean()

    const leaderboard = leaders.map((entry, i) => ({
      rank: i + 1,
      address: entry.walletAddress,
      totalTransactions: entry.totalTransactions,
      totalVolume: entry.totalVolume.toFixed(2),
      totalGasPaid: entry.totalGasPaid.toFixed(6),
      avgSettlement: entry.avgSettlementTime
        ? `${(entry.avgSettlementTime / 1000).toFixed(2)}s`
        : '—',
      fastestSettlement: entry.fastestSettlement
        ? `${(entry.fastestSettlement / 1000).toFixed(3)}s`
        : '—',
      successRate: entry.totalTransactions
        ? Math.round((entry.confirmedTransactions / entry.totalTransactions) * 100)
        : 100,
      lastActivity: entry.lastActivity,
    }))

    // Global stats
    const globalStats = await Transaction.aggregate([
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          totalVolume: { $sum: '$amount' },
          totalGasPaid: { $sum: { $toDouble: '$gasCost' } },
          avgSettlement: { $avg: '$settlementTime' },
          uniqueWallets: { $addToSet: '$walletAddress' },
        }
      }
    ])

    const global = globalStats[0] || {}

    res.json({
      success: true,
      leaderboard,
      globalStats: {
        totalTransactions: global.totalTransactions || 0,
        totalVolume: (global.totalVolume || 0).toFixed(2),
        totalGasPaid: (global.totalGasPaid || 0).toFixed(6),
        avgSettlement: global.avgSettlement
          ? `${(global.avgSettlement / 1000).toFixed(2)}s`
          : '—',
        activeWallets: global.uniqueWallets?.length || 0,
      }
    })
  } catch (err) {
    console.error('Leaderboard error:', err)
    res.status(500).json({ error: 'Failed to fetch leaderboard' })
  }
})

// ─── GET /api/testnet/network-stats ───────────────────────────────────
// Aggregate network-wide stats
router.get('/network-stats', async (req, res) => {
  try {
    const [volumeByDay, gasStats, settlementStats, totalWallets] = await Promise.all([
      // Volume per day (last 7 days)
      Transaction.aggregate([
        { $match: { status: 'confirmed', createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
        { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          volume: { $sum: '$amount' },
          count: { $sum: 1 },
          avgGas: { $avg: { $toDouble: '$gasCost' } },
        }},
        { $sort: { _id: 1 } }
      ]),
      // Gas stats
      Transaction.aggregate([
        { $match: { status: 'confirmed' } },
        { $group: {
          _id: null,
          avgGas: { $avg: { $toDouble: '$gasCost' } },
          totalGas: { $sum: { $toDouble: '$gasCost' } },
          minGas: { $min: { $toDouble: '$gasCost' } },
          maxGas: { $max: { $toDouble: '$gasCost' } },
        }}
      ]),
      // Settlement stats
      Transaction.aggregate([
        { $match: { status: 'confirmed', settlementTime: { $gt: 0 } } },
        { $group: {
          _id: null,
          avgSettlement: { $avg: '$settlementTime' },
          minSettlement: { $min: '$settlementTime' },
          maxSettlement: { $max: '$settlementTime' },
        }}
      ]),
      WalletStats.countDocuments(),
    ])

    res.json({
      success: true,
      volumeByDay,
      gasStats: gasStats[0] || {},
      settlementStats: settlementStats[0] || {},
      totalWallets,
    })
  } catch (err) {
    console.error('Network stats error:', err)
    res.status(500).json({ error: 'Failed to fetch network stats' })
  }
})

// ─── Helper: update wallet stats after a new transaction ─────────────
async function updateWalletStats(walletAddress, tx) {
  try {
    const isConfirmed = tx.status === 'confirmed'
    const gasCostNum = parseFloat(tx.gasCost) || 0

    // Get existing unique recipients
    const uniqueRecipients = await Transaction.distinct('to', {
      walletAddress,
      status: 'confirmed',
    })

    // Aggregate current totals
    const agg = await Transaction.aggregate([
      { $match: { walletAddress } },
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          confirmedTransactions: { $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] } },
          failedTransactions: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
          totalVolume: { $sum: '$amount' },
          totalGasPaid: { $sum: { $toDouble: '$gasCost' } },
          avgSettlement: { $avg: '$settlementTime' },
          minSettlement: { $min: '$settlementTime' },
        }
      }
    ])

    const data = agg[0] || {}

    await WalletStats.findOneAndUpdate(
      { walletAddress },
      {
        $set: {
          totalTransactions: data.totalTransactions || 0,
          confirmedTransactions: data.confirmedTransactions || 0,
          failedTransactions: data.failedTransactions || 0,
          totalVolume: data.totalVolume || 0,
          totalGasPaid: data.totalGasPaid || 0,
          avgSettlementTime: data.avgSettlement || 0,
          fastestSettlement: data.minSettlement || null,
          uniqueRecipients: uniqueRecipients.length,
          lastActivity: new Date(),
        },
        $setOnInsert: { firstActivity: new Date() }
      },
      { upsert: true, new: true }
    )
  } catch (err) {
    console.error('Update wallet stats error:', err)
  }
}

export default router
