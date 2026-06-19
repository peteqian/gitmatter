import "./index.css";
import { Composition } from "remotion";
import { GitcounselDemo, DEMO_FRAMES } from "./GitcounselDemo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="GitcounselDemo"
        component={GitcounselDemo}
        durationInFrames={DEMO_FRAMES}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
