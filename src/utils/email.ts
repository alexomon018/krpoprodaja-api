import { Resend } from 'resend'
import { env } from '../../env.js'

// Initialize Resend client
let resend: Resend | null = null

if (env.RESEND_API_KEY) {
  resend = new Resend(env.RESEND_API_KEY)
} else {
  console.warn(
    'RESEND_API_KEY not configured. Email functionality will be disabled.'
  )
}

export interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
}

/**
 * Send an email using Resend
 */
export async function sendEmail(options: SendEmailOptions): Promise<void> {
  if (!resend) {
    console.error('Cannot send email: Resend is not configured')
    throw new Error('Email service is not configured')
  }

  try {
    const { data, error } = await resend.emails.send({
      from: env.EMAIL_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    })

    if (error) {
      console.error('Failed to send email', error)
      throw new Error(`Failed to send email: ${error.message}`)
    }

    console.log('Email sent successfully', { emailId: data?.id })
  } catch (error) {
    console.error('Error sending email', error)
    throw error
  }
}

/**
 * Send a password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  resetToken: string
): Promise<void> {
  const resetUrl = `${env.FRONTEND_URL}/reset-password/${resetToken}`

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <!-- Header -->
                <tr>
                  <td style="padding: 40px 40px 20px 40px; text-align: center;">
                    <h1 style="margin: 0; color: #333333; font-size: 24px; font-weight: bold;">Reset Your Password</h1>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 0 40px 40px 40px;">
                    <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 24px;">
                      We received a request to reset your password for your KrpoProdaja account. Click the button below to create a new password:
                    </p>

                    <!-- Button -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 30px 0;">
                      <tr>
                        <td align="center">
                          <a href="${resetUrl}" style="display: inline-block; padding: 14px 40px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 16px; font-weight: bold;">Reset Password</a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 20px 0 0 0; color: #666666; font-size: 14px; line-height: 20px;">
                      Or copy and paste this link into your browser:
                    </p>
                    <p style="margin: 10px 0 0 0; color: #007bff; font-size: 14px; word-break: break-all;">
                      ${resetUrl}
                    </p>

                    <p style="margin: 30px 0 0 0; color: #999999; font-size: 14px; line-height: 20px;">
                      This link will expire in 1 hour for security reasons.
                    </p>

                    <p style="margin: 20px 0 0 0; color: #999999; font-size: 14px; line-height: 20px;">
                      If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 20px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px;">
                    <p style="margin: 0; color: #999999; font-size: 12px; line-height: 18px; text-align: center;">
                      This is an automated email from KrpoProdaja. Please do not reply to this email.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `

  const text = `
Reset Your Password

We received a request to reset your password for your KrpoProdaja account.

Click the link below to create a new password:
${resetUrl}

This link will expire in 1 hour for security reasons.

If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
  `

  await sendEmail({
    to: email,
    subject: 'Reset Your Password - KrpoProdaja',
    html,
    text,
  })
}

export default {
  sendEmail,
  sendPasswordResetEmail,
}
