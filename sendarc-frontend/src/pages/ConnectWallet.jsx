import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import { WALLET_OPTIONS } from '../data/constants'
import { Card, LoadingSpinner } from '../components/UI'

export default function ConnectWallet() {
  const { connect } = useWallet()
  const navigate = useNavigate()
  const [connecting, setConnecting] = useState(null)
  const [error, setError] = useState(null)

  const handleConnect = async (walletId) => {
    setConnecting(walletId)
    setError(null)
    try {
      await new Promise(r => setTimeout(r, 1200)) // simulate connection delay
      await connect(walletId)
      navigate('/dashboard')
    } catch {
      setError('Connection failed. Please try again.')
      setConnecting(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#0D1117] flex items-center justify-center px-6 py-16">
      {/* Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[#00D4FF] opacity-[0.04] blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative">
        {/* Back link */}
        <a href="/" className="flex items-center gap-2 text-[#8892a0] text-sm mb-8 hover:text-white transition-colors">
          ← Back to SendArc
        </a>

        <Card glow className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-[#0a2030] border border-[#00D4FF] flex items-center justify-center mx-auto mb-4 text-2xl animate-float">
              👛
            </div>
            <h1 className="text-2xl font-bold font-['Space_Grotesk'] mb-2">Connect Your Wallet</h1>
            <p className="text-sm text-[#8892a0] leading-relaxed">
              Connect your wallet to start sending USDC to Africa. No bank account required.
            </p>
          </div>

          {/* Wallet options */}
          <div className="space-y-3 mb-6">
            {WALLET_OPTIONS.map(w => (
              <button
                key={w.id}
                onClick={() => handleConnect(w.id)}
                disabled={!!connecting}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
                  connecting === w.id
                    ? 'bg-[#0a2030] border-[#00D4FF]'
                    : 'bg-[#0D1117] border-[#1e2530] hover:border-[#00D4FF] hover:bg-[#0a1520]'
                } disabled:opacity-60`}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-white font-bold text-xs"
                  style={{ background: w.color }}
                >
                  {w.name.slice(0, 2)}
                </div>
                <div className="flex-1">
                  <p className="font-semibold font-['Space_Grotesk'] text-sm">{w.name}</p>
                  <p className="text-xs text-[#8892a0] mt-0.5">{w.desc}</p>
                </div>
                {connecting === w.id ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <span className="text-[#00D4FF] text-lg">→</span>
                )}
              </button>
            ))}
          </div>

          {error && (
            <p className="text-center text-red-400 text-sm mb-4">{error}</p>
          )}

          {/* Info box */}
          <div className="bg-[#0a2030] border border-[#00D4FF]/30 rounded-xl p-4 text-center">
            <p className="text-xs text-[#8892a0] leading-relaxed">
              SendArc is <span className="text-white">non-custodial</span> — we never hold your funds.
              Your wallet is your identity. You stay in full control.
            </p>
          </div>

          {/* What is a wallet */}
          <div className="mt-4 text-center">
            <a href="https://ethereum.org/en/wallets/" target="_blank" rel="noreferrer" className="text-xs text-[#00D4FF] hover:underline">
              What is a crypto wallet? →
            </a>
          </div>
        </Card>

        {/* Bottom note */}
        <p className="text-center text-[#556] text-xs mt-6">
          Powered by Arc Network · USDC native gas · EVM compatible
        </p>
      </div>
    </div>
  )
}
