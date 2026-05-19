import { createContext, useContext, useState } from 'react'

const WalletContext = createContext(null)

export function WalletProvider({ children }) {
  const [wallet, setWallet] = useState(null)
  // wallet shape: { address, shortAddress, balance, network }

  // These functions are stubs — will be replaced with real wagmi/viem calls
  // when the backend/web3 layer is connected
  const connect = async (providerType) => {
    // TODO: replace with real wallet connection (wagmi connectAsync)
    const mockAddress = '0x3f4a8b2c1d9e5f6a7b8c9d0e1f2a3b4c8c2d'
    setWallet({
      address: mockAddress,
      shortAddress: `${mockAddress.slice(0, 6)}...${mockAddress.slice(-4)}`,
      balance: '1,240.00',
      network: 'Arc Testnet',
      provider: providerType,
    })
    return true
  }

  const disconnect = () => setWallet(null)

  return (
    <WalletContext.Provider value={{ wallet, connect, disconnect, isConnected: !!wallet }}>
      {children}
    </WalletContext.Provider>
  )
}

export const useWallet = () => {
  const ctx = useContext(WalletContext)
  if (!ctx) throw new Error('useWallet must be used inside WalletProvider')
  return ctx
}
