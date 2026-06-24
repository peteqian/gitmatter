import { EmailLayout, Paragraph } from "./Layout.js";

// Sign-up / email confirmation.
export function VerifyEmail({ url }: { url: string }) {
  return (
    <EmailLayout
      preview="Verify your gitmatter email"
      heading="Confirm your email"
      action={{ label: "Verify email", url }}
      footnote="If you did not create a gitmatter account, ignore this message — no account will be activated."
    >
      <Paragraph>
        Welcome to gitmatter. Confirm this address to finish setting up your account.
      </Paragraph>
    </EmailLayout>
  );
}

// Forgot-password reset.
export function ResetPasswordEmail({ url }: { url: string }) {
  return (
    <EmailLayout
      preview="Reset your gitmatter password"
      heading="Reset your password"
      action={{ label: "Reset password", url }}
      footnote="If you did not request a reset, ignore this message — your password stays unchanged."
    >
      <Paragraph>
        We received a request to reset your gitmatter password. Choose a new one using the link
        below.
      </Paragraph>
    </EmailLayout>
  );
}

// Account deletion — destructive, so the danger tone.
export function DeleteAccountEmail({ url }: { url: string }) {
  return (
    <EmailLayout
      tone="danger"
      preview="Confirm your gitmatter account deletion"
      heading="Confirm account deletion"
      action={{ label: "Delete my account", url }}
      footnote="This cannot be undone. If you did not request this, ignore this message and your account stays active."
    >
      <Paragraph>
        You asked to permanently delete your gitmatter account. Confirm with the link below to
        remove your profile, settings, and access.
      </Paragraph>
    </EmailLayout>
  );
}

// Team invite.
export function InviteEmail({ url, orgName }: { url: string; orgName?: string }) {
  const orgSuffix = orgName ? ` to ${orgName}` : "";
  return (
    <EmailLayout
      preview={`You've been invited${orgSuffix} on gitmatter`}
      heading="You've been invited"
      action={{ label: "Accept invite", url }}
      footnote="If you weren't expecting this invite, you can safely ignore it."
    >
      <Paragraph>
        You've been invited{orgSuffix} on gitmatter. Accept the invite to join the team.
      </Paragraph>
    </EmailLayout>
  );
}
