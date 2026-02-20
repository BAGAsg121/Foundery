
/**
 * Email Service
 * Handles creation of Nodemailer transporter using either:
 * 1. OAuth2 (Gmail) - Preferred
 * 2. SMTP (Legacy) - Fallback
 */

export const createTransporter = async () => {
    let nodemailer;
    try {
        nodemailer = (await import('nodemailer')).default;
    } catch {
        throw new Error('nodemailer package not installed. Run: npm install nodemailer');
    }

    // 1. OAuth2 Strategy (Preferred)
    if (process.env.GMAIL_CLIENT_ID && process.env.GMAIL_REFRESH_TOKEN) {
        return nodemailer.createTransport({
            service: 'gmail',
            auth: {
                type: 'OAuth2',
                user: process.env.GMAIL_USER || process.env.SMTP_USER,
                clientId: process.env.GMAIL_CLIENT_ID,
                clientSecret: process.env.GMAIL_CLIENT_SECRET,
                refreshToken: process.env.GMAIL_REFRESH_TOKEN
            }
        });
    }

    // 2. SMTP Strategy (Fallback)
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
        return nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }

    // 3. No configuration found
    throw new Error('No email configuration found. Please set GMAIL_... or SMTP_... env variables.');
};

/**
 * Send an email
 * @param {Object} mailOptions - { to, subject, text, attachments }
 */
export const sendEmail = async (mailOptions) => {
    const transporter = await createTransporter();

    // Ensure 'from' is set
    if (!mailOptions.from) {
        mailOptions.from = process.env.GMAIL_USER || process.env.SMTP_USER;
    }

    await transporter.sendMail(mailOptions);
};
