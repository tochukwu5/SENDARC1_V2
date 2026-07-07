import { useState } from 'react'

export function TokenIcon({ symbol, color, size = 32 }) {
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
      style={{ backgroundColor: color, width: size, height: size, fontSize: size * 0.42 }}
    >
      {symbol}
    </div>
  )
}

// tokens: [{ symbol, name, icon, color, balance, enabled }]
export default function TokenSelectModal({ open, onClose, tokens, selected, onSelect }) {
  const [search, setSearch] = useState('')
  if (!open) return null

  const filtered = tokens.filter(t =>
    t.symbol.toLowerCase().includes(search.toLowerCase()) ||
    t.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-[#0f1822] border border-[#1e2530] rounded-2xl w-full max-w-sm p-5 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold font-['Space_Grotesk'] text-white text-lg">Select a token</h3>
          <button onClick={onClose} className="text-[#8892a0] hover:text-white transition-colors text-lg">✕</button>
        </div>

        <input
          type="text"
          placeholder="Search Token"
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoFocus
          className="w-full bg-[#0D1117] border border-[#1e2530] rounded-full px-4 py-2.5 text-sm text-white outline-none focus:border-[#00D4FF] transition-colors mb-3"
        />

        <div className="space-y-1 max-h-72 overflow-y-auto -mx-1">
          {filtered.length === 0 && (
            <p className="text-center text-xs text-[#556] py-6">No tokens match "{search}"</p>
          )}
          {filtered.map(t => {
            const isSelected = selected === t.symbol
            return (
              <button
                key={t.symbol}
                onClick={() => { if (t.enabled) { onSelect(t.symbol); onClose() } }}
                disabled={!t.enabled}
                className={
                  'w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors mx-1 ' +
                  (t.enabled ? 'hover:bg-[#1e2530] cursor-pointer' : 'opacity-45 cursor-not-allowed') +
                  (isSelected ? ' bg-[#0a2a38] border border-[#00D4FF]/40' : ' border border-transparent')
                }
                style={{ width: 'calc(100% - 0.5rem)' }}
              >
                <div className="flex items-center gap-3">
                  <TokenIcon symbol={t.icon} color={t.color} />
                  <div className="text-left">
                    <p className={'text-sm font-semibold ' + (isSelected ? 'text-[#00D4FF]' : 'text-white')}>{t.symbol}</p>
                    <p className="text-xs text-[#8892a0]">{t.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-white">{t.balance}</p>
                  <p className="text-[10px] text-[#8892a0]">{t.enabled ? 'Balance' : 'Soon'}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
