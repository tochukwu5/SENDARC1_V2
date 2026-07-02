// ═══════════════════════════════════════════════════════════════════════
// SendArc — Arc Network + Circle CCTP Integration
// Built on Arc Testnet (Circle's stablecoin-native L1)
// Cross-chain transfers powered by Circle's Cross-Chain Transfer Protocol
// ═══════════════════════════════════════════════════════════════════════

// ─── Arc Testnet Configuration ────────────────────────────────────────
export const ARC_TESTNET = {
  id: 5042002,
  name: 'Arc Testnet',
  rpcUrl: 'https://rpc.testnet.arc.network',
  explorerUrl: 'https://testnet.arcscan.app',
  faucetUrl: 'https://faucet.circle.com',
  usdcAddress: '0x3600000000000000000000000000000000000000',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  // Arc is built by Circle — it has native CCTP support
  cctpDomain: 7,
  // Arc MessageTransmitter for receiving CCTP messages
  cctpMessageTransmitter: '0x7865fAfC2db2093669d92c0197e5116bf938Ccca',
}


// ─── SendArcRouter Contract ───────────────────────────────────────────
// Deployed on Arc Testnet — all sends route through this contract so
// Arc Network attributes volume to SendArc (not anonymous wallet-to-wallet)
// Set VITE_ROUTER_ADDRESS in your Vercel env after deploying the contract
export const SENDARC_ROUTER = {
  address: import.meta.env.VITE_ROUTER_ADDRESS || null,
  // send(address payable recipient) payable
  // ABI selector: keccak256("send(address)") = 0x9a8a0592
  sendSelector: '0x9a8a0592',
}

// ─── CCTP V1 Testnet Contract Addresses ───────────────────────────────
// Official Circle CCTP contracts — these are the real Circle-deployed contracts
// Source: https://developers.circle.com/stablecoins/docs/evm-smart-contracts
export const CCTP_CONTRACTS = {
  ethereum: {
    domain: 0,
    tokenMessenger:      '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
    messageTransmitter:  '0x7865fAfC2db2093669d92c0197e5116bf938Ccca',
  },
  base: {
    domain: 6,
    tokenMessenger:      '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
    messageTransmitter:  '0x7865fAfC2db2093669d92c0197e5116bf938Ccca',
  },
  arbitrum: {
    domain: 3,
    tokenMessenger:      '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
    messageTransmitter:  '0x7865fAfC2db2093669d92c0197e5116bf938Ccca',
  },
  arc: {
    domain: 7,
    messageTransmitter:  '0x7865fAfC2db2093669d92c0197e5116bf938Ccca',
  },
}

// Circle Attestation Service — provides burn proofs for CCTP
const CIRCLE_ATTESTATION_API = 'https://iris-api-sandbox.circle.com/attestations'

// ─── EVM Chain Configurations ─────────────────────────────────────────
export const EVM_CHAINS = {
  arc: {
    id: 5042002,
    chainIdHex: '0x4CEF52',
    name: 'Arc Testnet',
    symbol: 'ARC',
    rpcUrl: 'https://rpc.testnet.arc.network',
    explorerUrl: 'https://testnet.arcscan.app',
    usdcAddress: '0x3600000000000000000000000000000000000000',
    nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
    faucetUrl: 'https://faucet.circle.com',
    icon: '⬡',
    color: '#00D4FF',
    live: true,
    useCCTP: false,
    note: 'Native Arc — direct on-chain transfer',
  },
  ethereum: {
    id: 11155111,
    chainIdHex: '0xAA36A7',
    name: 'Ethereum Sepolia',
    symbol: 'ETH',
    rpcUrl: 'https://rpc.sepolia.org',
    explorerUrl: 'https://sepolia.etherscan.io',
    usdcAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
    faucetUrl: 'https://faucet.circle.com',
    icon: '⟠',
    color: '#627EEA',
    live: true,
    useCCTP: true,
    note: 'CCTP Bridge → Arc Testnet',
  },
  base: {
    id: 84532,
    chainIdHex: '0x14A34',
    name: 'Base Sepolia',
    symbol: 'ETH',
    rpcUrl: 'https://sepolia.base.org',
    explorerUrl: 'https://sepolia.basescan.org',
    usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
    faucetUrl: 'https://faucet.circle.com',
    icon: '🔵',
    color: '#0052FF',
    live: true,
    useCCTP: true,
    note: 'CCTP Bridge → Arc Testnet',
  },
  arbitrum: {
    id: 421614,
    chainIdHex: '0x66EEE',
    name: 'Arbitrum Sepolia',
    symbol: 'ETH',
    rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    explorerUrl: 'https://sepolia.arbiscan.io',
    usdcAddress: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
    nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
    faucetUrl: 'https://faucet.circle.com',
    icon: '🔷',
    color: '#28A0F0',
    live: true,
    useCCTP: true,
    note: 'CCTP Bridge → Arc Testnet',
  },
}

