import emailjs, { send, init } from '@emailjs/browser';

export interface SendDermaVisionEmailParams {
  toEmail: string;
  name?: string;
  notificationTitle: string;
  message: string;
  appointmentDate?: string;
  appointmentTime?: string;
  doctorName?: string;
  conditionName?: string;
  confidence?: number | string;
  riskLevel?: string;
  scanDate?: string;
}

export interface SendDermaVisionEmailResult {
  success: boolean;
  recipientEmail: string;
  status?: string;
  error?: string;
}

// Read EmailJS credentials from Vite environment variables (11:25 PM State: service_20rx1d8, template_mx4zoze, xhkqRY1oAMS-7kYwe)
const metaEnv = (import.meta as any).env || {};
const SERVICE_ID = metaEnv.VITE_EMAILJS_SERVICE_ID || 'service_20rx1d8';
const TEMPLATE_ID = metaEnv.VITE_EMAILJS_TEMPLATE_ID || 'template_mx4zoze';
const PUBLIC_KEY = metaEnv.VITE_EMAILJS_PUBLIC_KEY || 'xhkqRY1oAMS-7kYwe';

let isInitialized = false;

export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return 'un***@invalid';
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local.slice(0, 3)}***@${domain}`;
}

export function initEmailJS(): void {
  if (!isInitialized && PUBLIC_KEY) {
    try {
      if (typeof init === 'function') {
        init({ publicKey: PUBLIC_KEY });
      } else if (emailjs && typeof emailjs.init === 'function') {
        emailjs.init({ publicKey: PUBLIC_KEY });
      }
      isInitialized = true;
    } catch (e) {
      console.warn('[EMAILJS NOTICE] Initialization warning:', e);
    }
  }
}

/**
 * Core EmailJS dispatch helper using official @emailjs/browser v4 SDK.
 * Restored 11:25 PM state with template_mx4zoze.
 * NON-BLOCKING: Fails gracefully without breaking database operations or crashing the app.
 */
export async function sendDermaVisionEmail({
  toEmail,
  name,
  notificationTitle,
  message,
  appointmentDate,
  appointmentTime,
  doctorName,
  conditionName,
  confidence,
  riskLevel,
  scanDate
}: SendDermaVisionEmailParams): Promise<SendDermaVisionEmailResult> {
  const hasUserEmail = Boolean(toEmail && typeof toEmail === 'string' && toEmail.includes('@') && toEmail.trim().length >= 5);
  const recipientEmail = hasUserEmail ? toEmail.trim() : '';

  if (!hasUserEmail) {
    console.warn('[EMAILJS SKIPPED] Recipient email unavailable or invalid:', toEmail);
    return {
      success: false,
      recipientEmail: toEmail || '',
      error: 'Missing or invalid recipient email address'
    };
  }

  const recipientName = name || 'DermaVision Patient';
  const title = notificationTitle || 'Notification';

  try {
    initEmailJS();

    const templateParams = {
      to_email: recipientEmail,
      user_email: recipientEmail,
      recipient_email: recipientEmail,
      email: recipientEmail,
      
      to_name: recipientName,
      user_name: recipientName,
      name: recipientName,
      from_name: 'DermaVision AI',

      notification_title: title,
      subject: title,
      message: message,

      appointment_date: appointmentDate || '',
      appointment_time: appointmentTime || '',
      doctor_name: doctorName || 'Dr. Sarah Smith, MD',
      condition_name: conditionName || '',
      condition: conditionName || '',
      confidence: confidence ? String(confidence) : '',
      risk_level: riskLevel || '',
      scan_date: scanDate || new Date().toLocaleDateString()
    };

    console.log(`[EMAILJS DISPATCH] Service '${SERVICE_ID}' | Template '${TEMPLATE_ID}' | Recipient '${maskEmail(recipientEmail)}' | Event: '${title}'`);

    const sendFn = typeof send === 'function' ? send : (emailjs && emailjs.send ? emailjs.send : null);
    if (!sendFn) {
      throw new Error('EmailJS send function is unavailable');
    }

    const response = await sendFn(
      SERVICE_ID,
      TEMPLATE_ID,
      templateParams,
      { publicKey: PUBLIC_KEY }
    );

    console.log(`[EMAILJS SUCCESS] Delivered '${title}' to '${maskEmail(recipientEmail)}' | Status: ${response.status} ${response.text}`);
    return {
      success: response.status === 200,
      recipientEmail,
      status: response.text
    };
  } catch (error: any) {
    const errorMsg = error?.text || error?.message || String(error);
    console.error(`[EMAILJS ERROR] Delivery to '${maskEmail(recipientEmail)}' failed:`, errorMsg);

    return {
      success: false,
      recipientEmail,
      error: errorMsg
    };
  }
}
