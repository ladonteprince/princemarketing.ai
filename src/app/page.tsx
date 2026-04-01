import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Hero } from '@/components/landing/Hero';
import { AccordionFeatures } from '@/components/cinematic/AccordionFeatures';
import { ScoringDemo } from '@/components/landing/ScoringDemo';
import { Pricing } from '@/components/landing/Pricing';

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <AccordionFeatures />
        <ScoringDemo />
        <Pricing />
      </main>
      <Footer />
    </>
  );
}
