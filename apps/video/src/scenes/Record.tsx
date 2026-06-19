import { AbsoluteFill } from "remotion";
import { theme, fonts } from "../theme";
import { Eyebrow, Rise } from "../components";

// Step four — the climax and the whole point. Every action Jane's agent just
// took is now a commit you can blame: who, what, with which model.
const commits = [
  { hash: "1c88af0", msg: "open matter · Acme Corp · Delaware", who: "John", model: "—" },
  { hash: "b3d9012", msg: "add 3 NDAs to matter", who: "John", model: "—" },
  { hash: "7b0e4d1", msg: "review: clause-by-clause pass", who: "Jane", model: "gemini-2.5-pro" },
  {
    hash: "a3f19c2",
    msg: "flag: non-standard indemnity in Acme NDA #2",
    who: "Jane",
    model: "claude-opus-4-8",
  },
  {
    hash: "e51c7d4",
    msg: "ruling: reject clause · request mutual cap",
    who: "Jane",
    model: "— human",
  },
];

export const Record: React.FC = () => (
  <AbsoluteFill
    style={{ backgroundColor: theme.ink, padding: 96, flexDirection: "column", gap: 26 }}
  >
    <Rise at={4}>
      <Eyebrow>step four · the record</Eyebrow>
    </Rise>
    <Rise at={12}>
      <div style={{ fontFamily: fonts.heading, fontSize: 46, color: theme.text }}>
        Every step is on the record.
      </div>
    </Rise>
    <div style={{ display: "flex", flexDirection: "column", gap: 13, marginTop: 10 }}>
      {commits.map((c, i) => (
        <Rise key={c.hash} at={28 + i * 24}>
          <CommitRow {...c} highlight={i === commits.length - 1} />
        </Rise>
      ))}
    </div>
    <Rise at={150} style={{ marginTop: 18 }}>
      <div style={{ fontFamily: fonts.body, fontSize: 24, color: theme.muted }}>
        Blame any line — <span style={{ color: theme.text }}>who</span> changed it,{" "}
        <span style={{ color: theme.text }}>what</span> they did,{" "}
        <span style={{ color: theme.text }}>which model</span> ran it.
      </div>
    </Rise>
    <Rise at={186}>
      <div style={{ fontFamily: fonts.body, fontSize: 24, color: theme.text }}>
        Every step provable. Every step reversible.
      </div>
    </Rise>
  </AbsoluteFill>
);

const CommitRow: React.FC<{
  hash: string;
  msg: string;
  who: string;
  model: string;
  highlight: boolean;
}> = ({ hash, msg, who, model, highlight }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 20,
      backgroundColor: theme.panel,
      border: `1px solid ${highlight ? theme.text : theme.border}`,
      borderLeft: `3px solid ${theme.text}`,
      borderRadius: 8,
      padding: "16px 22px",
      fontFamily: fonts.mono,
    }}
  >
    <span style={{ color: theme.text, fontSize: 20 }}>{hash}</span>
    <span style={{ color: theme.text, fontSize: 20 }}>{msg}</span>
    <span style={{ marginLeft: "auto", color: theme.muted, fontSize: 16 }}>{who}</span>
    <span style={{ color: theme.muted, fontSize: 16 }}>{model}</span>
  </div>
);
