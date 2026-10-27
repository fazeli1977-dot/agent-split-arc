import { useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useReadContract } from 'wagmi'
import { erc20Abi, parseUnits } from 'viem'
import { X, Loader2, ExternalLink, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { getUsdc, buildTxExplorerUrl } from '@/onchain-facts'
import { usdcDecimalsFor, Amount } from '@/onchain-money'
import { AGENT_SPLIT_ADDRESS, AGENT_SPLIT_ABI } from '@/contract'

const CHAIN_ID = 5042002

const usdcFact = getUsdc(CHAIN_ID)
const USDC_ADDRESS = (usdcFact?.address ?? '0x0000000000000000000000000000000000000000') as `0x${string}`
const USDC_DECIMALS = usdcDecimalsFor(CHAIN_ID)

const springs = {
  sheet: { type: 'spring' as const, damping: 28, stiffness: 320 },
}

// Pre-filled quick amounts in USD cents (6-decimal USDC)
const QUICK_AMOUNTS = ['1', '5', '10', '25', '50']

function parseOnchainError(error: unknown): string {
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase()
  if (msg.includes('user rejected') || msg.includes('user denied')) return 'Transaction cancelled.'
  if (msg.includes('insufficient') || msg.includes('exceeds balance')) return 'Insufficient USDC balance.'
  if (msg.includes('duplicatetaskid')) return 'A payment with this task ID already exists.'
  if (msg.includes('reverted')) return 'Transaction failed — check allowance and balance.'
  if (msg.includes('network') || msg.includes('timeout')) return 'Network error. Please retry.'
  return 'Something went wrong. Please try again.'
}

interface Props {
  open: boolean
  onClose: () => void
}

type Step = 'form' | 'approving' | 'depositing' | 'success'

export default function DepositSheet({ open, onClose }: Props) {
  const { address, chainId } = useAccount()
  const { switchChain } = useSwitchChain()

  const [amount, setAmount] = useState('')
  const [recipient, setRecipient] = useState('')
  const [taskId, setTaskId] = useState('')
  const [step, setStep] = useState<Step>('form')
  const [settleTxHash, setSettleTxHash] = useState<`0x${string}` | undefined>()

  const wrongChain = chainId !== CHAIN_ID

  // USDC balance
  const { data: rawBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
    chainId: CHAIN_ID,
    query: { enabled: !!address },
  })
  const formattedBalance = rawBalance !== undefined
    ? Amount.fromRaw(rawBalance, USDC_DECIMALS).toFixed(2)
    : undefined

  // Approve write
  const { writeContract: approveWrite, data: approveTxHash, isPending: approveIsPending } = useWriteContract()
  const { isLoading: approveConfirming, isSuccess: approveSuccess } = useWaitForTransactionReceipt({
    hash: approveTxHash,
  })

  // Deposit write
  const { writeContract: depositWrite, data: depositTxHash, isPending: depositIsPending, isError: depositIsError, error: depositError } = useWriteContract()
  const { isLoading: depositConfirming, isSuccess: depositSuccess } = useWaitForTransactionReceipt({
    hash: depositTxHash,
  })

  // Derive parsed amount
  const parsedAmount = amount && /^\d+(\.\d{0,6})?$/.test(amount)
    ? parseUnits(amount, USDC_DECIMALS)
    : undefined

  const fee = parsedAmount !== undefined
    ? Amount.fromRaw((parsedAmount * 500n) / 10000n, USDC_DECIMALS).toFixed(2)
    : undefined
  const recipientNet = parsedAmount !== undefined
    ? Amount.fromRaw(parsedAmount - (parsedAmount * 500n) / 10000n, USDC_DECIMALS).toFixed(2)
    : undefined

  // Generate a deterministic task ID from input string
  const taskIdBytes32 = useCallback((): `0x${string}` => {
    if (!taskId.trim()) return `0x${'00'.repeat(32)}`
    // Simple UTF-8 → hex with right-zero-padding to 32 bytes
    const encoder = new TextEncoder()
    const bytes = encoder.encode(taskId.slice(0, 32))
    const padded = new Uint8Array(32)
    padded.set(bytes)
    return `0x${Array.from(padded).map((b) => b.toString(16).padStart(2, '0')).join('')}`
  }, [taskId])

  const isFormValid =
    !!parsedAmount &&
    parsedAmount > 0n &&
    recipient.startsWith('0x') &&
    recipient.length === 42 &&
    !!taskId.trim()

  // --- Approve step ---
  const handleApprove = () => {
    if (!isFormValid || !parsedAmount) return
    if (wrongChain) { switchChain({ chainId: CHAIN_ID }); return }
    setStep('approving')
    approveWrite(
      {
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: 'approve',
        args: [AGENT_SPLIT_ADDRESS, parsedAmount],
        chainId: CHAIN_ID,
      },
      {
        onError: (err) => {
          setStep('form')
          toast.error(parseOnchainError(err))
        },
      },
    )
  }

  // When approval confirms, auto-trigger deposit
  if (approveSuccess && step === 'approving') {
    setStep('depositing')
    depositWrite(
      {
        address: AGENT_SPLIT_ADDRESS,
        abi: AGENT_SPLIT_ABI,
        functionName: 'deposit',
        args: [taskIdBytes32(), recipient as `0x${string}`, parsedAmount ?? 0n],
        chainId: CHAIN_ID,
      },
      {
        onSuccess: (hash) => setSettleTxHash(hash),
        onError: (err) => {
          setStep('form')
          toast.error(parseOnchainError(err))
        },
      },
    )
  }

  if (depositSuccess && step === 'depositing') {
    setStep('success')
  }

  if (depositIsError && step === 'depositing') {
    setStep('form')
    toast.error(parseOnchainError(depositError))
  }

  const handleClose = () => {
    setStep('form')
    setAmount('')
    setRecipient('')
    setTaskId('')
    setSettleTxHash(undefined)
    onClose()
  }

  const isBusy = step === 'approving' || step === 'depositing' || approveIsPending || approveConfirming || depositIsPending || depositConfirming

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <motion.section
            className="relative w-full max-w-md overflow-hidden rounded-t-3xl"
            style={{
              background: 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(40px) saturate(200%)',
              WebkitBackdropFilter: 'blur(40px) saturate(200%)',
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={springs.sheet}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Spectral strip */}
            <div
              className="h-1 w-full"
              style={{
                background:
                  'linear-gradient(90deg,#3b82f6,#8b5cf6,#ec4899,#f59e0b,#10b981)',
              }}
            />

            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-black/10" />
            </div>

            <div className="px-5 pb-8 pt-2">
              {step === 'success' ? (
                <SuccessState
                  txHash={settleTxHash}
                  amount={amount}
                  recipient={recipient}
                  taskId={taskId}
                  onClose={handleClose}
                />
              ) : (
                <>
                  {/* Header */}
                  <div className="mb-5 flex items-center justify-between">
                    <h2
                      className="display text-lg font-semibold"
                      style={{ color: 'var(--ink)' }}
                    >
                      New Payment
                    </h2>
                    <button
                      onClick={handleClose}
                      className="flex size-8 items-center justify-center rounded-full transition-colors"
                      style={{ background: 'var(--surface-muted)' }}
                    >
                      <X className="size-4" style={{ color: 'var(--muted)' }} />
                    </button>
                  </div>

                  {/* Amount input */}
                  <div
                    className="mb-4 rounded-2xl p-4"
                    style={{
                      background: 'var(--surface-muted)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <input
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^0-9.]/g, '')
                        if (v === '' || /^\d*\.?\d*$/.test(v)) setAmount(v)
                      }}
                      placeholder="0.00"
                      disabled={isBusy}
                      className="display w-full bg-transparent text-4xl font-bold tabular-nums outline-none placeholder:opacity-20 disabled:opacity-50"
                      style={{ color: 'var(--ink)' }}
                    />
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs font-medium" style={{ color: 'var(--subtle)' }}>
                        USDC
                      </span>
                      {formattedBalance !== undefined && (
                        <button
                          disabled={isBusy}
                          onClick={() => setAmount(formattedBalance)}
                          className="text-xs font-semibold disabled:opacity-40"
                          style={{ color: 'var(--accent-hover)' }}
                        >
                          Balance: {formattedBalance} · Max
                        </button>
                      )}
                    </div>
                    {/* Quick amounts */}
                    <div className="mt-3 flex gap-2 flex-wrap">
                      {QUICK_AMOUNTS.map((q) => (
                        <button
                          key={q}
                          disabled={isBusy}
                          onClick={() => setAmount(q)}
                          className="rounded-full px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-40"
                          style={{
                            background: amount === q ? 'var(--accent)' : 'var(--surface)',
                            color: amount === q ? '#fff' : 'var(--ink-2)',
                            border: '1px solid var(--border)',
                          }}
                        >
                          ${q}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Recipient */}
                  <div className="mb-3">
                    <label
                      className="mb-1.5 block text-xs font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--muted)' }}
                    >
                      Recipient Address
                    </label>
                    <input
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value.trim())}
                      placeholder="0x..."
                      disabled={isBusy}
                      className="mono w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-colors disabled:opacity-50"
                      style={{
                        background: 'var(--surface-muted)',
                        border: '1px solid var(--border)',
                        color: 'var(--ink)',
                      }}
                    />
                  </div>

                  {/* Task ID */}
                  <div className="mb-4">
                    <label
                      className="mb-1.5 block text-xs font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--muted)' }}
                    >
                      Task / Invoice ID
                    </label>
                    <input
                      value={taskId}
                      onChange={(e) => setTaskId(e.target.value)}
                      placeholder="e.g. task-001, invoice-42"
                      disabled={isBusy}
                      className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-colors disabled:opacity-50"
                      style={{
                        background: 'var(--surface-muted)',
                        border: '1px solid var(--border)',
                        color: 'var(--ink)',
                        fontFamily: 'inherit',
                      }}
                    />
                  </div>

                  {/* Preview rows */}
                  {parsedAmount !== undefined && parsedAmount > 0n && (
                    <div
                      className="mb-4 rounded-2xl px-4 py-3 space-y-2"
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                    >
                      <PreviewRow label="Total" value={`$${amount} USDC`} />
                      <PreviewRow label="Recipient receives" value={`$${recipientNet} USDC`} highlight="success" />
                      <PreviewRow label="Platform fee (5%)" value={`$${fee} USDC`} highlight="muted" />
                    </div>
                  )}

                  {/* CTA */}
                  <button
                    disabled={!isFormValid || isBusy || wrongChain}
                    onClick={handleApprove}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold text-white transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
                    style={{ background: 'var(--accent)' }}
                  >
                    {wrongChain ? (
                      'Switch to Arc Testnet'
                    ) : step === 'approving' || approveIsPending || approveConfirming ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        {approveIsPending ? 'Confirm approval in wallet...' : 'Approving USDC...'}
                      </>
                    ) : step === 'depositing' || depositIsPending || depositConfirming ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        {depositIsPending ? 'Confirm payment in wallet...' : 'Settling payment...'}
                      </>
                    ) : (
                      'Approve & Send'
                    )}
                  </button>

                  <p className="mt-3 text-center text-xs" style={{ color: 'var(--muted)' }}>
                    Two wallet confirmations: approve USDC, then send payment.
                  </p>
                </>
              )}
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function PreviewRow({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: 'success' | 'muted'
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs" style={{ color: 'var(--muted)' }}>
        {label}
      </span>
      <span
        className="text-xs font-semibold tabular-nums"
        style={{
          color:
            highlight === 'success'
              ? 'var(--success)'
              : highlight === 'muted'
              ? 'var(--subtle)'
              : 'var(--ink)',
        }}
      >
        {value}
      </span>
    </div>
  )
}

