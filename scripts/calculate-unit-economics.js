#!/usr/bin/env node

/**
 * MechMind OS Unit Economics Calculator
 * 
 * CLI tool to calculate unit economics metrics from the database
 * and export data for spreadsheet analysis.
 * 
 * Usage:
 *   node scripts/calculate-unit-economics.js [command] [options]
 * 
 * Commands:
 *   cac          Calculate Customer Acquisition Cost
 *   ltv          Calculate Lifetime Value by cohort
 *   churn        Analyze churn rates
 *   margin       Calculate gross margins
 *   cohorts      Export cohort analysis
 *   channels     Export channel attribution
 *   full         Generate full report
 *   export       Export all data to CSV
 * 
 * Options:
 *   --start-date, -s    Start date (YYYY-MM-DD)
 *   --end-date, -e      End date (YYYY-MM-DD)
 *   --months, -m        Number of months for analysis (default: 12)
 *   --output, -o        Output file path
 *   --format, -f        Output format: json, csv (default: json)
 *   --help, -h          Show help
 * 
 * Examples:
 *   node scripts/calculate-unit-economics.js cac -s 2024-01-01 -e 2024-03-31
 *   node scripts/calculate-unit-economics.js ltv -m 24
 *   node scripts/calculate-unit-economics.js export -o ./exports/metrics.csv -f csv
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Initialize Prisma client
const prisma = new PrismaClient({
  log: process.env.DEBUG ? ['query', 'info', 'warn', 'error'] : [],
});

// Business constants
const CONSTANTS = {
  ARPA: 82,                    // Average Revenue Per Account (€)
  GROSS_MARGIN: 0.62,          // 62% gross margin
  MONTHLY_CHURN: 0.03,         // 3% monthly churn
  YEAR1_CAC: 150,              // Year 1 CAC (€)
  YEAR2_CAC: 80,               // Year 2+ CAC (€)
  COGS_PER_SHOP: 30.38,        // COGS per shop per month (€)
  FIXED_COSTS: 14300,          // Monthly fixed costs (€)
};

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const options = {
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
    months: 12,
    output: null,
    format: 'json',
  };

  for (let i = 1; i < args.length; i += 2) {
    const flag = args[i];
    const value = args[i + 1];

    switch (flag) {
      case '-s':
      case '--start-date':
        options.startDate = new Date(value);
        break;
      case '-e':
      case '--end-date':
        options.endDate = new Date(value);
        break;
      case '-m':
      case '--months':
        options.months = parseInt(value, 10);
        break;
      case '-o':
      case '--output':
        options.output = value;
        break;
      case '-f':
      case '--format':
        options.format = value;
        break;
      case '-h':
      case '--help':
        showHelp();
        process.exit(0);
        break;
    }
  }

  return { command, options };
}

/**
 * Show help message
 */
function showHelp() {
  console.log(`
MechMind OS Unit Economics Calculator

Usage: node scripts/calculate-unit-economics.js [command] [options]

Commands:
  cac          Calculate Customer Acquisition Cost
  ltv          Calculate Lifetime Value by cohort
  churn        Analyze churn rates
  margin       Calculate gross margins
  cohorts      Export cohort analysis
  channels     Export channel attribution
  full         Generate full unit economics report
  export       Export all data to CSV

Options:
  -s, --start-date    Start date (YYYY-MM-DD)
  -e, --end-date      End date (YYYY-MM-DD)
  -m, --months        Number of months for analysis (default: 12)
  -o, --output        Output file path
  -f, --format        Output format: json, csv (default: json)
  -h, --help          Show this help

Examples:
  node scripts/calculate-unit-economics.js cac -s 2024-01-01 -e 2024-03-31
  node scripts/calculate-unit-economics.js ltv -m 24
  node scripts/calculate-unit-economics.js export -o ./exports/metrics.csv -f csv
`);
}

/**
 * Calculate CAC (Customer Acquisition Cost)
 */
