import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service & Privacy Policy — Con-Vive",
  description: "Terms of Service and Privacy Policy for Con-Vive dinner parties.",
};

export default function TermsAndPrivacy() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link
        href="/"
        className="body-sm mb-8 inline-block text-terracotta hover:underline"
      >
        &larr; Back to Home
      </Link>

      <h1 className="heading-1 mb-2 text-charcoal">Terms of Service & Privacy Policy</h1>
      <p className="body-base mb-8 text-warm-gray">
        Home-Hosted Dinner Parties in North County San Diego
      </p>

      <div className="prose prose-lg text-warm-gray">
        <p className="body-base mb-6">
          <strong>Effective Date:</strong> March 2026 · <strong>Last Updated:</strong> March 2026
        </p>

        {/* PART 1 */}
        <h2 className="heading-2 mb-4 mt-12 text-charcoal">PART 1: GENERAL TERMS (ALL USERS)</h2>

        <h3 className="heading-3 mb-4 mt-8 text-charcoal">1. Introduction and Acceptance</h3>
        <p className="body-base mb-6">
          Welcome to Con-Vive. These Terms of Service (&quot;Terms&quot;) constitute a legally binding
          agreement between you and Con-Vive Dinners Inc. (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;),
          operated by Joe Mazzella in Encinitas, California. By creating an account, signing up for a
          dinner, hosting a dinner, or using our website at con-vive.com (the &quot;Platform&quot;),
          you agree to be bound by these Terms.
        </p>
        <p className="body-base mb-6">
          If you do not agree to these Terms, please do not use the Platform or attend any Con-Vive
          events.
        </p>
        <p className="body-base mb-6">
          We may update these Terms from time to time. We will notify you of material changes by email
          or through the Platform. Your continued use of the Platform after any changes constitutes
          acceptance of the updated Terms.
        </p>

        <h3 className="heading-3 mb-4 mt-8 text-charcoal">2. Eligibility</h3>
        <p className="body-base mb-6">
          To use Con-Vive, you must be at least 21 years of age (to participate in events where
          alcohol is served), a resident of or visitor to the North County San Diego area (or other
          areas where Con-Vive operates), and capable of forming a legally binding agreement. All
          users must complete a welcome call with Con-Vive prior to attending their first dinner.
        </p>

        <h3 className="heading-3 mb-4 mt-8 text-charcoal">3. The Con-Vive Platform</h3>
        <p className="body-base mb-6">
          Con-Vive is a curated dinner party platform that connects guests and hosts for intimate,
          home-hosted dining experiences. We personally curate each table, matching 6–8 guests based
          on backgrounds, interests, and personalities.
        </p>
        <p className="body-base mb-6">
          Con-Vive is not a restaurant, catering service, or food establishment. Dinners take place in
          private homes. Con-Vive acts as a facilitator and curator of social dining experiences. We
          do not prepare food, control the premises where events take place, or supervise hosts during
          events.
        </p>

        <h3 className="heading-3 mb-4 mt-8 text-charcoal">4. Code of Conduct</h3>
        <p className="body-base mb-4">
          All Con-Vive participants — guests and hosts alike — agree to the following:
        </p>
        <ul className="body-base mb-6 list-disc space-y-2 pl-6">
          <li>Treat all participants with respect, courtesy, and kindness.</li>
          <li>Do not engage in harassment, discrimination, or intimidation of any kind.</li>
          <li>Respect the host&apos;s home, property, and house rules.</li>
          <li>Disclose any food allergies or dietary restrictions during the welcome call.</li>
          <li>
            Drink alcohol responsibly. Con-Vive reserves the right to remove any participant who is
            visibly intoxicated or behaving disruptively.
          </li>
          <li>
            Do not share other participants&apos; personal information (phone numbers, addresses,
            etc.) without their explicit consent.
          </li>
          <li>Do not use Con-Vive events for commercial solicitation, recruiting, or sales.</li>
        </ul>
        <p className="body-base mb-6">
          Violation of the Code of Conduct may result in immediate removal from an event and permanent
          suspension from the Platform, at Con-Vive&apos;s sole discretion and without refund.
        </p>

        <h3 className="heading-3 mb-4 mt-8 text-charcoal">5. Fees and Payments</h3>
        <p className="body-base mb-6">
          The current participation fee is $40 per person per dinner. In addition, guests are
          typically asked to bring a contribution to the meal — a bottle of wine, an appetizer, or a
          dessert. Fees are non-refundable except as described below.
        </p>

        <h4 className="heading-4 mb-3 mt-6 text-charcoal">5.1 Cancellation Policy</h4>
        <p className="body-base mb-6">
          If you cancel more than 48 hours before a scheduled dinner, you will receive a full refund
          or credit toward a future dinner. Cancellations within 48 hours of a dinner are
          non-refundable, as the host has already purchased ingredients and prepared for your
          attendance. Con-Vive may waive this policy at its discretion in cases of emergency.
        </p>

        <h4 className="heading-4 mb-3 mt-6 text-charcoal">5.2 Event Cancellation by Con-Vive</h4>
        <p className="body-base mb-6">
          We reserve the right to cancel or reschedule any dinner at any time. If Con-Vive cancels an
          event, all guests will receive a full refund or credit.
        </p>

        <h3 className="heading-3 mb-4 mt-8 text-charcoal">6. Assumption of Risk and Liability Waiver</h3>
        <p className="body-base mb-6 font-medium text-charcoal">
          BY USING THE CON-VIVE PLATFORM AND ATTENDING CON-VIVE EVENTS, YOU ACKNOWLEDGE AND AGREE TO
          THE FOLLOWING:
        </p>

        <h4 className="heading-4 mb-3 mt-6 text-charcoal">6.1 Voluntary Participation</h4>
        <p className="body-base mb-6">
          Your participation in any Con-Vive event is entirely voluntary. You understand that dining
          in a private home involves inherent risks that differ from dining at a licensed commercial
          establishment.
        </p>

        <h4 className="heading-4 mb-3 mt-6 text-charcoal">6.2 Food and Beverage Risks</h4>
        <p className="body-base mb-6">
          You acknowledge that meals are prepared in private, non-commercial kitchens by hosts who are
          not professionally licensed food handlers (unless otherwise noted). Risks include, but are
          not limited to, exposure to food allergens, foodborne illness, and cross-contamination. You
          are responsible for communicating any allergies, dietary restrictions, or medical conditions
          to Con-Vive during your welcome call and to the host upon arrival.
        </p>

        <h4 className="heading-4 mb-3 mt-6 text-charcoal">6.3 Alcohol</h4>
        <p className="body-base mb-6">
          Alcoholic beverages are typically available at Con-Vive dinners. You assume full
          responsibility for your alcohol consumption. You agree not to drive while impaired and to
          arrange safe transportation. California social host liability laws may apply to hosts who
          serve alcohol.
        </p>

        <h4 className="heading-4 mb-3 mt-6 text-charcoal">6.4 Premises</h4>
        <p className="body-base mb-6">
          Dinners take place in private residences that have not been inspected or certified by
          Con-Vive. You accept the condition of the premises as-is. Risks may include uneven surfaces,
          pets, stairs, pools, and other conditions typical of residential properties.
        </p>

        <h4 className="heading-4 mb-3 mt-6 text-charcoal">6.5 Release of Liability</h4>
        <p className="body-base mb-6 font-medium text-charcoal">
          TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, YOU HEREBY RELEASE, WAIVE, AND DISCHARGE
          CON-VIVE, ITS OWNER, OPERATORS, EMPLOYEES, AGENTS, AND AFFILIATES (COLLECTIVELY, THE
          &quot;RELEASED PARTIES&quot;) FROM ANY AND ALL CLAIMS, DEMANDS, DAMAGES, LOSSES,
          LIABILITIES, COSTS, AND EXPENSES (INCLUDING ATTORNEY&apos;S FEES) ARISING OUT OF OR RELATED
          TO YOUR PARTICIPATION IN ANY CON-VIVE EVENT, INCLUDING BUT NOT LIMITED TO CLAIMS FOR
          PERSONAL INJURY, ILLNESS, PROPERTY DAMAGE, OR DEATH.
        </p>
        <p className="body-base mb-6">
          This release does not apply to claims arising from the gross negligence or willful
          misconduct of Con-Vive.
        </p>

        <h4 className="heading-4 mb-3 mt-6 text-charcoal">6.6 Limitation of Liability</h4>
        <p className="body-base mb-6">
          In no event shall Con-Vive&apos;s total liability to you exceed the amount you paid for the
          specific dinner event giving rise to the claim.
        </p>

        <h3 className="heading-3 mb-4 mt-8 text-charcoal">7. Indemnification</h3>
        <p className="body-base mb-6">
          You agree to indemnify, defend, and hold harmless Con-Vive and the Released Parties from and
          against any claims, damages, losses, liabilities, costs, and expenses (including reasonable
          attorney&apos;s fees) arising out of or related to: your breach of these Terms, your conduct
          at any Con-Vive event, any injury or damage you cause to another person or their property,
          or any violation of applicable law.
        </p>

        <h3 className="heading-3 mb-4 mt-8 text-charcoal">8. Dispute Resolution</h3>
        <p className="body-base mb-6">
          Any dispute arising out of or relating to these Terms or your participation in Con-Vive
          events shall first be addressed through good-faith informal negotiation by contacting us at{" "}
          <a href="mailto:joe@con-vive.com" className="text-terracotta hover:underline">
            joe@con-vive.com
          </a>
          . If the dispute cannot be resolved informally within 30 days, it shall be resolved through
          binding arbitration administered in San Diego County, California, under the rules of JAMS or
          a mutually agreed-upon arbitrator. Each party shall bear its own costs and attorney&apos;s
          fees unless the arbitrator determines otherwise. You agree that any disputes will be
          resolved on an individual basis and waive any right to participate in a class action lawsuit
          or class-wide arbitration.
        </p>

        <h3 className="heading-3 mb-4 mt-8 text-charcoal">9. Intellectual Property</h3>
        <p className="body-base mb-6">
          All content on the Con-Vive website and Platform — including text, graphics, logos, images,
          and software — is the property of Con-Vive and is protected by applicable copyright and
          trademark laws. You may not reproduce, distribute, or create derivative works from our
          content without our prior written consent.
        </p>

        <h3 className="heading-3 mb-4 mt-8 text-charcoal">10. Photo and Media Release</h3>
        <p className="body-base mb-6">
          By attending a Con-Vive event, you consent to being photographed or recorded. These photos
          or recordings may be used by Con-Vive for promotional purposes on our website, social media,
          and marketing materials. If you do not wish to be photographed, please inform the host and
          Con-Vive prior to the event.
        </p>

        {/* PART 2 */}
        <h2 className="heading-2 mb-4 mt-12 text-charcoal">PART 2: ADDITIONAL TERMS FOR GUESTS</h2>

        <h3 className="heading-3 mb-4 mt-8 text-charcoal">11. Guest Responsibilities</h3>
        <p className="body-base mb-4">As a Con-Vive guest, you additionally agree to:</p>
        <ul className="body-base mb-6 list-disc space-y-2 pl-6">
          <li>Complete a welcome call with Con-Vive before your first dinner.</li>
          <li>
            Arrive on time to the scheduled dinner. If you will be late, notify Con-Vive as soon as
            possible.
          </li>
          <li>
            Bring the requested contribution (e.g., wine, appetizer, or dessert) as communicated
            before the event.
          </li>
          <li>
            Respect the host&apos;s home as you would a friend&apos;s home. Remove shoes if asked,
            follow parking instructions, and leave the space as you found it.
          </li>
          <li>
            Disclose all food allergies, dietary restrictions, and medical conditions that may affect
            your participation.
          </li>
          <li>
            Refrain from bringing uninvited guests. Con-Vive dinners are curated, and each seat is
            intentionally assigned.
          </li>
        </ul>

        <h3 className="heading-3 mb-4 mt-8 text-charcoal">12. Guest Safety</h3>
        <p className="body-base mb-6">
          You are responsible for your own safety and transportation to and from events. Con-Vive
          strongly encourages guests who consume alcohol to arrange rideshare or designated driver
          transportation. Con-Vive is not responsible for any incidents that occur during your commute
          to or from an event.
        </p>

        <h3 className="heading-3 mb-4 mt-8 text-charcoal">13. No-Show Policy</h3>
        <p className="body-base mb-6">
          If you fail to show up to a confirmed dinner without notice, you will not receive a refund.
          Repeated no-shows may result in suspension from the Platform.
        </p>

        {/* PART 3 */}
        <h2 className="heading-2 mb-4 mt-12 text-charcoal">PART 3: ADDITIONAL TERMS FOR HOSTS</h2>

        <h3 className="heading-3 mb-4 mt-8 text-charcoal">14. Becoming a Con-Vive Host</h3>
        <p className="body-base mb-4">
          Hosting a Con-Vive dinner is by invitation only. All prospective hosts must complete an
          onboarding process that includes:
        </p>
        <ul className="body-base mb-6 list-disc space-y-2 pl-6">
          <li>A welcome call and interview with Con-Vive</li>
          <li>A background check conducted by a third-party provider at Con-Vive&apos;s expense</li>
          <li>Confirmation of active homeowner&apos;s or renter&apos;s insurance</li>
        </ul>
        <p className="body-base mb-6">
          Con-Vive reserves the right to decline or revoke host status at any time, for any reason.
        </p>

        <h3 className="heading-3 mb-4 mt-8 text-charcoal">15. Host Responsibilities</h3>
        <p className="body-base mb-4">As a Con-Vive host, you agree to:</p>

        <h4 className="heading-4 mb-3 mt-6 text-charcoal">15.1 Food Safety</h4>
        <ul className="body-base mb-6 list-disc space-y-2 pl-6">
          <li>
            Prepare food using safe food-handling practices, including proper storage, cooking
            temperatures, and hygiene.
          </li>
          <li>
            Clearly communicate the full menu (including all ingredients) to Con-Vive before the event
            so guests can be informed of potential allergens.
          </li>
          <li>
            Accommodate known dietary restrictions and allergies communicated by Con-Vive for the
            guest list.
          </li>
          <li>Disclose whether any food is store-bought, catered, or homemade.</li>
        </ul>

        <h4 className="heading-4 mb-3 mt-6 text-charcoal">15.2 Alcohol Service</h4>
        <ul className="body-base mb-6 list-disc space-y-2 pl-6">
          <li>Serve alcohol responsibly. Do not serve alcohol to anyone under 21 years of age.</li>
          <li>
            Be aware of guests&apos; consumption and avoid serving visibly intoxicated individuals.
          </li>
          <li>
            Understand that under California law, social hosts may be liable for injuries caused by an
            intoxicated guest whom they served.
          </li>
        </ul>

        <h4 className="heading-4 mb-3 mt-6 text-charcoal">15.3 Premises and Environment</h4>
        <ul className="body-base mb-6 list-disc space-y-2 pl-6">
          <li>Ensure your home is clean, safe, and in reasonable condition for hosting guests.</li>
          <li>
            Disclose any known hazards on your property (e.g., pets, uneven walkways, pools, stairs)
            to Con-Vive before the event.
          </li>
          <li>
            Secure any firearms, medications, or other potentially dangerous items before guests
            arrive.
          </li>
          <li>Provide adequate lighting in entryways, walkways, and restroom areas.</li>
        </ul>

        <h4 className="heading-4 mb-3 mt-6 text-charcoal">15.4 Event Conduct</h4>
        <ul className="body-base mb-6 list-disc space-y-2 pl-6">
          <li>Be present and attentive throughout the dinner.</li>
          <li>
            Contact Con-Vive immediately if any safety concern or behavioral issue arises during an
            event.
          </li>
          <li>Do not use Con-Vive events to promote personal business, products, or services.</li>
        </ul>

        <h3 className="heading-3 mb-4 mt-8 text-charcoal">16. Host Insurance</h3>
        <p className="body-base mb-6">
          You represent and warrant that you maintain active homeowner&apos;s or renter&apos;s
          insurance that includes personal liability coverage. You acknowledge that standard
          homeowner&apos;s policies may exclude coverage for &quot;business activities&quot; in the
          home, and it is your responsibility to verify with your insurer that hosting a Con-Vive
          dinner is covered, or to obtain appropriate additional coverage (such as an endorsement or
          rider). Con-Vive may request proof of insurance at any time.
        </p>

        <h3 className="heading-3 mb-4 mt-8 text-charcoal">17. Host Indemnification</h3>
        <p className="body-base mb-6">
          As a host, you agree to indemnify, defend, and hold harmless Con-Vive and its owner,
          operators, agents, and affiliates from and against any and all claims, demands, damages,
          losses, liabilities, costs, and expenses (including reasonable attorney&apos;s fees) arising
          out of or related to: the food or beverages you serve, the condition of your premises, your
          conduct or negligence during any event, any violation of applicable food safety, health,
          alcohol, or other laws, and any injury, illness, or property damage sustained by any guest
          at your home.
        </p>

        <h3 className="heading-3 mb-4 mt-8 text-charcoal">18. Host Compensation</h3>
        <p className="body-base mb-6">
          Host compensation terms are established separately between Con-Vive and each host. Con-Vive
          may adjust compensation structures at any time. Details will be communicated to hosts
          directly.
        </p>

        <h3 className="heading-3 mb-4 mt-8 text-charcoal">19. Independent Contractor Status</h3>
        <p className="body-base mb-6">
          Hosts are independent participants and are not employees, agents, joint venturers, or
          partners of Con-Vive. Nothing in these Terms creates an employment or agency relationship.
          Hosts are responsible for their own tax reporting and compliance.
        </p>

        {/* PART 4 */}
        <h2 className="heading-2 mb-4 mt-12 text-charcoal">PART 4: PRIVACY POLICY</h2>

        <h3 className="heading-3 mb-4 mt-8 text-charcoal">20. Information We Collect</h3>
        <p className="body-base mb-4">
          When you sign up for Con-Vive, we may collect the following information:
        </p>
        <ul className="body-base mb-6 list-disc space-y-2 pl-6">
          <li>First and last name</li>
          <li>Email address</li>
          <li>Phone number</li>
          <li>Mailing address (for hosts)</li>
          <li>Dietary restrictions and food allergies</li>
          <li>
            Background check information (for hosts, processed by a third-party provider)
          </li>
          <li>
            Optional biographical and interest information you choose to share during your welcome
            call or profile
          </li>
          <li>
            Payment information (processed by our third-party payment processor; Con-Vive does not
            store credit card numbers)
          </li>
        </ul>

        <h3 className="heading-3 mb-4 mt-8 text-charcoal">21. How We Use Your Information</h3>
        <p className="body-base mb-4">We use your information to:</p>
        <ul className="body-base mb-6 list-disc space-y-2 pl-6">
          <li>Communicate with you about upcoming dinner events, invitations, and logistics</li>
          <li>
            Curate dinner tables by matching guests based on backgrounds, interests, and personalities
          </li>
          <li>
            Share limited information (such as first name, brief bio, and dietary needs) with other
            dinner guests and hosts to facilitate introductions and meal planning
          </li>
          <li>
            Coordinate dinner arrangements, including sharing your first name and dietary information
            with your assigned host
          </li>
          <li>Conduct background checks on hosts</li>
          <li>Process payments</li>
          <li>Respond to your questions and requests</li>
          <li>Improve our Platform and services</li>
        </ul>

        <h3 className="heading-3 mb-4 mt-8 text-charcoal">22. Text Messaging</h3>
        <p className="body-base mb-6">
          We may use your phone number to send you text messages about dinner events, invitations, and
          logistics. By providing your phone number and agreeing to this Privacy Policy, you consent
          to receive such messages. You may opt out of text messages at any time by replying STOP or
          contacting us directly.
        </p>
        <p className="body-base mb-6 font-medium text-charcoal">
          All the above categories exclude text messaging originator opt-in data and consent; this
          information will not be shared with any third parties.
        </p>

        <h3 className="heading-3 mb-4 mt-8 text-charcoal">23. Information Sharing</h3>
        <p className="body-base mb-4">
          We do not sell, trade, or rent your personal information to third parties. We may share
          information in the following limited circumstances:
        </p>
        <ul className="body-base mb-6 list-disc space-y-2 pl-6">
          <li>
            <strong>With other dinner guests:</strong> limited information such as your first name and
            brief bio to facilitate introductions.
          </li>
          <li>
            <strong>With hosts:</strong> your first name, dietary restrictions, and allergies so they
            can prepare appropriately.
          </li>
          <li>
            <strong>With service providers:</strong> third-party providers who assist with payment
            processing, background checks, email delivery, and other operational functions, subject to
            confidentiality obligations.
          </li>
          <li>
            <strong>As required by law:</strong> in response to legal process, court orders, or
            government requests, or to protect the rights, property, or safety of Con-Vive, our users,
            or others.
          </li>
        </ul>

        <h3 className="heading-3 mb-4 mt-8 text-charcoal">24. Data Security</h3>
        <p className="body-base mb-6">
          We take reasonable measures to protect your personal information from unauthorized access,
          use, or disclosure. However, no method of transmission over the internet or electronic
          storage is completely secure, and we cannot guarantee absolute security.
        </p>

        <h3 className="heading-3 mb-4 mt-8 text-charcoal">25. Data Retention</h3>
        <p className="body-base mb-6">
          We retain your personal information for as long as your account is active or as needed to
          provide you services. We will also retain your information as necessary to comply with legal
          obligations, resolve disputes, and enforce our agreements. You may request deletion of your
          account and personal information at any time.
        </p>

        <h3 className="heading-3 mb-4 mt-8 text-charcoal">26. Your Rights</h3>
        <p className="body-base mb-4">
          You may request to access, update, or delete your personal information at any time by
          contacting us at{" "}
          <a href="mailto:joe@con-vive.com" className="text-terracotta hover:underline">
            joe@con-vive.com
          </a>
          .
        </p>
        <p className="body-base mb-4">
          California residents may have additional rights under the California Consumer Privacy Act
          (CCPA), including:
        </p>
        <ul className="body-base mb-6 list-disc space-y-2 pl-6">
          <li>The right to know what personal information we collect</li>
          <li>The right to request deletion of personal information</li>
          <li>
            The right to opt out of the sale of personal information (note: we do not sell personal
            information)
          </li>
        </ul>

        <h3 className="heading-3 mb-4 mt-8 text-charcoal">27. Cookies and Analytics</h3>
        <p className="body-base mb-6">
          Our website may use cookies and similar tracking technologies to improve your browsing
          experience and analyze site traffic. You can manage cookie preferences through your browser
          settings.
        </p>

        <h3 className="heading-3 mb-4 mt-8 text-charcoal">28. Changes to This Privacy Policy</h3>
        <p className="body-base mb-6">
          We may update this Privacy Policy from time to time. We will notify you of any material
          changes by email or by posting the new policy on our website. Your continued use of the
          Platform after changes are posted constitutes acceptance of the updated policy.
        </p>

        {/* PART 5 */}
        <h2 className="heading-2 mb-4 mt-12 text-charcoal">PART 5: GENERAL PROVISIONS</h2>

        <h3 className="heading-3 mb-4 mt-8 text-charcoal">29. Governing Law</h3>
        <p className="body-base mb-6">
          These Terms shall be governed by and construed in accordance with the laws of the State of
          California, without regard to its conflict of law provisions. Any legal action or proceeding
          not subject to arbitration shall be brought exclusively in the state or federal courts
          located in San Diego County, California.
        </p>

        <h3 className="heading-3 mb-4 mt-8 text-charcoal">30. Severability</h3>
        <p className="body-base mb-6">
          If any provision of these Terms is found to be unenforceable or invalid, that provision
          shall be limited or eliminated to the minimum extent necessary so that these Terms shall
          otherwise remain in full force and effect.
        </p>

        <h3 className="heading-3 mb-4 mt-8 text-charcoal">31. Entire Agreement</h3>
        <p className="body-base mb-6">
          These Terms (including the Privacy Policy) constitute the entire agreement between you and
          Con-Vive regarding the use of the Platform and participation in events, and supersede all
          prior agreements and understandings.
        </p>

        <h3 className="heading-3 mb-4 mt-8 text-charcoal">32. Waiver</h3>
        <p className="body-base mb-6">
          The failure of Con-Vive to enforce any right or provision of these Terms shall not
          constitute a waiver of such right or provision. Any waiver must be in writing and signed by
          Con-Vive.
        </p>

        <h3 className="heading-3 mb-4 mt-8 text-charcoal">33. Contact Information</h3>
        <p className="body-base mb-4">
          If you have any questions about these Terms of Service or Privacy Policy, please contact us
          at:
        </p>
        <p className="body-base mb-6">
          <strong>Con-Vive Dinners Inc.</strong>
          <br />
          Encinitas, California
          <br />
          Email:{" "}
          <a href="mailto:joe@con-vive.com" className="text-terracotta hover:underline">
            joe@con-vive.com
          </a>
          <br />
          Web:{" "}
          <a
            href="https://con-vive.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-terracotta hover:underline"
          >
            con-vive.com
          </a>
          <br />
          Instagram:{" "}
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
