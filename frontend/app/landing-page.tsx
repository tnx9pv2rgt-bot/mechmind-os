'use client';

import {
  Navbar,
  Hero,
  TrustBar,
  FeaturePillars,
  HowItWorks,
  ProductDemo,
  RoiCalculator,
  ComparisonTable,
  Testimonials,
  PricingPreview,
  Faq,
  CtaSection,
  Footer,
  ChatWidget,
  ExitIntent,
  MobileBanner,
} from '@/components/marketing';

export function LandingPage(): React.ReactElement {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a]">
      {/* Sezione 1: Navbar */}
      <Navbar />

      {/* Sezione 2: Hero */}
      <Hero />

      {/* Sezione 3: Trust Bar */}
      <TrustBar />

      {/* Sezione 4: 3 Feature Pillar */}
      <FeaturePillars />

      {/* Sezione 4b: Come Funziona */}
      <HowItWorks />

      {/* Sezione 5: Demo Interattiva */}
      <ProductDemo />

      {/* Sezione 5b: ROI Calculator */}
      <RoiCalculator />

      {/* Sezione 5c: Confronto Prima vs Dopo */}
      <ComparisonTable />

      {/* Sezione 6: Testimonial / Perché MechMind */}
      <Testimonials />

      {/* Sezione 7: Pricing Preview */}
      <PricingPreview />

      {/* Sezione 8: FAQ */}
      <Faq />

      {/* Sezione 9: CTA Finale + Footer */}
      <CtaSection />
      <Footer />

      {/* Sezione 10: Live Chat Widget */}
      <ChatWidget />

      {/* Sezione 11: Exit Intent (desktop) + Mobile Banner */}
      <ExitIntent />
      <MobileBanner />
    </div>
  );
}