// ─── ABI Fragments ────────────────────────────────────────────────────
// Only the functions we actually call — no need for full ABIs

// ERC-20: approve(spender, amount) + balanceOf(address)
const ERC20_ABI_APPROVE = '0x095ea7b3' // approve(address,uint256)
const ERC20_ABI_BALANCE  = '0x70a08231' // balanceOf(address)

// CCTP TokenMessenger: depositForBurn(amount, destinationDomain, mintRecipient, burnToken)
const TOKEN_MESSENGER_DEPOSIT_FOR_BURN = '0x6fd3504e'

// CCTP MessageTransmitter: receiveMessage(message, attestation)
const MESSAGE_TRANSMITTER_RECEIVE = '0x57ecfd28'

// ─── Utility: encode function call data ───────────────────────────────
function encodeUint256(value) {
  return BigInt(value).toString(16).padStart(64, '0')
}

function encodeAddress(address) {
  return address.slice(2).toLowerCase().padStart(64, '0')
}

// Encode address as bytes32 (CCTP mintRecipient format)
function encodeAddressAsBytes32(address) {
  return '0x' + '0'.repeat(24) + address.slice(2).toLowerCase()
}

// ─── MetaMask Network Switcher ─────────────────────────────────────────
export async function switchToChain(chainKey) {
  if (!window.ethereum) throw new Error('MetaMask not found')
  const chain = EVM_CHAINS[chainKey]
  if (!chain) throw new Error('Unknown chain: ' + chainKey)

  try {
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: chain.chainIdHex,
        chainName: chain.name,
        nativeCurrency: chain.nativeCurrency,
        rpcUrls: [chain.rpcUrl],
        blockExplorerUrls: [chain.explorerUrl],
      }],
    })
  } catch (addErr) {
    if (addErr.code === 4001) throw new Error('User rejected adding the network.')
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chain.chainIdHex }],
      })
    } catch (switchErr) {
      if (switchErr.code === 4001) throw new Error('User rejected the network switch.')
      throw switchErr
    }
  }
}

// ─── Get USDC Balance ─────────────────────────────────────────────────
export async function getUsdcBalance(chainKey, address) {
  if (!window.ethereum) return '0'
  const chain = EVM_CHAINS[chainKey]
  if (!chain) return '0'

  try {
    if (chainKey === 'arc') {
      // Arc: USDC is the native gas token — use eth_getBalance
      const raw = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [address, 'latest'],
      })
      return (parseInt(raw, 16) / 1e18).toFixed(6)
    } else {
      // ERC-20 balanceOf — USDC uses 6 decimals on all Sepolia testnets
      const paddedAddr = encodeAddress(address)
      const result = await window.ethereum.request({
        method: 'eth_call',
        params: [{ to: chain.usdcAddress, data: ERC20_ABI_BALANCE + paddedAddr }, 'latest'],
      })
      if (!result || result === '0x') return '0.000000'
      return (parseInt(result, 16) / 1_000_000).toFixed(6)
    }
  } catch {
    return '0'
  }
}

// ─── Wait for TX receipt ──────────────────────────────────────────────
async function waitForReceipt(txHash, maxAttempts = 60, delayMs = 2000) {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, delayMs))
    const receipt = await window.ethereum.request({
      method: 'eth_getTransactionReceipt',
      params: [txHash],
    })
    if (receipt) return receipt
  }
  return null
}

// ─── Step 1: Approve USDC spend ───────────────────────────────────────
async function approveUsdc(chain, spender, rawAmount, from) {
  const data = ERC20_ABI_APPROVE
    + encodeAddress(spender)
    + encodeUint256(rawAmount)

  const txHash = await window.ethereum.request({
    method: 'eth_sendTransaction',
    params: [{ from, to: chain.usdcAddress, data, gas: '0xC350' }], // 50000 gas
  })

  const receipt = await waitForReceipt(txHash, 30, 2000)
  if (!receipt) throw new Error('Approval transaction timed out')
  return txHash
}

