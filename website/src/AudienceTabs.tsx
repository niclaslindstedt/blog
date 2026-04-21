import { AUDIENCES, type Audience } from "./types.ts";

export function AudienceTabs({
  audience,
  onSwitch,
}: {
  audience: Audience;
  onSwitch: (next: Audience) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Audience"
      data-no-drag
      className="flex border-b border-term-border bg-term-titlebar"
    >
      {AUDIENCES.map((a) => {
        const active = a === audience;
        return (
          <button
            key={a}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSwitch(a)}
            className={[
              "cursor-pointer select-none border-r border-term-border bg-transparent px-3 py-1.5 text-xs font-[inherit] tracking-wide",
              active
                ? "text-fg-bright underline underline-offset-4"
                : "text-dim hover:text-fg-bright",
            ].join(" ")}
          >
            {a}
          </button>
        );
      })}
    </div>
  );
}
