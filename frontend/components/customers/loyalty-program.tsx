'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Gift,
  Star,
  Trophy,
  Crown,
  Gem,
  History,
  ArrowUp,
  ArrowDown,
  ShoppingCart,
  Wrench,
  Calendar,
  ChevronRight,
  Check,
  Lock,
  Sparkles,
  Ticket,
  Coffee,
  Fuel,
  Percent,
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

// Types
interface LoyaltyTransaction {
  id: string
  date: string
  type: 'earned' | 'redeemed' | 'bonus' | 'expired'
  points: number
  description: string
  reference?: string
}

interface Reward {
  id: string
  name: string
  description: string
  pointsCost: number
  category: 'service' | 'discount' | 'product' | 'experience'
  icon: React.ElementType
  available: boolean
}

interface Tier {
  name: string
  minPoints: number
  maxPoints: number
  color: string
  bgColor: string
  icon: React.ElementType
  benefits: string[]
}

// Mock Data
const loyaltyTiers: Tier[] = [
  {
    name: 'Bronze',
    minPoints: 0,
    maxPoints: 999,
    color: 'text-[var(--status-warning)]',
    bgColor: 'bg-[var(--status-warning)]/10',
    icon: Star,
    benefits: ['1 punto per ogni € speso', 'Sconto compleanno 5%'],
  },
  {
    name: 'Silver',
    minPoints: 1000,
    maxPoints: 4999,
    color: 'text-[var(--text-secondary)]',
    bgColor: 'bg-[var(--surface-secondary)]',
    icon: Trophy,
    benefits: ['1.2 punti per ogni € speso', 'Sconto compleanno 10%', 'Priority booking'],
  },
  {
    name: 'Gold',
    minPoints: 5000,
    maxPoints: 9999,
    color: 'text-[var(--status-warning)]',
    bgColor: 'bg-[var(--status-warning)]/20',
    icon: Crown,
    benefits: ['1.5 punti per ogni € speso', 'Sconto compleanno 15%', 'Priority booking', 'Servizio di cortesia gratuito'],
  },
  {
    name: 'Platinum',
    minPoints: 10000,
    maxPoints: Infinity,
    color: 'text-[var(--brand)]',
    bgColor: 'bg-[var(--brand-subtle)]',
    icon: Gem,
    benefits: ['2 punti per ogni € speso', 'Sconto compleanno 20%', 'Priority booking', 'Servizi gratuiti', 'Consulenza dedicata'],
  },
]

const mockTransactions: LoyaltyTransaction[] = [
  { id: '1', date: '2026-02-15', type: 'earned', points: 450, description: 'Tagliando completo', reference: 'SR-001' },
  { id: '2', date: '2026-01-10', type: 'earned', points: 320, description: 'Sostituzione freni', reference: 'SR-002' },
  { id: '3', date: '2026-01-05', type: 'redeemed', points: -500, description: 'Sconto €25 su tagliando', reference: 'REW-001' },
  { id: '4', date: '2025-11-20', type: 'earned', points: 180, description: 'Cambio olio e filtri', reference: 'SR-003' },
  { id: '5', date: '2025-11-01', type: 'bonus', points: 200, description: 'Bonus fedeltà 6 mesi', reference: 'BONUS-001' },
  { id: '6', date: '2025-09-05', type: 'earned', points: 120, description: 'Diagnosi elettronica', reference: 'SR-004' },
  { id: '7', date: '2025-08-01', type: 'earned', points: 250, description: 'Cambio gomme', reference: 'SR-005' },
  { id: '8', date: '2025-07-15', type: 'redeemed', points: -300, description: 'Caffè in officina gratis', reference: 'REW-002' },
]

