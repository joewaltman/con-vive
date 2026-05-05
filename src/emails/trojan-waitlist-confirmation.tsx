import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
} from "@react-email/components";

interface TrojanWaitlistConfirmationEmailProps {
  guestName: string;
  dinnerDate: string;
}

export default function TrojanWaitlistConfirmationEmail({
  guestName,
  dinnerDate,
}: TrojanWaitlistConfirmationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>You&apos;re on the waitlist for the Trojan Alumni dinner</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={coBrand}>
            San Diego Trojan Network x Con-Vive
          </Text>

          <Heading style={h1}>You&apos;re on the Waitlist</Heading>

          <Text style={text}>
            Hi {guestName},
          </Text>

          <Text style={text}>
            Thanks for your interest in the Trojan Alumni dinner on {dinnerDate}.
            The dinner is currently full, but we&apos;ve added you to the waitlist.
          </Text>

          <Text style={text}>
            If a spot opens up, we&apos;ll reach out right away. In the meantime,
            you&apos;re on our list for future Con-Vive dinners in San Diego. We
            host intimate gatherings regularly and would love to have you at one.
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            Questions? Just reply to this email or text me at (760) 274-8830.
          </Text>

          <Text style={footer}>
            Fight On!
            <br />
            Joe
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

const coBrand = {
  color: "#c75d3a",
  fontSize: "12px",
  fontWeight: "600",
  textTransform: "uppercase" as const,
  letterSpacing: "1px",
  textAlign: "center" as const,
  margin: "0 0 20px",
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
