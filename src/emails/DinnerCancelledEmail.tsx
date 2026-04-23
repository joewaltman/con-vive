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
} from '@react-email/components';
import * as React from 'react';

interface DinnerCancelledEmailProps {
  guestFirstName: string;
  dinnerDate: string; // formatted date string e.g. "Saturday, January 15th"
  refundAmountDollars: number;
}

export default function DinnerCancelledEmail({
  guestFirstName,
  dinnerDate,
  refundAmountDollars,
}: DinnerCancelledEmailProps) {
  const previewText = `Update on your Con-Vive dinner ${dinnerDate}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Dinner Update</Heading>

          <Text style={paragraph}>
            Hi {guestFirstName},
          </Text>

          <Text style={paragraph}>
            I am sorry to let you know that the Con-Vive dinner scheduled for {dinnerDate} has been cancelled.
          </Text>

          <Section style={refundBox}>
            <Text style={refundText}>
              Your payment of <strong>${refundAmountDollars}</strong> will be refunded automatically.
              Please allow 5-10 business days for the refund to appear on your statement.
            </Text>
          </Section>

          <Text style={paragraph}>
            I apologize for any inconvenience this may cause. We will reach out soon about upcoming dinners that might work for your schedule.
          </Text>

          <Text style={paragraph}>
            If you have any questions, feel free to reply to this email.
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            Warmly,
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

const refundBox = {
  backgroundColor: '#FFFFFF',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
  border: '1px solid #E5E7EB',
};

const refundText = {
  color: '#374151',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0',
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
