/**
 * GET /api/stripe/billing-info
 * Get tenant billing information
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server'
import { 
  stripe, 
  getInvoices, 
  getUpcomingInvoice,
  getDefaultPaymentMethod,
  PRICE_ID_TO_PLAN 
} from '@/lib/stripe/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Get tenant ID from session/auth
    // TODO: Replace with actual auth
    const tenantId = request.headers.get('x-tenant-id') || 'default-tenant'

    // Get tenant from database
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        _count: {
          select: {
            inspections: true,
          },
        },
      },
    })

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      )
    }

    // If no Stripe customer, return basic info
    if (!tenant.stripeCustomerId) {
      return NextResponse.json({
        subscription: null,
        invoices: [],
        paymentMethod: null,
        usage: {
          inspectionsThisMonth: tenant._count.inspections,
          aiCallsThisMonth: tenant.aiCallsThisMonth || 0,
          storageUsed: tenant.storageUsed || 0,
        },
      })
    }

    // Get subscription details
    let subscriptionDetails = null
    if (tenant.stripeSubscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(
          tenant.stripeSubscriptionId,
          { expand: ['default_payment_method'] }
        )

        const mainItem = subscription.items.data.find(
          (item) => !item.price.id.includes('ai_addon')
        )
        const plan = mainItem ? PRICE_ID_TO_PLAN[mainItem.price.id] : tenant.subscriptionPlan
        const hasAiAddon = subscription.items.data.some(
          (item) => item.price.id.includes('ai_addon')
        )

        const firstItem = subscription.items.data[0]
        subscriptionDetails = {
          id: subscription.id,
          status: subscription.status,
          plan: plan || tenant.subscriptionPlan,
          currentPeriodStart: new Date((firstItem?.current_period_start ?? 0) * 1000).toISOString(),
          currentPeriodEnd: new Date((firstItem?.current_period_end ?? 0) * 1000).toISOString(),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          aiAddonActive: hasAiAddon,
          aiAddonAmount: hasAiAddon ? 20000 : undefined,
        }
      } catch (error) {
        console.error('Failed to retrieve subscription:', error)
      }
    }

    // Get invoices
    interface BillingInvoice {
      id: string
      number: string
      amount: number
      currency: string
      status: string | null
      created: string
      pdfUrl: string | null | undefined
      lineItems: { description: string; amount: number }[]
    }
    let invoices: BillingInvoice[] = []
    try {
      const stripeInvoices = await getInvoices(tenant.stripeCustomerId, 10)
      invoices = stripeInvoices.map((invoice) => ({
        id: invoice.id,
        number: invoice.number || invoice.id,
        amount: invoice.amount_due,
        currency: invoice.currency,
        status: invoice.status,
        created: new Date(invoice.created * 1000).toISOString(),
        pdfUrl: invoice.invoice_pdf,
        lineItems: invoice.lines.data.map((line) => ({
          description: line.description || 'Subscription',
          amount: line.amount,
        })),
      }))
    } catch (error) {
      console.error('Failed to retrieve invoices:', error)
    }

    // Get payment method
    let paymentMethod = null
    try {
      const pm = await getDefaultPaymentMethod(tenant.stripeCustomerId)
      if (pm) {
        paymentMethod = {
          id: pm.id,
          type: pm.type,
          card: pm.card ? {
            brand: pm.card.brand,
            last4: pm.card.last4,
            expMonth: pm.card.exp_month,
            expYear: pm.card.exp_year,
          } : undefined,
        }
      }
    } catch (error) {
      console.error('Failed to retrieve payment method:', error)
    }

    // Get usage
    const usage = {
      inspectionsThisMonth: tenant._count.inspections,
      aiCallsThisMonth: tenant.aiCallsThisMonth || 0,
      storageUsed: tenant.storageUsed || 0,
    }

    return NextResponse.json({
      subscription: subscriptionDetails,
      invoices,
      paymentMethod,
      usage,
    })
  } catch (error: unknown) {
    // Return empty billing data on error (DB/Stripe unavailable)
    return NextResponse.json({
      subscription: null,
      invoices: [],
      paymentMethod: null,
      usage: {
        inspectionsThisMonth: 0,
        aiCallsThisMonth: 0,
        storageUsed: 0,
      },
    })
  }
}
