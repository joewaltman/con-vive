import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Restaurant Dinner Guide | Con-Vive",
  description: "Everything you need to know before attending a Con-Vive restaurant dinner.",
};

export default function RestaurantGuidePage() {
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
        <h1 className="guide-title">Restaurant Dinner Guide</h1>

        <section className="guide-section">
          <h2>Before You Arrive</h2>
          <ul>
            <li>Arrive 5–10 minutes before the reservation time. Restaurants hold tables on a clock — if you&apos;re late, the table starts without you.</li>
            <li>The reservation will be under &quot;Con-Vive.&quot;</li>
            <li>Phones stay in pockets or purses for the evening. If you need to take a call, step outside.</li>
          </ul>
        </section>

        <section className="guide-section">
          <h2>Dress Code</h2>
          <p>We don&apos;t have a strict dress code, but Con-Vive isn&apos;t a beach hang. It&apos;s a real dinner, in a real restaurant, with people you haven&apos;t met. Most guests land somewhere around nice jeans and a golf shirt or sweater, a casual dress, a linen shirt. When in doubt, dress up a notch. You on a good night.</p>
        </section>

        <section className="guide-section">
          <h2>Arrival & First Impressions</h2>
          <ul>
            <li>Tell the host stand you&apos;re with the Con-Vive reservation.</li>
            <li>Introduce yourself like a human, not a LinkedIn profile.</li>
            <li>Seating is open — sit next to someone you haven&apos;t met yet, not the person you came with.</li>
          </ul>
        </section>

        <section className="guide-section">
          <h2>The Art of Conversation</h2>
          <ul>
            <li><strong>The 60-second rule</strong> — if you&apos;ve been talking for more than a minute, pause and ask someone a question. Great conversations are tennis, not golf.</li>
            <li><strong>Go deeper, not wider</strong> — lean into curiosity-driven topics (travel, passion projects, weird hobbies, food, things you&apos;re learning) rather than surface-level defaults (work complaints, real estate prices, divisive politics).</li>
            <li>If someone&apos;s been quiet, bring them into the conversation.</li>
            <li><strong>Listen as much as you talk</strong> — the best guests make other people feel interesting.</li>
            <li>Restaurant tables are long and noisy — conversations naturally split into smaller groups. Try rotating who you&apos;re talking to between courses.</li>
          </ul>
        </section>

        <section className="guide-section">
          <h2>The Bill</h2>
          <ul>
            <li>Your food is prepaid through Con-Vive, gratuity included.</li>
            <li>Drinks are on your own tab. Some restaurants will split drink checks individually; others will split evenly across the table. Go with the flow.</li>
          </ul>
        </section>

        <p className="guide-signoff">Show up ready to be surprised by someone.</p>
      </main>
    </>
  );
}
