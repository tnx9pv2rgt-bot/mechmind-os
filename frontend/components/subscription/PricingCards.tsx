/**
 * PRICING CARDS COMPONENT
 *
 * Displays pricing tiers with features and upgrade CTAs
 */

'use client';

import { useState } from 'react';
type SubscriptionPlan = 'TRIAL' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Check, X, Sparkles, Building2, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PricingPlan {
  id: SubscriptionPlan;
  name: string;
  nameIt: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  yearlyDiscountPercent: number;
  monthlyPriceFormatted: string;
  yearlyPriceFormatted: string;
  isCustomPricing: boolean;
}

interface Feature {
  name: string;
  included: boolean;
}

interface PlanFeatures {
  plan: SubscriptionPlan;
  features: string[];
}

interface PricingCardsProps {
  plans: PricingPlan[];
  currentPlan?: SubscriptionPlan;
  onSelectPlan: (
    plan: SubscriptionPlan,
    billingCycle: 'monthly' | 'yearly',
    aiAddon: boolean
  ) => void;
  loading?: boolean;
}

const PLAN_ICONS: Record<string, typeof Sparkles> = {
  STARTER: Building2,
  PROFESSIONAL: Building2,
  ENTERPRISE: Crown,
  TRIAL: Sparkles,
  FREE: Sparkles,
};

const PLAN_COLORS: Record<string, string> = {
  STARTER: 'from-[var(--status-success)] to-[var(--status-success)]',
  PROFESSIONAL: 'from-[var(--status-info)] to-[var(--brand)]',
  ENTERPRISE: 'from-[var(--brand)] to-[var(--status-warning)]',
  TRIAL: 'from-[var(--text-secondary)] to-[var(--text-secondary)]',
  FREE: 'from-[var(--text-secondary)] to-[var(--text-secondary)]',
};

