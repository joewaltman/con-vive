import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface PostDinnerEmailProps {
  guestName: string;
  hostName: string;
  dinnerDate: string;
}

export default function PostDinnerEmail({
  guestName,
  hostName,
  dinnerDate,
}: PostDinnerEmailProps) {
  const safeHostName = hostName || 'your host';

  return (
    <Html>
      <Head />
      <Preview>Thanks for joining {safeHostName}&apos;s dinner!</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Thanks for Coming, {guestName}!</Heading>

          <Text style={text}>
            We hope you had a wonderful time at {safeHostName}&apos;s dinner on{" "}
            {dinnerDate}. Sharing meals with new people is what Con-Vive is all
            about.
          </Text>

          <Section style={detailsBox}>
            <Text style={detailsHeading}>Stay Connected</Text>
            <Text style={detailsText}>
              Made some new friends? We hope so! Con-Vive dinners are all about
              building community one meal at a time.
            </Text>
          </Section>

          <Section style={detailsBox}>
            <Text style={detailsHeading}>Join Another Dinner</Text>
            <Text style={detailsText}>
              We&apos;ll let you know when new dinners are available in your
              area. Keep an eye on your inbox!
            </Text>
          </Section>

          <Section style={feedbackBox}>
            <Text style={detailsHeading}>We&apos;d Love Your Feedback</Text>
            <Text style={detailsText}>
              How was your experience? Just reply to this email and let us know
              what you thought. Your feedback helps us make Con-Vive even
              better.
            </Text>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            Until next time!
            <br />
            Joe & the Con-Vive Team
          </Text>

          <Text style={footerSmall}>
            Questions? Text Joe at{" "}
            <Link href="sms:+17602748830" style={link}>
              (760) 274-8830
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f6f4f0",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

const container = {
  margin: "0 auto",
  padding: "40px 20px",
  maxWidth: "560px",
};

const h1 = {
  color: "#2d2d2d",
  fontSize: "28px",
  fontWeight: "600",
  lineHeight: "1.3",
  margin: "0 0 20px",
};

const text = {
  color: "#6b6b6b",
  fontSize: "16px",
  lineHeight: "1.6",
  margin: "0 0 20px",
};

const detailsBox = {
  backgroundColor: "#ffffff",
  borderRadius: "8px",
  padding: "20px",
  marginBottom: "16px",
};

const feedbackBox = {
  backgroundColor: "#fff8f5",
  borderRadius: "8px",
  padding: "20px",
  marginBottom: "16px",
};

const detailsHeading = {
  color: "#2d2d2d",
  fontSize: "14px",
  fontWeight: "600",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 12px",
};

const detailsText = {
  color: "#2d2d2d",
  fontSize: "16px",
  lineHeight: "1.6",
  margin: "0 0 8px",
};

const link = {
  color: "#c75d3a",
  textDecoration: "underline",
};

const hr = {
  borderColor: "#ddd",
  margin: "30px 0",
};

const footer = {
  color: "#6b6b6b",
  fontSize: "14px",
  lineHeight: "1.6",
  margin: "0 0 16px",
};

const footerSmall = {
  color: "#999999",
  fontSize: "12px",
  lineHeight: "1.6",
  margin: "0",
};
