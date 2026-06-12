import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import { Card } from '../components/UI'

const WALLETS = [
  {
    id: 'metamask',
    name: 'MetaMask',
    desc: 'Most popular browser wallet',
    color: '#E8821A',
    icon: '🦊',
    available: true,
  },
  {
    id: 'walletconnect',
    name: 'WalletConnect',
    desc: 'Connect any mobile wallet',
    color: '#3B99FC',
    icon: '🔗',
    available: false,
  },
  {
    id: 'coinbase',
    name: 'Coinbase Wallet',
    desc: 'Easy onboarding for beginners',
    color: '#0052FF',
    icon: '🔵',
    available: false,
  },
]

const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')

// Register the wallet in MongoDB on first connect
// This creates a WalletStats entry so the user appears in leaderboard
async function registerWallet(address) {
  try {
    await fetch(API_BASE + '/testnet/wallet/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress: address.toLowerCase() }),
    })
  } catch {
    // Non-fatal — wallet will still be created when first transaction is recorded
    console.warn('Wallet pre-registration skipped (will be created on first tx)')
  }
}

export default function ConnectWallet() {
  const { connect, isConnected, wallet } = useWallet()
  const navigate = useNavigate()
  const [connecting, setConnecting] = useState(null)
  const [error, setError] = useState(null)
  const [step, setStep] = useState('idle') // idle | waiting | switching | success

  // If already connected, go straight to dashboard
  if (isConnected && wallet) {
    navigate('/dashboard')
    return null
  }

  const handleConnect = async (walletId) => {
    if (!WALLETS.find(w => w.id === walletId)?.available) return

    setConnecting(walletId)
    setError(null)
    setStep('waiting')

    try {
      // Step 1: Trigger MetaMask popup — user approves account
      const address = await connect(walletId)

      // Step 2: Switch to Arc Testnet (handled inside useArcTestnet)
      setStep('switching')

      // Step 3: Register wallet in MongoDB (non-blocking)
      await registerWallet(address)

      setStep('success')

      // Small pause so user sees the success state
      await new Promise(r => setTimeout(r, 600))

      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Connection failed. Please try again.')
      setConnecting(null)
      setStep('idle')
    }
  }

  const stepLabel = {
    idle: null,
    waiting: 'Waiting for MetaMask approval...',
    switching: 'Switching to Arc Testnet...',
    success: '✓ Connected! Redirecting...',
  }

  return (
    <div className="min-h-screen bg-[#0D1117] flex items-center justify-center px-6 py-16 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#00D4FF] opacity-[0.04] blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-[#7B61FF] opacity-[0.03] blur-[100px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Back */}
        <a href="/" className="inline-flex items-center gap-2 text-[#8892a0] text-sm mb-8 hover:text-white transition-colors group">
          <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
          Back to SendArc
        </a>

        <Card glow className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0a2030] to-[#051018] border border-[#00D4FF]/40 flex items-center justify-center mx-auto mb-4 text-3xl shadow-lg shadow-[#00D4FF]/10">
              👛
            </div>
            <h1 className="text-2xl font-bold font-['Space_Grotesk'] mb-2 text-white">Connect Your Wallet</h1>
            <p className="text-sm text-[#8892a0] leading-relaxed max-w-xs mx-auto">
              Connect your wallet to start sending USDC to Africa. No bank account required.
            </p>
          </div>

          {/* Wallet options */}
          <div className="space-y-3 mb-6">
            {WALLETS.map(w => {
              const isThisConnecting = connecting === w.id
              const isDone = step === 'success' && isThisConnecting

              return (
                <button
                  key={w.id}
                  onClick={() => handleConnect(w.id)}
                  disabled={!!connecting || !w.available}
                  className={
                    'w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left relative overflow-hidden ' +
                    (isDone
                      ? 'bg-[#0a2f1a] border-green-500/60'
                      : isThisConnecting
                      ? 'bg-[#0a2030] border-[#00D4FF]'
                      : w.available
                      ? 'bg-[#0D1117] border-[#1e2530] hover:border-[#00D4FF]/60 hover:bg-[#0a1520]'
                      : 'bg-[#0D1117] border-[#1e2530] opacity-50 cursor-not-allowed')
                  }
                >
                  {/* Shimmer on active */}
                  {isThisConnecting && !isDone && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#00D4FF]/5 to-transparent animate-pulse" />
                  )}

                  {/* Icon */}
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-xl shadow-md"
                    style={{ background: w.available ? w.color : '#1e2530' }}
                  >
                    {w.icon}
                  </div>

                  {/* Label */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold font-['Space_Grotesk'] text-sm text-white flex items-center gap-2">
                      {w.name}
                      {!w.available && (
                        <span className="text-[10px] font-normal text-[#556] border border-[#1e2530] rounded px-1.5 py-0.5">
                          Coming soon
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-[#8892a0] mt-0.5">{w.desc}</p>
                  </div>

                  {/* Right indicator */}
                  <div className="flex-shrink-0">
                    {isDone ? (
                      <span className="text-green-400 text-lg font-bold">✓</span>
                    ) : isThisConnecting ? (
                      <div className="w-5 h-5 border-2 border-[#00D4FF] border-t-transparent rounded-full animate-spin" />
                    ) : w.available ? (
                      <span className="text-[#00D4FF] text-lg opacity-60 group-hover:opacity-100">→</span>
                    ) : null}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Status message */}
          {step !== 'idle' && (
            <div className={
              'text-center text-xs mb-4 py-2.5 px-4 rounded-lg border ' +
              (step === 'success'
                ? 'text-green-400 bg-green-900/20 border-green-500/30'
                : 'text-[#00D4FF] bg-[#00D4FF]/5 border-[#00D4FF]/20')
            }>
              {stepLabel[step]}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="text-center text-red-400 text-xs mb-4 py-2.5 px-4 rounded-lg bg-red-900/20 border border-red-500/30">
              {error}
            </div>
          )}

          {/* Non-custodial info */}
          <div className="bg-[#0a2030] border border-[#00D4FF]/20 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-[#00D4FF] text-base mt-0.5 flex-shrink-0">🔒</span>
              <p className="text-xs text-[#8892a0] leading-relaxed">
                SendArc is{' '}
                <span className="text-white font-semibold">non-custodial</span>
                {' '}— we never hold your funds. Your wallet is your identity. You stay in full control.
              </p>
            </div>
          </div>

          {/* What is a wallet */}
          <div className="mt-5 text-center">
            <a
              href="https://ethereum.org/en/wallets/"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-[#00D4FF] hover:underline inline-flex items-center gap-1"
            >
              What is a crypto wallet? →
            </a>
          </div>
        </Card>

        {/* Footer note */}
        <p className="text-center text-[#556] text-xs mt-6">
          Powered by Arc Network · USDC native gas · EVM compatible
        </p>
      </div>
    </div>
  )
}