function SuccessState({
  txHash,
  amount,
  recipient,
  taskId,
  onClose,
}: {
  txHash: `0x${string}` | undefined
  amount: string
  recipient: string
  taskId: string
  onClose: () => void
}) {
  const explorerUrl = txHash ? buildTxExplorerUrl(CHAIN_ID, txHash) : undefined

  const recipientNet = amount && /^\d+(\.\d{0,6})?$/.test(amount)
    ? Amount.fromRaw(
        (parseUnits(amount, USDC_DECIMALS) * 9500n) / 10000n,
        USDC_DECIMALS,
      ).toFixed(2)
    : amount

  return (
    <div className="flex flex-col items-center py-4 text-center">
      <div
        className="mb-4 flex size-16 items-center justify-center rounded-full"
        style={{ background: 'rgba(26,128,71,0.10)' }}
      >
        <CheckCircle2 className="size-8" style={{ color: 'var(--success)' }} />
      </div>
      <h3 className="display text-xl font-semibold" style={{ color: 'var(--ink)' }}>
        Payment Settled
      </h3>
      <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
        ${recipientNet} USDC sent to recipient
      </p>

      <div
        className="mt-5 w-full rounded-2xl px-4 py-3 text-left space-y-2"
        style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}
      >
        <ReceiptRow label="Task ID" value={taskId} mono />
        <ReceiptRow
          label="Recipient"
          value={`${recipient.slice(0, 8)}...${recipient.slice(-6)}`}
          mono
        />
        <ReceiptRow label="Amount sent" value={`$${recipientNet} USDC`} />
        <ReceiptRow label="Platform fee" value="5%" />
      </div>

      {explorerUrl && (
        <a
          href={explorerUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium"
          style={{ color: 'var(--accent-hover)' }}
        >
          View on ArcScan <ExternalLink className="size-3.5" />
        </a>
      )}

      <button
        onClick={onClose}
        className="mt-5 w-full rounded-2xl py-3 text-sm font-semibold transition-all hover:scale-[1.01] active:scale-[0.99]"
        style={{ background: 'var(--accent)', color: '#fff' }}
      >
        Done
      </button>
    </div>
  )
}

function ReceiptRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs shrink-0" style={{ color: 'var(--muted)' }}>{label}</span>
      <span
        className={`text-xs font-medium truncate ${mono ? 'mono' : ''}`}
        style={{ color: 'var(--ink-2)' }}
      >
        {value}
      </span>
    </div>
  )
}
