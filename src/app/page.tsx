import { ScrollSection } from "@/components/scroll-animation";
import { Header } from "@/components/landing/header";
import { HeroSection } from "@/components/landing/hero-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { NarrativeSection } from "@/components/landing/narrative-section";
import { NarrativeCta } from "@/components/landing/narrative-cta";
import { DetailsSection } from "@/components/landing/details-section";
import { AboutSection } from "@/components/landing/about-section";
import { SignupSection } from "@/components/landing/signup-section";
import { Footer } from "@/components/landing/footer";

export default function Home() {
  return (
    <main>
      <Header />
      <HeroSection />
      <ScrollSection>
        <HowItWorksSection />
      </ScrollSection>
      <ScrollSection>
        <NarrativeSection />
        <NarrativeCta />
      </ScrollSection>
      <ScrollSection>
        <DetailsSection />
      </ScrollSection>
      <ScrollSection>
        <AboutSection />
      </ScrollSection>
      <ScrollSection>
        <SignupSection />
      </ScrollSection>
      <Footer />
    </main>
  );
}
