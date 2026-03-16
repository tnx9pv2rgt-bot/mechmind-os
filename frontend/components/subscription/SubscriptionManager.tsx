/**
 * SUBSCRIPTION MANAGER COMPONENT
 *
 * Admin dashboard for managing all tenant subscriptions
 */

'use client';

import { useState, useEffect } from 'react';
type SubscriptionPlan = 'TRIAL' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE' | 'FREE';
const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  'TRIAL',
  'STARTER',
  'PROFESSIONAL',
  'ENTERPRISE',
  'FREE',
];
type SubscriptionStatus =
  | 'TRIAL'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'SUSPENDED'
  | 'UNPAID';
const SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [
  'TRIAL',
  'ACTIVE',
  'PAST_DUE',
  'CANCELLED',
  'EXPIRED',
  'SUSPENDED',
  'UNPAID',
];
type FeatureFlag =
  | 'BASIC'
  | 'STANDARD'
  | 'PREMIUM'
  | 'AI_ANALYSIS'
  | 'UNLIMITED_USERS'
  | 'API_ACCESS'
  | 'PRIORITY_SUPPORT';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
}

interface Subscription {
  id: string;
  tenantId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEndsAt: string | null;
  aiAddonEnabled: boolean;
  maxUsers: number;
  maxLocations: number;
  apiCallsUsed: number;
  apiCallsLimit: number | null;
  storageUsedBytes: string;
  tenant: Tenant;
  features: { feature: FeatureFlag; enabled: boolean }[];
}

interface Analytics {
  totalSubscriptions: number;
  byPlan: Record<string, number>;
  byStatus: Record<string, number>;
  trialConversions: number;
  aiAddonRevenue: number;
}

