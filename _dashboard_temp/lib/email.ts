import { Resend } from 'resend';
import type { ReactElement } from 'react';

const apiKey = process.env.RESEND_API_KEY;
const resend = new Resend(apiKey);

interface SendEmailOptions {
  to: string;
  subject: string;
  react: ReactElement;
}

interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

export async function sendEmail({ to, subject, react }: SendEmailOptions): Promise<SendEmailResult> {
  const fromAddress = process.env.EMAIL_FROM_ADDRESS || 'joe@con-vive.com';

  // Check if API key is configured
  if (!apiKey) {
    console.error('RESEND_API_KEY is not configured');
    return { success: false, error: 'Email service not configured (missing API key)' };
  }

  console.log(`Attempting to send email to ${to} from ${fromAddress}`);

  try {
    const { data, error } = await resend.emails.send({
      from: `Joe from Con-Vive <${fromAddress}>`,
      to,
      subject,
      react,
    });

    if (error) {
      console.error('Resend API error:', JSON.stringify(error, null, 2));
      return { success: false, error: error.message };
    }

    console.log(`Email sent successfully to ${to}, id: ${data?.id}`);
    return { success: true, id: data?.id };
  } catch (err) {
    console.error('Email send exception:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error'
    };
  }
}
