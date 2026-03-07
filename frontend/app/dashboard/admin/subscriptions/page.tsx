/**
 * ADMIN SUBSCRIPTIONS PAGE
 * 
 * Admin dashboard for managing all tenant subscriptions
 */

'use client';

import { SubscriptionManager } from '@/components/subscription';

export default function AdminSubscriptionsPage() {
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Subscription Management</h1>
        <p className="text-gray-600 mt-2">
          Manage all tenant subscriptions, view analytics, and handle billing issues
        </p>
      </div>

      <SubscriptionManager />
    </div>
  );
}
