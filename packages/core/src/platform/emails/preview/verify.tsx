// Preview entry for `email dev` / `email export`. Default-exports the template
// with sample props so the React Email dev server can render it.
import { VerifyEmail } from "../templates.js";

const SAMPLE_URL = "https://app.gitmatter.com/api/auth/verify-email?token=preview-token";

export default function VerifyPreview() {
  return <VerifyEmail url={SAMPLE_URL} />;
}
