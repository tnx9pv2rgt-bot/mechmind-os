/**
 * PRICING CARDS COMPONENT
 * 
 * Displays pricing tiers with features and upgrade CTAs
 */

'use client';

import { useState } from 'react';
import { SubscriptionTier as SubscriptionPlan } from '@prisma/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
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
  onSelectPlan: (plan: SubscriptionPlan, billingCycle: 'monthly' | 'yearly', aiAddon: boolean) => void;
  loading?: boolean;
}

const PLAN_ICONS: Record<SubscriptionPlan, typeof Sparkles> = {
  [SubscriptionPlan.STARTER]: Building2,
  [SubscriptionPlan.PROFESSIONAL]: Building2,
  [SubscriptionPlan.ENTERPRISE]: Crown,
  [SubscriptionPlan.TRIAL]: Sparkles,
  [SubscriptionPlan.FREE]: Sparkles,
};

const PLAN_COLORS: Record<SubscriptionPlan, string> = {
  [SubscriptionPlan.STARTER]: 'from-emerald-500 to-teal-600',
  [SubscriptionPlan.PROFESSIONAL]: 'from-blue-500 to-indigo-600',
  [SubscriptionPlan.ENTERPRISE]: 'from-purple-500 to-pink-600',
  [SubscriptionPlan.TRIAL]: 'from-gray-400 to-gray-500',
  [SubscriptionPlan.FREE]: 'from-slate-400 to-slate-500',
};

