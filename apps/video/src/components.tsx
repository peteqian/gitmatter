import { interpolate, useCurrentFrame } from "remotion";
import { theme, fonts } from "./theme";

// Fade + slight rise, driven by the local sequence frame. `at` is the frame the
// element should be fully settled by; everything eases in over `dur` frames.
export const Rise: React.FC<{
  at: number;
  dur?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ at, dur = 16, children, style }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [at, at + dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const y = interpolate(frame, [at, at + dur], [14, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return <div style={{ opacity: o, transform: `translateY(${y}px)`, ...style }}>{children}</div>;
};

// Small uppercase mono eyebrow, same role as the marketing <Eyebrow>.
export const Eyebrow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      fontFamily: fonts.mono,
      fontSize: 18,
      letterSpacing: 4,
      textTransform: "uppercase",
      color: theme.bronze,
    }}
  >
    {children}
  </div>
);

// Reveals `text` character by character. Starts at `start`, types `cps` chars
// per frame. A blinking caret rides the leading edge while typing.
export const Typed: React.FC<{
  text: string;
  start: number;
  cps?: number;
  style?: React.CSSProperties;
}> = ({ text, start, cps = 0.9, style }) => {
  const frame = useCurrentFrame();
  const shown = Math.max(0, Math.min(text.length, Math.floor((frame - start) * cps)));
  const typing = shown > 0 && shown < text.length;
  const caretOn = Math.floor(frame / 8) % 2 === 0;
  return (
    <span style={style}>
      {text.slice(0, shown)}
      {(typing || (shown === 0 && frame >= start)) && caretOn ? (
        <span style={{ color: theme.bronze }}>▍</span>
      ) : null}
    </span>
  );
};
