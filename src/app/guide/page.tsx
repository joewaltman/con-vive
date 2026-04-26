import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Guest Dinner Guide | Con-Vive",
  description: "Everything you need to know before attending a Con-Vive dinner.",
};

export default function GuidePage() {
  return (
    <>
      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        html {
          font-size: 18px;
        }

        body {
          font-family: Georgia, 'Times New Roman', serif;
          background-color: #FAF5F0;
          color: #2D2D2D;
          line-height: 1.7;
          -webkit-font-smoothing: antialiased;
        }

        .guide-container {
          max-width: 640px;
          margin: 0 auto;
          padding: 3rem 1.5rem 4rem;
        }

        .guide-wordmark {
          font-family: Georgia, serif;
          font-size: 1.1rem;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #B85C38;
          margin-bottom: 0.5rem;
        }

        .guide-title {
          font-size: 2rem;
          font-weight: normal;
          color: #2D2D2D;
          margin-bottom: 3rem;
          line-height: 1.3;
        }

        .guide-section {
          margin-bottom: 2.5rem;
          padding-bottom: 2.5rem;
          border-bottom: 1px solid #E8DDD4;
        }

        .guide-section:last-of-type {
          border-bottom: none;
          margin-bottom: 3rem;
        }

        .guide-section h2 {
          font-size: 1.25rem;
          font-weight: normal;
          color: #B85C38;
          margin-bottom: 1.25rem;
          letter-spacing: 0.02em;
        }

        .guide-section ul {
          list-style: none;
          padding: 0;
        }

        .guide-section li {
          position: relative;
          padding-left: 1.25rem;
          margin-bottom: 1rem;
        }

        .guide-section li:last-child {
          margin-bottom: 0;
        }

        .guide-section li::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0.6em;
          width: 6px;
          height: 6px;
          background-color: #B85C38;
          border-radius: 50%;
          opacity: 0.6;
        }

        .guide-section strong {
          font-weight: normal;
          color: #B85C38;
        }

        .guide-section p {
          margin: 0;
        }

        .guide-signoff {
          font-size: 1.35rem;
          line-height: 1.5;
          color: #B85C38;
          font-style: italic;
          text-align: center;
          padding: 1rem 0;
        }

        @media (min-width: 768px) {
          html {
            font-size: 19px;
          }

          .guide-container {
            padding: 5rem 2rem 6rem;
          }

          .guide-title {
            font-size: 2.4rem;
            margin-bottom: 4rem;
          }

          .guide-section {
            margin-bottom: 3rem;
            padding-bottom: 3rem;
          }

          .guide-signoff {
            font-size: 1.5rem;
            padding: 1.5rem 0;
          }
        }
      `}</style>

      <main className="guide-container">
        <p className="guide-wordmark">Con-Vive</p>
        <h1 className="guide-title">Guest Dinner Guide</h1>

        <section className="guide-section">
          <h2>Before You Arrive</h2>
          <ul>
            <li>Bring a bottle of wine, a finger food appetizer, or a finger food dessert (finger food to minimize dishes)</li>
            <li>Show up between 6:00pm and 6:15pm</li>
            <li>Phones stay in pockets or purses for the evening. If you need to take a call, step outside.</li>
          </ul>
        </section>

        <section className="guide-section">
          <h2>Dress Code</h2>
          <p>We don&apos;t have a strict dress code, but Con-Vive isn&apos;t a beach hang and it isn&apos;t a fancy restaurant. It&apos;s a real dinner, in someone&apos;s home, with people you haven&apos;t met. Most guests land somewhere around nice jeans and a golf shirt or sweater, a casual dress, a linen shirt. You on a good night.</p>
        </section>

        <section className="guide-section">
          <h2>Arrival & First Impressions</h2>
          <ul>
            <li>Say hi to the host, drop off what you brought, then go introduce yourself to other guests.</li>
            <li>Introduce yourself like a human, not a LinkedIn profile</li>
            <li>Seating is open, but sit next to someone you haven&apos;t talked with yet, not the person you came with</li>
          </ul>
        </section>

        <section className="guide-section">
          <h2>The Art of Conversation</h2>
          <ul>
            <li><strong>The 60-second rule</strong> — if you&apos;ve been talking for more than a minute, pause and ask someone a question. Great conversations are tennis, not golf.</li>
            <li><strong>Go deeper, not wider</strong> — lean into curiosity-driven topics (travel, passion projects, weird hobbies, food, things you&apos;re learning) rather than surface-level defaults (work complaints, real estate prices, divisive politics)</li>
            <li>If someone&apos;s been quiet, bring them into the conversation</li>
            <li><strong>Listen as much as you talk</strong> — the best guests make other people feel interesting</li>
          </ul>
        </section>

        <section className="guide-section">
          <h2>Wrapping Up & Cleanup</h2>
          <ul>
            <li>Clear your plate, rinse it, load it in the dishwasher</li>
            <li>Offer to help but read the room on when the host wants you to just relax</li>
            <li>Look for cues that the evening is winding down — don&apos;t be the last one lingering</li>
          </ul>
        </section>

        <section className="guide-section">
          <h2>After the Dinner</h2>
          <ul>
            <li>All guests will be added to a group text after the dinner to stay connected. If you&apos;d prefer not to be included, let Joe know within 24 hours of the dinner.</li>
            <li>Thank the host — a quick text the next day goes a long way</li>
            <li>Share feedback with Con-Vive on what you loved or what could be better</li>
          </ul>
        </section>

        <section className="guide-section">
          <h2>The Vibe We&apos;re Going For</h2>
          <ul>
            <li>Trust the host — they&apos;re curating the evening, so go with the flow</li>
            <li>Drink at a pace that keeps the conversation good</li>
            <li>This isn&apos;t networking and it&apos;s not a party. It&apos;s a table full of curious people sharing a meal.</li>
          </ul>
        </section>

        <p className="guide-signoff">Show up ready to be surprised by someone.</p>
      </main>
    </>
  );
}
