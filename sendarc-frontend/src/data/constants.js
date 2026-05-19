export const COUNTRIES = [
  { code: 'NG', flag: '🇳🇬', name: 'Nigeria', currency: 'NGN', symbol: '₦', rate: 1634.20, cashout: ['Yellow Card', 'Mara', 'Binance P2P'], status: 'live' },
  { code: 'GH', flag: '🇬🇭', name: 'Ghana', currency: 'GHS', symbol: '₵', rate: 15.20, cashout: ['Yellow Card', 'MTN MoMo', 'Mara'], status: 'live' },
  { code: 'KE', flag: '🇰🇪', name: 'Kenya', currency: 'KES', symbol: 'KSh', rate: 129.40, cashout: ['M-Pesa', 'Yellow Card', 'Mara'], status: 'live' },
  { code: 'ZA', flag: '🇿🇦', name: 'South Africa', currency: 'ZAR', symbol: 'R', rate: 18.40, cashout: ['Luno', 'VALR', 'Yellow Card'], status: 'live' },
  { code: 'RW', flag: '🇷🇼', name: 'Rwanda', currency: 'RWF', symbol: 'RWF', rate: 1310, cashout: ['MTN MoMo', 'Airtel Money'], status: 'live' },
  { code: 'TZ', flag: '🇹🇿', name: 'Tanzania', currency: 'TZS', symbol: 'TZS', rate: 2640, cashout: ['Vodacom M-Pesa', 'Airtel Money'], status: 'live' },
  { code: 'ET', flag: '🇪🇹', name: 'Ethiopia', currency: 'ETB', symbol: 'ETB', rate: 0, cashout: [], status: 'soon' },
  { code: 'SN', flag: '🇸🇳', name: 'Senegal', currency: 'XOF', symbol: 'XOF', rate: 0, cashout: [], status: 'soon' },
]

export const CHAINS = [
  { id: 'arc', name: 'Arc Testnet', badge: 'Recommended', fee: '$0.003', time: '< 1s' },
  { id: 'eth', name: 'Ethereum', badge: null, fee: '~$2.10', time: '~20s (via CCTP)' },
  { id: 'base', name: 'Base', badge: null, fee: '~$0.01', time: '~5s (via CCTP)' },
  { id: 'arb', name: 'Arbitrum', badge: null, fee: '~$0.05', time: '~8s (via CCTP)' },
  { id: 'sol', name: 'Solana', badge: null, fee: '~$0.001', time: '~3s (via CCTP)' },
]

export const MOCK_TRANSACTIONS = [
  { id: 'TXN-ARC-00847', to: '0x8f2a...4e91', country: { flag: '🇳🇬', name: 'Nigeria' }, sent: 100, received: '₦163,420', currency: 'NGN', fee: '$0.003', status: 'confirmed', time: '2m ago', network: 'Arc Testnet', hash: '0x7d4f2a8b3c91e5f6a0d2...' },
  { id: 'TXN-ARC-00846', to: '0x2c9d...7f31', country: { flag: '🇬🇭', name: 'Ghana' }, sent: 250, received: 'GH₵3,800', currency: 'GHS', fee: '$0.003', status: 'confirmed', time: '1hr ago', network: 'Arc Testnet', hash: '0x3a1c9d2f8e4b7a6...' },
  { id: 'TXN-ARC-00845', to: '0x5b4e...1a20', country: { flag: '🇰🇪', name: 'Kenya' }, sent: 50, received: 'KSh 6,450', currency: 'KES', fee: '$0.003', status: 'confirmed', time: '3hr ago', network: 'Arc Testnet', hash: '0x9b2e4f1a7c3d8...' },
  { id: 'TXN-ARC-00844', to: '0x9a1f...3d88', country: { flag: '🇳🇬', name: 'Nigeria' }, sent: 500, received: '₦817,100', currency: 'NGN', fee: '$0.003', status: 'confirmed', time: 'Yesterday', network: 'Arc Testnet', hash: '0x4d6a1e8f2c7b...' },
  { id: 'TXN-ARC-00843', to: '0x3e7c...9b42', country: { flag: '🇿🇦', name: 'S. Africa' }, sent: 200, received: 'R3,680', currency: 'ZAR', fee: '$0.003', status: 'pending', time: 'Yesterday', network: 'Arc Testnet', hash: '0x2f8c4a9e1d5b...' },
]

export const WALLET_OPTIONS = [
  { id: 'metamask', name: 'MetaMask', color: '#e8821a', desc: 'Most popular browser wallet' },
  { id: 'walletconnect', name: 'WalletConnect', color: '#1b6ef3', desc: 'Connect any mobile wallet' },
  { id: 'coinbase', name: 'Coinbase Wallet', color: '#0052ff', desc: 'Easy onboarding for beginners' },
]

export const COMPETITORS = [
  { name: 'SendArc (Arc Network)', fee: '$0.003', time: 'Under 1 second', badge: 'best' },
  { name: 'Western Union', fee: '~$5.00', time: '1–5 business days', badge: 'bad' },
  { name: 'Bank Wire', fee: '~$25.00', time: '2–5 business days', badge: 'bad' },
  { name: 'PayPal', fee: '~$4.99', time: '3–5 days to withdraw', badge: 'bad' },
]
