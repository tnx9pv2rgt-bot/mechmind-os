# MechMind OS v10 - Investor Metrics & Reporting

## Executive Dashboard

Key metrics for board meetings and investor updates.

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| **ARR** | €71,160 | €500K Y1 | 🟡 On Track |
| **MRR** | €5,930 | €42K Y1 | 🟡 On Track |
| **LTV/CAC** | 14.6:1 | 3:1+ | 🟢 Excellent |
| **Gross Margin** | 58% | 70% | 🟡 Improving |
| **Net Dollar Retention** | 102% | 100%+ | 🟢 Good |
| **Magic Number** | 0.8 | >0.75 | 🟢 Good |
| **Rule of 40** | 35% | 40%+ | 🟡 Close |

---

## Annual Recurring Revenue (ARR)

### ARR Calculation
```
ARR = MRR × 12

Current: €5,930 × 12 = €71,160
Target Y1: €500,000 (€42K MRR)
Target Y2: €1,500,000
Target Y3: €5,000,000
```

### ARR Growth Metrics

| Metric | Formula | Current | Target |
|--------|---------|---------|--------|
| ARR Growth Rate | (ARR - ARR_last_year) / ARR_last_year | N/A (launch) | 200% Y1 |
| New ARR | ARR from new customers | €71K | €400K Y1 |
| Expansion ARR | ARR from upsells | €2K | €50K Y1 |
| Contraction ARR | ARR lost to downgrades | €500 | <€10K Y1 |
| Churned ARR | ARR lost to cancellations | €0 | <€20K Y1 |
| Net New ARR | New + Expansion - Contraction - Churn | €72.5K | €420K Y1 |

### ARR by Tier

| Tier | Shops | ARPU | ARR Contribution | % of Total |
|------|-------|------|------------------|------------|
| Starter | 40 | €588 | €23,520 | 33% |
| Pro | 25 | €1,188 | €29,700 | 42% |
| Enterprise | 5 | €3,588 | €17,940 | 25% |
| **Total** | **70** | | **€71,160** | **100%** |

---

## Net Dollar Retention (NDR)

### NDR Formula
```
NDR = (Starting MRR + Expansion - Contraction - Churn) / Starting MRR × 100

Example:
- Starting MRR (Month 1): €5,000 (50 shops)
- Expansion (upsells): +€300
- Contraction (downgrades): -€50
- Churn (cancellations): -€150
- Ending MRR: €5,100

NDR = €5,100 / €5,000 × 100 = 102%
```

### NDR Benchmarks

| NDR Range | Interpretation | Action Required |
|-----------|----------------|-----------------|
| <90% | 🔴 Critical churn problem | Immediate intervention |
| 90-100% | 🟡 Churn offsetting growth | Focus on retention |
| 100-110% | 🟢 Healthy expansion | Maintain course |
| 110-120% | 🟢 Strong expansion | Accelerate growth |
| >120% | 🟢 Excellent | Best-in-class |

### NDR Components Tracking

| Component | Monthly Target | Impact on NDR |
|-----------|----------------|---------------|
| Gross churn | <5% | -5% |
| Expansion rate | >7% | +7% |
| **Net retention** | **>102%** | **+2%** |

---

## Gross Dollar Retention (GDR)

### GDR Formula
```
GDR = (Starting MRR - Churn) / Starting MRR × 100

GDR excludes expansion revenue - pure retention metric

Example:
- Starting MRR: €5,000
- Churned MRR: €150
- GDR = (€5,000 - €150) / €5,000 × 100 = 97%
```

### GDR vs NDR

| Metric | Includes Expansion | Best For |
|--------|-------------------|----------|
| GDR | No | Measuring true retention |
| NDR | Yes | Overall business health |

### GDR Targets by Stage

| Stage | Target GDR | Notes |
|-------|------------|-------|
| Seed (<$1M ARR) | 85%+ | Product-market fit focus |
| Series A ($1-5M) | 90%+ | Scale validation |
| Series B+ ($5M+) | 93%+ | Efficiency focus |

---

## Magic Number (SaaS Efficiency)

### Magic Number Formula
```
Magic Number = (Current Quarter ARR - Prior Quarter ARR) × 4
               ─────────────────────────────────────────────
                        Sales & Marketing Spend

Simplified for monthly:
Magic Number = Net New ARR × 12 / Sales & Marketing Spend

Example:
- Net New MRR: €1,000
- S&M Spend: €15,000/month
- Magic Number = (€1,000 × 12) / €15,000 = 0.8
```

### Magic Number Interpretation

