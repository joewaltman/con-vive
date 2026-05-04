import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface HostGuestConfirmedEmailProps {
  hostName: string;
  guestName: string;
  guestEmail: string;
  dinnerDate: string;
  dinnerTime: string;
  confirmedCount: number;
  totalSeats: number;
}

export default function HostGuestConfirmedEmail({
  hostName,
  guestName,
  guestEmail,
  dinnerDate,
  dinnerTime,
  confirmedCount,
  totalSeats,
}: HostGuestConfirmedEmailProps) {
  const safeHostName = hostName || 'Host';

  return (
    <Html>
      <Head />
      <Preview>{guestName} confirmed for your dinner on {dinnerDate}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>New Guest Confirmed!</Heading>

          <Text style={text}>
            Hi {safeHostName},
          </Text>

          <Text style={text}>
            Great news! <strong>{guestName}</strong> has confirmed their spot for your
            Con-Vive dinner.
          </Text>

          <Section style={detailsBox}>
            <Text style={detailsHeading}>Guest Info</Text>
            <Text style={detailsText}>
              <strong>Name:</strong> {guestName}
              <br />
              <strong>Email:</strong> {guestEmail}
            </Text>
          </Section>

          <Section style={detailsBox}>
            <Text style={detailsHeading}>Dinner Status</Text>
            <Text style={detailsText}>
              <strong>Date:</strong> {dinnerDate} at {dinnerTime}
              <br />
              <strong>Confirmed:</strong> {confirmedCount} of {totalSeats} seats filled
            </Text>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            Thanks for hosting!
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