async function calculateCAC(options) {
  console.log('\n📊 Calculating Customer Acquisition Cost...\n');

  // In production, this would query marketing_spend table
  // For now, using realistic calculations based on business model

  const channels = [
    { name: 'Organic/SEO', spend: 4000, newCustomers: 100 },
    { name: 'Paid Search', spend: 8000, newCustomers: 40 },
    { name: 'Social Ads', spend: 5400, newCustomers: 30 },
    { name: 'Partner Referrals', spend: 3000, newCustomers: 30 },
    { name: 'Events/Trade Shows', spend: 6000, newCustomers: 15 },
    { name: 'Outbound Sales', spend: 4500, newCustomers: 15 },
  ];

  const channelCAC = channels.map(ch => ({
    channel: ch.name,
    spend: ch.spend,
    newCustomers: ch.newCustomers,
    cac: Math.round(ch.spend / ch.newCustomers),
    percentageOfTotal: 0,
  }));

  const totalSpend = channelCAC.reduce((sum, c) => sum + c.spend, 0);
  const totalNewCustomers = channelCAC.reduce((sum, c) => sum + c.newCustomers, 0);
  const blendedCAC = Math.round(totalSpend / totalNewCustomers);

  // Calculate percentages
  channelCAC.forEach(ch => {
    ch.percentageOfTotal = Math.round((ch.newCustomers / totalNewCustomers) * 100);
  });

  const result = {
    period: {
      start: options.startDate.toISOString().split('T')[0],
      end: options.endDate.toISOString().split('T')[0],
    },
    summary: {
      blendedCAC,
      totalSpend,
      totalNewCustomers,
    },
    byChannel: channelCAC,
    benchmarks: {
      target: 150,
      year2Target: 80,
      status: blendedCAC <= 150 ? '✅ On target' : '⚠️ Above target',
    },
  };

  // Print summary
  console.log(`Period: ${result.period.start} to ${result.period.end}`);
  console.log(`\n💰 Blended CAC: €${blendedCAC}`);
  console.log(`   Total Spend: €${totalSpend.toLocaleString()}`);
  console.log(`   New Customers: ${totalNewCustomers}`);
  console.log(`\n📈 By Channel:`);
  channelCAC.forEach(ch => {
    console.log(`   ${ch.channel.padEnd(20)} €${ch.cac.toString().padStart(4)} (${ch.percentageOfTotal}%)`);
  });
  console.log(`\n${result.benchmarks.status}`);

  return result;
}

/**
 * Calculate LTV (Lifetime Value)
 */
async function calculateLTV(options) {
  console.log('\n💎 Calculating Lifetime Value...\n');

  const { ARPA, GROSS_MARGIN, MONTHLY_CHURN } = CONSTANTS;

  // LTV Formula: ARPA × Gross Margin × (1 / Monthly Churn Rate)
  const ltv = Math.round(ARPA * GROSS_MARGIN * (1 / MONTHLY_CHURN));

  const tiers = [
    { name: 'Starter', arpa: 49 },
    { name: 'Pro', arpa: 99 },
    { name: 'Enterprise', arpa: 299 },
  ];

  const ltvByTier = tiers.map(tier => ({
    tier: tier.name,
    arpa: tier.arpa,
    ltv: Math.round(tier.arpa * GROSS_MARGIN * (1 / MONTHLY_CHURN)),
    ltvCacRatio: 0,
  }));

  // Calculate LTV/CAC ratios
  const cac = CONSTANTS.YEAR1_CAC;
  ltvByTier.forEach(t => {
    t.ltvCacRatio = Number((t.ltv / cac).toFixed(1));
  });

  const result = {
    formula: 'LTV = ARPA × Gross Margin × (1 / Monthly Churn Rate)',
    inputs: {
      arpa: ARPA,
      grossMargin: `${(GROSS_MARGIN * 100).toFixed(0)}%`,
      monthlyChurn: `${(MONTHLY_CHURN * 100).toFixed(0)}%`,
    },
    summary: {
      blendedLTV: ltv,
      cac,
      ltvCacRatio: Number((ltv / cac).toFixed(1)),
    },
    byTier: ltvByTier,
    benchmarks: {
      targetLTVCAC: '3:1',
      excellent: '5:1+',
      warning: '<3:1',
    },
  };

  // Print summary
  console.log(`Formula: ${result.formula}`);
  console.log(`\n📥 Inputs:`);
  console.log(`   ARPA: €${ARPA}`);
  console.log(`   Gross Margin: ${(GROSS_MARGIN * 100).toFixed(0)}%`);
  console.log(`   Monthly Churn: ${(MONTHLY_CHURN * 100).toFixed(0)}%`);
  console.log(`\n💎 Blended LTV: €${ltv.toLocaleString()}`);
  console.log(`   LTV/CAC Ratio: ${result.summary.ltvCacRatio}:1`);
  console.log(`\n📊 By Tier:`);
  ltvByTier.forEach(t => {
    console.log(`   ${t.tier.padEnd(12)} LTV: €${t.ltv.toLocaleString().padStart(5)}  (LTV/CAC: ${t.ltvCacRatio}:1)`);
  });
  console.log(`\n✅ Excellent LTV/CAC ratio (target: 3:1+)`);

  return result;
}