export function PricingCards({ plans, currentPlan, onSelectPlan, loading }: PricingCardsProps) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [aiAddon, setAiAddon] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);

  // Filter out trial from display plans
  const displayPlans = plans.filter(p => p.id !== SubscriptionPlan.TRIAL);

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    onSelectPlan(plan, billingCycle, aiAddon);
  };

  const allFeatures = [
    { name: 'Vehicle Inspections', key: 'inspections' },
    { name: 'Customer Management', key: 'customers' },
    { name: 'Booking System', key: 'bookings' },
    { name: 'OBD Integration', key: 'obd', plan: [SubscriptionPlan.STARTER, SubscriptionPlan.PROFESSIONAL, SubscriptionPlan.ENTERPRISE] },
    { name: 'Inventory Management', key: 'inventory', plan: [SubscriptionPlan.STARTER, SubscriptionPlan.PROFESSIONAL, SubscriptionPlan.ENTERPRISE] },
    { name: 'Multi-Location Support', key: 'multi_location', plan: [SubscriptionPlan.PROFESSIONAL, SubscriptionPlan.ENTERPRISE] },
    { name: 'API Access', key: 'api', plan: [SubscriptionPlan.PROFESSIONAL, SubscriptionPlan.ENTERPRISE] },
    { name: 'Advanced Analytics', key: 'analytics', plan: [SubscriptionPlan.PROFESSIONAL, SubscriptionPlan.ENTERPRISE] },
    { name: 'Custom Branding', key: 'branding', plan: [SubscriptionPlan.PROFESSIONAL, SubscriptionPlan.ENTERPRISE] },
    { name: 'Priority Support', key: 'support', plan: [SubscriptionPlan.PROFESSIONAL, SubscriptionPlan.ENTERPRISE] },
    { name: 'AI Vehicle Inspections', key: 'ai', plan: [SubscriptionPlan.ENTERPRISE], addon: true },
    { name: 'Voice AI Assistant', key: 'voice', plan: [SubscriptionPlan.ENTERPRISE], addon: true },
    { name: 'White Label', key: 'white_label', plan: [SubscriptionPlan.ENTERPRISE] },
    { name: 'Blockchain Verification', key: 'blockchain', plan: [SubscriptionPlan.ENTERPRISE] },
    { name: 'Custom Integrations', key: 'integrations', plan: [SubscriptionPlan.ENTERPRISE] },
    { name: 'Dedicated Account Manager', key: 'manager', plan: [SubscriptionPlan.ENTERPRISE] },
  ];

  const getPlanLimits = (plan: SubscriptionPlan) => {
    switch (plan) {
      case SubscriptionPlan.STARTER:
        return { users: '3', locations: '1', apiCalls: '5,000/mo', storage: '10 GB' };
      case SubscriptionPlan.PROFESSIONAL:
        return { users: '10', locations: '2', apiCalls: '25,000/mo', storage: '50 GB' };
      case SubscriptionPlan.ENTERPRISE:
        return { users: 'Unlimited', locations: 'Unlimited', apiCalls: 'Unlimited', storage: 'Unlimited' };
      default:
        return { users: '-', locations: '-', apiCalls: '-', storage: '-' };
    }
  };

  return (
    <div className="space-y-8">
      {/* Billing Toggle */}
      <div className="flex flex-col items-center space-y-4">
        <div className="flex items-center space-x-4">
          <span className={cn(
            "text-sm font-medium",
            billingCycle === 'monthly' ? 'text-gray-900' : 'text-gray-500'
          )}>
            Monthly
          </span>
          <Switch
            checked={billingCycle === 'yearly'}
            onCheckedChange={(checked) => setBillingCycle(checked ? 'yearly' : 'monthly')}
          />
          <span className={cn(
            "text-sm font-medium",
            billingCycle === 'yearly' ? 'text-gray-900' : 'text-gray-500'
          )}>
            Yearly
          </span>
          {billingCycle === 'yearly' && (
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Save 15%
            </Badge>
          )}
        </div>

        {/* AI Addon Toggle */}
        <div className="flex items-center space-x-3 p-4 bg-purple-50 rounded-lg">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <div className="flex-1">
            <p className="font-medium text-purple-900">AI Assistant Add-on</p>
            <p className="text-sm text-purple-700">€200/month - AI inspections & voice assistant</p>
          </div>
          <Switch
            checked={aiAddon}
            onCheckedChange={setAiAddon}
          />
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {displayPlans.map((plan) => {
          const Icon = PLAN_ICONS[plan.id];
          const isCurrentPlan = currentPlan === plan.id;
          const limits = getPlanLimits(plan.id);

          return (
            <Card
              key={plan.id}
              className={cn(
                "relative flex flex-col transition-all duration-200",
                isCurrentPlan && "ring-2 ring-blue-500",
                selectedPlan === plan.id && loading && "opacity-70"
              )}
            >
              {isCurrentPlan && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500">
                  Current Plan
                </Badge>
              )}

              <CardHeader className={cn(
                "text-white rounded-t-lg",
                "bg-gradient-to-br",
                PLAN_COLORS[plan.id]
              )}>
                <div className="flex items-center space-x-3">
                  <Icon className="w-8 h-8" />
                  <div>
                    <CardTitle className="text-xl">{plan.nameIt}</CardTitle>
                    <CardDescription className="text-white/80">
                      {plan.name}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1 pt-6">
                {/* Price */}
                <div className="mb-6">
                  {plan.isCustomPricing ? (
                    <div className="text-3xl font-bold">Custom</div>
                  ) : (
                    <>
                      <div className="flex items-baseline space-x-2">
                        <span className="text-4xl font-bold">
                          {billingCycle === 'monthly' ? plan.monthlyPriceFormatted : plan.yearlyPriceFormatted}
                        </span>
                        <span className="text-gray-500">/month</span>
                      </div>
                      {billingCycle === 'yearly' && (
                        <p className="text-sm text-green-600 mt-1">
                          Billed annually (15% savings)
                        </p>
                      )}
                    </>
                  )}
                  {aiAddon && !plan.isCustomPricing && (
                    <p className="text-sm text-purple-600 mt-2">
                      + €200/month for AI Add-on
                    </p>
                  )}
                </div>

                {/* Description */}
                <p className="text-gray-600 mb-6">{plan.description}</p>

                {/* Limits */}
                <div className="space-y-2 mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Users</span>
                    <span className="font-medium">{limits.users}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Locations</span>
                    <span className="font-medium">{limits.locations}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">API Calls</span>
                    <span className="font-medium">{limits.apiCalls}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Storage</span>
                    <span className="font-medium">{limits.storage}</span>
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-2">
                  {allFeatures.map((feature) => {
                    const included = (feature.plan as string[] | undefined)?.includes(plan.id) ?? true;
                    const isAddon = feature.addon;
                    const showWithAddon = isAddon && aiAddon;

                    return (
                      <div key={feature.key} className="flex items-center space-x-3">
                        {included ? (
                          <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                        ) : showWithAddon ? (
                          <Check className="w-5 h-5 text-purple-500 flex-shrink-0" />
                        ) : (
                          <X className="w-5 h-5 text-gray-300 flex-shrink-0" />
                        )}
                        <span className={cn(
                          "text-sm",
                          included ? "text-gray-700" : showWithAddon ? "text-purple-700" : "text-gray-400"
                        )}>
                          {feature.name}
                          {isAddon && showWithAddon && (
                            <Badge variant="outline" className="ml-2 text-xs">AI Add-on</Badge>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>

              <CardFooter>
                <Button
                  className="w-full"
                  variant={isCurrentPlan ? 'outline' : 'default'}
                  disabled={isCurrentPlan || loading || plan.isCustomPricing}
                  onClick={() => handleSelectPlan(plan.id)}
                >
                  {isCurrentPlan ? 'Current Plan' : 
                   plan.isCustomPricing ? 'Contact Sales' : 
                   loading && selectedPlan === plan.id ? 'Processing...' : 
                   'Select Plan'}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Enterprise CTA */}
      <Card className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
        <CardContent className="flex flex-col md:flex-row items-center justify-between p-8">
          <div>
            <h3 className="text-2xl font-bold mb-2">Need a custom solution?</h3>
            <p className="text-white/80">
              Contact our sales team for enterprise pricing tailored to your needs.
            </p>
          </div>
          <Button variant="secondary" size="lg" className="mt-4 md:mt-0">
            Contact Sales
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default PricingCards;