const rewardsCatalog: Reward[] = [
  {
    id: 'r1',
    name: 'Sconto €25',
    description: 'Buono sconto di €25 su qualsiasi intervento',
    pointsCost: 500,
    category: 'discount',
    icon: Percent,
    available: true,
  },
  {
    id: 'r2',
    name: 'Lavaggio Interno',
    description: 'Lavaggio completo interno dell auto',
    pointsCost: 800,
    category: 'service',
    icon: Sparkles,
    available: true,
  },
  {
    id: 'r3',
    name: 'Cambio Olio Gratis',
    description: 'Cambio olio motore con filtro incluso',
    pointsCost: 1500,
    category: 'service',
    icon: Fuel,
    available: true,
  },
  {
    id: 'r4',
    name: 'Tagliando -20%',
    description: 'Sconto del 20% sul tagliando completo',
    pointsCost: 1000,
    category: 'discount',
    icon: Wrench,
    available: true,
  },
  {
    id: 'r5',
    name: 'Buono Carburante €30',
    description: 'Buono carburante utilizzabile in tutte le stazioni',
    pointsCost: 600,
    category: 'product',
    icon: Fuel,
    available: true,
  },
  {
    id: 'r6',
    name: 'Caffè in Officina',
    description: '10 caffè gratuiti presso la nostra officina',
    pointsCost: 300,
    category: 'experience',
    icon: Coffee,
    available: true,
  },
  {
    id: 'r7',
    name: 'Diagnosi Elettronica',
    description: 'Diagnosi completa del sistema elettronico',
    pointsCost: 700,
    category: 'service',
    icon: Wrench,
    available: false,
  },
  {
    id: 'r8',
    name: 'VIP Experience',
    description: 'Giornata in officina con meccanico dedicato',
    pointsCost: 5000,
    category: 'experience',
    icon: Crown,
    available: true,
  },
]

// Components
function TierBadge({ tier }: { tier: Tier }) {
  const Icon = tier.icon
  return (
    <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ${tier.bgColor} ${tier.color}`}>
      <Icon className="h-4 w-4" />
      {tier.name}
    </div>
  )
}

function TransactionIcon({ type }: { type: LoyaltyTransaction['type'] }) {
  const config = {
    earned: { icon: ArrowUp, color: 'text-[var(--status-success)] bg-[var(--status-success-subtle)]' },
    redeemed: { icon: ArrowDown, color: 'text-[var(--status-error)] bg-[var(--status-error-subtle)]' },
    bonus: { icon: Gift, color: 'text-[var(--brand)] bg-[var(--brand)]/10' },
    expired: { icon: Calendar, color: 'text-[var(--text-secondary)] bg-[var(--surface-secondary)]' },
  }

  const { icon: Icon, color } = config[type]

  return (
    <div className={`rounded-full p-2 ${color}`}>
      <Icon className="h-4 w-4" />
    </div>
  )
}

function RewardCard({ reward, userPoints, onRedeem }: { reward: Reward; userPoints: number; onRedeem: () => void }) {
  const Icon = reward.icon
  const canAfford = userPoints >= reward.pointsCost

  const categoryColors = {
    service: 'bg-[var(--status-info-subtle)] text-[var(--status-info)]',
    discount: 'bg-[var(--status-success-subtle)] text-[var(--status-success)]',
    product: 'bg-[var(--brand)]/10 text-[var(--brand)]',
    experience: 'bg-[var(--status-warning)]/10 text-[var(--status-warning)]',
  }

  return (
    <div className={`workshop-card relative ${!reward.available ? 'opacity-60' : ''}`}>
      {!reward.available && (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-[var(--surface-primary)]/5 backdrop-blur-[1px]">
          <span className="rounded-full bg-[var(--surface-primary)] px-3 py-1 text-xs font-medium text-[var(--text-on-brand)]">
            Non disponibile
          </span>
        </div>
      )}
      <div className="flex items-start justify-between">
        <div className={`rounded-full p-3 ${categoryColors[reward.category]}`}>
          <Icon className="h-6 w-6" />
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${categoryColors[reward.category]}`}>
          {reward.category === 'service' && 'Servizio'}
          {reward.category === 'discount' && 'Sconto'}
          {reward.category === 'product' && 'Prodotto'}
          {reward.category === 'experience' && 'Esperienza'}
        </span>
      </div>
      <h4 className="mt-3 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">{reward.name}</h4>
      <p className="mt-1 text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">{reward.description}</p>
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Star className="h-4 w-4 text-[var(--status-warning)]" />
          <span className="font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">{reward.pointsCost}</span>
          <span className="text-sm text-[var(--text-tertiary)]">punti</span>
        </div>
        <Button
          size="sm"
          disabled={!canAfford || !reward.available}
          onClick={onRedeem}
          variant={canAfford ? 'default' : 'outline'}
        >
          {canAfford ? 'Riscatta' : 'Insufficiente'}
        </Button>
      </div>
    </div>
  )
}

