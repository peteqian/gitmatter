import { DeleteAccountEmail } from "../templates.js";

const SAMPLE_URL = "https://app.gitmatter.com/api/auth/delete-user/callback?token=preview-token";

export default function DeleteAccountPreview() {
  return <DeleteAccountEmail url={SAMPLE_URL} />;
}