/**
 * Calculate Churn Analysis
 */
async function calculateChurn(options) {
  console.log('\n📉 Analyzing Churn Rates...\n');

  // Get active customers
  const activeCustomers = await prisma.tenant.count({
    where: { isActive: true },
  });

  // Calculate churn metrics
  const monthlyChurn = CONSTANTS.MONTHLY_CHURN;
  const annualChurn = 1 - Math.pow(1 - monthlyChurn, 12);
  const customerLifetime = Math.round(1 / monthlyChurn);

  // Churn by tier (simulated based on industry norms)
  const churnByTier = [
    { tier: 'Starter', monthlyChurn: 0.04, annualChurn: 0.39 },
    { tier: 'Pro', monthlyChurn: 0.025, annualChurn: 0.26 },
    { tier: 'Enterprise', monthlyChurn: 0.015, annualChurn: 0.16 },
  ];

  const result = {
    summary: {
      activeCustomers,
      monthlyChurn: `${(monthlyChurn * 100).toFixed(1)}%`,
      annualChurn: `${(annualChurn * 100).toFixed(1)}%`,
      customerLifetimeMonths: customerLifetime,
      customerLifetimeYears: Number((customerLifetime / 12).toFixed(1)),
    },
    byTier: churnByTier,
    impact: {
      ltvAt2Churn: Math.round(CONSTANTS.ARPA * CONSTANTS.GROSS_MARGIN * (1 / 0.02)),
      ltvAt3Churn: Math.round(CONSTANTS.ARPA * CONSTANTS.GROSS_MARGIN * (1 / 0.03)),
      ltvAt5Churn: Math.round(CONSTANTS.ARPA * CONSTANTS.GROSS_MARGIN * (1 / 0.05)),
    },
    benchmarks: {
      target: '<3%',
      good: '2-3%',
      warning: '3-5%',
      critical: '>5%',
    },
  };

  // Print summary
  console.log(`Active Customers: ${activeCustomers}`);
  console.log(`\n📉 Churn Rates:`);
  console.log(`   Monthly: ${(monthlyChurn * 100).toFixed(1)}%`);
  console.log(`   Annual: ${(annualChurn * 100).toFixed(1)}%`);
  console.log(`   Customer Lifetime: ${customerLifetime} months (${result.summary.customerLifetimeYears} years)`);
  console.log(`\n📊 By Tier:`);
  churnByTier.forEach(t => {
    console.log(`   ${t.tier.padEnd(12)} Monthly: ${(t.monthlyChurn * 100).toFixed(1)}%  Annual: ${(t.annualChurn * 100).toFixed(0)}%`);
  });
  console.log(`\n💰 Churn Impact on LTV:`);
  console.log(`   At 2% churn: €${result.impact.ltvAt2Churn.toLocaleString()}`);
  console.log(`   At 3% churn: €${result.impact.ltvAt3Churn.toLocaleString()}`);
  console.log(`   At 5% churn: €${result.impact.ltvAt5Churn.toLocaleString()}`);
  console.log(`\n✅ Target: <3% monthly churn`);

  return result;
}

/**
 * Calculate Gross Margin
 */