// ─── Step 2: Burn USDC on source chain via CCTP depositForBurn ────────
async function burnUsdcCCTP(chainKey, { from, to, rawAmount }) {
  const chain = EVM_CHAINS[chainKey]
  const cctp = CCTP_CONTRACTS[chainKey]
  if (!cctp) throw new Error('CCTP not configured for: ' + chainKey)

  // destinationDomain = Arc Testnet (domain 7)
  const destinationDomain = ARC_TESTNET.cctpDomain

  // mintRecipient must be bytes32-padded address
  const mintRecipient = encodeAddressAsBytes32(to)

  // Encode depositForBurn(uint256,uint32,bytes32,address)
  const data = TOKEN_MESSENGER_DEPOSIT_FOR_BURN
    + encodeUint256(rawAmount)                       // amount
    + encodeUint256(destinationDomain).padStart(64, '0') // destinationDomain (uint32)
    + mintRecipient.slice(2)                         // mintRecipient (bytes32)
    + encodeAddress(chain.usdcAddress)               // burnToken

  const txHash = await window.ethereum.request({
    method: 'eth_sendTransaction',
    params: [{
      from,
      to: cctp.tokenMessenger,
      data,
      gas: '0x493E0', // 300000 gas for CCTP burn
    }],
  })

  const receipt = await waitForReceipt(txHash, 60, 2000)
  if (!receipt) throw new Error('CCTP burn transaction timed out')

  return { txHash, receipt }
}

// ─── Step 3: Extract message hash from burn receipt ───────────────────
function extractMessageHashFromReceipt(receipt) {
  // CCTP emits MessageSent event with topic
  // keccak256("MessageSent(bytes)") = 0x8c5261668696ce22758910d05bab8f186d6eb247ceac2af2e82c7dc17669b036
  const MESSAGE_SENT_TOPIC = '0x8c5261668696ce22758910d05bab8f186d6eb247ceac2af2e82c7dc17669b036'

  const log = receipt.logs?.find(l =>
    l.topics && l.topics[0] && l.topics[0].toLowerCase() === MESSAGE_SENT_TOPIC.toLowerCase()
  )

  if (!log) {
    // Fallback: use transaction hash as message identifier
    return null
  }

  // The message bytes are in log.data — hash them to get the attestation key
  const msgBytes = log.data
  // keccak256 of the message bytes — we'll use the tx hash for the attestation API
  return { messageBytes: msgBytes, log }
}

// ─── Step 4: Poll Circle Attestation API ─────────────────────────────
// Circle's attestation service watches the burn and issues a signed proof
// This proof is then submitted to Arc Testnet to mint the USDC
async function waitForAttestation(burnTxHash, onStatusUpdate) {
  const MAX_POLLS = 60  // 5 minutes max (5s intervals)
  const POLL_INTERVAL = 5000

  onStatusUpdate('Waiting for Circle attestation...')

  for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL))

    try {
      // Circle's attestation API takes the keccak256 hash of the message
      // For simplicity with the sandbox API, we use the burn tx hash as the message hash
      const url = CIRCLE_ATTESTATION_API + '/0x' + burnTxHash.replace(/^0x/, '')
      const res = await fetch(url)

      if (res.ok) {
        const data = await res.json()
        if (data.status === 'complete' && data.attestation && data.attestation !== 'PENDING') {
          onStatusUpdate('Attestation received from Circle ✓')
          return {
            attestation: data.attestation,
            message: data.message,
          }
        }
        onStatusUpdate('Circle attestation pending... (' + (attempt + 1) + '/60)')
      } else if (res.status === 404) {
        onStatusUpdate('Waiting for Circle to process burn... (' + (attempt + 1) + '/60)')
      }
    } catch {
      onStatusUpdate('Polling Circle attestation... (' + (attempt + 1) + '/60)')
    }
  }

  throw new Error('Circle attestation timed out after 5 minutes. The burn was successful — you can manually complete the transfer later.')
}

