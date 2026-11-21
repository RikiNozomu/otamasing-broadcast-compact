/**
 * Its own OBS Browser Source (1920x1080, #/lower-third): only the runner lower third, on a transparent page.
 * Put it above the compact overlay in OBS (or alone over the live video). It is still run from the dock's
 * overview tab, through the same storage, so it syncs the same way as #/overlay.
 */
import { useEffect } from "react";
import { Stage } from "./Stage";
import { LowerThird } from "./LowerThird";

export function LowerThirdOverlay() {
  useEffect(() => {
    document.body.classList.add("overflow-hidden", "bg-transparent");
    document.title = "โอตะม้าซิ่ง Broadcast Compact · Lower third";
  }, []);
  return (
    <div className="fixed inset-0 overflow-hidden" data-testid="lower-third-page">
      <Stage><LowerThird /></Stage>
    </div>
  );
}
