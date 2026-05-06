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

interface BookingConfirmationEmailProps {
  guestName: string;
  dinnerDate: string;
  dinnerTime: string;
  hostName: string;
  address: string;
  googleMapsLink: string | null;
  parkingInstructions: string | null;
  whatToBring: string | null;
  bringItemAssignment: string | null;
  bringItemsUrl: string | null;
  googleCalendarUrl: string;
  outlookCalendarUrl: string;
  icsDownloadUrl: string;
  venueType?: string;
  restaurantName?: string | null;
  menu?: string | null;
  isCouple?: boolean;
  companionName?: string;
}

export default function BookingConfirmationEmail({
  guestName,
  dinnerDate,
  dinnerTime,
  hostName,
  address,
  googleMapsLink,
  parkingInstructions,
  whatToBring,
  bringItemAssignment,
  bringItemsUrl,
  googleCalendarUrl,
  outlookCalendarUrl,
  icsDownloadUrl,
  venueType = 'home',
  restaurantName,
  menu,
  isCouple = false,
  companionName,
}: BookingConfirmationEmailProps) {
  const safeHostName = hostName || 'your host';
  const isRestaurant = venueType === 'restaurant';
  const venueName = isRestaurant ? restaurantName : safeHostName;

  // Determine the headline based on couple booking status
  const headline = isCouple && companionName
    ? `You're In, ${guestName}!` // Primary with named companion
    : `You're In, ${guestName}!`;

  // Confirmation message varies based on whether this is for primary or companion
  const confirmationMessage = isCouple
    ? companionName
      ? `Your spot and ${companionName}'s at ${isRestaurant ? `the Con-Vive dinner at ${restaurantName}` : `${safeHostName}'s Con-Vive dinner`} is confirmed. We can't wait to see you both there.`
      : `You're confirmed as ${companionName}'s +1 at ${isRestaurant ? `the Con-Vive dinner at ${restaurantName}` : `${safeHostName}'s Con-Vive dinner`}. We can't wait to see you there.`
    : isRestaurant
      ? `Your spot at the Con-Vive dinner at ${restaurantName} is confirmed. We can't wait to see you there.`
      : `Your spot at ${safeHostName}'s Con-Vive dinner is confirmed. We can't wait to see you there.`;

  // Preview text for email client
  const previewText = isCouple
    ? companionName
      ? `You and ${companionName} are confirmed!`
      : `You're confirmed as a +1!`
    : isRestaurant
      ? `Your spot at ${restaurantName} is confirmed!`
      : `Your spot at ${safeHostName}'s dinner is confirmed!`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{headline}</Heading>

          <Text style={text}>{confirmationMessage}</Text>

          <Section style={detailsBox}>
            <Text style={detailsHeading}>Dinner Details</Text>
            <Text style={detailsText}>
              <strong>Date:</strong> {dinnerDate}
              <br />
              <strong>Time:</strong> {dinnerTime}
              {isRestaurant ? (
                <>
                  <br />
                  <strong>Restaurant:</strong> {restaurantName}
                </>
              ) : (
                <>
                  <br />
                  <strong>Host:</strong> {safeHostName}
                </>
              )}
            </Text>
          </Section>

          {/* Menu section for restaurant dinners */}
          {isRestaurant && menu && (
            <Section style={detailsBox}>
              <Text style={detailsHeading}>Menu</Text>
              <Text style={detailsText}>
                {menu.split('\n').map((line, i, arr) => (
                  <span key={i}>
                    {line}
                    {i < arr.length - 1 && <br />}
                  </span>
                ))}
              </Text>
            </Section>
          )}

          {/* Location section - only for home dinners */}
          {!isRestaurant && (
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
          )}

          {!isRestaurant && (
            <Section style={detailsBox}>
              <Text style={detailsHeading}>What to Bring</Text>
              {bringItemAssignment && (
                <Text style={highlightText}>
                  You signed up to bring: {bringItemAssignment}
                </Text>
              )}
              {whatToBring && <Text style={detailsText}>{whatToBring}</Text>}
              {bringItemsUrl && (
                <Text style={detailsText}>
                  <Link href={bringItemsUrl} style={link}>
                    Sign up to bring something
                  </Link>
                </Text>
              )}
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
            See you soon!
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
