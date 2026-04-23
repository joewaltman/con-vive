import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface InviteEmailProps {
  guestFirstName: string;
  dinnerDate: string; // formatted date string e.g. "Saturday, January 15th"
  dinnerTime: string; // e.g. "6:00 PM"
  hostFirstName: string;
  menu: string;
  vibeDescriptor?: string;
  priceDollars: number;
  magicLink: string;
}

export default function InviteEmail({
  guestFirstName,
  dinnerDate,
  dinnerTime,
  hostFirstName,
  menu,
  vibeDescriptor,
  priceDollars,
  magicLink,
}: InviteEmailProps) {
  const previewText = `You're invited to a Con-Vive dinner on ${dinnerDate}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>You&apos;re Invited!</Heading>

          <Text style={paragraph}>
            Hi {guestFirstName},
          </Text>

          <Text style={paragraph}>
            We would love to have you join us for an upcoming Con-Vive dinner.
            {vibeDescriptor ? ` ${vibeDescriptor}.` : ''}
          </Text>

          <Section style={detailsBox}>
            <Text style={detailsHeading}>Dinner Details</Text>
            <Text style={detailsText}>
              <strong>When:</strong> {dinnerDate} at {dinnerTime}
            </Text>
            <Text style={detailsText}>
              <strong>Host:</strong> {hostFirstName}
            </Text>
            <Text style={detailsText}>
              <strong>Menu:</strong> {menu}
            </Text>
            <Text style={detailsText}>
              <strong>Price:</strong> ${priceDollars}
            </Text>
          </Section>

          <Text style={paragraph}>
            Spots are limited. If you would like to join, please confirm your spot below.
          </Text>

          <Section style={buttonContainer}>
            <Button style={button} href={magicLink}>
              View Invitation & Book
            </Button>
          </Section>

          <Text style={paragraph}>
            If you are unable to attend, no worries. We will reach out again for a future dinner.
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            See you at the table,
            <br />
            Joe
          </Text>

          <Text style={footerSmall}>
            Con-Vive | Dinner parties for curious people
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: '#FAF5F0',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '40px 20px',
  maxWidth: '560px',
};

const heading = {
  color: '#B85C38',
  fontSize: '28px',
  fontWeight: '600',
  textAlign: 'center' as const,
  margin: '0 0 30px',
};

const paragraph = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
};

const detailsBox = {
  backgroundColor: '#FFFFFF',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
  border: '1px solid #E5E7EB',
};

const detailsHeading = {
  color: '#B85C38',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 16px',
};

const detailsText = {
  color: '#374151',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '8px 0',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#B85C38',
  borderRadius: '8px',
  color: '#FFFFFF',
  display: 'inline-block',
  fontSize: '16px',
  fontWeight: '600',
  padding: '14px 32px',
  textDecoration: 'none',
};

const hr = {
  borderColor: '#E5E7EB',
  margin: '32px 0',
};

const footer = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
};

const footerSmall = {
  color: '#9CA3AF',
  fontSize: '13px',
  marginTop: '24px',
  textAlign: 'center' as const,
};
