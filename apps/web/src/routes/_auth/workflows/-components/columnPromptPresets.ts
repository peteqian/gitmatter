import type { ColumnFormat } from "./columnFormats";

export interface ColumnPreset {
  name: string;
  matches: RegExp;
  prompt: string;
  format: ColumnFormat;
  tags?: string[];
}

export const PROMPT_PRESETS: ColumnPreset[] = [
  makePreset(
    "Parties",
    /\bpart(y|ies)\b/i,
    "bulleted_list",
    'List all parties to this agreement. For each party, state their full legal name, entity type, and defined role, e.g.:\n• ABC Corp, a Delaware corporation ("Company")\n• John Smith ("Shareholder")\nOne party per bullet. No additional commentary.'
  ),
  makePreset(
    "Governing Law",
    /\bgoverning law\b|\bjurisdiction\b/i,
    "text",
    'State only the governing law of this agreement using the short-form jurisdiction name, e.g. "New York Law", "English Law", "Indian Law", "PRC Law". No other text.'
  ),
  makePreset(
    "Effective Date",
    /\beffective date\b/i,
    "date",
    'State only the effective date of this agreement in DD Mon YYYY format, e.g. "2 Jan 2026". If not explicitly stated, write "Not specified".'
  ),
  makePreset(
    "Term",
    /\bterm\b|\bduration\b/i,
    "text",
    'State only the duration or term of this agreement in a concise form, e.g. "3 years", "24 months", "perpetual". No other text.'
  ),
  makePreset(
    "Termination",
    /\bterminat(e|ion|ing)\b/i,
    "text",
    "Extract the termination provisions. State who may terminate, the trigger events, required notice period, any cure period, and the key consequences of termination. Be concise."
  ),
  makePreset(
    "Change of Control",
    /\bchange of control\b/i,
    "text",
    "Identify any change of control provisions. Summarize the trigger events, consequences, consent requirements, and any related termination or acceleration rights. Be concise."
  ),
  makePreset(
    "Confidentiality",
    /\bconfidential(ity)?\b|\bnon-?disclosure\b/i,
    "text",
    "Summarize the confidentiality obligations: scope of confidential information, permitted disclosures, use restrictions, duration, and key carve-outs or exceptions."
  ),
  makePreset(
    "Assignment",
    /\bassign(ment|ability)?\b/i,
    "yes_no",
    "Is assignment of this agreement permitted without the other party's consent?"
  ),
  makePreset(
    "Payment & Fees",
    /\bpayment\b|\bfees?\b/i,
    "text",
    'State the key payment obligations concisely: amount, timing, and currency, e.g. "USD 10,000 payable within 30 days of invoice". Note any late payment consequences.'
  ),
  makePreset(
    "Amendment",
    /\bamendment\b|\bvariation\b/i,
    "text",
    "Summarize the amendment provisions: how amendments may be made, who must consent, and any formality requirements such as writing or signature."
  ),
  makePreset(
    "Indemnity",
    /\bindemni(ty|ties|fication)\b/i,
    "text",
    "Summarize the indemnity provisions: who indemnifies whom, the scope of indemnified losses, any liability caps or exclusions, and key claims procedures."
  ),
  makePreset(
    "Warranties",
    /\bwarrant(y|ies|ing)\b|\brepresentations?\b/i,
    "text",
    "Identify and describe key representations and warranties provided by any party, including the scope of such assurances and any specific time periods or conditions applicable to them. In particular highlight any non-standard warranties."
  ),
  makePreset(
    "Force Majeure",
    /\bforce majeure\b/i,
    "yes_no",
    "Does this agreement contain a force majeure clause?"
  ),
];

export function getPresetConfig(
  title: string
): Pick<ColumnPreset, "prompt" | "format" | "tags"> | null {
  const trimmed = title.trim();
  if (!trimmed) return null;
  const preset = PROMPT_PRESETS.find(({ matches }) => matches.test(trimmed));
  if (!preset) return null;
  return { prompt: preset.prompt, format: preset.format, tags: preset.tags };
}

function makePreset(
  name: string,
  matches: RegExp,
  format: ColumnFormat,
  prompt: string,
  tags?: string[]
): ColumnPreset {
  return { name, matches, format, prompt, tags };
}