| Value | Interpretation | Action |
|-------|----------------|--------|
| <0.5 | 🔴 Inefficient sales | Reduce S&M or fix product |
| 0.5-0.75 | 🟡 Approaching efficiency | Optimize before scaling |
| 0.75-1.0 | 🟢 Efficient | Ready to scale |
| 1.0-1.5 | 🟢 Highly efficient | Invest aggressively |
| >1.5 | 🟢 Exceptional | Accelerate growth |

### Magic Number by Channel

| Channel | Magic Number | Efficiency |
|---------|--------------|------------|
| Organic/SEO | 2.5 | 🟢 Exceptional |
| Paid Search | 0.9 | 🟢 Good |
| Social Ads | 0.6 | 🟡 Improving |
| Partner Referrals | 1.8 | 🟢 Excellent |
| Events | 0.4 | 🔴 Optimize |
| **Blended** | **0.8** | 🟢 Good |

---

## Rule of 40

### Rule of 40 Formula
```
Rule of 40 = ARR Growth Rate + EBITDA Margin ≥ 40%

Example:
- ARR Growth: 150%
- EBITDA Margin: -120% (burning)
- Rule of 40: 150% + (-120%) = 30%

Healthy SaaS businesses aim for the sum to exceed 40%
```

### Rule of 40 by Stage

| Stage | Growth | Profit | Target Sum |
|-------|--------|--------|------------|
| Seed | 200% | -150% | 50% ✅ |
| Series A | 100% | -50% | 50% ✅ |
| Series B | 60% | -10% | 50% ✅ |
| Series C+ | 30% | 15% | 45% ✅ |
| Public | 20% | 20% | 40% ✅ |

### MechMind Rule of 40 Trajectory

| Year | ARR Growth | EBITDA Margin | Rule of 40 | Status |
|------|------------|---------------|------------|--------|
| Y1 | 300%* | -200% | 100% | 🟢 (Investment phase) |
| Y2 | 200% | -80% | 120% | 🟢 |
| Y3 | 100% | -20% | 80% | 🟢 |
| Y4 | 60% | 10% | 70% | 🟢 |
| Y5 | 40% | 20% | 60% | 🟢 |

*From small base

---

## Cohort Analysis

### Cohort Retention Table

| Cohort | Month 0 | M3 | M6 | M9 | M12 | M18 | M24 |
|--------|---------|-----|-----|-----|-----|-----|-----|
| Jan 2024 | 10 | 10 | 9 | 9 | 8 | 8 | 8 |
| Feb 2024 | 8 | 8 | 8 | 7 | 7 | | |
| Mar 2024 | 12 | 12 | 11 | 11 | | | |
| Apr 2024 | 15 | 14 | 14 | | | | |

**Retention Rate:**
| Cohort | M3 | M6 | M9 | M12 |
|--------|-----|-----|-----|-----|
| Jan 2024 | 100% | 90% | 90% | 80% |
| Feb 2024 | 100% | 100% | 88% | 88% |
| Mar 2024 | 100% | 92% | 92% | |

### Cohort Revenue Analysis

| Cohort | Starting MRR | M12 MRR | LTV | CAC | LTV/CAC |
|--------|--------------|---------|-----|-----|---------|
| Jan 2024 | €820 | €1,200 | €2,880 | €150 | 19.2:1 |
| Feb 2024 | €656 | €950 | €2,280 | €150 | 15.2:1 |
| Mar 2024 | €984 | €1,400 | €3,360 | €150 | 22.4:1 |

---

## Board Report Templates

### Monthly Board Update Template

```markdown
# MechMind OS - Monthly Board Update

## Month: [Month Year]

### Key Metrics
| Metric | This Month | Last Month | Change |
|--------|------------|------------|--------|
| MRR | €X | €Y | +Z% |
| ARR | €X | €Y | +Z% |
| Customers | X | Y | +Z |
| ARPU | €X | €Y | +Z% |
| Churn Rate | X% | Y% | Zpp |

### Growth Metrics
- New Customers: X
- Expansion Revenue: €X
- Churned Revenue: €X
- Net New ARR: €X
- NDR: X%

### Efficiency Metrics
- CAC: €X
- LTV: €X
- LTV/CAC: X:1
- Payback Period: X months
- Magic Number: X

### Cash & Runway
- Cash on Hand: €X
- Monthly Burn: €X
- Runway: X months

### Highlights
- [Key wins]

### Challenges
- [Key issues]

### Next Month Priorities
- [Top 3 priorities]
```

### Quarterly Board Deck Structure