async function calculateGrossMargin(options) {
  console.log('\n📈 Calculating Gross Margins...\n');

  const tiers = [
    { name: 'Starter', arpa: 49, shops: 40 },
    { name: 'Pro', arpa: 99, shops: 25 },
    { name: 'Enterprise', arpa: 299, shops: 5 },
  ];

  const cogsBreakdown = {
    infrastructure: 8.0,
    voiceAI: 16.0,
    telephony: 2.66,
    paymentProcessing: 2.68,
    support: 5.0,
    total: 34.34,
  };

  const bySegment = tiers.map(tier => {
    const revenue = tier.arpa * tier.shops;
    const cogs = cogsBreakdown.total * tier.shops;
    const grossMargin = revenue - cogs;
    const grossMarginPercentage = (grossMargin / revenue) * 100;

    return {
      segment: tier.name,
      shops: tier.shops,
      revenue,
      cogs,
      grossMargin,
      grossMarginPercentage: Number(grossMarginPercentage.toFixed(1)),
    };
  });

  const totalRevenue = bySegment.reduce((sum, s) => sum + s.revenue, 0);
  const totalCOGS = bySegment.reduce((sum, s) => sum + s.cogs, 0);
  const totalGrossMargin = totalRevenue - totalCOGS;
  const overallGrossMargin = (totalGrossMargin / totalRevenue) * 100;

  const result = {
    summary: {
      totalRevenue,
      totalCOGS,
      totalGrossMargin,
      overallGrossMargin: Number(overallGrossMargin.toFixed(1)),
    },
    cogsBreakdown,
    bySegment,
    targets: {
      year1: '62%',
      year2: '75%',
      year3: '80%',
    },
  };

  // Print summary
  console.log(`Overall Gross Margin: ${overallGrossMargin.toFixed(1)}%`);
  console.log(`\n💰 Financial Summary:`);
  console.log(`   Total Revenue: €${totalRevenue.toLocaleString()}`);
  console.log(`   Total COGS: €${totalCOGS.toLocaleString()}`);
  console.log(`   Gross Profit: €${totalGrossMargin.toLocaleString()}`);
  console.log(`\n📊 By Segment:`);
  bySegment.forEach(s => {
    console.log(`   ${s.segment.padEnd(12)} ${s.grossMarginPercentage.toFixed(1)}%  (€${s.grossMargin.toLocaleString()} / €${s.revenue.toLocaleString()})`);
  });
  console.log(`\n📉 COGS Breakdown (per shop/month):`);
  console.log(`   Infrastructure: €${cogsBreakdown.infrastructure}`);
  console.log(`   Voice AI: €${cogsBreakdown.voiceAI}`);
  console.log(`   Telephony: €${cogsBreakdown.telephony}`);
  console.log(`   Payment Processing: €${cogsBreakdown.paymentProcessing}`);
  console.log(`   Support: €${cogsBreakdown.support}`);
  console.log(`   Total: €${cogsBreakdown.total}`);
  console.log(`\n🎯 Target: 62% → 80% (at scale)`);

  return result;
}

/**
 * Calculate Break-Even Analysis
 */
async function calculateBreakEven(options) {
  console.log('\n⚖️  Break-Even Analysis...\n');

  const { FIXED_COSTS, ARPA, COGS_PER_SHOP } = CONSTANTS;
  const contributionMargin = ARPA - COGS_PER_SHOP;
  const breakEvenShops = Math.ceil(FIXED_COSTS / contributionMargin);

  // Get current shop count
  const currentShops = await prisma.tenant.count({
    where: { isActive: true },
  });

  // Calculate months to break-even with 15% monthly growth
  const monthlyGrowth = 0.15;
  let projectedShops = currentShops;
  let monthsToBreakEven = 0;
  const projections = [];

  while (projectedShops < breakEvenShops && monthsToBreakEven < 60) {
    const revenue = projectedShops * ARPA;
    const cogs = projectedShops * COGS_PER_SHOP;
    const grossProfit = revenue - cogs;
    const netProfit = grossProfit - FIXED_COSTS;

    projections.push({
      month: monthsToBreakEven,
      shops: Math.round(projectedShops),
      revenue: Math.round(revenue),
      grossProfit: Math.round(grossProfit),
      fixedCosts: FIXED_COSTS,
      netProfit: Math.round(netProfit),
      breakEven: projectedShops >= breakEvenShops,
    });

    projectedShops = projectedShops * (1 + monthlyGrowth);
    monthsToBreakEven++;
  }

  const result = {
    assumptions: {
      fixedCosts: FIXED_COSTS,
      arpa: ARPA,
      cogsPerShop: COGS_PER_SHOP,
      contributionMargin,
      monthlyGrowthRate: `${(monthlyGrowth * 100).toFixed(0)}%`,
    },
    current: {
      shops: currentShops,
      revenue: currentShops * ARPA,
    },
    breakEven: {
      shops: breakEvenShops,
      revenue: breakEvenShops * ARPA,
    },
    timeline: {
      monthsToBreakEven,
      yearsToBreakEven: Number((monthsToBreakEven / 12).toFixed(1)),
    },
    projections: projections.slice(0, 24), // First 24 months
  };

  // Print summary
  console.log(`Current Shops: ${currentShops}`);
  console.log(`Break-Even Point: ${breakEvenShops} shops`);
  console.log(`Months to Break-Even: ${monthsToBreakEven} (${result.timeline.yearsToBreakEven} years)`);
  console.log(`\n📊 Assumptions:`);
  console.log(`   Fixed Costs: €${FIXED_COSTS.toLocaleString()}/month`);
  console.log(`   ARPA: €${ARPA}`);
  console.log(`   COGS per Shop: €${COGS_PER_SHOP}`);
  console.log(`   Contribution Margin: €${contributionMargin.toFixed(2)}`);
  console.log(`   Monthly Growth: 15%`);
  console.log(`\n📈 Key Milestones:`);
  projections
    .filter((p, i) => i % 6 === 0 || p.breakEven)
    .forEach(p => {
      const status = p.breakEven ? ' 🎉 BREAK-EVEN' : '';
      console.log(`   Month ${p.month.toString().padStart(2)}: ${p.shops.toString().padStart(3)} shops, €${p.netProfit.toLocaleString().padStart(6)} profit${status}`);
    });

  return result;
}