export function SubscriptionManager() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showUsageDialog, setShowUsageDialog] = useState(false);
  const [filterStatus, setFilterStatus] = useState<SubscriptionStatus | 'all'>('all');
  const [filterPlan, setFilterPlan] = useState<SubscriptionPlan | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [subsRes, analyticsRes] = await Promise.all([
        fetch('/api/admin/subscriptions'),
        fetch('/api/admin/subscriptions/analytics'),
      ]);

      if (subsRes.ok) {
        setSubscriptions(await subsRes.json());
      }
      if (analyticsRes.ok) {
        setAnalytics(await analyticsRes.json());
      }
    } catch (error) {
      console.error('Failed to fetch subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSubscription = async (updates: Partial<Subscription>) => {
    if (!selectedSubscription) return;

    try {
      const response = await fetch(`/api/admin/subscriptions/${selectedSubscription.tenantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        await fetchData();
        setShowEditDialog(false);
      }
    } catch (error) {
      console.error('Failed to update subscription:', error);
    }
  };

  const filteredSubscriptions = subscriptions.filter(sub => {
    if (filterStatus !== 'all' && sub.status !== filterStatus) return false;
    if (filterPlan !== 'all' && sub.plan !== filterPlan) return false;
    if (searchQuery && !sub.tenant.name.toLowerCase().includes(searchQuery.toLowerCase()))
      return false;
    return true;
  });

  const getStatusBadge = (status: SubscriptionStatus) => {
    const colors: Record<string, string> = {
      ACTIVE: 'bg-green-500',
      TRIAL: 'bg-blue-500',
      PAST_DUE: 'bg-yellow-500',
      UNPAID: 'bg-red-500',
      CANCELLED: 'bg-gray-500',
      SUSPENDED: 'bg-orange-500',
      EXPIRED: 'bg-red-700',
    };

    return <Badge className={`${colors[status]} text-white`}>{status}</Badge>;
  };

  const getPlanBadge = (plan: SubscriptionPlan) => {
    const colors: Record<string, string> = {
      STARTER: 'bg-emerald-500',
      PROFESSIONAL: 'bg-blue-500',
      ENTERPRISE: 'bg-purple-500',
      TRIAL: 'bg-gray-500',
      FREE: 'bg-slate-500',
    };

    return <Badge className={`${colors[plan]} text-white`}>{plan}</Badge>;
  };

  const formatBytes = (bytes: string) => {
    const size = parseInt(bytes);
    if (size === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(size) / Math.log(k));
    return `${parseFloat((size / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <div className='space-y-6'>
      {/* Analytics Cards */}
      {analytics && (
        <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium text-gray-500'>
                Total Subscriptions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{analytics.totalSubscriptions}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium text-gray-500'>Trial Conversions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{analytics.trialConversions}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium text-gray-500'>
                Active Subscriptions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{analytics.byStatus['ACTIVE'] || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium text-gray-500'>AI Addon Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>€{analytics.aiAddonRevenue.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className='pt-6'>
          <div className='flex flex-wrap gap-4'>
            <Input
              placeholder='Search by tenant name...'
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className='w-64'
            />

            <Select
              value={filterStatus}
              onValueChange={v => setFilterStatus(v as SubscriptionStatus | 'all')}
            >
              <SelectTrigger className='w-40'>
                <SelectValue placeholder='Filter by status' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All Statuses</SelectItem>
                {SUBSCRIPTION_STATUSES.map(status => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filterPlan}
              onValueChange={v => setFilterPlan(v as SubscriptionPlan | 'all')}
            >
              <SelectTrigger className='w-40'>
                <SelectValue placeholder='Filter by plan' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All Plans</SelectItem>
                {SUBSCRIPTION_PLANS.map(plan => (
                  <SelectItem key={plan} value={plan}>
                    {plan}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant='outline' onClick={fetchData}>
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Subscriptions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Subscriptions ({filteredSubscriptions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className='text-center py-8'>Loading...</div>
          ) : (
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead>
                  <tr className='border-b'>
                    <th className='text-left py-3 px-4'>Tenant</th>
                    <th className='text-left py-3 px-4'>Plan</th>
                    <th className='text-left py-3 px-4'>Status</th>
                    <th className='text-left py-3 px-4'>AI Addon</th>
                    <th className='text-left py-3 px-4'>Period End</th>
                    <th className='text-left py-3 px-4'>Usage</th>
                    <th className='text-left py-3 px-4'>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubscriptions.map(sub => (
                    <tr key={sub.id} className='border-b hover:bg-gray-50'>
                      <td className='py-3 px-4'>
                        <div className='font-medium'>{sub.tenant.name}</div>
                        <div className='text-sm text-gray-500'>{sub.tenant.slug}</div>
                      </td>
                      <td className='py-3 px-4'>{getPlanBadge(sub.plan)}</td>
                      <td className='py-3 px-4'>{getStatusBadge(sub.status)}</td>
                      <td className='py-3 px-4'>
                        {sub.aiAddonEnabled ? (
                          <Badge className='bg-purple-500'>Enabled</Badge>
                        ) : (
                          <Badge variant='outline'>Disabled</Badge>
                        )}
                      </td>
                      <td className='py-3 px-4'>
                        {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                      </td>
                      <td className='py-3 px-4'>
                        <div className='text-sm'>
                          {sub.apiCallsUsed.toLocaleString()} /{' '}
                          {sub.apiCallsLimit?.toLocaleString() || '∞'} API calls
                        </div>
                        <div className='text-sm text-gray-500'>
                          {formatBytes(sub.storageUsedBytes)} storage
                        </div>
                      </td>
                      <td className='py-3 px-4'>
                        <div className='flex gap-2'>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() => {
                              setSelectedSubscription(sub);
                              setShowEditDialog(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() => {
                              setSelectedSubscription(sub);
                              setShowUsageDialog(true);
                            }}
                          >
                            Usage
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className='max-w-lg'>
          <DialogHeader>
            <DialogTitle>Edit Subscription</DialogTitle>
            <DialogDescription>{selectedSubscription?.tenant.name}</DialogDescription>
          </DialogHeader>

          {selectedSubscription && (
            <div className='space-y-4 py-4'>
              <div>
                <label htmlFor='subscriptionPlan' className='text-sm font-medium'>
                  Plan
                </label>
                <Select
                  value={selectedSubscription.plan}
                  onValueChange={v => handleUpdateSubscription({ plan: v as SubscriptionPlan })}
                >
                  <SelectTrigger id='subscriptionPlan'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBSCRIPTION_PLANS.map(plan => (
                      <SelectItem key={plan} value={plan}>
                        {plan}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label htmlFor='subscriptionStatus' className='text-sm font-medium'>
                  Status
                </label>
                <Select
                  value={selectedSubscription.status}
                  onValueChange={v => handleUpdateSubscription({ status: v as SubscriptionStatus })}
                >
                  <SelectTrigger id='subscriptionStatus'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBSCRIPTION_STATUSES.map(status => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label htmlFor='subscriptionAiAddon' className='text-sm font-medium'>
                  AI Addon
                </label>
                <Select
                  value={selectedSubscription.aiAddonEnabled.toString()}
                  onValueChange={v => handleUpdateSubscription({ aiAddonEnabled: v === 'true' })}
                >
                  <SelectTrigger id='subscriptionAiAddon'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='true'>Enabled</SelectItem>
                    <SelectItem value='false'>Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant='outline' onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SubscriptionManager;
