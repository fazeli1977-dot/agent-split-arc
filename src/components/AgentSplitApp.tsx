import { useState } from 'react'
import { useAccount } from 'wagmi'
import { ConnectKitButton } from 'connectkit'
import { Wallet, Zap } from 'lucide-react'
import { TokenUSDC } from '@web3icons/react'
import DepositSheet from './DepositSheet'
import SettlementFeed from './SettlementFeed'
import BalanceCard from './BalanceCard'

export default function AgentSplitApp() {
  const { address, isConnected } = useAccount()
  const [depositOpen, setDepositOpen] = useState(false)

  return (
    <div className="min-h-dvh w-full" style={{ background: 'var(--bg-gradient)' }}>
      {/* Header */}
      <header className="mx-auto flex max-w-md items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2.5">
          <div
            className="flex size-8 items-center justify-center rounded-xl"
            style={{ background: 'var(--accent)' }}
          >
            <Zap className="size-4 fill-white text-white" />
          </div>
          <div>
            <span className="display text-sm font-semibold" style={{ color: 'var(--ink)' }}>
              AgentSplit
            </span>
            <span
              className="ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
              style={{ background: 'rgba(18,45,69,0.08)', color: 'var(--muted)' }}
            >
              Arc Testnet
            </span>
          </div>
        </div>
        <ConnectKitButton />
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-md px-4 pb-10 pt-2 space-y-4">
        {/* Hero balance */}
        <BalanceCard address={address} isConnected={isConnected} />

        {/* Fee info strip */}
        <div
          className="flex items-center justify-between rounded-2xl px-4 py-3"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2">
            <TokenUSDC variant="branded" size={20} />
            <span className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>
              Split structure
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm tabular-nums">
            <span style={{ color: 'var(--success)' }}>
              <span className="font-semibold">95%</span>{' '}
              <span className="text-xs" style={{ color: 'var(--muted)' }}>
                Recipient
              </span>
            </span>
            <span style={{ color: 'var(--muted)' }}>/</span>
            <span style={{ color: 'var(--danger)' }}>
              <span className="font-semibold">5%</span>{' '}
              <span className="text-xs" style={{ color: 'var(--muted)' }}>
                Platform
              </span>
            </span>
          </div>
        </div>

        {/* Primary CTA */}
        {isConnected ? (
          <button
            onClick={() => setDepositOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold text-white transition-all hover:scale-[1.01] active:scale-[0.99]"
            style={{ background: 'var(--accent)' }}
          >
            <Wallet className="size-4" />
            New Payment
          </button>
        ) : (
          <div
            className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-medium"
            style={{
              background: 'var(--surface-muted)',
              color: 'var(--muted)',
              border: '1px dashed var(--border-strong)',
            }}
          >
            Connect wallet to send payments
          </div>
        )}

        {/* Settlement feed */}
        <SettlementFeed address={address} isConnected={isConnected} />
      </main>

      {/* Deposit sheet */}
      <DepositSheet open={depositOpen} onClose={() => setDepositOpen(false)} />
    </div>
  )
}
