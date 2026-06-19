import { AbsoluteFill } from "remotion";
import { theme, fonts } from "../theme";
import { Eyebrow, Rise } from "../components";

export const Title: React.FC = () => (
  <AbsoluteFill
    style={{
      backgroundColor: theme.ink,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      gap: 26,
    }}
  >
    <Rise at={4}>
      <Eyebrow>one matter, start to finish</Eyebrow>
    </Rise>
    <Rise at={16}>
      <div
        style={{ fontFamily: fonts.heading, fontSize: 92, letterSpacing: -2, color: theme.text }}
      >
        git<span style={{ color: theme.bronze }}>counsel</span>
      </div>
    </Rise>
    <Rise at={30}>
      <div
        style={{
          fontFamily: fonts.body,
          fontSize: 26,
          color: theme.muted,
          maxWidth: "30ch",
          textAlign: "center",
          lineHeight: 1.4,
        }}
      >
        Jane reviews Acme's NDAs. Every step stays on the record — provable, reversible.
      </div>
    </Rise>
  </AbsoluteFill>
);