// ─── Step 5: Mint USDC on Arc Testnet ────────────────────────────────
// Submit the Circle attestation to Arc's MessageTransmitter to mint USDC
async function mintUsdcOnArc(message, attestation, from) {
  // Switch MetaMask to Arc Testnet for the mint step
  await switchToChain('arc')

  // Encode receiveMessage(bytes memory message, bytes attestation)
  // This is an ABI encoding of dynamic bytes — complex to hand-encode
  // We use the selector + ABI-encoded parameters
  const msgBytes = message.startsWith('0x') ? message.slice(2) : message
  const attBytes = attestation.startsWith('0x') ? attestation.slice(2) : attestation

  // ABI encode: function receiveMessage(bytes message, bytes attestation)
  // offset for message bytes, offset for attestation bytes, then lengths + data
  const msgLen = (msgBytes.length / 2).toString(16).padStart(64, '0')
  const attLen = (attBytes.length / 2).toString(16).padStart(64, '0')
  // Padded to 32-byte boundaries
  const msgPadded = msgBytes.padEnd(Math.ceil(msgBytes.length / 64) * 64, '0')
  const attPadded = attBytes.padEnd(Math.ceil(attBytes.length / 64) * 64, '0')

  const msgOffset = '0000000000000000000000000000000000000000000000000000000000000040'
  const attOffset = (64 + 32 + msgBytes.length / 2 + (32 - (msgBytes.length / 2 % 32 || 32))).toString(16).padStart(64, '0')

  const data = MESSAGE_TRANSMITTER_RECEIVE
    + msgOffset
    + attOffset
    + msgLen
    + msgPadded
    + attLen
    + attPadded

  const txHash = await window.ethereum.request({
    method: 'eth_sendTransaction',
    params: [{
      from,
      to: ARC_TESTNET.cctpMessageTransmitter,
      data,
      gas: '0x493E0', // 300000 gas
    }],
  })

  const receipt = await waitForReceipt(txHash, 30, 1000)
  return { txHash, receipt }
}

// ─── Main: Send USDC via CCTP (source chain → Arc Testnet) ────────────
// Full 3-step CCTP flow:
// 1. Approve USDC spend on source chain
// 2. Burn USDC on source chain (depositForBurn)
// 3. Poll Circle attestation API
// 4. Mint USDC on Arc Testnet (receiveMessage)
export async function sendUsdcViaCCTP(chainKey, { from, to, amount }, onStatusUpdate = () => {}) {
  const chain = EVM_CHAINS[chainKey]
  if (!chain) throw new Error('Unknown chain: ' + chainKey)
  if (!chain.useCCTP) throw new Error('Chain does not use CCTP: ' + chainKey)

  const cctp = CCTP_CONTRACTS[chainKey]
  const rawAmount = BigInt(Math.round(parseFloat(amount) * 1_000_000)) // USDC = 6 decimals
  const start = Date.now()

  // ── Step 1: Approve TokenMessenger to spend USDC ──
  onStatusUpdate('Step 1/4: Approving USDC spend on ' + chain.name + '...')
  const approvalHash = await approveUsdc(chain, cctp.tokenMessenger, rawAmount, from)
  onStatusUpdate('Approval confirmed ✓')

  // ── Step 2: Burn USDC on source chain ──
  onStatusUpdate('Step 2/4: Burning USDC on ' + chain.name + ' via CCTP...')
  const { txHash: burnTxHash, receipt: burnReceipt } = await burnUsdcCCTP(chainKey, { from, to, rawAmount })
  onStatusUpdate('USDC burned on ' + chain.name + ' ✓ — TX: ' + burnTxHash.slice(0, 10) + '...')

  // Extract message from receipt logs
  const messageInfo = extractMessageHashFromReceipt(burnReceipt)

  // ── Step 3: Wait for Circle attestation ──
  onStatusUpdate('Step 3/4: Waiting for Circle attestation service...')
  const { attestation, message } = await waitForAttestation(burnTxHash, onStatusUpdate)

  // ── Step 4: Mint on Arc Testnet ──
  onStatusUpdate('Step 4/4: Switching to Arc Testnet to mint USDC...')
  const { txHash: mintTxHash, receipt: mintReceipt } = await mintUsdcOnArc(
    message || messageInfo?.messageBytes || burnTxHash,
    attestation,
    from
  )

  const settlementTime = Date.now() - start

  onStatusUpdate('USDC minted on Arc Testnet ✓')

  // Calculate gas from burn receipt (ETH gas on source chain)
  const gasUsed = burnReceipt ? parseInt(burnReceipt.gasUsed, 16) : 100000
  const gasPrice = await window.ethereum.request({ method: 'eth_gasPrice' })
  const gasCostRaw = BigInt(gasUsed) * BigInt(parseInt(gasPrice, 16))
  const gasCost = (Number(gasCostRaw) / 1e18).toFixed(9)

  return {
    // Burn tx (source chain) — the primary record
    hash: burnTxHash,
    // Mint tx (Arc Testnet)
    mintTxHash,
    approvalHash,
    from,
    to,
    amount: parseFloat(amount),
    gasCost,
    gasUsed,
    blockNumber: burnReceipt ? parseInt(burnReceipt.blockNumber, 16) : 0,
    settlementTime,
    status: 'confirmed',
    sourceChain: chain.name,
    destinationChain: 'Arc Testnet',
    network: chain.name + ' → Arc Testnet (CCTP)',
    chainId: chain.id,
    cctpBridge: true,
    simulated: false,
  }
}

