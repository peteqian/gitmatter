// Section label — a quiet uppercase kicker in the Harvey/Legora register.
// Premium and restrained, not a terminal prompt.
export default function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-medium tracking-[0.2em] text-bronze uppercase">{children}</span>
  );
}
