import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Con-Vive",
  description: "Privacy Policy for Con-Vive dinner parties.",
};

export default function PrivacyPolicy() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link
        href="/"
        className="body-sm mb-8 inline-block text-terracotta hover:underline"
      >
        &larr; Back to Home
      </Link>

      <h1 className="heading-1 mb-8 text-charcoal">Privacy Policy</h1>

      <div className="prose prose-lg text-warm-gray">
        <p className="body-base mb-6">
          <strong>Last updated:</strong> March 2026
        </p>

        <p className="body-base mb-6">
          Con-Vive (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) respects your privacy and is
          committed to protecting the personal information you share with us. This Privacy Policy
          explains how we collect, use, and safeguard your information when you sign up for our
          dinner events.
        </p>

        <h2 className="heading-3 mb-4 mt-8 text-charcoal">Information We Collect</h2>
        <p className="body-base mb-4">
          When you sign up for Con-Vive, we collect the following information:
        </p>
        <ul className="body-base mb-6 list-disc space-y-2 pl-6">
          <li>First and last name</li>
          <li>Email address</li>
          <li>Phone number</li>
          <li>Optional information you choose to share about yourself</li>
        </ul>

        <h2 className="heading-3 mb-4 mt-8 text-charcoal">How We Use Your Information</h2>
        <p className="body-base mb-4">We use your information to:</p>
        <ul className="body-base mb-6 list-disc space-y-2 pl-6">
          <li>Communicate with you about upcoming dinner events</li>
          <li>Send you invitations and event details</li>
          <li>Coordinate dinner arrangements and logistics</li>
          <li>Respond to your questions and requests</li>
        </ul>

        <h2 className="heading-3 mb-4 mt-8 text-charcoal">Text Messaging</h2>
        <p className="body-base mb-6">
          We may use your phone number to send you text messages about dinner events, invitations,
          and logistics. By providing your phone number and agreeing to this Privacy Policy, you
          consent to receive such messages. You may opt out of text messages at any time by replying
          STOP or contacting us directly.
        </p>
        <p className="body-base mb-6 font-medium text-charcoal">
          All the above categories exclude text messaging originator opt-in data and consent; this
          information will not be shared with any third parties.
        </p>

        <h2 className="heading-3 mb-4 mt-8 text-charcoal">Information Sharing</h2>
        <p className="body-base mb-6">
          We do not sell, trade, or rent your personal information to third parties. We may share
          limited information (such as your first name) with other dinner guests to facilitate
          introductions at events.
        </p>

        <h2 className="heading-3 mb-4 mt-8 text-charcoal">Data Security</h2>
        <p className="body-base mb-6">
          We take reasonable measures to protect your personal information from unauthorized access,
          use, or disclosure. However, no method of transmission over the internet or electronic
          storage is completely secure.
        </p>

        <h2 className="heading-3 mb-4 mt-8 text-charcoal">Your Rights</h2>
        <p className="body-base mb-6">
          You may request to access, update, or delete your personal information at any time by
          contacting us at{" "}
          <a href="mailto:joe@con-vive.com" className="text-terracotta hover:underline">
            joe@con-vive.com
          </a>
          .
        </p>

        <h2 className="heading-3 mb-4 mt-8 text-charcoal">Changes to This Policy</h2>
        <p className="body-base mb-6">
          We may update this Privacy Policy from time to time. We will notify you of any changes by
          posting the new policy on this page.
        </p>

        <h2 className="heading-3 mb-4 mt-8 text-charcoal">Contact Us</h2>
        <p className="body-base mb-6">
          If you have any questions about this Privacy Policy, please contact us at{" "}
          <a href="mailto:joe@con-vive.com" className="text-terracotta hover:underline">
            joe@con-vive.com
          </a>
          .
        </p>
        <p className="body-base mb-6">
          Follow us on Instagram:{" "}
          <a
            href="https://instagram.com/convive_dinners"
            target="_blank"
            rel="noopener noreferrer"
            className="text-terracotta hover:underline"
          >
            @convive_dinners
          </a>
        </p>
      </div>
    </main>
  );
}
