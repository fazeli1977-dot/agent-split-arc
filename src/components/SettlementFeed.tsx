import { useEffect, useState, useRef } from 'react'
import { createPublicClient, http, decodeEventLog, type Log } from 'viem'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Clock } from 'lucide-react'
import { requireChain, buildTxExplorerUrl } from '@/onchain-facts'
import { Amount, usdcDecimalsFor } from '@/onchain-money'
import { AGENT_SPLIT_ADDRESS, AGENT_SPLIT_ABI } from '@/contract'

const CHAIN_ID = 5042002
const chainInfo = requireChain(CHAIN_ID)
const USDC_DECIMALS = usdcDecimalsFor(CHAIN_ID)

interface SettlementEvent {
  taskId: string
  payer: string
  recipient: string
  totalAmount: bigint
  recipientAmount: bigint
  platformFee: bigint
  treasury: string
  txHash: string
}

interface Props {
  address: string | undefined
  isConnected: boolean
}

function formatAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function formatTaskId(raw: string) {
  try {
    const bytes = raw.slice(2)
    const chars: string[] = []
    for (let i = 0; i < bytes.length; i += 2) {
      const code = parseInt(bytes.slice(i, i + 2), 16)
      if (code === 0) break
      chars.push(String.fromCharCode(code))
    }
    const text = chars.join('')
    return text.length > 0 ? text : `${raw.slice(0, 10)}...`
  } catch {
    return `${raw.slice(0, 10)}...`
  }
}

export default function SettlementFeed({ address, isConnected }: Props) {
  const [events, setEvents] = useState<SettlementEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const prevConnected = useRef(isConnected)
  const prevAddress = useRef(address)

  useEffect(() => {
    const didChange = prevConnected.current !== isConnected || prevAddress.current !== address
    prevConnected.current = isConnected
    prevAddress.current = address

    if (!isConnected || !address) {
      if (didChange) setEvents([])
      return
    }

    let cancelled = false

    async function fetchEvents() {
      if (!address) return
      setLoading(true)
      try {
        const client = createPublicClient({
          transport: http(chainInfo.rpcUrls[0]),
        })

        const head = await client.getBlockNumber()
        // Query recent blocks to avoid RPC limit errors
        const fromBlock = head > 500n ? head - 500n : 0n

        const raw: Log[] = await client.getLogs({
          address: AGENT_SPLIT_ADDRESS,
          fromBlock,
          toBlock: 'latest',
        }).catch(() => [])

        if (cancelled) return

        const parsed: SettlementEvent[] = raw
          .flatMap((log) => {
            try {
              const decoded = decodeEventLog({
                abi: AGENT_SPLIT_ABI,
                eventName: 'Settled',
                data: log.data,
                topics: log.topics,
              })
              const args: any = decoded.args
              if (args.payer.toLowerCase() !== address.toLowerCase()) return []
              return [{
                taskId: args.taskId,
                payer: args.payer,
                recipient: args.recipient,
                totalAmount: args.totalAmount,
                recipientAmount: args.recipientAmount,
                platformFee: args.platformFee,
                treasury: args.treasury,
                txHash: log.transactionHash ?? '',
              }]
            } catch {
              return []
            }
          })
          .reverse()
          .slice(0, 20)

        setEvents(parsed)
        setLoadError(null)
      } catch (err) {
        console.warn('Log query error:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void fetchEvents()
    const interval = setInterval(() => { void fetchEvents() }, 15_000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [address, isConnected])

  if (!isConnected) return null

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <Clock className="size-3.5" style={{ color: 'var(--muted)' }} />
        <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
          Your Settlements
        </h3>
        {loading && (
          <span
            className="ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium"
            style={{ background: 'rgba(18,45,69,0.06)', color: 'var(--subtle)' }}
          >
            Updating...
          </span>
        )}
      </div>

      {loadError && (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{ background: 'rgba(186,43,76,0.06)', color: 'var(--danger)' }}
        >
          {loadError}
        </div>
      )}

      {!loading && !loadError && events.length === 0 && (
        <div
          className="flex flex-col items-center justify-center rounded-2xl px-4 py-10 text-center"
          style={{ background: 'var(--surface)', border: '1px dashed var(--border)' }}
        >
          <div
            className="mb-3 flex size-10 items-center justify-center rounded-full"
            style={{ background: 'var(--surface-muted)' }}
          >
            <CheckCircle2 className="size-5" style={{ color: 'var(--border-strong)' }} />
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>
            No settlements yet
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
            Your completed payments will appear here
          </p>
        </div>
      )}

      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {events.map((ev) => {
            const txUrl = buildTxExplorerUrl(CHAIN_ID, ev.txHash)
            const netAmount = Amount.fromRaw(ev.recipientAmount, USDC_DECIMALS).toFixed(2)
            const totalAmount = Amount.fromRaw(ev.totalAmount, USDC_DECIMALS).toFixed(2)
            const humanTaskId = formatTaskId(ev.taskId)

            return (
              <motion.a
                key={ev.txHash}
                href={txUrl}
                target="_blank"
                rel="noreferrer"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center justify-between rounded-2xl px-4 py-3 transition-colors hover:opacity-80"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  textDecoration: 'none',
                  display: 'flex',
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="flex size-9 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: 'rgba(26,128,71,0.10)' }}
                  >
                    <CheckCircle2 className="size-4" style={{ color: 'var(--success)' }} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                      {humanTaskId}
                    </p>
                    <p className="mono text-xs truncate" style={{ color: 'var(--subtle)' }}>
                      {formatAddr(ev.recipient)}
                    </p>
                  </div>
                </div>
                <div className="ml-3 shrink-0 text-right">
                  <p className="text-sm font-semibold tabular-nums" style={{ color: 'var(--ink)' }}>
                    ${totalAmount}
                  </p>
                  <p className="text-xs tabular-nums" style={{ color: 'var(--success)' }}>
                    ${netAmount} net
                  </p>
                </div>
              </motion.a>
            )
          })}
        </AnimatePresence>
      </div>
    </section>
  )
}
