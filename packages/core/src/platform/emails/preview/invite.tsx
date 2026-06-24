import { InviteEmail } from "../templates.js";

const SAMPLE_URL = "https://app.gitmatter.com/signup?email=invitee%40example.com";

export default function InvitePreview() {
  return <InviteEmail url={SAMPLE_URL} orgName="Acme Legal" />;
}
