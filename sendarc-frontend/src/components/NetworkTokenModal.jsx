import { useState, useEffect } from 'react'
import { TokenIcon } from './TokenSelectModal'

// networks: [{ key, name, icon, color, enabled, usdcAddress }]
export default function NetworkTokenModal({ open, onClose, title, networks, activeKey, onSelect }) {
  const [search, setSearch] = useState('')
  const [paneKey, setPaneKey] = useState(activeKey)

  useEffect(() => { if (open) setPaneKey(activeKey) }, [open, activeKey])

  if (!open) return null

  const filtered = networks.filter(n => n.name.toLowerCase().includes(search.toLowerCase()))
  const paneNetwork = networks.find(n => n.key === paneKey)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-[#0f1822] border border-[#1e2530] rounded-2xl w-full max-w-2xl flex overflow-hidden shadow-2xl"
        style={{ height: 440 }}
      >
        {/* Left: network list */}
        <div className="w-56 border-r border-[#1e2530] flex flex-col flex-shrink-0">
          <div className="p-3">
            <input
              type="text"
              placeholder="Search Network"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-[#0D1117] border border-[#1e2530] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#00D4FF] transition-colors"
            />
          </div>
          <p className="px-4 text-[9px] tracking-widest text-[#8892a0] mb-1">TOP CHAINS</p>
          <div className="flex-1 overflow-y-auto px-2 pb-2">
            {filtered.map(n => (
              <button
                key={n.key}
                onClick={() => n.enabled && setPaneKey(n.key)}
                disabled={!n.enabled}
                className={
                  'w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs text-left transition-colors mb-0.5 ' +
                  (!n.enabled ? 'opacity-40 cursor-not-allowed text-[#8892a0]' :
                    paneKey === n.key ? 'bg-[#1e2530] text-white font-semibold' : 'text-[#c5cdd6] hover:bg-[#161d27]')
                }
              >
                <span>{n.icon}</span>
                <span className="flex-1">{n.name}</span>
                {!n.enabled && <span className="text-[8px] text-[#556]">Soon</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Right: token for selected network */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#1e2530]">
            <h3 className="font-bold font-['Space_Grotesk'] text-white text-sm">{title}</h3>
            <button onClick={onClose} className="text-[#8892a0] hover:text-white transition-colors">✕</button>
          </div>
          <div className="p-3">
            <input
              type="text"
              placeholder="search token name or paste address"
              disabled
              className="w-full bg-[#0D1117] border border-[#1e2530] rounded-lg px-3 py-2 text-xs text-[#556] outline-none"
            />
          </div>
          <div className="flex-1 overflow-y-auto px-2">
            {paneNetwork ? (
              <button
                onClick={() => { onSelect(paneNetwork.key); onClose() }}
                className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-[#1e2530] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <TokenIcon symbol="$" color="#2775CA" />
                  <div className="text-left">
                    <p className="text-white text-sm font-semibold">USDC</p>
                    <p className="text-[#8892a0] text-xs">USD Coin</p>
                  </div>
                </div>
                <span className="text-[#8892a0] text-[10px] font-mono">
                  {paneNetwork.usdcAddress ? paneNetwork.usdcAddress.slice(0, 6) + '…' + paneNetwork.usdcAddress.slice(-4) : ''}
                </span>
              </button>
            ) : (
              <p className="text-center text-xs text-[#556] py-10">Select a network on the left</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