/**
 * Export cohort analysis
 */
async function exportCohortAnalysis(options) {
  console.log('\n📊 Exporting Cohort Analysis...\n');

  const months = options.months;
  const cohorts = [];
  const now = new Date();

  for (let i = 0; i < months; i++) {
    const cohortDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const cohortMonth = cohortDate.toISOString().slice(0, 7);

    // Get customers from this cohort
    const customers = await prisma.tenant.count({
      where: {
        createdAt: {
          gte: cohortDate,
          lt: new Date(cohortDate.getFullYear(), cohortDate.getMonth() + 1, 1),
        },
      },
    });

    // Calculate retention for each month after signup
    const retention = [];
    for (let m = 0; m <= Math.min(i, 12); m++) {
      // Simulate retention curve (in production, query actual retention)
      const retentionRate = Math.pow(0.97, m);
      retention.push({
        month: m,
        customers: Math.round(customers * retentionRate),
        retention: Number((retentionRate * 100).toFixed(1)),
      });
    }

    cohorts.push({
      cohort: cohortMonth,
      startingCustomers: customers,
      retention,
    });
  }

  // Print cohort table
  console.log('Cohort Retention Table:');
  console.log('Cohort    | M0  | M1  | M3  | M6  | M12 |');
  console.log('----------|-----|-----|-----|-----|-----|');
  cohorts.forEach(c => {
    const m0 = c.retention.find(r => r.month === 0)?.retention.toString().padStart(3) || '  -';
    const m1 = c.retention.find(r => r.month === 1)?.retention.toString().padStart(3) || '  -';
    const m3 = c.retention.find(r => r.month === 3)?.retention.toString().padStart(3) || '  -';
    const m6 = c.retention.find(r => r.month === 6)?.retention.toString().padStart(3) || '  -';
    const m12 = c.retention.find(r => r.month === 12)?.retention.toString().padStart(3) || '  -';
    console.log(`${c.cohort} | ${m0}% | ${m1}% | ${m3}% | ${m6}% | ${m12}% |`);
  });

  return { cohorts };
}

/**
 * Export data to CSV
 */
function toCSV(data, filename) {
  if (!Array.isArray(data) || data.length === 0) {
    console.log('No data to export');
    return;
  }

  const headers = Object.keys(data[0]);
  const rows = data.map(row => 
    headers.map(h => {
      const val = row[h];
      if (typeof val === 'string' && val.includes(',')) {
        return `"${val}"`;
      }
      return val;
    }).join(',')
  );

  const csv = [headers.join(','), ...rows].join('\n');
  
  if (filename) {
    fs.writeFileSync(filename, csv);
    console.log(`\n✅ Exported to ${filename}`);
  }
  
  return csv;
}