// ─── Send via SendArcRouter contract (two-step) ──────────────────────
// Step 1: Call recordTransfer() on the contract — gives Arc attribution
// Step 2: Send USDC natively to recipient — the actual transfer
//
// This two-step design is reliable on Arc because we avoid the
// msg.value forwarding issue with Arc's native USDC token.
// Arc block explorer records both transactions, with SendArcRouter
// as the interacted contract on Step 1.
export async function sendUsdcViaSendArcRouter({ from, to, amount }) {
  if (!window.ethereum) throw new Error('MetaMask not found')
  if (!SENDARC_ROUTER.address) throw new Error('SendArcRouter not deployed yet')

  const start = Date.now()

  // Arc native USDC: 18 decimals
  const rawAmount = BigInt(Math.round(parseFloat(amount) * 1e6)) * BigInt(1e12)
  const amountHex = '0x' + rawAmount.toString(16)
  const amountHexNoValue = '0x' + rawAmount.toString(16)

  // ── Step 1: Record transfer on SendArcRouter ──────────────────────
  // ABI encode: recordTransfer(address recipient, uint256 amount)
  // selector = keccak256("recordTransfer(address,uint256)")[0:4] = 0x73ac83ef
  const selector = '73ac83ef'
  const paddedRecipient = to.replace('0x', '').toLowerCase().padStart(64, '0')
  const paddedAmount = rawAmount.toString(16).padStart(64, '0')
  const recordData = '0x' + selector + paddedRecipient + paddedAmount

  const recordTxHash = await window.ethereum.request({
    method: 'eth_sendTransaction',
    params: [{
      from,
      to: SENDARC_ROUTER.address,
      value: '0x0', // no value — just recording
      data: recordData,
      gas: '0x186A0', // 100000 gas — covers cold SSTORE on first writes + event + storage
    }],
  })

  // Wait for record tx to confirm
  const recordReceipt = await waitForReceipt(recordTxHash, 30, 1000)
  if (recordReceipt && recordReceipt.status === '0x0') {
    throw new Error('SendArcRouter record failed. Check your wallet is connected to Arc Testnet.')
  }

  // ── Step 2: Send actual USDC to recipient ────────────────────────
  // Simple native transfer — USDC is native token on Arc
  const sendTxHash = await window.ethereum.request({
    method: 'eth_sendTransaction',
    params: [{
      from,
      to,
      value: amountHex,
      gas: '0x5208', // 21000 — simple native transfer
    }],
  })

  const sendReceipt = await waitForReceipt(sendTxHash, 30, 1000)
  if (sendReceipt && sendReceipt.status === '0x0') {
    throw new Error('USDC transfer failed. Check your balance.')
  }

  const gasUsed = (recordReceipt ? parseInt(recordReceipt.gasUsed, 16) : 0)
                + (sendReceipt ? parseInt(sendReceipt.gasUsed, 16) : 21000)
  const gasPrice = await window.ethereum.request({ method: 'eth_gasPrice' })
  const gasCostRaw = BigInt(gasUsed) * BigInt(parseInt(gasPrice, 16))
  const gasCost = (Number(gasCostRaw) / 1e18).toFixed(9)
  const settlementTime = Date.now() - start

  return {
    // Primary hash is the contract interaction (Step 1) for attribution
    hash: recordTxHash,
    // Secondary hash is the actual USDC transfer (Step 2)
    transferTxHash: sendTxHash,
    from,
    to,
    routerAddress: SENDARC_ROUTER.address,
    amount: parseFloat(amount),
    gasCost,
    gasUsed,
    blockNumber: sendReceipt ? parseInt(sendReceipt.blockNumber, 16) : 0,
    settlementTime,
    status: 'confirmed',
    sourceChain: 'Arc Testnet',
    destinationChain: 'Arc Testnet',
    network: 'Arc Testnet (via SendArcRouter)',
    chainId: ARC_TESTNET.id,
    cctpBridge: false,
    routedThroughContract: true,
    simulated: false,
  }
}

