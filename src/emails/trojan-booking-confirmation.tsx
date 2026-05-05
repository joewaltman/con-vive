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

interface TrojanBookingConfirmationEmailProps {
  guestName: string;
  dinnerDate: string;
  dinnerTime: string;
  address: string;
  googleMapsLink: string | null;
  parkingInstructions: string | null;
  menu: string | null;
  bringItemAssignment: string | null;
  googleCalendarUrl: string;
  outlookCalendarUrl: string;
  icsDownloadUrl: string;
}

export default function TrojanBookingConfirmationEmail({
  guestName,
  dinnerDate,
  dinnerTime,
  address,
  googleMapsLink,
  parkingInstructions,
  menu,
  bringItemAssignment,
  googleCalendarUrl,
  outlookCalendarUrl,
  icsDownloadUrl,
}: TrojanBookingConfirmationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your spot at the Trojan Alumni dinner is confirmed!</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={coBrand}>
            San Diego Trojan Network x Con-Vive
          </Text>

          <Heading style={h1}>You&apos;re In, {guestName}!</Heading>

          <Text style={text}>
            Your spot at the Trojan Alumni dinner is confirmed. We can&apos;t wait
            to see you there.
          </Text>

          <Section style={detailsBox}>
            <Text style={detailsHeading}>Dinner Details</Text>
            <Text style={detailsText}>
              <strong>Date:</strong> {dinnerDate}
              <br />
              <strong>Time:</strong> {dinnerTime}
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

          {menu && (
            <Section style={detailsBox}>
              <Text style={detailsHeading}>Menu</Text>
              <Text style={detailsText}>{menu}</Text>
            </Section>
          )}

          {bringItemAssignment && (
            <Section style={detailsBox}>
              <Text style={detailsHeading}>What to Bring</Text>
              <Text style={highlightText}>
                You signed up to bring: {bringItemAssignment}
              </Text>
            </Section>
          )}

          <Section style={calendarSection}>
            <Text style={detailsHeading}>Add to Calendar</Text>
            <Text style={detailsText}>
              <Link href={googleCalendarUrl} style={link}>
                Google Calendar
              </Link>
              {" | "}
              <Link href={outlookCalendarUrl} style={link}>
                Outlook
              </Link>
              {" | "}
              <Link href={icsDownloadUrl} style={link}>
                Download .ics
              </Link>
            </Text>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            Questions? Just reply to this email or text Joe at (760) 274-8830.
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

const highlightText = {
  color: "#c75d3a",
  fontSize: "16px",
  fontWeight: "600",
  margin: "0 0 8px",
};

const calendarSection = {
  backgroundColor: "#ffffff",
  borderRadius: "8px",
  padding: "20px",
  marginBottom: "16px",
  textAlign: "center" as const,
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