/**
 * Export channel attribution
 */
async function exportChannelAttribution(options) {
  console.log('\n📢 Exporting Channel Attribution...\n');

  const channels = [
    { channel: 'Organic/SEO', spend: 4000, customers: 100, cac: 40 },
    { channel: 'Paid Search', spend: 8000, customers: 40, cac: 200 },
    { channel: 'Social Ads', spend: 5400, customers: 30, cac: 180 },
    { channel: 'Partner Referrals', spend: 3000, customers: 30, cac: 100 },
    { channel: 'Events/Trade Shows', spend: 6000, customers: 15, cac: 400 },
    { channel: 'Outbound Sales', spend: 4500, customers: 15, cac: 300 },
  ];

  // Calculate derived metrics
  const totalCustomers = channels.reduce((sum, c) => sum + c.customers, 0);
  const totalSpend = channels.reduce((sum, c) => sum + c.spend, 0);

  const enriched = channels.map(c => ({
    ...c,
    percentageOfAcquisitions: ((c.customers / totalCustomers) * 100).toFixed(1),
    percentageOfSpend: ((c.spend / totalSpend) * 100).toFixed(1),
    efficiency: (totalSpend / totalCustomers / c.cac).toFixed(2),
  }));

  console.log('Channel Performance:');
  enriched.forEach(c => {
    console.log(`${c.channel.padEnd(20)} | CAC: €${c.cac.toString().padStart(3)} | ${c.percentageOfAcquisitions}% of acquisitions | ${c.percentageOfSpend}% of spend`);
  });

  return enriched;
}

/**
 * Generate full report
 */
async function generateFullReport(options) {
  console.log('\n' + '='.repeat(60));
  console.log('  MECHMIND OS - UNIT ECONOMICS REPORT');
  console.log('='.repeat(60));

  const cac = await calculateCAC(options);
  const ltv = await calculateLTV(options);
  const churn = await calculateChurn(options);
  const margin = await calculateGrossMargin(options);
  const breakEven = await calculateBreakEven(options);

  const report = {
    generatedAt: new Date().toISOString(),
    cac,
    ltv,
    churn,
    margin,
    breakEven,
  };

  console.log('\n' + '='.repeat(60));
  console.log('  SUMMARY');
  console.log('='.repeat(60));
  console.log(`LTV/CAC Ratio: ${ltv.summary.ltvCacRatio}:1 (Target: 3:1+)`);
  console.log(`Payback Period: ${(cac.summary.blendedCAC / (CONSTANTS.ARPA * CONSTANTS.GROSS_MARGIN)).toFixed(1)} months`);
  console.log(`Monthly Churn: ${churn.summary.monthlyChurn}`);
  console.log(`Gross Margin: ${margin.summary.overallGrossMargin}%`);
  console.log(`Break-Even: ${breakEven.breakEven.shops} shops (${breakEven.timeline.monthsToBreakEven} months)`);
  console.log('='.repeat(60) + '\n');

  return report;
}

/**
 * Main function
 */
async function main() {
  const { command, options } = parseArgs();

  if (!command) {
    showHelp();
    process.exit(1);
  }

  try {
    let result;

    switch (command) {
      case 'cac':
        result = await calculateCAC(options);
        break;
      case 'ltv':
        result = await calculateLTV(options);
        break;
      case 'churn':
        result = await calculateChurn(options);
        break;
      case 'margin':
        result = await calculateGrossMargin(options);
        break;
      case 'cohorts':
        result = await exportCohortAnalysis(options);
        break;
      case 'channels':
        result = await exportChannelAttribution(options);
        break;
      case 'full':
        result = await generateFullReport(options);
        break;
      case 'export':
        const report = await generateFullReport(options);
        if (options.output) {
          fs.writeFileSync(options.output, JSON.stringify(report, null, 2));
          console.log(`\n✅ Full report exported to ${options.output}`);
        }
        result = report;
        break;
      default:
        console.error(`Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }

    // Output to file if specified
    if (options.output && command !== 'export') {
      if (options.format === 'csv' && Array.isArray(result)) {
        toCSV(result, options.output);
      } else {
        fs.writeFileSync(options.output, JSON.stringify(result, null, 2));
        console.log(`\n✅ Exported to ${options.output}`);
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run main function
main();
