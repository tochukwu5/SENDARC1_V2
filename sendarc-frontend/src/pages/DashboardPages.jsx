import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import { MOCK_TRANSACTIONS } from '../data/constants'
import { Card, StatusBadge } from '../components/UI'
import { Sidebar } from './Dashboard'

// ─── TRANSACTIONS PAGE ─────────────────────────────────────────────
export function Transactions() {
  const [filter, setFilter] = useState('all')
  const filtered = filter === 'all' ? MOCK_TRANSACTIONS : MOCK_TRANSACTIONS.filter(t => t.status === filter)

  return (
    <div className="flex min-h-screen bg-[#0D1117]">
      <Sidebar active="transactions" />
      <main className="flex-1 p-8">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-2xl font-bold font-['Space_Grotesk']">Transactions</h1>
            <p className="text-[#8892a0] text-sm mt-1">Full history of all your USDC transfers</p>
          </div>
          <button className="border border-[#1e2530] text-[#8892a0] text-xs px-4 py-2 rounded-lg hover:border-[#00D4FF] transition-all">
            ↓ Export CSV
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {['all', 'confirmed', 'pending', 'failed'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-xs px-4 py-2 rounded-lg border font-['Space_Grotesk'] font-semibold capitalize transition-all ${
                filter === f ? 'bg-[#0a2030] border-[#00D4FF] text-[#00D4FF]' : 'border-[#1e2530] text-[#8892a0] hover:border-[#00D4FF]'
              }`}
            >{f}</button>
          ))}
        </div>

        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1e2530]">
                {['TRANSACTION', 'TO', 'COUNTRY', 'AMOUNT SENT', 'THEY RECEIVED', 'FEE', 'STATUS', 'TIME'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-[10px] tracking-widest text-[#8892a0] font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(tx => (
                <tr key={tx.id} className="border-b border-[#0f1520] hover:bg-[#0f1822] transition-colors cursor-pointer">
                  <td className="px-5 py-4">
                    <p className="font-mono text-xs text-white">{tx.id}</p>
                    <p className="text-[10px] text-[#556] font-mono">{tx.hash.slice(0, 20)}...</p>
                  </td>
                  <td className="px-5 py-4 text-xs font-mono text-[#8892a0]">{tx.to}</td>
                  <td className="px-5 py-4 text-sm">{tx.country.flag} {tx.country.name}</td>
                  <td className="px-5 py-4 font-semibold text-white">{tx.sent} USDC</td>
                  <td className="px-5 py-4 font-bold text-[#00D4FF]">{tx.received}</td>
                  <td className="px-5 py-4 text-green-400">{tx.fee}</td>
                  <td className="px-5 py-4"><StatusBadge status={tx.status} /></td>
                  <td className="px-5 py-4 text-xs text-[#8892a0]">{tx.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </main>
    </div>
  )
}

// ─── WALLET PAGE ────────────────────────────────────────────────────
export function WalletPage() {
  const { wallet } = useWallet()

  return (
    <div className="flex min-h-screen bg-[#0D1117]">
      <Sidebar active="wallet" />
      <main className="flex-1 p-8 max-w-2xl">
        <h1 className="text-2xl font-bold font-['Space_Grotesk'] mb-1">Wallet</h1>
        <p className="text-[#8892a0] text-sm mb-8">Your connected wallet and USDC balance</p>

        <Card glow className="p-6 mb-5">
          <p className="text-[10px] tracking-widest text-[#8892a0] mb-4">CONNECTED WALLET</p>
          <div className="flex items-center gap-4 mb-5">
            <div className="w-12 h-12 rounded-xl bg-[#e8821a] flex items-center justify-center text-white font-bold text-sm">MM</div>
            <div>
              <p className="font-semibold font-['Space_Grotesk']">MetaMask</p>
              <p className="text-xs text-[#8892a0] font-mono mt-0.5">{wallet?.address || '0x3f4a8b2c1d9e5f6a7b8c9d0e1f2a3b4c8c2d'}</p>
            </div>
            <span className="ml-auto text-xs border border-green-500 text-green-400 px-2 py-0.5 rounded-full bg-green-900/20">Connected</span>
          </div>

          <div className="bg-[#0D1117] border border-[#1e2530] rounded-xl p-5 text-center mb-5">
            <p className="text-[10px] tracking-widest text-[#8892a0] mb-2">USDC BALANCE</p>
            <p className="text-4xl font-bold text-[#00D4FF] font-['Space_Grotesk']">{wallet?.balance || '0.00'}</p>
            <p className="text-sm text-[#8892a0] mt-1">USDC · {wallet?.network || 'Arc Testnet'}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button className="border border-[#1e2530] text-[#8892a0] py-2.5 rounded-xl text-sm hover:border-[#00D4FF] hover:text-white transition-all font-['Space_Grotesk']">
              📋 Copy Address
            </button>
            <a href="https://testnet.arcscan.app" target="_blank" rel="noreferrer"
              className="border border-[#1e2530] text-[#8892a0] py-2.5 rounded-xl text-sm hover:border-[#00D4FF] hover:text-white transition-all font-['Space_Grotesk'] text-center block">
              🔍 View on ArcScan
            </a>
          </div>
        </Card>

        <Card className="p-5">
          <p className="text-[10px] tracking-widest text-[#8892a0] mb-4">NETWORK</p>
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm text-[#8892a0]">Current Network</span>
            <span className="text-sm text-white font-['Space_Grotesk'] font-semibold">{wallet?.network || 'Arc Testnet'}</span>
          </div>
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm text-[#8892a0]">Chain Type</span>
            <span className="text-xs border border-[#00D4FF] text-[#00D4FF] px-2 py-0.5 rounded-full">EVM Compatible</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-[#8892a0]">Gas Token</span>
            <span className="text-sm text-white">USDC (native)</span>
          </div>
        </Card>
      </main>
    </div>
  )
}

// ─── NOTIFICATIONS PAGE ──────────────────────────────────────────────
export function Notifications() {
  const [notes] = useState([
    { id: 1, type: 'success', title: 'Transaction Confirmed', desc: 'TXN-ARC-00847 — 100 USDC to Nigeria confirmed', time: '2m ago', read: false },
    { id: 2, type: 'info', title: 'Rate Alert', desc: 'NGN rate improved: 1 USDC = ₦1,641.80', time: '1hr ago', read: false },
    { id: 3, type: 'success', title: 'Transaction Confirmed', desc: 'TXN-ARC-00846 — 250 USDC to Ghana confirmed', time: '1hr ago', read: true },
    { id: 4, type: 'info', title: 'New Country Added', desc: 'Tanzania (TZS) is now supported on SendArc', time: '2 days ago', read: true },
    { id: 5, type: 'success', title: 'Transaction Confirmed', desc: 'TXN-ARC-00845 — 50 USDC to Kenya confirmed', time: '3hr ago', read: true },
  ])

  const icons = { success: '✅', info: 'ℹ️', warning: '⚠️' }

  return (
    <div className="flex min-h-screen bg-[#0D1117]">
      <Sidebar active="notifications" />
      <main className="flex-1 p-8 max-w-2xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold font-['Space_Grotesk']">Notifications</h1>
            <p className="text-[#8892a0] text-sm mt-1">{notes.filter(n => !n.read).length} unread</p>
          </div>
          <button className="text-xs text-[#00D4FF] hover:underline">Mark all read</button>
        </div>

        <div className="space-y-3">
          {notes.map(n => (
            <Card key={n.id} className={`p-4 flex gap-4 items-start cursor-pointer hover:border-[#00D4FF] transition-all ${!n.read ? 'border-[#1e3040]' : ''}`}>
              <div className="text-xl flex-shrink-0">{icons[n.type]}</div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <p className={`text-sm font-semibold font-['Space_Grotesk'] ${!n.read ? 'text-white' : 'text-[#8892a0]'}`}>{n.title}</p>
                  <span className="text-[10px] text-[#556]">{n.time}</span>
                </div>
                <p className="text-xs text-[#8892a0] mt-1">{n.desc}</p>
              </div>
              {!n.read && <div className="w-2 h-2 rounded-full bg-[#00D4FF] flex-shrink-0 mt-1" />}
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}

// ─── SETTINGS PAGE ───────────────────────────────────────────────────
export function Settings() {
  const [defaultCountry, setDefaultCountry] = useState('NG')
  const [emailNotifs, setEmailNotifs] = useState(true)
  const [pushNotifs, setPushNotifs] = useState(false)

  return (
    <div className="flex min-h-screen bg-[#0D1117]">
      <Sidebar active="settings" />
      <main className="flex-1 p-8 max-w-2xl">
        <h1 className="text-2xl font-bold font-['Space_Grotesk'] mb-1">Settings</h1>
        <p className="text-[#8892a0] text-sm mb-8">Manage your SendArc preferences</p>

        {/* Preferences */}
        <Card className="p-5 mb-4">
          <p className="text-[10px] tracking-widest text-[#8892a0] mb-4">PREFERENCES</p>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div><p className="text-sm font-semibold">Default Country</p><p className="text-xs text-[#8892a0]">Pre-select destination country</p></div>
              <select value={defaultCountry} onChange={e => setDefaultCountry(e.target.value)}
                className="bg-[#0D1117] border border-[#1e2530] text-white text-sm rounded-lg px-3 py-1.5 outline-none focus:border-[#00D4FF]">
                <option value="NG">🇳🇬 Nigeria</option>
                <option value="GH">🇬🇭 Ghana</option>
                <option value="KE">🇰🇪 Kenya</option>
                <option value="ZA">🇿🇦 South Africa</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Notifications */}
        <Card className="p-5 mb-4">
          <p className="text-[10px] tracking-widest text-[#8892a0] mb-4">NOTIFICATIONS</p>
          <div className="space-y-4">
            {[
              { label: 'Email notifications', sub: 'Receive transaction confirmations via email', val: emailNotifs, set: setEmailNotifs },
              { label: 'Browser push notifications', sub: 'Get notified instantly in browser', val: pushNotifs, set: setPushNotifs },
            ].map(s => (
              <div key={s.label} className="flex justify-between items-center">
                <div><p className="text-sm font-semibold">{s.label}</p><p className="text-xs text-[#8892a0]">{s.sub}</p></div>
                <button onClick={() => s.set(!s.val)}
                  className={`w-11 h-6 rounded-full transition-all ${s.val ? 'bg-[#00D4FF]' : 'bg-[#1e2530]'}`}>
                  <span className={`block w-4 h-4 bg-white rounded-full mx-1 transition-all ${s.val ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            ))}
          </div>
        </Card>

        {/* About */}
        <Card className="p-5">
          <p className="text-[10px] tracking-widest text-[#8892a0] mb-4">ABOUT SENDARC</p>
          <div className="space-y-2 text-sm">
            {[
              { l: 'Version', v: '1.0.0-beta' },
              { l: 'Built on', v: 'Arc Network by Circle' },
              { l: 'Arc Network Status', v: '● Operational', vc: 'text-green-400' },
              { l: 'USDC Contract', v: 'Circle · 100% backed' },
            ].map(r => (
              <div key={r.l} className="flex justify-between border-b border-[#1e2530] pb-2">
                <span className="text-[#8892a0]">{r.l}</span>
                <span className={r.vc || 'text-white'}>{r.v}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-4">
            <a href="https://docs.arc.network" target="_blank" rel="noreferrer" className="text-xs text-[#00D4FF] hover:underline">Arc Docs →</a>
            <a href="https://testnet.arcscan.app" target="_blank" rel="noreferrer" className="text-xs text-[#00D4FF] hover:underline">ArcScan →</a>
          </div>
        </Card>
      </main>
    </div>
  )
}
