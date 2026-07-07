import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useArcTestnet } from '../../hooks/useArcTestnet'
import { useTestnet } from '../../context/TestnetContext'
import {
  ARC_TESTNET, EVM_CHAINS, shortAddr, arcScanTx,
  switchToChain, sendUsdcOnChain, getUsdcBalance
} from '../../utils/arcTestnet'
import { Card, LoadingSpinner } from '../../components/UI'
import Navbar from '../../components/Navbar'
import TokenSelectModal, { TokenIcon } from '../../components/TokenSelectModal'
import NetworkTokenModal from '../../components/NetworkTokenModal'

// CCTP flow steps shown while a bridge transaction is in flight
const CCTP_STEPS = [
  { key: 'approve', label: 'Approve' },
  { key: 'burn',     label: 'Burn' },
  { key: 'attest',   label: 'Attest' },
  { key: 'mint',     label: 'Mint on Arc' },
]

// Every network shown in the bridge picker. Only ones with `usdcAddress`
// resolved are wired to real CCTP contracts in arcTestnet.js — the rest
// are shown for visual completeness and marked "Soon".
const ALL_NETWORKS = [
  { key: 'arc',       name: 'Arc Testnet',       icon: '⬡',  usdcAddress: ARC_TESTNET.usdcAddress },
  { key: 'ethereum',  name: 'Ethereum Sepolia',  icon: '⟠',  usdcAddress: EVM_CHAINS.ethereum.usdcAddress },
  { key: 'base',      name: 'Base Sepolia',      icon: '🔵', usdcAddress: EVM_CHAINS.base.usdcAddress },
  { key: 'arbitrum',  name: 'Arbitrum Sepolia',  icon: '🔷', usdcAddress: EVM_CHAINS.arbitrum.usdcAddress },
  { key: 'optimism',  name: 'Optimism Sepolia',  icon: '🔴' },
  { key: 'avalanche', name: 'Avalanche Fuji',    icon: '🔺' },
  { key: 'linea',     name: 'Linea Sepolia',     icon: '🌀' },
  { key: 'polygon',   name: 'Polygon Amoy',      icon: '🟣' },
  { key: 'sonic',     name: 'Sonic Testnet',     icon: '💨' },
  { key: 'unichain',  name: 'Unichain Sepolia',  icon: '🦄' },
]
const FROM_ENABLED = ['ethereum', 'base', 'arbitrum']
const TO_ENABLED = ['arc']

const AMOUNT_PRESETS = [1, 5, 10]

