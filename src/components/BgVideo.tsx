/**
 * The สนทนาม้าซิ่ง tile background: a navy loop of the logo tiles drifting up (1920x1080, 18 s), muted and looping.
 * Every copy jumps to the same point of the loop, worked out from the clock, so a scene change (two scenes on screen
 * at once) and the other Browser Sources (#/race-now, #/lower-third) never show the tiles out of step.
 * The navy underneath shows while the video loads.
 */
import { useEffect, useRef } from "react";
import src from "../assets/bg-tile-navy-loop-up.mp4";
import { cx } from "../lib/cx";

export function BgVideo({ className }: { className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const sync = () => {
      if (!v.duration || !Number.isFinite(v.duration)) return;
      const t = (Date.now() / 1000) % v.duration;
      if (Math.abs(v.currentTime - t) > 0.15) v.currentTime = t;
    };
    v.addEventListener("loadedmetadata", sync);
    sync();
    // muted video may autoplay, but a blocked play() is not an error worth showing
    v.play()?.catch(() => {});
    return () => v.removeEventListener("loadedmetadata", sync);
  }, []);
  return (
    <div aria-hidden="true" data-testid="bg-video" className={cx("pointer-events-none absolute inset-0 overflow-hidden bg-scene", className)}>
      <video ref={ref} src={src} autoPlay muted loop playsInline preload="auto" disablePictureInPicture className="absolute inset-0 size-full object-cover" />
    </div>
  );
}
