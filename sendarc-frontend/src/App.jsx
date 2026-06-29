import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { WalletProvider } from './context/WalletContext'
import { TestnetProvider } from './context/TestnetContext'
import { useEffect } from 'react'
import { useArcTestnet } from './hooks/useArcTestnet'
import { useTestnet } from './context/TestnetContext'

import Navbar from './components/Navbar'
import Footer from './components/Footer'

import Home from './pages/Home'
import ConnectWallet from './pages/ConnectWallet'
import SendMoney from './pages/SendMoney'
import Dashboard from './pages/Dashboard'
import { Transactions, WalletPage, Notifications, Settings } from './pages/DashboardPages'
import { HowItWorks, CountriesPage, RatesPage, AboutPage, DocsPage } from './pages/PublicPages'

// Testnet pages
import TestnetHub from './pages/testnet/TestnetHub'
import TestnetSend from './pages/testnet/TestnetSend'
import { TestnetTransactions, TestnetLeaderboard } from './pages/testnet/TestnetPages'
import AdminPage from './pages/AdminPage'

function PublicLayout({ children }) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  )
}

// ─── GLOBAL WALLET BRIDGE ─────────────────────────────────────────────
// This component sits inside the app and watches for MetaMask auto-reconnect
// The moment account becomes available (on any page, including after refresh)
// it automatically loads the user's MongoDB data
const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '')

// Register wallet in MongoDB with retry logic
// Called the moment MetaMask connects — ensures every wallet is tracked
// in the admin dashboard from first connection, before any transactions
async function registerWalletSilently(address) {
  const addr = address.toLowerCase().trim()
  // Try up to 3 times with 2s delay between attempts
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(API_BASE + '/testnet/wallet/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: addr }),
      })
      const data = await res.json()
      if (data.success) {
        console.log(data.isNew
          ? 'New wallet registered in MongoDB: ' + addr
          : 'Wallet already registered: ' + addr
        )
        return true
      }
    } catch (err) {
      console.warn('Wallet register attempt ' + attempt + ' failed:', err.message)
      if (attempt < 3) await new Promise(r => setTimeout(r, 2000))
    }
  }
  console.warn('Wallet registration failed after 3 attempts — will register on first transaction')
  return false
}

function WalletBridge() {
  const { account, isConnected } = useArcTestnet()
  const { loadTransactions } = useTestnet()

  useEffect(() => {
    if (account && isConnected) {
      console.log('WalletBridge: account detected, loading MongoDB data for', account)
      // 1. Register wallet immediately so admin dashboard counts it right away
      registerWalletSilently(account)
      // 2. Load transaction history from MongoDB
      loadTransactions(account)
    }
  }, [account, isConnected])

  return null
}

export default function App() {
  return (
    <WalletProvider>
      <TestnetProvider>
        <BrowserRouter>
          {/* WalletBridge must be inside BrowserRouter and TestnetProvider */}
          <WalletBridge />
          <Routes>
            {/* Public pages */}
            <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/countries" element={<CountriesPage />} />
            <Route path="/rates" element={<RatesPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/docs" element={<DocsPage />} />

            {/* App pages */}
            <Route path="/connect" element={<ConnectWallet />} />
            <Route path="/send" element={<SendMoney />} />

            {/* Dashboard */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/transactions" element={<Transactions />} />
            <Route path="/dashboard/wallet" element={<WalletPage />} />
            <Route path="/dashboard/notifications" element={<Notifications />} />
            <Route path="/dashboard/settings" element={<Settings />} />

            {/* Testnet */}
            <Route path="/testnet" element={<TestnetHub />} />
            <Route path="/testnet/send" element={<TestnetSend />} />
            <Route path="/testnet/transactions" element={<TestnetTransactions />} />
            <Route path="/testnet/leaderboard" element={<TestnetLeaderboard />} />

            {/* Admin (password protected) */}
            <Route path="/admin" element={<AdminPage />} />

            {/* 404 */}
            <Route path="*" element={
              <PublicLayout>
                <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6">
                  <p className="text-8xl font-bold text-[#1e2530] font-['Space_Grotesk'] mb-4">404</p>
                  <h1 className="text-2xl font-bold mb-3">Page not found</h1>
                  <p className="text-[#8892a0] mb-8">This page doesn't exist on SendArc.</p>
                  <a href="/" className="bg-[#00D4FF] text-[#0D1117] font-['Space_Grotesk'] font-bold px-6 py-3 rounded-xl hover:opacity-90 transition-all">
                    Back to Home →
                  </a>
                </div>
              </PublicLayout>
            } />
          </Routes>
        </BrowserRouter>
      </TestnetProvider>
    </WalletProvider>
  )
}