import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useArcTestnet } from '../../hooks/useArcTestnet'
import { useTestnet } from '../../context/TestnetContext'
import { ARC_TESTNET, EVM_CHAINS, shortAddr, arcScanTx, switchToChain, sendUsdcOnChain, getUsdcBalance } from '../../utils/arcTestnet'
import { Card, LoadingSpinner } from '../../components/UI'
import Navbar from '../../components/Navbar'

const STEPS = ['Connect Wallet', 'Send Details', 'Confirm', 'Complete']

const CHAIN_LIST = [
  EVM_CHAINS.arc,
  EVM_CHAINS.ethereum,
  EVM_CHAINS.base,
  EVM_CHAINS.arbitrum,
]

export default function TestnetSend() {
  const { account, balance: arcBalance, isConnected, isCorrectNetwork, connect, isLoading, error, hasMetaMask, refreshBalance } = useArcTestnet()
  const { recordTransaction, loadTransactions } = useTestnet()

  const [step, setStep] = useState(isConnected ? 1 : 0)
  const [sourceChainKey, setSourceChainKey] = useState('arc')
  const [chainBalance, setChainBalance] = useState(arcBalance)
  const [switchingChain, setSwitchingChain] = useState(false)
  const [switchError, setSwitchError] = useState(null)
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')
  const [txResult, setTxResult] = useState(null)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState(null)
  const [useOwnAddress, setUseOwnAddress] = useState(false)

  const selectedChain = EVM_CHAINS[sourceChainKey]

  useEffect(() => {
    if (isConnected && step === 0) setStep(1)
  }, [isConnected, step])

  const handleChainSelect = async (chainKey) => {
    if (chainKey === sourceChainKey) return
    setSwitchingChain(true)
    setSwitchError(null)
    setAmount('')
    try {
      await switchToChain(chainKey)
      setSourceChainKey(chainKey)
      if (account) {
        const bal = await getUsdcBalance(chainKey, account)
        setChainBalance(bal)
      }
    } catch (err) {
      if (err.code === 4001) {
        setSwitchError('You rejected the network switch. Please try again.')
      } else {
        setSwitchError(err.message || 'Could not switch network')
      }
    } finally {
      setSwitchingChain(false)
    }
  }

  useEffect(() => {
    if (!account) return
    getUsdcBalance(sourceChainKey, account).then(setChainBalance)
  }, [sourceChainKey, account, arcBalance])

  const handleUseOwnAddress = () => {
    setRecipient(account || '')
    setUseOwnAddress(true)
  }

  const handleSend = async () => {
    setSending(true)
    setSendError(null)
    try {
      const result = await sendUsdcOnChain(sourceChainKey, { to: recipient, amount })
      await recordTransaction(result, account)
      await loadTransactions(account)
      if (sourceChainKey === 'arc') refreshBalance()
      else {
        const bal = await getUsdcBalance(sourceChainKey, account)
        setChainBalance(bal)
      }
      setTxResult(result)
      setStep(3)
    } catch (err) {
      if (err.code === 4001) {
        setSendError('Transaction rejected in MetaMask.')
      } else {
        setSendError(err.message || 'Transaction failed. Please try again.')
      }
    } finally {
      setSending(false)
    }
  }

  const gasEstimate = amount ? (parseFloat(amount) * 0.00003).toFixed(6) : '0.000000'
  const afterSend = amount && parseFloat(chainBalance) ? (parseFloat(chainBalance) - parseFloat(amount)).toFixed(6) : null
  const isValidAddress = recipient && recipient.startsWith('0x') && recipient.length === 42
  const isValidAmount = amount && parseFloat(amount) > 0 && parseFloat(amount) <= parseFloat(chainBalance)

  const explorerTxUrl = (hash) => {
    return selectedChain.explorerUrl + '/tx/' + hash
  }

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
            <span className="text-[10px] border border-[#00D4FF]/30 text-[#00D4FF] px-2 py-1 rounded-full">
              {selectedChain ? selectedChain.name : 'Arc Testnet'}
            </span>
            {account && (
              <div className="flex items-center gap-2 bg-[#0D1117] border border-[#1e2530] rounded-lg px-3 py-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs font-mono text-white">{shortAddr(account)}</span>
                <span className="text-xs text-[#00D4FF] font-semibold">{chainBalance} USDC</span>
              </div>
            )}
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-5 gap-8">

          {/* Left — steps + form */}
          <div className="lg:col-span-3">
            <h1 className="text-2xl font-bold font-['Space_Grotesk'] mb-1">Send USDC</h1>
            <p className="text-[#8892a0] text-sm mb-8">Send real USDC from any supported chain. MetaMask switches automatically.</p>

            {/* Step indicators */}
            <div className="space-y-2 mb-8">
              {STEPS.map((s, i) => (
                <div key={s} className={'flex items-center gap-3 p-3.5 rounded-xl border transition-all ' + (
                  i === step ? 'bg-[#0a2030] border-[#00D4FF]' :
                  i < step ? 'border-[#1e2530] bg-[#0f1822]' : 'border-[#1e2530] opacity-40'
                )}>
                  <div className={'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ' + (
                    i < step ? 'bg-[#00D4FF] text-[#0D1117]' :
                    i === step ? 'border-2 border-[#00D4FF] text-[#00D4FF]' : 'border border-[#1e2530] text-[#8892a0]'
                  )}>
                    {i < step ? '✓' : i + 1}
                  </div>
                  <span className={'text-sm font-[\'Space_Grotesk\'] font-semibold ' + (i === step ? 'text-white' : 'text-[#8892a0]')}>{s}</span>
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
                    <p className="text-[#8892a0] text-sm mb-4">MetaMask is required to send USDC on any chain.</p>
                    <a
                      href="https://metamask.io"
                      target="_blank"
                      rel="noreferrer"
                      className="bg-[#e8821a] text-white font-['Space_Grotesk'] font-bold px-6 py-2.5 rounded-xl hover:opacity-90 transition-all inline-block"
                    >
                      Install MetaMask ↗
                    </a>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <div className="text-4xl mb-4">🦊</div>
                    <h3 className="font-bold font-['Space_Grotesk'] mb-2">Connect MetaMask</h3>
                    <p className="text-[#8892a0] text-sm mb-4">Connect once — we handle network switching automatically.</p>
                    <button
                      onClick={connect}
                      disabled={isLoading}
                      className="bg-[#00D4FF] text-[#0D1117] font-['Space_Grotesk'] font-bold px-8 py-3 rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
                    >
                      {isLoading ? 'Connecting…' : 'Connect MetaMask'}
                    </button>
                    {error && <p className="mt-3 text-red-400 text-xs">{error}</p>}
                  </div>
                )}
              </Card>
            )}

            {/* Step 1 — Send Details */}
            {step === 1 && (
              <div className="space-y-4">

                {/* SOURCE CHAIN SELECTOR */}
                <Card className="p-5">
                  <p className="text-[10px] tracking-widest text-[#8892a0] mb-3">SOURCE CHAIN</p>
                  <div className="flex gap-2 flex-wrap">
                    {CHAIN_LIST.map(chain => (
                      <button
                        key={chain.id}
                        onClick={() => handleChainSelect(Object.keys(EVM_CHAINS).find(k => EVM_CHAINS[k].id === chain.id))}
                        disabled={switchingChain}
                        className={'px-4 py-2 rounded-xl border text-sm font-semibold transition-all flex items-center gap-1.5 disabled:opacity-60 ' + (
                          sourceChainKey === Object.keys(EVM_CHAINS).find(k => EVM_CHAINS[k].id === chain.id)
                            ? 'text-white'
                            : 'border-[#1e2530] text-[#8892a0] hover:border-[#00D4FF]/50 hover:text-white'
                        )}
                        style={
                          sourceChainKey === Object.keys(EVM_CHAINS).find(k => EVM_CHAINS[k].id === chain.id)
                            ? { borderColor: chain.color, backgroundColor: chain.color + '15' }
                            : {}
                        }
                      >
                        <span>{chain.icon}</span>
                        <span>{chain.name}</span>
                      </button>
                    ))}
                  </div>

                  {switchingChain && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-[#00D4FF]">
                      <LoadingSpinner size="sm" />
                      <span>Switching network in MetaMask…</span>
                    </div>
                  )}
                  {switchError && (
                    <p className="mt-2 text-xs text-red-400">{switchError}</p>
                  )}
                  {!switchingChain && !switchError && selectedChain && (
                    <div className="mt-3 flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-green-900/10 border border-green-500/20 text-green-400">
                      <span>● Live</span>
                      <span>·</span>
                      <span>{selectedChain.note}</span>
                    </div>
                  )}
                </Card>

                {/* FROM WALLET */}
                <Card className="p-5">
                  <p className="text-[10px] tracking-widest text-[#8892a0] mb-3">FROM (YOUR WALLET)</p>
                  <div className="bg-[#0D1117] border border-[#1e2530] rounded-lg p-3 mb-4">
                    <p className="font-mono text-sm text-white break-all">{account}</p>
                    <div className="flex justify-between mt-2">
                      <span className="text-[10px] text-[#8892a0]">Balance</span>
                      <span className="text-[10px] text-[#00D4FF] font-semibold">{chainBalance} USDC</span>
                    </div>
                  </div>

                  <p className="text-[10px] tracking-widest text-[#8892a0] mb-2">AMOUNT (USDC)</p>
                  <div className="flex items-center gap-3 bg-[#0D1117] border border-[#1e2530] rounded-lg px-4 py-3 mb-2">
                    <input
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={e => {
                        const val = parseFloat(e.target.value)
                        if (e.target.value === '' || e.target.value === '0') {
                          setAmount('')
                        } else if (!isNaN(val) && val > 0) {
                          setAmount(e.target.value)
                        }
                      }}
                      min="0"
                      max={parseFloat(chainBalance)}
                      className="flex-1 bg-transparent text-white text-2xl font-bold outline-none font-['Space_Grotesk']"
                    />
                    <span className="text-sm text-white bg-[#1e2530] px-3 py-1 rounded-md">USDC</span>
                  </div>
                  <div className="flex justify-between text-xs text-[#8892a0]">
                    <span>Your Balance: <span className="text-[#00D4FF]">{chainBalance} USDC</span></span>
                    <button
                      onClick={() => setAmount((parseFloat(chainBalance) - 0.001).toFixed(6))}
                      className="text-[#00D4FF] hover:underline"
                    >
                      Max
                    </button>
                  </div>
                  {afterSend !== null && (
                    <div className="flex justify-between text-xs mt-1">
                      <span className="text-[#8892a0]">After Send</span>
                      <span className={parseFloat(afterSend) < 0 ? 'text-red-400' : 'text-[#8892a0]'}>
                        {afterSend} USDC
                      </span>
                    </div>
                  )}
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
                    placeholder={'0x... wallet address on ' + (selectedChain ? selectedChain.name : 'the network')}
                    value={recipient}
                    onChange={e => { setRecipient(e.target.value); setUseOwnAddress(false) }}
                    className="w-full bg-[#0D1117] border border-[#1e2530] rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-[#00D4FF] transition-colors font-mono"
                  />
                  {useOwnAddress && (
                    <p className="text-[10px] text-[#00D4FF] mt-2">✓ Sending to your own address — great for testing</p>
                  )}
                  {recipient && !isValidAddress && (
                    <p className="text-[10px] text-red-400 mt-2">Invalid address — must be 0x followed by 40 hex characters</p>
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
                  disabled={!isValidAddress || !isValidAmount || switchingChain}
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
                      { l: 'Source Chain', v: selectedChain ? selectedChain.name : 'Arc Testnet' },
                      { l: 'From', v: shortAddr(account), mono: true },
                      { l: 'To', v: shortAddr(recipient), mono: true },
                      { l: 'Amount', v: amount + ' USDC' },
                      { l: 'Est. Gas Fee', v: sourceChainKey === 'arc' ? '~' + gasEstimate + ' USDC' : 'ETH gas (from your wallet)', accent: true },
                      { l: 'Settlement Time', v: sourceChainKey === 'arc' ? '< 1 second' : '~15-30 seconds', accent: true },
                      { l: 'Network', v: selectedChain ? selectedChain.name : 'Arc Testnet' },
                    ].map(r => (
                      <div key={r.l} className="flex justify-between items-center border-b border-[#1e2530] pb-2.5 last:border-0 last:pb-0 text-sm">
                        <span className="text-[#8892a0]">{r.l}</span>
                        <span className={'font-semibold ' + (r.accent ? 'text-[#00D4FF]' : 'text-white') + (r.mono ? ' font-mono text-xs' : '')}>{r.v}</span>
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
                    <span className="text-white font-semibold">MetaMask will open</span> — review and sign the transaction.
                    {sourceChainKey !== 'arc' && (
                      <span> Gas is paid in ETH on {selectedChain ? selectedChain.name : 'this network'}. Make sure you have enough ETH for gas.</span>
                    )}
                    {sourceChainKey === 'arc' && (
                      <span> Gas is paid in USDC on Arc Testnet. Confirms in under 1 second.</span>
                    )}
                  </p>
                </div>

                {sendError && (
                  <div className="bg-red-900/10 border border-red-500/30 rounded-xl p-4">
                    <p className="text-xs text-red-400">{sendError}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 border border-[#1e2530] text-[#8892a0] py-3 rounded-xl hover:border-[#00D4FF] transition-all font-['Space_Grotesk'] font-semibold text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={sending}
                    className="flex-[2] bg-[#00D4FF] text-[#0D1117] font-['Space_Grotesk'] font-bold py-3 rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {sending ? (
                      <><LoadingSpinner size="sm" /> Processing…</>
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
                <p className="text-[#8892a0] text-sm mb-1">Confirmed on {txResult.sourceChain}</p>
                <p className="text-[#00D4FF] text-xs mb-8">
                  Settlement: <strong>{(txResult.settlementTime / 1000).toFixed(2)}s</strong> · Block #{txResult.blockNumber}
                </p>

                <div className="bg-[#0D1117] border border-[#1e2530] rounded-xl p-5 text-left mb-5 space-y-3">
                  {[
                    { l: 'Chain', v: txResult.sourceChain },
                    { l: 'Amount Sent', v: txResult.amount + ' USDC' },
                    { l: 'Gas Paid', v: txResult.gasCost, accent: true },
                    { l: 'Settlement', v: (txResult.settlementTime / 1000).toFixed(3) + 's', accent: true },
                    { l: 'Status', v: 'Confirmed · FINAL', green: true },
                  ].map(r => (
                    <div key={r.l} className="flex justify-between border-b border-[#1e2530] pb-2 last:border-0 last:pb-0 text-sm">
                      <span className="text-[#8892a0]">{r.l}</span>
                      <span className={'font-semibold ' + (r.green ? 'text-green-400' : r.accent ? 'text-[#00D4FF]' : 'text-white')}>{r.v}</span>
                    </div>
                  ))}
                  <div className="pt-1">
                    <p className="text-[10px] text-[#8892a0] mb-1">TX HASH</p>
                    <a
                      href={explorerTxUrl(txResult.hash)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-[#00D4FF] font-mono break-all hover:underline"
                    >
                      {txResult.hash}
                    </a>
                  </div>
                </div>

                <div className="flex gap-3 mb-3">
                  <a
                    href={explorerTxUrl(txResult.hash)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 border border-[#00D4FF] text-[#00D4FF] py-2.5 rounded-xl text-sm font-['Space_Grotesk'] font-bold hover:bg-[#0a2030] transition-all text-center"
                  >
                    View on Explorer ↗
                  </a>
                  <button
                    onClick={() => navigator.clipboard.writeText(txResult.hash)}
                    className="flex-1 border border-[#1e2530] text-[#8892a0] py-2.5 rounded-xl text-sm hover:border-[#00D4FF] transition-all"
                  >
                    📋 Copy TX Hash
                  </button>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setStep(1)
                      setRecipient('')
                      setAmount('')
                      setMemo('')
                      setTxResult(null)
                    }}
                    className="flex-1 bg-[#00D4FF] text-[#0D1117] font-['Space_Grotesk'] font-bold py-2.5 rounded-xl text-sm hover:opacity-90 transition-all"
                  >
                    Send Another →
                  </button>
                  <Link
                    to="/testnet/transactions"
                    className="flex-1 border border-[#1e2530] text-[#8892a0] py-2.5 rounded-xl text-sm hover:border-[#00D4FF] hover:text-white transition-all text-center"
                  >
                    View History
                  </Link>
                </div>
              </Card>
            )}
          </div>

          {/* Right sidebar */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="p-5">
              <p className="text-[10px] tracking-widest text-[#8892a0] mb-3">TRANSACTION SUMMARY</p>
              {selectedChain && (
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#1e2530]">
                  <span className="text-xl">{selectedChain.icon}</span>
                  <div>
                    <p className="text-sm text-white font-semibold">{selectedChain.name}</p>
                    <p className="text-[10px] text-green-400">● Live</p>
                  </div>
                </div>
              )}
              <div className="text-4xl font-bold font-['Space_Grotesk'] text-white mb-1">{amount || '0'}</div>
              <p className="text-xs text-[#8892a0] mb-4">USDC</p>

              {amount && parseFloat(amount) > 0 && (
                <div className="bg-[#0D1117] border border-[#1e2530] rounded-lg p-3 mb-4 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#8892a0]">Your Balance</span>
                    <span className="text-[#00D4FF]">{chainBalance} USDC</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8892a0]">After Send</span>
                    <span className={afterSend && parseFloat(afterSend) < 0 ? 'text-red-400' : 'text-white'}>
                      {afterSend} USDC
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-2.5 text-sm">
                {[
                  { l: 'Gas Token', v: sourceChainKey === 'arc' ? 'USDC (native)' : 'ETH' },
                  { l: 'Settlement', v: sourceChainKey === 'arc' ? '< 1 second' : '~15-30s' },
                  { l: 'Explorer', v: selectedChain ? selectedChain.explorerUrl.replace('https://', '') : '', link: selectedChain ? selectedChain.explorerUrl : '' },
                ].map(r => (
                  <div key={r.l} className="flex justify-between border-b border-[#1e2530] pb-2 last:border-0 last:pb-0">
                    <span className="text-[#8892a0]">{r.l}</span>
                    {r.link ? (
                      <a href={r.link} target="_blank" rel="noreferrer" className="text-[#00D4FF] hover:underline text-xs">{r.v} ↗</a>
                    ) : (
                      <span className="text-white">{r.v}</span>
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
                  <span className="text-[#00D4FF] font-bold">{chainBalance}</span>
                </div>
                <div className="flex justify-between border-t border-[#1e2530] pt-2.5">
                  <span className="text-[#8892a0]">Active Chain</span>
                  <span className="text-green-400 text-xs font-semibold">
                    ● {selectedChain ? selectedChain.name : 'Arc Testnet'}
                  </span>
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <p className="text-[10px] tracking-widest text-[#8892a0] mb-3">SUPPORTED CHAINS</p>
              <div className="space-y-2">
                {CHAIN_LIST.map(chain => (
                  <button
                    key={chain.id}
                    onClick={() => handleChainSelect(Object.keys(EVM_CHAINS).find(k => EVM_CHAINS[k].id === chain.id))}
                    disabled={switchingChain}
                    className={'w-full flex items-center justify-between py-2 px-2 rounded-lg border transition-all ' + (
                      sourceChainKey === Object.keys(EVM_CHAINS).find(k => EVM_CHAINS[k].id === chain.id)
                        ? 'border-[#00D4FF]/40 bg-[#0a2030]'
                        : 'border-transparent hover:border-[#1e2530]'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{chain.icon}</span>
                      <span className="text-sm text-white">{chain.name}</span>
                    </div>
                    <span className="text-[10px] bg-green-900/20 border border-green-500 text-green-400 px-2 py-0.5 rounded-full">Live</span>
                  </button>
                ))}
              </div>
            </Card>

            <Card className="p-4">
              <p className="text-[10px] tracking-widest text-[#8892a0] mb-2">NEED TESTNET USDC?</p>
              <a
                href={ARC_TESTNET.faucetUrl}
                target="_blank"
                rel="noreferrer"
                className="block w-full text-center border border-[#00D4FF] text-[#00D4FF] py-2.5 rounded-xl text-sm font-['Space_Grotesk'] font-bold hover:bg-[#0a2030] transition-all"
              >
                Circle Faucet → 10 USDC Free
              </a>
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}