function ProgressBar({ current, min, max, color }: { current: number; min: number; max: number; color: string }) {
  const progress = Math.min(100, Math.max(0, ((current - min) / (max - min)) * 100))

  return (
    <div className="h-3 w-full rounded-full bg-[var(--border-default)] dark:bg-[var(--border-default)]">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}

export function LoyaltyProgram() {
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'rewards'>('overview')
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null)

  // Mock user data
  const userPoints = 8750
  const userTier = loyaltyTiers.find(t => userPoints >= t.minPoints && userPoints <= t.maxPoints) || loyaltyTiers[0]
  const nextTier = loyaltyTiers.find(t => t.minPoints > userPoints)
  const pointsToNextTier = nextTier ? nextTier.minPoints - userPoints : 0
  const progressToNext = nextTier
    ? ((userPoints - userTier.minPoints) / (nextTier.minPoints - userTier.minPoints)) * 100
    : 100

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Current Tier Card */}
      <div className="workshop-card bg-gradient-to-br from-brand-600 to-brand-700 text-[var(--text-on-brand)]">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-brand-100">Il tuo livello</p>
            <div className="mt-2 flex items-center gap-3">
              <userTier.icon className="h-8 w-8" />
              <span className="text-3xl font-bold">{userTier.name}</span>
            </div>
          </div>
          <div className="rounded-full bg-[var(--surface-secondary)]/20 p-3">
            <Gift className="h-6 w-6" />
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between text-sm">
            <span className="text-brand-100">Punti accumulati</span>
            <span className="font-bold">{userPoints.toLocaleString()}</span>
          </div>
          <div className="mt-2 h-3 rounded-full bg-[var(--brand)]/40/30">
            <div
              className="h-full rounded-full bg-[var(--surface-secondary)] transition-all"
              style={{ width: `${progressToNext}%` }}
            />
          </div>
          {nextTier && (
            <p className="mt-2 text-sm text-brand-100">
              Mancano {pointsToNextTier.toLocaleString()} punti per {nextTier.name}
            </p>
          )}
        </div>
      </div>

      {/* Tier Benefits */}
      <div className="workshop-card">
        <h3 className="mb-4 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
          I tuoi vantaggi {userTier.name}
        </h3>
        <div className="space-y-3">
          {userTier.benefits.map((benefit, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className="rounded-full bg-[var(--status-success-subtle)] p-1 dark:bg-[var(--status-success)]/40/30">
                <Check className="h-4 w-4 text-[var(--status-success)]" />
              </div>
              <span className="text-[var(--text-primary)] dark:text-[var(--text-primary)]">{benefit}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="workshop-card text-center">
          <ShoppingCart className="mx-auto h-8 w-8 text-[var(--brand)]" />
          <p className="mt-2 text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">18</p>
          <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">Interventi</p>
        </div>
        <div className="workshop-card text-center">
          <Gift className="mx-auto h-8 w-8 text-[var(--brand)]" />
          <p className="mt-2 text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">3</p>
          <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">Premi riscattati</p>
        </div>
        <div className="workshop-card text-center">
          <Calendar className="mx-auto h-8 w-8 text-[var(--status-warning)]" />
          <p className="mt-2 text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">15</p>
          <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">Giorni al compleanno</p>
        </div>
      </div>
    </div>
  )

  const renderHistory = () => (
    <div className="workshop-card p-0">
      <div className="border-b border-[var(--border-default)] p-4 dark:border-[var(--border-default)]">
        <h3 className="font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">Storico Punti</h3>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {mockTransactions.map((transaction) => (
          <div key={transaction.id} className="flex items-center gap-4 p-4 hover:bg-[var(--surface-secondary)] dark:hover:bg-[var(--surface-hover)]/50">
            <TransactionIcon type={transaction.type} />
            <div className="flex-1">
              <p className="font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">{transaction.description}</p>
              <p className="text-sm text-[var(--text-tertiary)]">
                {formatDate(transaction.date)}
                {transaction.reference && ` • Ref: ${transaction.reference}`}
              </p>
            </div>
            <div className={`text-right ${transaction.points > 0 ? 'text-[var(--status-success)]' : 'text-[var(--status-error)]'}`}>
              <p className="font-bold">
                {transaction.points > 0 ? '+' : ''}{transaction.points}
              </p>
              <p className="text-xs capitalize">{transaction.type}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const renderRewards = () => (
    <div className="space-y-6">
      {/* Points Balance */}
      <div className="workshop-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">Punti disponibili</p>
            <p className="text-3xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">{userPoints.toLocaleString()}</p>
          </div>
          <div className="rounded-full bg-[var(--status-warning)]/10 p-4 dark:bg-[var(--status-warning)]/40/30">
            <Star className="h-8 w-8 text-[var(--status-warning)]" />
          </div>
        </div>
      </div>

      {/* Rewards Grid */}
      <div>
        <h3 className="mb-4 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">Catalogo Premi</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {rewardsCatalog.map((reward) => (
            <RewardCard
              key={reward.id}
              reward={reward}
              userPoints={userPoints}
              onRedeem={() => setSelectedReward(reward)}
            />
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">Loyalty Program</h2>
          <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
            Manage loyalty points and rewards
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 text-[var(--status-warning)]" />
          <span className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">{userPoints.toLocaleString()}</span>
          <span className="text-sm text-[var(--text-tertiary)]">punti</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[var(--border-default)] dark:border-[var(--border-default)]">
        <nav className="flex gap-1">
          {[
            { id: 'overview', label: 'Overview', icon: Star },
            { id: 'history', label: 'Points History', icon: History },
            { id: 'rewards', label: 'Rewards', icon: Gift },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-brand-600 text-[var(--brand)]'
                  : 'border-transparent text-[var(--text-secondary)] hover:border-[var(--border-default)] hover:text-[var(--text-primary)] dark:text-[var(--text-secondary)] dark:hover:text-[var(--text-tertiary)]'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'history' && renderHistory()}
        {activeTab === 'rewards' && renderRewards()}
      </div>

      {/* Redeem Modal */}
      {selectedReward && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--surface-primary)]/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-[var(--surface-secondary)] p-6 shadow-xl dark:bg-[var(--surface-primary)]">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--brand)]/10 dark:bg-[var(--brand)]/40/30">
                <selectedReward.icon className="h-8 w-8 text-[var(--brand)]" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                {selectedReward.name}
              </h3>
              <p className="mt-2 text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
                {selectedReward.description}
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <Star className="h-5 w-5 text-[var(--status-warning)]" />
                <span className="text-xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">{selectedReward.pointsCost}</span>
                <span className="text-[var(--text-tertiary)]">punti</span>
              </div>
              <p className="mt-2 text-sm text-[var(--text-tertiary)]">
                Saldo dopo riscatto: {userPoints - selectedReward.pointsCost} punti
              </p>
            </div>
            <div className="mt-6 flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setSelectedReward(null)}
              >
                Annulla
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  setSelectedReward(null)
                  // Handle redemption
                }}
              >
                Conferma Riscatto
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
