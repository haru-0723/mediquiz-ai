import { LandingNav } from '@/components/landing/LandingNav';
import { Hero } from '@/components/landing/Hero';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { Features } from '@/components/landing/Features';
import { CtaFooter } from '@/components/landing/CtaFooter';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      <LandingNav />
      <Hero />
      <HowItWorks />
      <Features />
      <CtaFooter />
    </main>
  );
}
