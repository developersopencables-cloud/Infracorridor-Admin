import { Resend } from 'resend';

interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

// Initialize Resend client
const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new Resend(apiKey);
};

const resend = getResendClient();

/**
 * Retry configuration for production email sending
 */
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000; // 1 second base delay

/**
 * Sleep utility for retry delays
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));


export async function sendEmail({ to, subject, text, html }: SendEmailOptions): Promise<void> {

  if (process.env.NODE_ENV === 'development' && !resend) {
    console.warn('[Email Service] Resend API key not configured. Email sending skipped in development.');
    return;
  }


  if (!resend) {
    throw new Error(
      'RESEND_API_KEY is not configured. Please add it to your environment variables.\n' +
      'Get your API key from: https://resend.com/api-keys'
    );
  }

  const emailFrom = process.env.EMAIL_FROM;
  if (!emailFrom) {
    throw new Error(
      'EMAIL_FROM is not configured. Please add it to your environment variables.\n' +
      'For production, use a verified domain email (e.g., noreply@yourdomain.com)'
    );
  }

  let lastError: Error | null = null;


  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await resend.emails.send({
        from: emailFrom,
        to,
        subject,
        html: html || text,
      });

      if (result.error) {
        const errorDetails = result.error as { message?: string; name?: string };
        const errorMessage = errorDetails.message || errorDetails.name || 'Unknown email service error';
        lastError = new Error(`Email service error: ${errorMessage}`);

        if (errorMessage.includes('invalid') || errorMessage.includes('forbidden')) {
          throw lastError;
        }

        if (attempt < MAX_RETRIES) {
          const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1); // Exponential backoff
          console.warn(`[Email Service] Attempt ${attempt} failed, retrying in ${delay}ms...`, errorMessage);
          await sleep(delay);
          continue;
        }

        throw lastError;
      }


      if (process.env.NODE_ENV === 'production') {
        console.log(`[Email Service] Email sent successfully to ${to}`);
      }

      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(`Failed to send email: ${String(error)}`);


      if (attempt === MAX_RETRIES) {
        console.error(`[Email Service] Failed to send email after ${MAX_RETRIES} attempts:`, {
          to,
          subject,
          error: lastError.message,
        });
        throw lastError;
      }


      const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
      console.warn(`[Email Service] Attempt ${attempt} failed, retrying in ${delay}ms...`, lastError.message);
      await sleep(delay);
    }
  }

  throw lastError || new Error('Failed to send email: Unknown error');
}