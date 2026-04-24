'use client';

import dynamic from 'next/dynamic';
import Navbar from '@/components/marketing/navbar';
import { Hero } from '@/components/marketing/hero';
import { TrustBar } from '@/components/marketing/trust-bar';

// Above-the-fold: caricati subito (Navbar + Hero + TrustBar)
// Below-the-fold: lazy-loaded quando l'utente scrolla
const FeaturePillars = dynamic(() => import('@/components/marketing/feature-pillars').then((m) => m.FeaturePillars));
const HowItWorks = dynamic(() => import('@/components/marketing/how-it-works').then((m) => m.HowItWorks));
const ProductDemo = dynamic(() => import('@/components/marketing/product-demo').then((m) => m.ProductDemo));
const RoiCalculator = dynamic(() => import('@/components/marketing/roi-calculator').then((m) => m.RoiCalculator));
const ComparisonTable = dynamic(() => import('@/components/marketing/comparison-table').then((m) => m.ComparisonTable));
const Testimonials = dynamic(() => import('@/components/marketing/testimonials').then((m) => m.default));
const PricingPreview = dynamic(() => import('@/components/marketing/pricing-preview').then((m) => m.PricingPreview));
const Faq = dynamic(() => import('@/components/marketing/faq').then((m) => m.Faq));
const CtaSection = dynamic(() => import('@/components/marketing/cta-section').then((m) => m.CtaSection));
const Footer = dynamic(() => import('@/components/marketing/footer').then((m) => m.Footer));
const ChatWidget = dynamic(() => import('@/components/marketing/chat-widget').then((m) => m.ChatWidget), { ssr: false });
const MobileBanner = dynamic(() => import('@/components/marketing/mobile-banner').then((m) => m.MobileBanner), { ssr: false });

export function LandingPage(): React.ReactElement {
  return (
    <div className="min-h-screen bg-[var(--surface-secondary)] dark:bg-[var(--surface-tertiary)]">
      {/* Above the fold — caricati immediatamente */}
      <Navbar />
      <Hero />
      <TrustBar />

      {/* Below the fold — lazy-loaded */}
      <FeaturePillars />
      <HowItWorks />
      <ProductDemo />
      <RoiCalculator />
      <ComparisonTable />
      <Testimonials />
      <PricingPreview />
      <Faq />
      <CtaSection />
      <Footer />

      {/* Client-only widgets */}
      <ChatWidget />
      <MobileBanner />
    </div>
  );
}
