import Hero from "@/marketing/components/Hero";
import Manifesto from "@/marketing/components/Manifesto";
import AuditSpine from "@/marketing/components/AuditSpine";
import BothDirections from "@/marketing/components/BothDirections";
import SelfHost from "@/marketing/components/SelfHost";
import CTASection from "@/marketing/components/CTASection";

// Cloud-only marketing landing. Bundled solely when DEPLOYMENT=cloud (see
// routes/(marketing)/). Calm editorial flow — one artifact, generous space.
export default function Home() {
  return (
    <div className="flex flex-col">
      <Hero />
      <Manifesto />
      <AuditSpine />
      <BothDirections />
      <SelfHost />
      <CTASection />
    </div>
  );
}
