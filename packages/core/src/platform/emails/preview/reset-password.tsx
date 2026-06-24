import { ResetPasswordEmail } from "../templates.js";

const SAMPLE_URL = "https://app.gitmatter.com/api/auth/reset-password?token=preview-token";

export default function ResetPasswordPreview() {
  return <ResetPasswordEmail url={SAMPLE_URL} />;
}
