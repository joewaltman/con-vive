import { TrojanCoBrandHeader } from "@/components/trojan/TrojanCoBrandHeader";
import { Header } from "@/components/landing/header";
import { Footer } from "@/components/landing/footer";

export default function TrojanWaitlistConfirmedPage() {
  return (
    <main>
      <Header />
      <div className="mx-auto max-w-2xl px-6 py-12 sm:py-24">
        <TrojanCoBrandHeader />

        <div className="text-center">
          <h1 className="heading-1 text-charcoal">
            You&rsquo;re on the <span className="text-terracotta">Waitlist</span>
          </h1>
          <p className="body-lg mt-4 text-warm-gray">
            Thanks for your interest in the Trojan Alumni dinner.
          </p>
        </div>

        <div className="mt-12 bg-cream rounded-2xl p-6 sm:p-8 text-center">
          <p className="text-charcoal">
            We&rsquo;ve added you to the waitlist. If a spot opens up, we&rsquo;ll
            reach out right away.
          </p>
          <p className="text-warm-gray mt-4">
            In the meantime, you&rsquo;ll be on our list for future Con-Vive
            dinners in San Diego. We host intimate gatherings regularly and
            would love to have you at one.
          </p>
        </div>

        <div className="mt-8 text-center">
          <p className="body-base text-warm-gray">
            Questions? Email{" "}
            <a
              href="mailto:joe@con-vive.com"
              className="text-terracotta hover:underline"
            >
              joe@con-vive.com
            </a>{" "}
            or text Joe at (760) 274-8830.
          </p>
        </div>
      </div>
      <Footer />
    </main>
  );
}
