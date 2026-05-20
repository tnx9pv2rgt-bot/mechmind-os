const fs = require('fs');
const path = require('path');

const srcPath = './src';
const modules = fs.readdirSync(srcPath).filter(f => {
  const stat = fs.statSync(path.join(srcPath, f));
  return stat.isDirectory() && \!f.startsWith('.');
});

// TIER classification
const tierMap = {
  auth: 'TIER_1', booking: 'TIER_1', invoice: 'TIER_1', 
  'payment-link': 'TIER_1', subscription: 'TIER_1', gdpr: 'TIER_1',
  
  analytics: 'TIER_2', common: 'TIER_2', dvi: 'TIER_2', voice: 'TIER_2',
  iot: 'TIER_2', notifications: 'TIER_2', 'ai-compliance': 'TIER_2',
  webhooks: 'TIER_2', 'webhook-subscription': 'TIER_2', 'ai-diagnostic': 'TIER_2',
  'vehicle-history': 'TIER_2'
};

const tier1 = [], tier2 = [], tier3 = [], tier4 = [];
modules.forEach(m => {
  const t = tierMap[m] || 'TIER_3';
  if (t === 'TIER_1') tier1.push(m);
  else if (t === 'TIER_2') tier2.push(m);
  else if (t === 'TIER_3') tier3.push(m);
  else tier4.push(m);
});

console.log(`✅ TIER_1 CRITICAL (${tier1.length}): ${tier1.join(', ')}`);
console.log(`✅ TIER_2 HIGH (${tier2.length}): ${tier2.join(', ')}`);
console.log(`✅ TIER_3 MEDIUM (${tier3.length}): ${tier3.join(', ')}`);
console.log(`✅ TIER_4 UTILITY (${tier4.length}): ${tier4.join(', ')}`);
console.log(`\n📊 TOTAL: ${modules.length} moduli`);
