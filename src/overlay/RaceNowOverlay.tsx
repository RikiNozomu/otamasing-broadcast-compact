/**
 * Its own OBS Browser Source (1920x1080, #/race-now): only the Race Now box, on a transparent page.
 * Run from the dock's overview tab through the same storage, so it syncs like #/overlay and #/lower-third.
 */
import { useEffect } from "react";
import { Stage } from "./Stage";
import { RaceNow } from "./RaceNow";

export function RaceNowOverlay() {
  useEffect(() => {
    document.body.classList.add("overflow-hidden", "bg-transparent");
    document.title = "โอตะม้าซิ่ง Broadcast Compact · Race Now";
  }, []);
  return (
    <div className="fixed inset-0 overflow-hidden" data-testid="race-now-page">
      <Stage><RaceNow /></Stage>
    </div>
  );
}