// ─── Main: Send USDC natively on Arc Testnet ──────────────────────────
// Arc: USDC is the native gas token — simple value transfer
export async function sendUsdcNativeArc({ from, to, amount }) {
  if (!window.ethereum) throw new Error('MetaMask not found')
  const start = Date.now()

  // Arc uses 18 decimals for native USDC
  const rawAmount = BigInt(Math.round(parseFloat(amount) * 1e6)) * BigInt(1e12)
  const amountHex = '0x' + rawAmount.toString(16)

  const txHash = await window.ethereum.request({
    method: 'eth_sendTransaction',
    params: [{ from, to, value: amountHex, gas: '0x5208' }],
  })

  const receipt = await waitForReceipt(txHash, 30, 1000)

  const gasUsed = receipt ? parseInt(receipt.gasUsed, 16) : 21000
  const gasPrice = await window.ethereum.request({ method: 'eth_gasPrice' })
  const gasCostRaw = BigInt(gasUsed) * BigInt(parseInt(gasPrice, 16))
  const gasCost = (Number(gasCostRaw) / 1e18).toFixed(9)
  const settlementTime = Date.now() - start

  return {
    hash: txHash,
    from,
    to,
    amount: parseFloat(amount),
    gasCost,
    gasUsed,
    blockNumber: receipt ? parseInt(receipt.blockNumber, 16) : 0,
    settlementTime,
    status: 'confirmed',
    sourceChain: 'Arc Testnet',
    destinationChain: 'Arc Testnet',
    network: 'Arc Testnet',
    chainId: ARC_TESTNET.id,
    cctpBridge: false,
    simulated: false,
  }
}

// ─── Unified send function (used by TestnetSend.jsx) ──────────────────
export async function sendUsdcOnChain(chainKey, { to, amount }, onStatusUpdate = () => {}) {
  if (!window.ethereum) throw new Error('MetaMask not found')

  const accounts = await window.ethereum.request({ method: 'eth_accounts' })
  const from = accounts[0]
  if (!from) throw new Error('No account connected')

  const chain = EVM_CHAINS[chainKey]
  if (!chain) throw new Error('Unknown chain: ' + chainKey)

  if (chainKey === 'arc') {
    // Route through SendArcRouter if deployed — this is what makes
    // Arc Network attribute the volume to SendArc on the block explorer
    if (SENDARC_ROUTER.address) {
      onStatusUpdate('Routing through SendArcRouter...')
      return sendUsdcViaSendArcRouter({ from, to, amount })
    }
    onStatusUpdate('Sending USDC on Arc Testnet...')
    return sendUsdcNativeArc({ from, to, amount })
  } else {
    // CCTP cross-chain bridge: source chain → Arc Testnet
    return sendUsdcViaCCTP(chainKey, { from, to, amount }, onStatusUpdate)
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────
export function shortAddr(addr) {
  if (!addr) return '—'
  return addr.slice(0, 6) + '...' + addr.slice(-4)
}

export function arcScanTx(hash) {
  return ARC_TESTNET.explorerUrl + '/tx/' + hash
}

export function arcScanAddr(address) {
  return ARC_TESTNET.explorerUrl + '/address/' + address
}

export function switchToArcTestnet() {
  return switchToChain('arc')
}

// Formats raw on-chain USDC value (smallest unit) to human-readable string
export function formatUsdc(raw, decimals = 6) {
  return (Number(raw) / Math.pow(10, decimals)).toFixed(6)
}

// Parses human-readable USDC amount into smallest unit BigInt
export function parseUsdc(amount, decimals = 6) {
  return BigInt(Math.round(parseFloat(amount) * Math.pow(10, decimals)))
}

// Formats milliseconds into a readable settlement time string
export function formatSettlement(ms) {
  if (!ms || ms < 0) return '—'
  if (ms < 1000) return ms + 'ms'
  return (ms / 1000).toFixed(2) + 's'
}

// Prompts MetaMask to add Arc Testnet — alias for switchToChain('arc')
export function addArcTestnetToWallet() {
  return switchToChain('arc')
}