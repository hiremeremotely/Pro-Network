import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

type EmailEnvironment = {
  NODE_ENV?: string;
  DEMO_MODE?: string;
  PUBLIC_APP_URL?: string;
  SES_FROM_EMAIL?: string;
  AWS_REGION?: string;
};

export function isDemoAuthEmail(env: EmailEnvironment = process.env): boolean {
  return env.NODE_ENV !== "production" && env.DEMO_MODE === "true";
}

export function authEmailConfigured(env: EmailEnvironment = process.env): boolean {
  if (isDemoAuthEmail(env)) return true;
  if (!env.SES_FROM_EMAIL?.trim() || !env.PUBLIC_APP_URL) return false;
  try {
    const url = new URL(env.PUBLIC_APP_URL);
    return url.protocol === "https:" && !url.username && !url.password && !url.search && !url.hash;
  } catch {
    return false;
  }
}

export function authenticationLink(base: string, kind: "verify-email" | "reset-password", token: string): string {
  const url = new URL(kind, base.endsWith("/") ? base : `${base}/`);
  url.searchParams.set("token", token);
  return url.href;
}

// Uses the ECS task role; no AWS access keys or Clerk credentials in app code.
let client: SESv2Client | undefined;
export async function sendAuthenticationEmail(
  recipient: string,
  token: string,
  kind: "verify-email" | "reset-password",
): Promise<void> {
  if (isDemoAuthEmail()) return;
  if (!authEmailConfigured()) throw new Error("Authentication email delivery is not configured");
  client ??= new SESv2Client({ region: process.env.AWS_REGION ?? "us-east-1" });
  const link = authenticationLink(process.env.PUBLIC_APP_URL!, kind, token);
  const isVerification = kind === "verify-email";
  await client.send(new SendEmailCommand({
    FromEmailAddress: process.env.SES_FROM_EMAIL,
    Destination: { ToAddresses: [recipient] },
    Content: {
      Simple: {
        Subject: { Data: isVerification ? "Verify your Hire Me Remotely email" : "Reset your Hire Me Remotely password", Charset: "UTF-8" },
        Body: {
          Text: {
            Charset: "UTF-8",
            Data: `${isVerification ? "Verify your email to activate your account" : "Set a new password for your account"}:\n\n${link}\n\nThis link expires in ${isVerification ? "24 hours" : "1 hour"}. If you did not request this, ignore this email.`,
          },
        },
      },
    },
  }));
}