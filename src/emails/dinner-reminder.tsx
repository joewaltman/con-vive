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

interface DinnerReminderEmailProps {
  guestName: string;
  dinnerDate: string;
  dinnerTime: string;
  hostName: string;
  address: string;
  googleMapsLink: string | null;
  parkingInstructions: string | null;
  whatToBring: string | null;
  bringItemAssignment: string | null;
}

export default function DinnerReminderEmail({
  guestName,
  dinnerDate,
  dinnerTime,
  hostName,
  address,
  googleMapsLink,
  parkingInstructions,
  whatToBring,
  bringItemAssignment,
}: DinnerReminderEmailProps) {
  const safeHostName = hostName || 'your host';

  return (
    <Html>
      <Head />
      <Preview>Reminder: {safeHostName}&apos;s dinner is coming up!</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>See You Soon, {guestName}!</Heading>

          <Text style={text}>
            Just a friendly reminder that {safeHostName}&apos;s Con-Vive dinner is
            coming up. Here&apos;s everything you need to know:
          </Text>

          <Section style={detailsBox}>
            <Text style={detailsHeading}>Dinner Details</Text>
            <Text style={detailsText}>
              <strong>Date:</strong> {dinnerDate}
              <br />
              <strong>Time:</strong> {dinnerTime}
              <br />
              <strong>Host:</strong> {safeHostName}
            </Text>
          </Section>

          <Section style={detailsBox}>
            <Text style={detailsHeading}>Location</Text>
            <Text style={detailsText}>
              {address}
              {googleMapsLink && (
                <>
                  <br />
                  <Link href={googleMapsLink} style={link}>
                    View on Google Maps
                  </Link>
                </>
              )}
            </Text>
            {parkingInstructions && (
              <Text style={detailsText}>
                <strong>Parking:</strong> {parkingInstructions}
              </Text>
            )}
          </Section>

          {(whatToBring || bringItemAssignment) && (
            <Section style={highlightBox}>
              <Text style={detailsHeading}>Don&apos;t Forget!</Text>
              {bringItemAssignment && (
                <Text style={highlightText}>
                  You signed up to bring: {bringItemAssignment}
                </Text>
              )}
              {whatToBring && <Text style={detailsText}>{whatToBring}</Text>}
            </Section>
          )}

          <Hr style={hr} />

          <Text style={footer}>
            Running late or have questions? Text Joe at (760) 274-8830.
          </Text>

          <Text style={footer}>
            See you there!
            <br />
            Joe & the Con-Vive Team
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

const highlightBox = {
  backgroundColor: "#fff8f5",
  border: "2px solid #c75d3a",
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

const highlightText = {
  color: "#c75d3a",
  fontSize: "16px",
  fontWeight: "600",
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
