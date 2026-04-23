import { Resend } from "resend";
import { ReactElement } from "react";

let resendInstance: Resend | null = null;

function getResend(): Resend {
  if (!resendInstance) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not set");
    }
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }
  return resendInstance;
}

const FROM_EMAIL = "Joe from Con-Vive <joe@con-vive.com>";

interface SendEmailOptions {
  to: string;
  subject: string;
  react: ReactElement;
  replyTo?: string;
}

interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

export async function sendEmail({
  to,
  subject,
  react,
  replyTo = "joe@con-vive.com",
}: SendEmailOptions): Promise<SendEmailResult> {
  try {
    const resend = getResend();
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      react,
      replyTo,
    });

    if (error) {
      console.error("Resend API error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err) {
    console.error("Failed to send email:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
