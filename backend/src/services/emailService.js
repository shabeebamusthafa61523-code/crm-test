import nodemailer from 'nodemailer';

/**
 * Configure Nodemailer Transporter using environment variables
 */
const getTransporter = () => {
  if (
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  ) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: Number(process.env.SMTP_PORT) === 465, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  return null;
};

/**
 * Sends an email, optionally attaching files.
 * @param {Object} options - Email sending options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - Email body (HTML)
 * @param {Array<Object>} [options.attachments] - Optional attachments [{ filename: 'slip.pdf', content: Buffer }]
 */
export const sendMailWithAttachments = async ({ to, subject, html, attachments = [] }) => {
  const transporter = getTransporter();
  
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || `"KOD.brand Admin" <${process.env.SMTP_USER}>`,
        to,
        subject,
        html,
        attachments
      });
      console.log(`[SMTP Mail Service] Email successfully sent to: ${to} | MsgID: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error(`[SMTP Mail Service] Error sending mail to ${to}:`, error.message);
      throw error;
    }
  } else {
    // Fallback Mock Log
    console.log(`==================================================`);
    console.log(`📬 [MOCK EMAIL DISPATCH] (SMTP credentials missing)`);
    console.log(`  To: ${to}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Attachments count: ${attachments.length}`);
    attachments.forEach(att => console.log(`  - Attachment: ${att.filename} (${att.content.length} bytes)`));
    console.log(`==================================================`);
    return { success: true, mock: true };
  }
};

const emailService = {
  sendMailWithAttachments
};

export default emailService;
