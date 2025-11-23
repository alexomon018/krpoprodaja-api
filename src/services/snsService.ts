import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { env } from "../../env.ts";

// Initialize SNS client
let snsClient: SNSClient | null = null;

if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY) {
  snsClient = new SNSClient({
    region: env.AWS_REGION,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
  });
} else {
  console.warn(
    "AWS credentials not configured. SMS functionality will be disabled."
  );
}

/**
 * Generate a random 6-digit verification code
 */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send an SMS message using AWS SNS
 * @param phoneNumber - Phone number in E.164 format (e.g., +381601234567)
 * @param message - The SMS message content
 */
export async function sendSMS(
  phoneNumber: string,
  message: string
): Promise<void> {
  if (!snsClient) {
    console.error("Cannot send SMS: AWS SNS is not configured");
    throw new Error("SMS service is not configured");
  }

  try {
    const command = new PublishCommand({
      PhoneNumber: phoneNumber,
      Message: message,
      MessageAttributes: {
        "AWS.SNS.SMS.SenderID": {
          DataType: "String",
          StringValue: "KrpoProdaja",
        },
        "AWS.SNS.SMS.SMSType": {
          DataType: "String",
          StringValue: "Transactional", // Higher reliability for OTP
        },
      },
    });

    const result = await snsClient.send(command);
    console.log("SMS sent successfully", { messageId: result.MessageId });
  } catch (error) {
    console.error("Error sending SMS:", error);
    throw new Error(
      `Failed to send SMS: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Send a phone verification SMS with the verification code
 * @param phoneNumber - Phone number in E.164 format
 * @param code - 6-digit verification code
 */
export async function sendPhoneVerificationSMS(
  phoneNumber: string,
  code: string
): Promise<void> {
  const message = `Your KrpoProdaja verification code is: ${code}. This code expires in 10 minutes. Do not share this code with anyone.`;

  await sendSMS(phoneNumber, message);
}

export default {
  generateVerificationCode,
  sendSMS,
  sendPhoneVerificationSMS,
};