export function PricingCards({ plans, currentPlan, onSelectPlan, loading }: PricingCardsProps) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [aiAddon, setAiAddon] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);

  // Filter out trial from display plans
  const displayPlans = plans.filter(p => p.id !== 'TRIAL');

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    onSelectPlan(plan, billingCycle, aiAddon);
  };

  const allFeatures = [
    { name: 'Ispezioni Veicoli', key: 'inspections' },
    { name: 'Gestione Clienti', key: 'customers' },
    { name: 'Sistema Prenotazioni', key: 'bookings' },
    { name: 'Integrazione OBD', key: 'obd', plan: ['STARTER', 'PROFESSIONAL', 'ENTERPRISE'] },
    {
      name: 'Gestione Inventario',
      key: 'inventory',
      plan: ['STARTER', 'PROFESSIONAL', 'ENTERPRISE'],
    },
    { name: 'Supporto Multi-Sede', key: 'multi_location', plan: ['PROFESSIONAL', 'ENTERPRISE'] },
    { name: 'Accesso API', key: 'api', plan: ['PROFESSIONAL', 'ENTERPRISE'] },
    { name: 'Analisi Avanzate', key: 'analytics', plan: ['PROFESSIONAL', 'ENTERPRISE'] },
    { name: 'Branding Personalizzato', key: 'branding', plan: ['PROFESSIONAL', 'ENTERPRISE'] },
    { name: 'Supporto Prioritario', key: 'support', plan: ['PROFESSIONAL', 'ENTERPRISE'] },
    { name: 'Ispezioni Veicoli AI', key: 'ai', plan: 'ENTERPRISE', addon: true },
    { name: 'Assistente Vocale AI', key: 'voice', plan: 'ENTERPRISE', addon: true },
    { name: 'White Label', key: 'white_label', plan: 'ENTERPRISE' },
    { name: 'Verifica Blockchain', key: 'blockchain', plan: 'ENTERPRISE' },
    { name: 'Integrazioni Personalizzate', key: 'integrations', plan: 'ENTERPRISE' },
    { name: 'Account Manager Dedicato', key: 'manager', plan: 'ENTERPRISE' },
  ];

  const getPlanLimits = (plan: SubscriptionPlan) => {
    switch (plan) {
      case 'STARTER':
        return { users: '3', locations: '1', apiCalls: '5,000/mo', storage: '10 GB' };
      case 'PROFESSIONAL':
        return { users: '10', locations: '2', apiCalls: '25,000/mo', storage: '50 GB' };
      case 'ENTERPRISE':
        return {
          users: 'Illimitati',
          locations: 'Illimitate',
          apiCalls: 'Illimitate',
          storage: 'Illimitato',
        };
      default:
        return { users: '-', locations: '-', apiCalls: '-', storage: '-' };
    }
  };

  return (
    <div className='space-y-8'>
      {/* Billing Toggle */}
      <div className='flex flex-col items-center space-y-4'>
        <div className='flex items-center space-x-4'>
          <span
            className={cn(
              'text-sm font-medium',
              billingCycle === 'monthly' ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
            )}
          >
            Mensile
          </span>
          <Switch
            checked={billingCycle === 'yearly'}
            onCheckedChange={checked => setBillingCycle(checked ? 'yearly' : 'monthly')}
          />
          <span
            className={cn(
              'text-sm font-medium',
              billingCycle === 'yearly' ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
            )}
          >
            Annuale
          </span>
          {billingCycle === 'yearly' && (
            <Badge variant='secondary' className='bg-[var(--status-success-subtle)] text-[var(--status-success)]'>
              Risparmia 15%
            </Badge>
          )}
        </div>

        {/* AI Addon Toggle */}
        <div className='flex items-center space-x-3 p-4 bg-[var(--brand)]/5 rounded-lg'>
          <Sparkles className='w-5 h-5 text-[var(--brand)]' />
          <div className='flex-1'>
            <p className='font-medium text-[var(--brand)]'>Add-on Assistente AI</p>
            <p className='text-sm text-[var(--brand)]'>€200/mese - Ispezioni AI e assistente vocale</p>
          </div>
          <Switch checked={aiAddon} onCheckedChange={setAiAddon} />
        </div>
      </div>

      {/* Pricing Cards */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
        {displayPlans.map(plan => {
          const Icon = PLAN_ICONS[plan.id];
          const isCurrentPlan = currentPlan === plan.id;
          const limits = getPlanLimits(plan.id);

          return (
            <Card
              key={plan.id}
              className={cn(
                'relative flex flex-col transition-all duration-200',
                isCurrentPlan && 'ring-2 ring-[var(--status-info)]',
                selectedPlan === plan.id && loading && 'opacity-70'
              )}
            >
              {isCurrentPlan && (
                <Badge className='absolute -top-3 left-1/2 -translate-x-1/2 bg-[var(--status-info-subtle)]0'>
                  Piano Attuale
                </Badge>
              )}

              <CardHeader
                className={cn('text-[var(--text-on-brand)] rounded-t-lg', 'bg-gradient-to-br', PLAN_COLORS[plan.id])}
              >
                <div className='flex items-center space-x-3'>
                  <Icon className='w-8 h-8' />
                  <div>
                    <CardTitle className='text-xl'>{plan.nameIt}</CardTitle>
                    <CardDescription className='text-[var(--text-on-brand)]/80'>{plan.name}</CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className='flex-1 pt-6'>
                {/* Price */}
                <div className='mb-6'>
                  {plan.isCustomPricing ? (
                    <div className='text-3xl font-bold'>Personalizzato</div>
                  ) : (
                    <>
                      <div className='flex items-baseline space-x-2'>
                        <span className='text-4xl font-bold'>
                          {billingCycle === 'monthly'
                            ? plan.monthlyPriceFormatted
                            : plan.yearlyPriceFormatted}
                        </span>
                        <span className='text-[var(--text-secondary)]'>/mese</span>
                      </div>
                      {billingCycle === 'yearly' && (
                        <p className='text-sm text-[var(--status-success)] mt-1'>
                          Fatturato annualmente (15% di risparmio)
                        </p>
                      )}
                    </>
                  )}
                  {aiAddon && !plan.isCustomPricing && (
                    <p className='text-sm text-[var(--brand)] mt-2'>+ €200/mese per Add-on AI</p>
                  )}
                </div>

                {/* Description */}
                <p className='text-[var(--text-secondary)] mb-6'>{plan.description}</p>

                {/* Limits */}
                <div className='space-y-2 mb-6 p-4 bg-[var(--surface-secondary)] rounded-lg'>
                  <div className='flex justify-between text-sm'>
                    <span className='text-[var(--text-secondary)]'>Utenti</span>
                    <span className='font-medium'>{limits.users}</span>
                  </div>
                  <div className='flex justify-between text-sm'>
                    <span className='text-[var(--text-secondary)]'>Sedi</span>
                    <span className='font-medium'>{limits.locations}</span>
                  </div>
                  <div className='flex justify-between text-sm'>
                    <span className='text-[var(--text-secondary)]'>Chiamate API</span>
                    <span className='font-medium'>{limits.apiCalls}</span>
                  </div>
                  <div className='flex justify-between text-sm'>
                    <span className='text-[var(--text-secondary)]'>Spazio</span>
                    <span className='font-medium'>{limits.storage}</span>
                  </div>
                </div>

                {/* Features */}
                <div className='space-y-2'>
                  {allFeatures.map(feature => {
                    const included =
                      (feature.plan as string[] | undefined)?.includes(plan.id) ?? true;
                    const isAddon = feature.addon;
                    const showWithAddon = isAddon && aiAddon;

                    return (
                      <div key={feature.key} className='flex items-center space-x-3'>
                        {included ? (
                          <Check className='w-5 h-5 text-[var(--status-success)] flex-shrink-0' />
                        ) : showWithAddon ? (
                          <Check className='w-5 h-5 text-[var(--brand)] flex-shrink-0' />
                        ) : (
                          <X className='w-5 h-5 text-[var(--text-tertiary)] flex-shrink-0' />
                        )}
                        <span
                          className={cn(
                            'text-sm',
                            included
                              ? 'text-[var(--text-primary)]'
                              : showWithAddon
                                ? 'text-[var(--brand)]'
                                : 'text-[var(--text-tertiary)]'
                          )}
                        >
                          {feature.name}
                          {isAddon && showWithAddon && (
                            <Badge variant='outline' className='ml-2 text-xs'>
                              AI Add-on
                            </Badge>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>

              <CardFooter>
                <Button
                  className='w-full'
                  variant={isCurrentPlan ? 'outline' : 'default'}
                  disabled={isCurrentPlan || loading || plan.isCustomPricing}
                  onClick={() => handleSelectPlan(plan.id)}
                >
                  {isCurrentPlan
                    ? 'Piano Attuale'
                    : plan.isCustomPricing
                      ? 'Contatta Vendite'
                      : loading && selectedPlan === plan.id
                        ? 'Elaborazione...'
                        : 'Seleziona Piano'}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Enterprise CTA */}
      <Card className='bg-gradient-to-r from-[var(--brand)] to-[var(--status-warning)] text-[var(--text-on-brand)]'>
        <CardContent className='flex flex-col md:flex-row items-center justify-between p-8'>
          <div>
            <h3 className='text-2xl font-bold mb-2'>
              Hai bisogno di una soluzione personalizzata?
            </h3>
            <p className='text-[var(--text-on-brand)]/80'>
              Contatta il nostro team vendite per un piano enterprise su misura per le tue esigenze.
            </p>
          </div>
          <Button variant='secondary' size='lg' className='mt-4 md:mt-0'>
            Contatta Vendite
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default PricingCards;