1. **Executive Summary** (1 slide)
   - ARR, growth rate, key wins

2. **Financial Performance** (3-4 slides)
   - ARR trajectory
   - Revenue breakdown
   - Unit economics
   - Cash position

3. **Customer Metrics** (2-3 slides)
   - Customer growth
   - Churn and retention
   - NDR/GDR
   - Cohort analysis

4. **Product & Engineering** (2 slides)
   - Shipping velocity
   - Key features launched
   - Technical metrics

5. **Go-to-Market** (2-3 slides)
   - Pipeline
   - CAC by channel
   - Sales efficiency

6. **Team** (1 slide)
   - Headcount
   - Hiring plan
   - Key hires

7. **Goals & Priorities** (1 slide)
   - Q goals: X% achieved
   - Next quarter priorities

---

## KPI Dashboard

### Weekly KPIs (Operations)
| Metric | Target | Owner |
|--------|--------|-------|
| New signups | 5/week | Marketing |
| Trial activations | 70% | Product |
| Trial-to-paid | 30% | Sales |
| Support tickets | <20/week | Support |
| NPS score | >40 | Customer Success |
| System uptime | 99.9% | Engineering |

### Monthly KPIs (Management)
| Metric | Target | Owner |
|--------|--------|-------|
| MRR growth | 15% | CEO |
| Net new customers | 10 | Sales |
| Churn rate | <3% | Customer Success |
| ARPU | €85 | Product |
| Gross margin | >60% | COO |
| CAC | <€150 | Marketing |

### Quarterly KPIs (Board)
| Metric | Target | Owner |
|--------|--------|-------|
| ARR growth | 50%+ | CEO |
| NDR | >100% | CEO |
| LTV/CAC | >3:1 | CEO |
| Magic Number | >0.75 | CRO |
| Rule of 40 | >40% | CEO |
| Gross margin | >65% | COO |

---

## Valuation Metrics

### SaaS Valuation Multiples

| ARR Range | Multiple Range | Notes |
|-----------|----------------|-------|
| <€1M | 3-6x | Early stage, high risk |
| €1M-5M | 5-10x | Product-market fit |
| €5M-20M | 8-15x | Growth stage |
| €20M-100M | 10-20x | Scale stage |
| >€100M | 15-25x | Public/market leader |

### Key Drivers of Multiple

| Factor | Impact on Multiple | MechMind Status |
|--------|-------------------|-----------------|
| Growth rate | High | 🟡 150% projected |
| Net retention | High | 🟢 102% |
| Gross margin | Medium | 🟡 58% improving |
| LTV/CAC | Medium | 🟢 14.6:1 |
| Market size | High | 🟢 €2B+ TAM |
| Competition | Negative | 🟡 Moderate |

### Valuation Scenarios

| Scenario | ARR | Multiple | Valuation |
|----------|-----|----------|-----------|
| Conservative | €500K | 5x | €2.5M |
| Base Case | €500K | 8x | €4M |
| Optimistic | €500K | 12x | €6M |

---

## Investor Update Email Template

```
Subject: MechMind OS - [Month] Update: X% MRR Growth

Hi [Investor Name],

Quick update on MechMind OS progress this month:

📈 KEY METRICS
• MRR: €X (↑Y% MoM)
• Customers: X (↑Y)
• ARPU: €X
• Churn: X%

💰 FINANCIALS
• Cash: €X
• Burn: €X/month
• Runway: X months

🎯 WINS
• [Win 1]
• [Win 2]

🚀 NEXT MONTH
• [Priority 1]
• [Priority 2]

Full dashboard: [link]

Thanks,
[Name]
```

---

## Data Room Contents

### Standard Data Room Structure

```
📁 01 - Company Overview
  ├── Pitch deck
  ├── One-pager
  └── Cap table

📁 02 - Financials
  ├── P&L (monthly)
  ├── Balance sheet
  ├── Cash flow
  ├── Financial projections
  └── Unit economics

📁 03 - Metrics
  ├── Cohort analysis
  ├── Customer metrics
  ├── Revenue breakdown
  └── Churn analysis

📁 04 - Legal
  ├── Incorporation docs
  ├── IP assignments
  ├── Contracts
  └── Employment agreements

📁 05 - Product
  ├── Product roadmap
  ├── Technical architecture
  ├── Security docs
  └── API documentation

📁 06 - Market
  ├── Market research
  ├── Competitive analysis
  └── Customer interviews
```

---

*Document Version: 1.0*
*Last Updated: 2024*
*Next Review: Monthly (board meetings)*
