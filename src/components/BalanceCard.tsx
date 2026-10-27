import { useBalance } from 'wagmi'
import { arcTestnet } from 'viem/chains'

interface BalanceCardProps {
  address: string | undefined
  isConnected: boolean
}

export default function BalanceCard({ address, isConnected }: BalanceCardProps) {
  const { data: balanceData, isLoading } = useBalance({
    address: address as `0x${string}` | undefined,
    chainId: arcTestnet.id,
    query: {
      enabled: Boolean(address && isConnected),
      refetchInterval: 5000,
    },
  })

  const formattedBalance = balanceData
    ? Number(balanceData.formatted).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
      })
    : '0.00'

  return (
    <section
      className="rounded-3xl p-5"
      style={{
        background: 'var(--surface)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        border: '1px solid var(--border)',
      }}
    >
      <div className="mb-3 flex items-center gap-1.5">
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest"
          style={{ background: 'rgba(26,128,71,0.10)', color: 'var(--success)' }}
        >
          Live Balance
        </span>
      </div>

      <div className="flex items-baseline gap-2">
        <span
          className="display text-5xl font-bold tabular-nums"
          style={{ color: 'var(--ink)', letterSpacing: '-0.03em' }}
        >
          {isLoading ? (
            <span className="inline-block h-10 w-32 animate-pulse rounded-xl" style={{ background: 'var(--border)' }} />
          ) : (
            formattedBalance
          )}
        </span>
        <span className="text-xl font-medium" style={{ color: 'var(--subtle)' }}>
          {balanceData?.symbol || 'USDC'}
        </span>
      </div>

      <p className="mt-2 text-xs" style={{ color: 'var(--muted)' }}>
        {isConnected
          ? 'Arc Testnet'
          : 'Connect your wallet to view balance'}
      </p>
    </section>
  )
}
