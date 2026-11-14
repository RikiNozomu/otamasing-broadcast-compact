/** A labelled form row of the dock (label above the input when the dock is narrower than 400px), and the shared input/select look. */
import type { ReactNode } from "react";

export const inputClass = "w-full min-w-0 border border-line bg-panel px-1.5 py-[5px] text-[13px] text-ink";

export function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_minmax(0,1fr)] items-center gap-2 text-[13px] max-[399px]:grid-cols-1 max-[399px]:gap-1">
      <label htmlFor={id}>{label}</label>
      {children}
    </div>
  );
}
