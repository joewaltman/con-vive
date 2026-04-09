import { ScrollSection } from "@/components/scroll-animation";
import { Header } from "@/components/landing/header";
import { SignupSection } from "@/components/landing/signup-section";
import { Footer } from "@/components/landing/footer";

export default function JoinPage() {
  return (
    <main>
      <Header />
      <ScrollSection>
        <SignupSection />
      </ScrollSection>
      <Footer />
    </main>
  );
}
