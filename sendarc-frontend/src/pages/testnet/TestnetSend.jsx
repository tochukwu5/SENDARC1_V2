import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useArcTestnet } from '../../hooks/useArcTestnet'
import { useTestnet } from '../../context/TestnetContext'
import { ARC_TESTNET, shortAddr, arcScanTx } from '../../utils/arcTestnet'
import { Card, LoadingSpinner } from '../../components/UI'
import Navbar from '../../components/Navbar'

const STEPS = ['Connect Wallet', 'Send Details', 'Confirm', 'Complete']

export default function TestnetSend() {
  const navigate = useNavigate()
  const { account, balance, isConnected, isCorrectNetwork, connect, sendUsdc, isLoading, error, hasMetaMask, refreshBalance } = useArcTestnet()
  const { recordTransaction, loadTransactions } = useTestnet()

  const [step, setStep] = useState(isConnected && isCorrectNetwork ? 1 : 0)
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')
  const [txResult, setTxResult] = useState(null)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState(null)
  const [useOwnAddress, setUseOwnAddress] = useState(false)

  // Auto advance to step 1 when wallet connects
  useEffect(() => {
    if (isConnected && isCorrectNetwork && step === 0) setStep(1)
  }, [isConnected, isCorrectNetwork, step])

  const handleUseOwnAddress = () => {
    setRecipient(account || '')
    setUseOwnAddress(true)
  }

  const handleSend = async () => {
    setSending(true)
    setSendError(null)
    try {
      const result = await sendUsdc({ to: recipient, amount })
      const recorded = await recordTransaction(result, account)
      // Refresh stats from MongoDB immediately after recording
      await loadTransactions(account)
      setTxResult({ ...result, id: recorded.id })
      setStep(3)
    } catch (err) {
      setSendError(err.message || 'Transaction failed. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const gasEstimate = amount ? (parseFloat(amount) * 0.00003).toFixed(6) : '0.000000'
  const isValidAddress = recipient && recipient.startsWith('0x') && recipient.length === 42
  const isValidAmount = amount && parseFloat(amount) > 0 && parseFloat(amount) <= parseFloat(balance)

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#0D1117]">

        {/* Top bar */}
        <div className="border-b border-[#1e2530] bg-[#0f1822] px-6 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link to="/testnet" className="text-[#8892a0] hover:text-white text-sm transition-colors">← Testnet Hub</Link>
            <span className="text-[#1e2530]">/</span>
            <span className="text-sm text-white font-['Space_Grotesk'] font-semibold">Send USDC</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] border border-[#00D4FF]/30 text-[#00D4FF] px-2 py-1 rounded-full">Arc Testnet · Chain 5042002</span>
            {account && (
              <div className="flex items-center gap-2 bg-[#0D1117] border border-[#1e2530] rounded-lg px-3 py-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs font-mono text-white">{shortAddr(account)}</span>
                <span className="text-xs text-[#00D4FF] font-semibold">{balance} USDC</span>
              </div>
            )}
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-5 gap-8">

          {/* Left — steps + form */}
          <div className="lg:col-span-3">
            <h1 className="text-2xl font-bold font-['Space_Grotesk'] mb-1">Send Testnet USDC</h1>
            <p className="text-[#8892a0] text-sm mb-8">Real transactions on Arc Testnet. Gas deducted from your USDC balance.</p>

            {/* Step indicators */}
            <div className="space-y-2 mb-8">
              {STEPS.map((s, i) => (
                <div key={s} className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all ${
                  i === step ? 'bg-[#0a2030] border-[#00D4FF]' :
                  i < step ? 'border-[#1e2530] bg-[#0f1822]' : 'border-[#1e2530] opacity-40'
                }`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    i < step ? 'bg-[#00D4FF] text-[#0D1117]' :
                    i === step ? 'border-2 border-[#00D4FF] text-[#00D4FF]' : 'border border-[#1e2530] text-[#8892a0]'
                  }`}>
                    {i < step ? '✓' : i + 1}
                  </div>
                  <span className={`text-sm font-['Space_Grotesk'] font-semibold ${i === step ? 'text-white' : 'text-[#8892a0]'}`}>{s}</span>
                </div>
              ))}
            </div>

            {/* Step 0 — Connect */}
            {step === 0 && (
              <Card className="p-6">
                {!hasMetaMask ? (
                  <div className="text-center py-4">
                    <div className="text-4xl mb-4">🦊</div>
                    <h3 className="font-bold font-['Space_Grotesk'] mb-2">MetaMask Required</h3>
                    <p className="text-[#8892a0] text-sm mb-4">MetaMask is required to send transactions on Arc Testnet.</p>
                    <a href="https://metamask.io" target="_blank" rel="noreferrer"
                      className="bg-[#e8821a] text-white font-['Space_Grotesk'] font-bold px-6 py-2.5 rounded-xl hover:opacity-90 transition-all inline-block">
                      Install MetaMask ↗
                    </a>
                    <div className="mt-5 border-t border-[#1e2530] pt-4">
                      <p className="text-[10px] text-[#8892a0] mb-2">OTHER WALLETS — COMING SOON</p>
                      <div className="flex gap-2 justify-center flex-wrap">
                        {['WalletConnect', 'Coinbase Wallet', 'Rainbow'].map(w => (
                          <span key={w} className="text-[10px] border border-[#1e2530] text-[#556] px-2 py-1 rounded-full">{w}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <div className="text-4xl mb-4">🦊</div>
                    <h3 className="font-bold font-['Space_Grotesk'] mb-2">Connect MetaMask</h3>
                    <p className="text-[#8892a0] text-sm mb-4">We'll automatically add Arc Testnet to your wallet.</p>
                    <button onClick={connect} disabled={isLoading}
                      className="bg-[#00D4FF] text-[#0D1117] font-['Space_Grotesk'] font-bold px-8 py-3 rounded-xl hover:opacity-90 transition-all disabled:opacity-50">
                      {isLoading ? 'Connecting…' : 'Connect MetaMask'}
                    </button>
                    {error && <p className="mt-3 text-red-400 text-xs">{error}</p>}
                    <div className="mt-5 border-t border-[#1e2530] pt-4">
                      <p className="text-[10px] text-[#8892a0] mb-2">OTHER WALLETS — COMING SOON</p>
                      <div className="flex gap-2 justify-center flex-wrap">
                        {['WalletConnect', 'Coinbase Wallet', 'Rainbow', 'Ledger'].map(w => (
                          <span key={w} className="text-[10px] border border-[#1e2530] text-[#556] px-2 py-1 rounded-full opacity-60">{w} — Soon</span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* Step 1 — Send Details */}
            {step === 1 && (
              <div className="space-y-4">
                <Card className="p-5">
                  <p className="text-[10px] tracking-widest text-[#8892a0] mb-3">FROM (YOUR WALLET)</p>
                  <div className="bg-[#0D1117] border border-[#1e2530] rounded-lg p-3 mb-3">
                    <p className="font-mono text-sm text-white break-all">{account}</p>
                    <div className="flex justify-between mt-2">
                      <span className="text-[10px] text-[#8892a0]">Balance</span>
                      <span className="text-[10px] text-[#00D4FF] font-semibold">{balance} USDC</span>
                    </div>
                  </div>

                  <p className="text-[10px] tracking-widests text-[#8892a0] mb-2">AMOUNT (USDC)</p>
                  <div className="flex items-center gap-3 bg-[#0D1117] border border-[#1e2530] rounded-lg px-4 py-3 mb-2">
                    <input
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      max={parseFloat(balance)}
                      className="flex-1 bg-transparent text-white text-2xl font-bold outline-none font-['Space_Grotesk']"
                    />
                    <span className="text-sm text-white bg-[#1e2530] px-3 py-1 rounded-md">USDC</span>
                  </div>
                  <div className="flex justify-between text-xs text-[#8892a0]">
                    <span>Available: {balance} USDC</span>
                    <button onClick={() => setAmount((parseFloat(balance) - 0.001).toFixed(6))} className="text-[#00D4FF] hover:underline">Max</button>
                  </div>
                </Card>

                <Card className="p-5">
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-[10px] tracking-widest text-[#8892a0]">RECIPIENT ADDRESS</p>
                    <button onClick={handleUseOwnAddress} className="text-[10px] text-[#00D4FF] hover:underline">
                      Use my own address
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="0x... wallet address on Arc Testnet"
                    value={recipient}
                    onChange={e => { setRecipient(e.target.value); setUseOwnAddress(false) }}
                    className="w-full bg-[#0D1117] border border-[#1e2530] rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-[#00D4FF] transition-colors font-mono"
                  />
                  {useOwnAddress && (
                    <p className="text-[10px] text-[#00D4FF] mt-2">✓ Sending to your own address — great for testing</p>
                  )}
                  {recipient && !isValidAddress && (
                    <p className="text-[10px] text-red-400 mt-2">Invalid address format — must be 0x followed by 40 hex characters</p>
                  )}

                  <p className="text-[10px] tracking-widest text-[#8892a0] mt-4 mb-2">MEMO (OPTIONAL)</p>
                  <input
                    type="text"
                    placeholder="Add a note to this transaction"
                    value={memo}
                    onChange={e => setMemo(e.target.value)}
                    maxLength={100}
                    className="w-full bg-[#0D1117] border border-[#1e2530] rounded-lg px-4 py-2.5 text-sm text-white outline-none focus:border-[#00D4FF] transition-colors"
                  />
                </Card>

                <button
                  onClick={() => setStep(2)}
                  disabled={!isValidAddress || !isValidAmount}
                  className="w-full bg-[#00D4FF] text-[#0D1117] font-['Space_Grotesk'] font-bold py-3.5 rounded-xl hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Review Transaction →
                </button>
              </div>
            )}

            {/* Step 2 — Confirm */}
            {step === 2 && (
              <div className="space-y-4">
                <Card className="p-5">
                  <p className="text-[10px] tracking-widest text-[#8892a0] mb-4">TRANSACTION REVIEW</p>
                  <div className="space-y-3">
                    {[
                      { l: 'From', v: shortAddr(account), mono: true },
                      { l: 'To', v: shortAddr(recipient), mono: true },
                      { l: 'Amount', v: `${amount} USDC` },
                      { l: 'Est. Gas Fee', v: `~${gasEstimate} USDC`, accent: true },
                      { l: 'Settlement Time', v: '< 1 second', accent: true },
                      { l: 'Network', v: 'Arc Testnet · Chain 5042002' },
                      { l: 'Explorer', v: 'testnet.arcscan.app' },
                    ].map(r => (
                      <div key={r.l} className="flex justify-between items-center border-b border-[#1e2530] pb-2.5 last:border-0 last:pb-0 text-sm">
                        <span className="text-[#8892a0]">{r.l}</span>
                        <span className={`${r.accent ? 'text-[#00D4FF]' : 'text-white'} font-semibold ${r.mono ? 'font-mono text-xs' : ''}`}>{r.v}</span>
                      </div>
                    ))}
                    {memo && (
                      <div className="border-t border-[#1e2530] pt-2.5 text-sm">
                        <span className="text-[#8892a0]">Memo: </span>
                        <span className="text-white">{memo}</span>
                      </div>
                    )}
                  </div>
                </Card>

                <div className="bg-[#0a1520] border border-[#00D4FF]/20 rounded-xl p-4">
                  <p className="text-xs text-[#8892a0] leading-relaxed">
                    <span className="text-white font-semibold">MetaMask will open</span> — review and sign the transaction. Gas is paid in USDC on Arc Testnet. The transfer confirms in under 1 second.
                  </p>
                </div>

                {sendError && (
                  <div className="bg-red-900/10 border border-red-500/30 rounded-xl p-4">
                    <p className="text-xs text-red-400">{sendError}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button onClick={() => setStep(1)}
                    className="flex-1 border border-[#1e2530] text-[#8892a0] py-3 rounded-xl hover:border-[#00D4FF] transition-all font-['Space_Grotesk'] font-semibold text-sm">
                    Edit
                  </button>
                  <button onClick={handleSend} disabled={sending}
                    className="flex-[2] bg-[#00D4FF] text-[#0D1117] font-['Space_Grotesk'] font-bold py-3 rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                    {sending ? (
                      <><LoadingSpinner size="sm" /> Processing on Arc…</>
                    ) : (
                      'Sign & Send →'
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3 — Success */}
            {step === 3 && txResult && (
              <Card glow className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-green-900/30 border-2 border-green-500 flex items-center justify-center mx-auto mb-5 text-2xl">✓</div>
                <h2 className="text-2xl font-bold font-['Space_Grotesk'] mb-1">
                  Transaction <span className="text-green-400">Confirmed!</span>
                </h2>
                <p className="text-[#8892a0] text-sm mb-1">Confirmed on Arc Network</p>
                <p className="text-[#00D4FF] text-xs mb-8">
                  Settlement: <strong>{(txResult.settlementTime/1000).toFixed(2)}s</strong> · Block #{txResult.blockNumber}
                </p>

                <div className="bg-[#0D1117] border border-[#1e2530] rounded-xl p-5 text-left mb-5 space-y-3">
                  {[
                    { l: 'Transaction ID', v: txResult.id, mono: true, small: true },
                    { l: 'Amount Sent', v: `${txResult.amount} USDC` },
                    { l: 'Gas Paid', v: `${txResult.gasCost} USDC`, accent: true },
                    { l: 'Gas Used', v: `${txResult.gasUsed} units` },
                    { l: 'Settlement Time', v: `${(txResult.settlementTime/1000).toFixed(3)} seconds`, accent: true },
                    { l: 'Status', v: 'Confirmed · FINAL', green: true },
                    { l: 'Network', v: 'Arc Testnet · Chain 5042002' },
                  ].map(r => (
                    <div key={r.l} className="flex justify-between items-center border-b border-[#1e2530] pb-2 last:border-0 last:pb-0 text-sm">
                      <span className="text-[#8892a0]">{r.l}</span>
                      <span className={`${r.green ? 'text-green-400' : r.accent ? 'text-[#00D4FF]' : 'text-white'} font-semibold ${r.mono ? 'font-mono' : ''} ${r.small ? 'text-xs' : ''}`}>{r.v}</span>
                    </div>
                  ))}
                  <div className="pt-1">
                    <p className="text-[10px] text-[#8892a0] mb-1">ON-CHAIN TX HASH</p>
                    <a href={arcScanTx(txResult.hash)} target="_blank" rel="noreferrer"
                      className="text-[10px] text-[#00D4FF] font-mono break-all hover:underline">
                      {txResult.hash}
                    </a>
                  </div>
                </div>

                <div className="flex gap-3 mb-4">
                  <a href={arcScanTx(txResult.hash)} target="_blank" rel="noreferrer"
                    className="flex-1 border border-[#00D4FF] text-[#00D4FF] py-2.5 rounded-xl text-sm font-['Space_Grotesk'] font-bold hover:bg-[#0a2030] transition-all text-center">
                    View on ArcScan ↗
                  </a>
                  <button onClick={() => navigator.clipboard.writeText(txResult.hash)}
                    className="flex-1 border border-[#1e2530] text-[#8892a0] py-2.5 rounded-xl text-sm hover:border-[#00D4FF] transition-all">
                    📋 Copy TX Hash
                  </button>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => {
                    setStep(1); setRecipient(''); setAmount(''); setMemo(''); setTxResult(null); refreshBalance()
                  }} className="flex-1 bg-[#00D4FF] text-[#0D1117] font-['Space_Grotesk'] font-bold py-2.5 rounded-xl text-sm hover:opacity-90 transition-all">
                    Send Another →
                  </button>
                  <Link to="/testnet/transactions"
                    className="flex-1 border border-[#1e2530] text-[#8892a0] py-2.5 rounded-xl text-sm hover:border-[#00D4FF] hover:text-white transition-all text-center">
                    View History
                  </Link>
                </div>
              </Card>
            )}
          </div>

          {/* Right sidebar */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="p-5">
              <p className="text-[10px] tracking-widest text-[#8892a0] mb-4">TRANSACTION SUMMARY</p>
              <div className="text-4xl font-bold font-['Space_Grotesk'] text-white mb-1">{amount || '0'}</div>
              <p className="text-xs text-[#8892a0] mb-5">USDC · Arc Testnet</p>
              <div className="space-y-2.5 text-sm">
                {[
                  { l: 'Network Fee', v: `~${gasEstimate} USDC`, accent: true },
                  { l: 'Settlement', v: '< 1 second', accent: true },
                  { l: 'Chain', v: 'Arc Testnet · 5042002' },
                  { l: 'Explorer', v: 'ArcScan', link: ARC_TESTNET.explorerUrl },
                  { l: 'Gas Token', v: 'USDC (native)' },
                ].map(r => (
                  <div key={r.l} className="flex justify-between border-b border-[#1e2530] pb-2 last:border-0 last:pb-0">
                    <span className="text-[#8892a0]">{r.l}</span>
                    {r.link ? (
                      <a href={r.link} target="_blank" rel="noreferrer" className="text-[#00D4FF] hover:underline text-xs">{r.v} ↗</a>
                    ) : (
                      <span className={r.accent ? 'text-[#00D4FF] font-semibold' : 'text-white'}>{r.v}</span>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <p className="text-[10px] tracking-widest text-[#8892a0] mb-4">YOUR WALLET</p>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#8892a0]">Address</span>
                  <span className="font-mono text-xs text-white">{shortAddr(account)}</span>
                </div>
                <div className="flex justify-between border-t border-[#1e2530] pt-2.5">
                  <span className="text-[#8892a0]">USDC Balance</span>
                  <span className="text-[#00D4FF] font-bold">{balance}</span>
                </div>
                <div className="flex justify-between border-t border-[#1e2530] pt-2.5">
                  <span className="text-[#8892a0]">Network</span>
                  <span className={`text-xs font-semibold ${isCorrectNetwork ? 'text-green-400' : 'text-amber-400'}`}>
                    {isCorrectNetwork ? '● Arc Testnet' : '⚠ Wrong Network'}
                  </span>
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <p className="text-[10px] tracking-widest text-[#8892a0] mb-3">SUPPORTED WALLETS</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between py-1.5 border-b border-[#1e2530]">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded bg-[#e8821a] flex items-center justify-center text-[10px] text-white font-bold">M</span>
                    <span className="text-sm text-white">MetaMask</span>
                  </div>
                  <span className="text-[10px] bg-green-900/20 border border-green-500 text-green-400 px-2 py-0.5 rounded-full">Live</span>
                </div>
                {['WalletConnect', 'Coinbase Wallet', 'Rainbow', 'Ledger'].map(w => (
                  <div key={w} className="flex items-center justify-between py-1.5 border-b border-[#1e2530] last:border-0 opacity-50">
                    <span className="text-sm text-[#8892a0]">{w}</span>
                    <span className="text-[10px] border border-[#1e2530] text-[#556] px-2 py-0.5 rounded-full">Soon</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4">
              <p className="text-[10px] tracking-widest text-[#8892a0] mb-2">NEED TESTNET USDC?</p>
              <a href={ARC_TESTNET.faucetUrl} target="_blank" rel="noreferrer"
                className="block w-full text-center border border-[#00D4FF] text-[#00D4FF] py-2.5 rounded-xl text-sm font-['Space_Grotesk'] font-bold hover:bg-[#0a2030] transition-all">
                Circle Faucet → 10 USDC Free
              </a>
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}