export default function TestnetSend() {
  const {
    account, balance: arcBalance, isConnected,
    connect, isLoading, error, hasMetaMask, refreshBalance
  } = useArcTestnet()
  const { recordTransaction, loadTransactions } = useTestnet()

  const [activeTab, setActiveTab] = useState('send') // 'send' | 'bridge'
  const [view, setView] = useState('form')            // 'form' | 'confirm' | 'success'

  const [sourceChainKey, setSourceChainKey] = useState('arc')
  const [bridgeToKey, setBridgeToKey] = useState('arc')
  const [chainBalance, setChainBalance] = useState(arcBalance)
  const [switchingChain, setSwitchingChain] = useState(false)
  const [switchError, setSwitchError] = useState(null)

  const [selectedToken, setSelectedToken] = useState('USDC')
  const [showTokenModal, setShowTokenModal] = useState(false)
  const [showFromModal, setShowFromModal] = useState(false)
  const [showToModal, setShowToModal] = useState(false)

  const [recipient, setRecipient] = useState('')
  const [useOwnAddress, setUseOwnAddress] = useState(false)
  const [showWalletInput, setShowWalletInput] = useState(false)
  const [amount, setAmount] = useState('')
  const [showMemo, setShowMemo] = useState(false)
  const [memo, setMemo] = useState('')

  const [txResult, setTxResult] = useState(null)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState(null)

  // CCTP progress tracking
  const [cctpStatus, setCctpStatus] = useState('')
  const [cctpActiveStep, setCctpActiveStep] = useState(-1)
  const [cctpDoneSteps, setCctpDoneSteps] = useState([])

  const selectedChain = EVM_CHAINS[sourceChainKey]
  const isCCTP = selectedChain && selectedChain.useCCTP
  const tokenSupported = selectedToken === 'USDC'

  const fromNetworks = ALL_NETWORKS.map(n => ({ ...n, enabled: FROM_ENABLED.includes(n.key) }))
  const toNetworks = ALL_NETWORKS.map(n => ({ ...n, enabled: TO_ENABLED.includes(n.key) }))
  const sendTokens = [
    { symbol: 'USDC',   name: 'USD Coin',       icon: '$', color: '#2775CA', balance: chainBalance,   enabled: true },
    { symbol: 'EURC',   name: 'Euro Coin',      icon: '€', color: '#1F6FD1', balance: '0.000000', enabled: false },
    { symbol: 'USDT',   name: 'Tether USD',     icon: '₮', color: '#26A17B', balance: '0.000000', enabled: false },
    { symbol: 'cirBTC', name: 'Circle Bitcoin', icon: '₿', color: '#8256E9', balance: '0.000000', enabled: false },
  ]

  const handleChainSelect = async (chainKey) => {
    if (chainKey === sourceChainKey) return
    setSwitchingChain(true)
    setSwitchError(null)
    setAmount('')
    try {
      await switchToChain(chainKey)
      setSourceChainKey(chainKey)
      if (account) setChainBalance(await getUsdcBalance(chainKey, account))
    } catch (err) {
      setSwitchError(err.message || 'Could not switch network')
    } finally {
      setSwitchingChain(false)
    }
  }

  // Keep the wallet network in sync with the active tab
  useEffect(() => {
    if (!isConnected) return
    if (activeTab === 'send' && sourceChainKey !== 'arc') handleChainSelect('arc')
    if (activeTab === 'bridge' && sourceChainKey === 'arc') handleChainSelect('ethereum')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isConnected])

  useEffect(() => {
    if (!account) return
    getUsdcBalance(sourceChainKey, account).then(setChainBalance)
  }, [sourceChainKey, account, arcBalance])

  // Default the recipient to the connected wallet until the person expands
  // "Add receiving wallet" and picks someone else — mirrors the reference flow.
  useEffect(() => {
    if (activeTab === 'bridge' && account && !showWalletInput) {
      setRecipient(account)
      setUseOwnAddress(true)
    }
  }, [activeTab, account, showWalletInput])

  const handleStatusUpdate = (msg) => {
    setCctpStatus(msg)
    if (msg.includes('Approving')) { setCctpActiveStep(0); setCctpDoneSteps([]) }
    else if (msg.includes('Approval confirmed')) { setCctpDoneSteps(['approve']); setCctpActiveStep(1) }
    else if (msg.includes('Burning')) { setCctpActiveStep(1) }
    else if (msg.includes('burned on')) { setCctpDoneSteps(p => [...p, 'burn']); setCctpActiveStep(2) }
    else if (msg.includes('attestation')) { setCctpActiveStep(2) }
    else if (msg.includes('Attestation received')) { setCctpDoneSteps(p => [...p, 'attest']); setCctpActiveStep(3) }
    else if (msg.includes('Switching to Arc') || msg.includes('minting')) { setCctpActiveStep(3) }
    else if (msg.includes('minted on Arc')) { setCctpDoneSteps(p => [...p, 'mint']); setCctpActiveStep(-1) }
  }

  const handleSend = async () => {
    setSending(true)
    setSendError(null)
    setCctpStatus('')
    setCctpActiveStep(-1)
    setCctpDoneSteps([])
    try {
      const result = await sendUsdcOnChain(sourceChainKey, { to: recipient, amount }, handleStatusUpdate)
      await recordTransaction(result, account)
      await loadTransactions(account)
      if (sourceChainKey === 'arc') refreshBalance()
      else setChainBalance(await getUsdcBalance(sourceChainKey, account))
      setTxResult(result)
      setView('success')
    } catch (err) {
      if (err.code === 4001) setSendError('Transaction rejected in MetaMask.')
      else setSendError(err.message || 'Transaction failed. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const resetForm = () => {
    setView('form'); setAmount(''); setMemo(''); setShowMemo(false); setShowWalletInput(false)
    setTxResult(null); setCctpStatus(''); setCctpDoneSteps([]); setCctpActiveStep(-1); setSendError(null)
  }

  const changeTab = (tab) => {
    if (tab === activeTab) return
    setActiveTab(tab)
    setSelectedToken('USDC')
    resetForm()
  }

  const afterSend = amount && parseFloat(chainBalance)
    ? (parseFloat(chainBalance) - parseFloat(amount)).toFixed(6)
    : null
  const isValidAddress = recipient && recipient.startsWith('0x') && recipient.length === 42
  const isValidAmount = amount && parseFloat(amount) > 0 && parseFloat(amount) <= parseFloat(chainBalance)
  const canReview = isValidAddress && isValidAmount && !switchingChain && tokenSupported

  const explorerTxUrl = (hash) => selectedChain ? selectedChain.explorerUrl + '/tx/' + hash : arcScanTx(hash)

  const fillAmount = (val) => {
    const capped = Math.min(val, parseFloat(chainBalance) || 0)
    setAmount(capped > 0 ? capped.toString() : '')
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#0D1117] px-4 py-10">
        <div className="max-w-lg mx-auto">

          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-xl font-bold font-['Space_Grotesk'] text-white">Send &amp; Bridge USDC</h1>
              <p className="text-xs text-[#8892a0] mt-0.5">Move USDC across wallets and chains.</p>
            </div>
            {account && (
              <div className="flex items-center gap-2 bg-[#0f1822] border border-[#1e2530] rounded-lg px-3 py-1.5">
                <span className="live-dot" />
                <span className="text-xs font-mono text-white">{shortAddr(account)}</span>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-[#0f1822] border border-[#1e2530] rounded-xl p-1 mb-4">
            {[
              { key: 'send', label: 'Send' },
              { key: 'bridge', label: 'Bridge' },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => changeTab(t.key)}
                className={'flex-1 py-2 rounded-lg text-sm font-semibold font-[\'Space_Grotesk\'] transition-all ' + (
                  activeTab === t.key ? 'bg-[#00D4FF] text-[#0D1117]' : 'text-[#8892a0] hover:text-white'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <Card className="p-6">

            {/* Not connected */}
            {!isConnected && view === 'form' && (
              <div className="text-center py-4">
                <div className="text-3xl mb-3">🦊</div>
                {!hasMetaMask ? (
                  <>
                    <h3 className="font-bold font-['Space_Grotesk'] mb-1.5">MetaMask required</h3>
                    <p className="text-[#8892a0] text-sm mb-4">Install MetaMask to send or bridge USDC.</p>
                    <a href="https://metamask.io" target="_blank" rel="noreferrer"
                      className="bg-[#e8821a] text-white font-['Space_Grotesk'] font-bold px-6 py-2.5 rounded-xl hover:opacity-90 inline-block">
                      Install MetaMask ↗
                    </a>
                  </>
                ) : (
                  <>
                    <h3 className="font-bold font-['Space_Grotesk'] mb-1.5">Connect your wallet</h3>
                    <p className="text-[#8892a0] text-sm mb-4">We'll switch networks for you automatically.</p>
                    <button onClick={connect} disabled={isLoading}
                      className="bg-[#00D4FF] text-[#0D1117] font-['Space_Grotesk'] font-bold px-8 py-3 rounded-xl hover:opacity-90 disabled:opacity-50">
                      {isLoading ? 'Connecting…' : 'Connect Wallet'}
                    </button>
                    {error && <p className="mt-3 text-red-400 text-xs">{error}</p>}
                  </>
                )}
              </div>
            )}

            {/* ── SEND FORM ─────────────────────────────────────────── */}
            {isConnected && view === 'form' && activeTab === 'send' && (
              <div>
                <p className="text-[10px] tracking-widest text-[#8892a0] mb-2">YOU SEND</p>
                <div className="bg-[#0D1117] border border-[#1e2530] rounded-xl px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <button
                      onClick={() => setShowTokenModal(true)}
                      className="flex items-center gap-1.5 text-sm text-white font-semibold hover:text-[#00D4FF] transition-colors"
                    >
                      <TokenIcon symbol={sendTokens.find(t => t.symbol === selectedToken)?.icon} color={sendTokens.find(t => t.symbol === selectedToken)?.color} size={22} />
                      {selectedToken}
                      <span className="text-[#8892a0] text-xs">⌄</span>
                    </button>
                    <span className="text-[10px] text-[#8892a0]">
                      Balance: {tokenSupported ? chainBalance : '0.000000'} {selectedToken}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      disabled={!tokenSupported}
                      onChange={e => {
                        const val = parseFloat(e.target.value)
                        if (e.target.value === '' || e.target.value === '0') setAmount('')
                        else if (!isNaN(val) && val > 0) setAmount(e.target.value)
                      }}
                      min="0"
                      className="flex-1 bg-transparent text-white text-2xl font-bold outline-none font-['Space_Grotesk'] disabled:opacity-30"
                    />
                    <span className="text-sm text-white bg-[#1e2530] px-3 py-1 rounded-md">{selectedToken}</span>
                    {tokenSupported && (
                      <button
                        onClick={() => setAmount(Math.max(0, parseFloat(chainBalance) - 0.001).toFixed(6))}
                        className="text-[10px] text-[#00D4FF] hover:underline"
                      >
                        Max
                      </button>
                    )}
                  </div>
                </div>

                {!tokenSupported && (
                  <div className="mt-2.5 bg-[#1a1408] border border-[#3d2f10] rounded-lg px-3 py-2 flex items-start gap-2">
                    <span className="text-sm">🚧</span>
                    <p className="text-xs text-[#e8c374]">{selectedToken} isn't live on Arc Testnet yet — switch to USDC to send.</p>
                  </div>
                )}

                {/* Divider arrow */}
                <div className="flex justify-center -my-2.5 relative z-10">
                  <div className="w-8 h-8 rounded-full bg-[#0f1822] border border-[#1e2530] flex items-center justify-center text-[#8892a0]">↓</div>
                </div>

                {/* Recipient */}
                <div className="bg-[#0D1117] border border-[#1e2530] rounded-xl px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] tracking-widest text-[#8892a0]">SEND TO</span>
                    <button onClick={() => { setRecipient(account || ''); setUseOwnAddress(true) }}
                      className="text-[10px] text-[#00D4FF] hover:underline">
                      Use my address
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="0x… wallet address"
                    value={recipient}
                    onChange={e => { setRecipient(e.target.value); setUseOwnAddress(false) }}
                    className="w-full bg-transparent text-white text-sm font-mono outline-none"
                  />
                  {useOwnAddress && <p className="text-[10px] text-[#00D4FF] mt-1">✓ Sending to your own address</p>}
                  {recipient && !isValidAddress && (
                    <p className="text-[10px] text-red-400 mt-1">Must be a valid 0x address</p>
                  )}
                </div>

                {!showMemo ? (
                  <button onClick={() => setShowMemo(true)} className="text-[10px] text-[#8892a0] hover:text-[#00D4FF] mt-2">
                    + Add a note (optional)
                  </button>
                ) : (
                  <input
                    type="text"
                    placeholder="Add a note to this transaction"
                    value={memo}
                    onChange={e => setMemo(e.target.value)}
                    maxLength={100}
                    className="w-full mt-2 bg-[#0D1117] border border-[#1e2530] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#00D4FF] transition-colors"
                  />
                )}

                <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-[#1e2530] text-center">
                  <div>
                    <p className="text-[9px] text-[#8892a0] mb-0.5">RATE</p>
                    <p className="text-xs text-white font-semibold">1 : 1</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-[#8892a0] mb-0.5">EST. TIME</p>
                    <p className="text-xs text-white font-semibold">&lt; 1 sec</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-[#8892a0] mb-0.5">NETWORK FEE</p>
                    <p className="text-xs text-white font-semibold">USDC gas</p>
                  </div>
                </div>

                {afterSend !== null && tokenSupported && (
                  <div className="flex justify-between text-xs mt-3 text-[#8892a0]">
                    <span>After send</span>
                    <span className={parseFloat(afterSend) < 0 ? 'text-red-400' : 'text-white'}>{afterSend} USDC</span>
                  </div>
                )}

                <button
                  onClick={() => setView('confirm')}
                  disabled={!canReview}
                  className="w-full mt-5 bg-[#00D4FF] text-[#0D1117] font-['Space_Grotesk'] font-bold py-3.5 rounded-xl hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Review &amp; Send →
                </button>
              </div>
            )}

            {/* ── BRIDGE FORM ───────────────────────────────────────── */}
            {isConnected && view === 'form' && activeTab === 'bridge' && (
              <div>
                <div className="flex justify-end gap-2 mb-3">
                  <Link to="/testnet/transactions" title="History"
                    className="w-8 h-8 rounded-lg border border-[#1e2530] flex items-center justify-center text-[#8892a0] hover:text-white hover:border-[#00D4FF] transition-colors text-sm">
                    🕓
                  </Link>
                  <button
                    title="Refresh balance"
                    onClick={() => account && getUsdcBalance(sourceChainKey, account).then(setChainBalance)}
                    className="w-8 h-8 rounded-lg border border-[#1e2530] flex items-center justify-center text-[#8892a0] hover:text-white hover:border-[#00D4FF] transition-colors text-sm">
                    🔄
                  </button>
                </div>

                {/* Bridge from */}
                <div className="bg-[#0D1117] border border-[#1e2530] rounded-xl px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] tracking-widest text-[#8892a0]">BRIDGE FROM</span>
                    <span className="text-[10px] text-[#8892a0]">
                      Balance: {chainBalance} USDC
                      {parseFloat(chainBalance) > 0 && (
                        <button onClick={() => setAmount(Math.max(0, parseFloat(chainBalance) - 0.001).toFixed(6))}
                          className="ml-2 text-[#00D4FF] hover:underline">Max</button>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <button
                      onClick={() => setShowFromModal(true)}
                      disabled={switchingChain}
                      className="flex items-center gap-1.5 bg-[#1e2530] px-3 py-1.5 rounded-lg text-sm text-white font-semibold hover:opacity-80 transition-opacity flex-shrink-0 disabled:opacity-60"
                    >
                      <TokenIcon symbol="$" color="#2775CA" size={20} />
                      USDC <span className="text-[#8892a0] text-xs">⌄</span>
                    </button>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={e => {
                        const val = parseFloat(e.target.value)
                        if (e.target.value === '' || e.target.value === '0') setAmount('')
                        else if (!isNaN(val) && val > 0) setAmount(e.target.value)
                      }}
                      min="0"
                      className="flex-1 min-w-0 bg-transparent text-white text-2xl font-bold outline-none font-['Space_Grotesk'] text-right"
                    />
                  </div>
                  <p className="text-[10px] text-[#556] mt-1">{selectedChain?.icon} {selectedChain?.name}</p>
                  {switchingChain && (
                    <p className="mt-1.5 text-xs text-[#00D4FF] flex items-center gap-1.5">
                      <LoadingSpinner size="sm" /> Switching network…
                    </p>
                  )}
                  {switchError && <p className="mt-1.5 text-xs text-red-400">{switchError}</p>}
                </div>

                {/* Divider arrow — reversing not yet supported */}
                <div className="flex justify-center -my-2.5 relative z-10">
                  <div
                    title="Bridging out of Arc Testnet isn't available yet"
                    className="w-8 h-8 rounded-full bg-[#0f1822] border border-[#1e2530] flex items-center justify-center text-[#8892a0] cursor-default"
                  >
                    ↓
                  </div>
                </div>

                {/* Bridge to */}
                <div className="bg-[#0D1117] border border-[#1e2530] rounded-xl px-4 py-3">
                  <p className="text-[10px] tracking-widest text-[#8892a0] mb-2">BRIDGE TO</p>
                  <div className="flex items-center justify-between gap-3">
                    <button
                      onClick={() => setShowToModal(true)}
                      className="flex items-center gap-1.5 bg-[#1e2530] px-3 py-1.5 rounded-lg text-sm text-white font-semibold hover:opacity-80 transition-opacity flex-shrink-0"
                    >
                      <TokenIcon symbol="$" color="#2775CA" size={20} />
                      USDC <span className="text-[#8892a0] text-xs">⌄</span>
                    </button>
                    <span className="flex-1 min-w-0 text-right text-2xl font-bold font-['Space_Grotesk'] text-[#8892a0]">
                      {amount || '0.00'}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#556] mt-1">⬡ Arc Testnet</p>
                </div>

                {/* Receiving wallet */}
                {!showWalletInput ? (
                  <button onClick={() => setShowWalletInput(true)} className="text-[10px] text-[#8892a0] hover:text-[#00D4FF] mt-2">
                    + Add receiving wallet
                  </button>
                ) : (
                  <div className="mt-2 bg-[#0D1117] border border-[#1e2530] rounded-xl px-4 py-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] tracking-widest text-[#8892a0]">RECEIVING WALLET (ARC TESTNET)</span>
                      <button onClick={() => { setRecipient(account || ''); setUseOwnAddress(true) }}
                        className="text-[10px] text-[#00D4FF] hover:underline">
                        Use my address
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="0x… wallet address"
                      value={recipient}
                      onChange={e => { setRecipient(e.target.value); setUseOwnAddress(false) }}
                      className="w-full bg-transparent text-white text-sm font-mono outline-none"
                    />
                    {useOwnAddress && <p className="text-[10px] text-[#00D4FF] mt-1">✓ Sending to your own address</p>}
                    {recipient && !isValidAddress && (
                      <p className="text-[10px] text-red-400 mt-1">Must be a valid 0x address</p>
                    )}
                  </div>
                )}

                {/* Quick presets */}
                <div className="flex gap-2 mt-3">
                  {AMOUNT_PRESETS.map(v => (
                    <button
                      key={v}
                      onClick={() => fillAmount(v)}
                      className="flex items-center gap-1 bg-[#0f1822] border border-[#1e2530] rounded-full px-3 py-1 text-[11px] text-white hover:border-[#00D4FF] transition-colors"
                    >
                      <TokenIcon symbol="$" color="#2775CA" size={14} /> {v} USDC
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-[#1e2530] text-center">
                  <div>
                    <p className="text-[9px] text-[#8892a0] mb-0.5">RATE</p>
                    <p className="text-xs text-white font-semibold">1 : 1</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-[#8892a0] mb-0.5">EST. TIME</p>
                    <p className="text-xs text-white font-semibold">~2–5 min</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-[#8892a0] mb-0.5">NETWORK FEE</p>
                    <p className="text-xs text-white font-semibold">ETH gas</p>
                  </div>
                </div>

                <button
                  onClick={() => setView('confirm')}
                  disabled={!canReview}
                  className="w-full mt-5 bg-[#00D4FF] text-[#0D1117] font-['Space_Grotesk'] font-bold py-3.5 rounded-xl hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Review &amp; Bridge →
                </button>
              </div>
            )}

            {/* Confirm view */}
            {view === 'confirm' && (
              <div>
                <p className="text-[10px] tracking-widest text-[#8892a0] mb-4">
                  {activeTab === 'bridge' ? 'BRIDGE REVIEW' : 'TRANSFER REVIEW'}
                </p>
                <div className="space-y-3 mb-5">
                  {[
                    { l: 'Route',   v: isCCTP ? selectedChain?.name + ' → Arc (CCTP)' : 'Arc Testnet (direct)' },
                    { l: 'From',    v: shortAddr(account), mono: true },
                    { l: 'To',      v: shortAddr(recipient), mono: true },
                    { l: 'Amount',  v: amount + ' USDC' },
                    { l: 'Est. Time', v: isCCTP ? '2–5 minutes' : '< 1 second', accent: true },
                    { l: 'Prompts', v: isCCTP ? '3 (approve, burn, mint)' : '1 (sign)' },
                  ].map(r => (
                    <div key={r.l} className="flex justify-between items-center border-b border-[#1e2530] pb-2.5 last:border-0 text-sm">
                      <span className="text-[#8892a0]">{r.l}</span>
                      <span className={'font-semibold ' + (r.accent ? 'text-[#00D4FF]' : 'text-white') + (r.mono ? ' font-mono text-xs' : '')}>
                        {r.v}
                      </span>
                    </div>
                  ))}
                  {memo && (
                    <div className="border-t border-[#1e2530] pt-2.5 text-sm">
                      <span className="text-[#8892a0]">Note: </span>
                      <span className="text-white">{memo}</span>
                    </div>
                  )}
                </div>

                {isCCTP && (
                  <div className="flex items-center justify-between mb-5 bg-[#0D1117] border border-[#1e2530] rounded-xl px-3 py-3">
                    {CCTP_STEPS.map((s, i) => (
                      <div key={s.key} className="flex-1 flex flex-col items-center gap-1">
                        <div className={'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border ' + (
                          cctpDoneSteps.includes(s.key) ? 'bg-green-500 border-green-500 text-white' :
                          cctpActiveStep === i && sending ? 'border-[#00D4FF] text-[#00D4FF] animate-pulse' :
                          'border-[#1e2530] text-[#556]'
                        )}>
                          {cctpDoneSteps.includes(s.key) ? '✓' : i + 1}
                        </div>
                        <span className="text-[9px] text-[#8892a0] text-center">{s.label}</span>
                      </div>
                    ))}
                  </div>
                )}
                {cctpStatus && sending && (
                  <p className="text-xs text-[#00D4FF] mb-4 -mt-2">{cctpStatus}</p>
                )}

                {sendError && (
                  <div className="bg-red-900/10 border border-red-500/30 rounded-xl p-3 mb-4">
                    <p className="text-xs text-red-400">{sendError}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button onClick={() => { setView('form'); setSendError(null) }} disabled={sending}
                    className="flex-1 border border-[#1e2530] text-[#8892a0] py-3 rounded-xl hover:border-[#00D4FF] transition-all font-['Space_Grotesk'] font-semibold text-sm disabled:opacity-40">
                    Edit
                  </button>
                  <button onClick={handleSend} disabled={sending}
                    className="flex-[2] bg-[#00D4FF] text-[#0D1117] font-['Space_Grotesk'] font-bold py-3 rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                    {sending ? (
                      <><LoadingSpinner size="sm" /> {isCCTP ? 'Bridging…' : 'Sending…'}</>
                    ) : (
                      isCCTP ? 'Confirm & Bridge →' : 'Confirm & Send →'
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Success view */}
            {view === 'success' && txResult && (
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-green-900/30 border-2 border-green-500 flex items-center justify-center mx-auto mb-4 text-2xl">✓</div>
                <h2 className="text-xl font-bold font-['Space_Grotesk'] mb-1">
                  {txResult.cctpBridge ? 'Bridge ' : 'Transfer '}<span className="text-green-400">confirmed</span>
                </h2>
                <p className="text-[#8892a0] text-xs mb-6">
                  {txResult.cctpBridge ? txResult.sourceChain + ' → Arc Testnet via CCTP' : 'Confirmed on Arc Testnet'}
                  {' · '}{(txResult.settlementTime / 1000).toFixed(1)}s
                </p>

                <div className="bg-[#0D1117] border border-[#1e2530] rounded-xl p-4 text-left mb-5 space-y-2.5">
                  {[
                    { l: 'Amount', v: txResult.amount + ' USDC' },
                    { l: 'Gas Paid', v: txResult.gasCost },
                    { l: 'Status', v: 'Confirmed', green: true },
                  ].map(r => (
                    <div key={r.l} className="flex justify-between border-b border-[#1e2530] pb-2 last:border-0 text-sm">
                      <span className="text-[#8892a0]">{r.l}</span>
                      <span className={'font-semibold ' + (r.green ? 'text-green-400' : 'text-white')}>{r.v}</span>
                    </div>
                  ))}
                  <div className="pt-1">
                    <p className="text-[10px] text-[#8892a0] mb-1">TX HASH</p>
                    <a href={explorerTxUrl(txResult.hash)} target="_blank" rel="noreferrer"
                      className="text-[10px] text-[#00D4FF] font-mono break-all hover:underline">
                      {txResult.hash}
                    </a>
                  </div>
                  {txResult.mintTxHash && (
                    <div>
                      <p className="text-[10px] text-[#8892a0] mb-1">MINT TX (ARC TESTNET)</p>
                      <a href={arcScanTx(txResult.mintTxHash)} target="_blank" rel="noreferrer"
                        className="text-[10px] text-[#00D4FF] font-mono break-all hover:underline">
                        {txResult.mintTxHash}
                      </a>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 mb-3">
                  <a href={explorerTxUrl(txResult.hash)} target="_blank" rel="noreferrer"
                    className="flex-1 border border-[#00D4FF] text-[#00D4FF] py-2.5 rounded-xl text-sm font-['Space_Grotesk'] font-bold hover:bg-[#0a2030] transition-all text-center">
                    View on Explorer ↗
                  </a>
                  <button onClick={() => navigator.clipboard.writeText(txResult.hash)}
                    className="flex-1 border border-[#1e2530] text-[#8892a0] py-2.5 rounded-xl text-sm hover:border-[#00D4FF] transition-all">
                    Copy TX Hash
                  </button>
                </div>

                <div className="flex gap-3">
                  <button onClick={resetForm}
                    className="flex-1 bg-[#00D4FF] text-[#0D1117] font-['Space_Grotesk'] font-bold py-2.5 rounded-xl text-sm hover:opacity-90">
                    Send Another →
                  </button>
                  <Link to="/testnet/transactions"
                    className="flex-1 border border-[#1e2530] text-[#8892a0] py-2.5 rounded-xl text-sm hover:border-[#00D4FF] hover:text-white transition-all text-center">
                    View History
                  </Link>
                </div>
              </div>
            )}
          </Card>

          <p className="text-center text-xs text-[#556] mt-4">
            Need testnet USDC?{' '}
            <a href={ARC_TESTNET.faucetUrl} target="_blank" rel="noreferrer" className="text-[#00D4FF] hover:underline">
              Get some from Circle's faucet →
            </a>
          </p>
        </div>
      </div>

      <TokenSelectModal
        open={showTokenModal}
        onClose={() => setShowTokenModal(false)}
        tokens={sendTokens}
        selected={selectedToken}
        onSelect={setSelectedToken}
      />
      <NetworkTokenModal
        open={showFromModal}
        onClose={() => setShowFromModal(false)}
        title="Bridge from"
        networks={fromNetworks}
        activeKey={sourceChainKey}
        onSelect={handleChainSelect}
      />
      <NetworkTokenModal
        open={showToModal}
        onClose={() => setShowToModal(false)}
        title="Bridge to"
        networks={toNetworks}
        activeKey={bridgeToKey}
        onSelect={setBridgeToKey}
      />
    </>
  )
}