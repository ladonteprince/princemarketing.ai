import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Hero } from '@/components/landing/Hero';
import { Features } from '@/components/landing/Features';
import { ScoringDemo } from '@/components/landing/ScoringDemo';
import { Pricing } from '@/components/landing/Pricing';

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Features />
        <ScoringDemo />
        <Pricing />
      </main>
      <Footer />
    </>
  );
}
