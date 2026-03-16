/**
 * SUBSCRIPTION MANAGEMENT PAGE
 *
 * User-facing subscription management interface
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import useSWR from 'swr';
// Local type definitions to avoid @prisma/client import in client components
type SubscriptionPlan = 'TRIAL' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
const FeatureFlag = {
  BASIC: 'BASIC',
  STANDARD: 'STANDARD',
  PREMIUM: 'PREMIUM',
  AI_ANALYSIS: 'AI_ANALYSIS',
  UNLIMITED_USERS: 'UNLIMITED_USERS',
  API_ACCESS: 'API_ACCESS',
  PRIORITY_SUPPORT: 'PRIORITY_SUPPORT',
} as const;
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  CreditCard,
  Calendar,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { PricingCards } from '@/components/subscription/PricingCards';
import subscriptionService, {
  SubscriptionData,
  UsageStats,
  PricingPlan,
} from '@/lib/subscription/service';

interface SubscriptionPageData {
  subscription: SubscriptionData;
  usage: UsageStats;
  pricing: { plans: PricingPlan[]; aiAddon: { name: string; monthlyPrice: number } };
}

async function fetchSubscriptionData(): Promise<SubscriptionPageData> {
  const timeout = <T,>(promise: Promise<T>, ms: number): Promise<T> =>
    Promise.race([
      promise,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms)),
    ]);
  const [subscription, usage, pricing] = await timeout(
    Promise.all([
      subscriptionService.getCurrentSubscription(),
      subscriptionService.getUsageStats(),
      subscriptionService.getPricing(),
    ]),
    10000
  );
  return { subscription, usage, pricing };
}

export default function SubscriptionPage() {
  const router = useRouter();
  const {
    data: pageData,
    isLoading: loading,
    mutate,
  } = useSWR<SubscriptionPageData>('subscription-page-data', fetchSubscriptionData, {
    onError: () => {
      toast.error('Errore nel caricamento dei dati abbonamento');
    },
  });

  const subscription = pageData?.subscription ?? null;
  const usage = pageData?.usage ?? null;
  const pricing = pageData?.pricing ?? null;

  const [processing, setProcessing] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleUpgrade = async (
    plan: SubscriptionPlan,
    billingCycle: 'monthly' | 'yearly',
    aiAddon: boolean
  ) => {
    try {
      setProcessing(true);
      setError(null);

      // For paid plans, create Stripe checkout session
      if (plan !== 'TRIAL') {
        const successUrl = `${window.location.origin}/dashboard/subscription?success=true`;
        const cancelUrl = `${window.location.origin}/dashboard/subscription?canceled=true`;

        const { url } = await subscriptionService.createCheckoutSession(
          plan,
          billingCycle,
          aiAddon,
          successUrl,
          cancelUrl
        );

        // Redirect to Stripe Checkout
        window.location.href = url;
        return;
      }

      // For trial or manual upgrades
      await subscriptionService.upgradeSubscription(plan, billingCycle, aiAddon);
      await mutate();
      setShowUpgradeDialog(false);
      setSuccess('Subscription upgraded successfully!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to upgrade subscription';
      setError(msg);
      toast.error(msg);
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = async (immediate: boolean = false) => {
    try {
      setProcessing(true);
      setError(null);
      await subscriptionService.cancelSubscription(immediate);
      await mutate();
      setShowCancelDialog(false);
      setSuccess(
        immediate ? 'Subscription cancelled immediately' : 'Subscription will cancel at period end'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to cancel subscription';
      setError(msg);
      toast.error(msg);
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleAiAddon = async () => {
    if (!subscription) return;

    try {
      setProcessing(true);
      setError(null);
      await subscriptionService.toggleAiAddon(!subscription.aiAddonEnabled);
      await mutate();
      setSuccess(subscription.aiAddonEnabled ? 'AI Add-on disabled' : 'AI Add-on enabled');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to toggle AI add-on';
      setError(msg);
      toast.error(msg);
    } finally {
      setProcessing(false);
    }
  };

  const getPlanName = (plan: string) => {
    const names: Record<string, string> = {
      STARTER: 'Piccole',
      PROFESSIONAL: 'Medie',
      ENTERPRISE: 'Grandi',
      TRIAL: 'Trial',
      FREE: 'Free',
    };
    return names[plan] || plan;
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { color: string; icon: typeof CheckCircle2 }> = {
      ACTIVE: { color: 'bg-green-500', icon: CheckCircle2 },
      TRIAL: { color: 'bg-blue-500', icon: Calendar },
      PAST_DUE: { color: 'bg-yellow-500', icon: AlertTriangle },
      UNPAID: { color: 'bg-red-500', icon: XCircle },
      CANCELLED: { color: 'bg-gray-500', icon: XCircle },
      EXPIRED: { color: 'bg-red-700', icon: XCircle },
    };

    const config = configs[status] || configs.ACTIVE;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} text-white flex items-center space-x-1`}>
        <Icon className='w-3 h-3' />
        <span>{status}</span>
      </Badge>
    );
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <Loader2 className='w-8 h-8 animate-spin' />
      </div>
    );
  }

  if (!subscription || !usage) {
    return (
      <div className='max-w-6xl mx-auto p-6 space-y-8'>
        <div>
          <h1 className='text-3xl font-bold'>Abbonamento</h1>
          <p className='text-gray-600 dark:text-gray-400 mt-2'>
            Gestisci il tuo piano e la fatturazione
          </p>
        </div>
        <Card>
          <CardContent className='flex flex-col items-center justify-center py-16 text-center'>
            <CreditCard className='w-12 h-12 text-gray-300 mb-4' />
            <h3 className='text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2'>
              Nessun abbonamento attivo
            </h3>
            <p className='text-gray-500 dark:text-gray-400 max-w-md mb-6'>
              Connetti il backend per gestire il tuo abbonamento, oppure scegli un piano dalla
              pagina Fatturazione.
            </p>
            <Button onClick={() => router.push('/dashboard/billing')}>
              <ArrowRight className='w-4 h-4 mr-2' />
              Vai alla Fatturazione
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className='max-w-6xl mx-auto p-6 space-y-8'>
      <div>
        <h1 className='text-3xl font-bold'>Subscription</h1>
        <p className='text-gray-600 dark:text-gray-400 mt-2'>Manage your plan and billing</p>
      </div>

      {/* Success/Error Messages */}
      {error && (
        <Alert variant='destructive'>
          <AlertTriangle className='h-4 w-4' />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className='bg-green-50 dark:bg-green-900/20 border-green-200'>
          <CheckCircle2 className='h-4 w-4 text-green-600' />
          <AlertTitle className='text-green-800 dark:text-green-300'>Success</AlertTitle>
          <AlertDescription className='text-green-700 dark:text-green-300'>
            {success}
          </AlertDescription>
        </Alert>
      )}

      {/* Current Plan Overview */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center justify-between'>
            <span>Current Plan</span>
            {getStatusBadge(subscription.status)}
          </CardTitle>
          <CardDescription>
            {subscription.status === 'TRIAL'
              ? `Trial ends on ${new Date(subscription.trialEndsAt || '').toLocaleDateString()}`
              : `Current period ends on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-3xl font-bold'>{getPlanName(subscription.plan)}</p>
              <p className='text-gray-600 dark:text-gray-400'>
                {subscription.aiAddonEnabled && (
                  <span className='inline-flex items-center'>
                    <Sparkles className='w-4 h-4 mr-1 text-purple-500' />
                    with AI Add-on
                  </span>
                )}
              </p>
            </div>
            <div className='flex space-x-3'>
              <Button variant='outline' onClick={() => setShowUpgradeDialog(true)}>
                Change Plan
              </Button>
              {subscription.status === 'ACTIVE' && (
                <Button variant='destructive' onClick={() => setShowCancelDialog(true)}>
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Tabs */}
      <Tabs defaultValue='usage' className='w-full'>
        <TabsList>
          <TabsTrigger value='usage'>Usage</TabsTrigger>
          <TabsTrigger value='features'>Features</TabsTrigger>
          <TabsTrigger value='billing'>Billing</TabsTrigger>
        </TabsList>

        <TabsContent value='usage' className='space-y-6'>
          {/* Usage Cards */}
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
            {/* Users */}
            <Card>
              <CardHeader className='pb-2'>
                <CardTitle className='text-sm font-medium text-gray-500'>Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>
                  {usage.usage.users.current} /{' '}
                  {usage.usage.users.limit === null ? '∞' : usage.usage.users.limit}
                </div>
                <Progress value={usage.usage.users.percentage} className='mt-2' />
              </CardContent>
            </Card>

            {/* Locations */}
            <Card>
              <CardHeader className='pb-2'>
                <CardTitle className='text-sm font-medium text-gray-500'>Locations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>
                  {usage.usage.locations.current} /{' '}
                  {usage.usage.locations.limit === null ? '∞' : usage.usage.locations.limit}
                </div>
                <Progress value={usage.usage.locations.percentage} className='mt-2' />
              </CardContent>
            </Card>

            {/* API Calls */}
            <Card>
              <CardHeader className='pb-2'>
                <CardTitle className='text-sm font-medium text-gray-500'>API Calls</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>
                  {usage.usage.apiCalls.current.toLocaleString()} /{' '}
                  {usage.usage.apiCalls.limit === null
                    ? '∞'
                    : usage.usage.apiCalls.limit.toLocaleString()}
                </div>
                <Progress value={usage.usage.apiCalls.percentage} className='mt-2' />
              </CardContent>
            </Card>

            {/* Storage */}
            <Card>
              <CardHeader className='pb-2'>
                <CardTitle className='text-sm font-medium text-gray-500'>Storage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>
                  {formatBytes(usage.usage.storage.current)} /{' '}
                  {usage.usage.storage.limit === null
                    ? '∞'
                    : formatBytes(usage.usage.storage.limit)}
                </div>
                <Progress value={usage.usage.storage.percentage} className='mt-2' />
              </CardContent>
            </Card>

            {/* Customers */}
            <Card>
              <CardHeader className='pb-2'>
                <CardTitle className='text-sm font-medium text-gray-500'>Customers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>
                  {usage.usage.customers.current.toLocaleString()} /{' '}
                  {usage.usage.customers.limit === null
                    ? '∞'
                    : usage.usage.customers.limit.toLocaleString()}
                </div>
                <Progress value={usage.usage.customers.percentage} className='mt-2' />
              </CardContent>
            </Card>

            {/* Inspections */}
            <Card>
              <CardHeader className='pb-2'>
                <CardTitle className='text-sm font-medium text-gray-500'>Inspections</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>
                  {usage.usage.inspections.current.toLocaleString()} /{' '}
                  {usage.usage.inspections.limit === null
                    ? '∞'
                    : usage.usage.inspections.limit.toLocaleString()}
                </div>
                <Progress value={usage.usage.inspections.percentage} className='mt-2' />
              </CardContent>
            </Card>
          </div>

          {/* AI Addon Card */}
          <Card className={subscription.aiAddonEnabled ? 'border-purple-200 bg-purple-50' : ''}>
            <CardContent className='p-6'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center space-x-4'>
                  <div
                    className={`p-3 rounded-full ${subscription.aiAddonEnabled ? 'bg-purple-100' : 'bg-gray-100'}`}
                  >
                    <Sparkles
                      className={`w-6 h-6 ${subscription.aiAddonEnabled ? 'text-purple-600' : 'text-gray-400'}`}
                    />
                  </div>
                  <div>
                    <h3 className='font-semibold'>AI Assistant Add-on</h3>
                    <p className='text-sm text-gray-600 dark:text-gray-400'>
                      {subscription.aiAddonEnabled
                        ? 'Active - AI-powered inspections and voice assistant enabled'
                        : 'Add AI-powered features for €200/month'}
                    </p>
                  </div>
                </div>
                <Button
                  variant={subscription.aiAddonEnabled ? 'outline' : 'default'}
                  onClick={handleToggleAiAddon}
                  disabled={processing || subscription.plan === 'STARTER'}
                >
                  {processing ? (
                    <Loader2 className='w-4 h-4 animate-spin' />
                  ) : subscription.aiAddonEnabled ? (
                    'Disable'
                  ) : (
                    'Enable'
                  )}
                </Button>
              </div>
              {subscription.plan === 'STARTER' && (
                <p className='text-sm text-orange-600 mt-3'>
                  AI Add-on requires Medium plan or higher
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='features'>
          <Card>
            <CardHeader>
              <CardTitle>Available Features</CardTitle>
              <CardDescription>Features included in your current plan</CardDescription>
            </CardHeader>
            <CardContent>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                {Object.values(FeatureFlag).map(feature => {
                  const hasFeature = subscription.features.includes(feature);
                  return (
                    <div
                      key={feature}
                      className={`flex items-center space-x-3 p-3 rounded-lg ${
                        hasFeature
                          ? 'bg-green-50 dark:bg-green-900/20'
                          : 'bg-gray-50 dark:bg-gray-800'
                      }`}
                    >
                      {hasFeature ? (
                        <CheckCircle2 className='w-5 h-5 text-green-500' />
                      ) : (
                        <XCircle className='w-5 h-5 text-gray-300' />
                      )}
                      <span
                        className={
                          hasFeature
                            ? 'text-gray-900 dark:text-white'
                            : 'text-gray-500 dark:text-gray-400'
                        }
                      >
                        {feature.replace(/_/g, ' ')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='billing'>
          <Card>
            <CardHeader>
              <CardTitle>Billing Information</CardTitle>
              <CardDescription>Manage your payment method and invoices</CardDescription>
            </CardHeader>
            <CardContent className='space-y-6'>
              {subscription.stripe.paymentMethodRequired ? (
                <Alert>
                  <CreditCard className='h-4 w-4' />
                  <AlertTitle>Payment Method Required</AlertTitle>
                  <AlertDescription>
                    Please add a payment method to continue using MechMind OS after your trial ends.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className='flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg'>
                  <div className='flex items-center space-x-3'>
                    <CreditCard className='w-5 h-5 text-gray-500' />
                    <div>
                      <p className='font-medium'>Payment Method</p>
                      <p className='text-sm text-gray-500'>Managed via Stripe</p>
                    </div>
                  </div>
                  <Button
                    variant='outline'
                    onClick={() => window.open('https://billing.stripe.com', '_blank')}
                  >
                    Manage
                  </Button>
                </div>
              )}

              <Separator />

              <div className='space-y-4'>
                <h4 className='font-medium'>Billing Period</h4>
                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <p className='text-sm text-gray-500'>Start Date</p>
                    <p className='font-medium'>
                      {new Date(subscription.currentPeriodStart).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className='text-sm text-gray-500'>End Date</p>
                    <p className='font-medium'>
                      {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Upgrade Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className='max-w-6xl max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>Change Your Plan</DialogTitle>
            <DialogDescription>Choose the plan that works best for your business</DialogDescription>
          </DialogHeader>

          {pricing && (
            <PricingCards
              plans={pricing.plans}
              currentPlan={subscription.plan}
              onSelectPlan={handleUpgrade}
              loading={processing}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Subscription</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel your subscription?
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4 py-4'>
            <p className='text-sm text-gray-600 dark:text-gray-400'>
              Your data will be retained for 6 months. You can reactivate your subscription at any
              time during this period.
            </p>

            <div className='bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg'>
              <p className='text-sm text-yellow-800 dark:text-yellow-300'>
                <strong>Tip:</strong> You can also choose to cancel at the end of your current
                billing period to continue using the service until then.
              </p>
            </div>
          </div>

          <DialogFooter className='flex space-x-2'>
            <Button variant='outline' onClick={() => setShowCancelDialog(false)}>
              Keep Subscription
            </Button>
            <Button variant='destructive' onClick={() => handleCancel(false)} disabled={processing}>
              {processing ? <Loader2 className='w-4 h-4 animate-spin' /> : 'Cancel at Period End'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
