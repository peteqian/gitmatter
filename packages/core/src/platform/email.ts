// Provider-agnostic email transport. A real provider (Resend / SMTP / SES) is
// wired at deploy time by setting EMAIL_PROVIDER and adding a case below. Until
// then the console transport logs messages (incl. action links) so the
// verification / reset / delete / invite flows are fully testable without a
// provider.

import type { ReactElement } from "react";
import { Resend } from "resend";
import { getEnv, requireEnv } from "../core/config.js";
import { renderEmail } from "./emails/render.js";
import {
  DeleteAccountEmail,
  InviteEmail,
  ResetPasswordEmail,
  VerifyEmail,
} from "./emails/templates.js";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailTransport {
  send(msg: EmailMessage): Promise<void>;
}

class ConsoleEmailTransport implements EmailTransport {
  async send(msg: EmailMessage): Promise<void> {
    console.log(`[email] to=${msg.to} subject=${JSON.stringify(msg.subject)}\n${msg.text}`);
  }
}

// Resend transactional transport. EMAIL_FROM is the verified sender address
// (e.g. "gitmatter <no-reply@yourdomain.com>") configured in the Resend dashboard.
class ResendTransport implements EmailTransport {
  private readonly client: Resend;
  private readonly from: string;

  constructor(apiKey: string, from: string) {
    this.client = new Resend(apiKey);
    this.from = from;
  }

  async send(msg: EmailMessage): Promise<void> {
    const { error } = await this.client.emails.send({
      from: this.from,
      to: msg.to,
      subject: msg.subject,
      text: msg.text,
      ...(msg.html ? { html: msg.html } : {}),
    });
    if (error) throw new Error(`Resend send failed: ${error.message}`);
  }
}

let cached: EmailTransport | undefined;

/** The active transport. Console when EMAIL_PROVIDER is unset (dev). */
export function emailTransport(): EmailTransport {
  if (cached) return cached;
  const provider = getEnv("EMAIL_PROVIDER")?.trim();
  switch (provider) {
    case "resend":
      cached = new ResendTransport(requireEnv("RESEND_API_KEY"), requireEnv("EMAIL_FROM"));
      break;
    default:
      cached = new ConsoleEmailTransport();
  }
  return cached;
}

/** True when a real (non-console) email provider is configured. */
export function emailEnabled(): boolean {
  return Boolean(getEnv("EMAIL_PROVIDER")?.trim());
}

// Render a template and hand its html + text to the active transport.
async function sendTemplate(to: string, subject: string, element: ReactElement): Promise<void> {
  await emailTransport().send({ to, subject, ...(await renderEmail(element)) });
}

export function sendVerificationEmail(to: string, url: string): Promise<void> {
  return sendTemplate(to, "Verify your gitmatter email", VerifyEmail({ url }));
}

export function sendPasswordResetEmail(to: string, url: string): Promise<void> {
  return sendTemplate(to, "Reset your gitmatter password", ResetPasswordEmail({ url }));
}

export function sendDeleteAccountEmail(to: string, url: string): Promise<void> {
  return sendTemplate(to, "Confirm your gitmatter account deletion", DeleteAccountEmail({ url }));
}

export function sendInviteEmail(to: string, url: string, orgName?: string): Promise<void> {
  const subject = `You've been invited${orgName ? ` to ${orgName}` : ""} on gitmatter`;
  return sendTemplate(to, subject, InviteEmail({ url, orgName }));
}
