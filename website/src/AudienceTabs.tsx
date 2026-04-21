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
      className="flex bg-term-titlebar font-ui text-[13px]"
    >
      {AUDIENCES.map((a, i) => {
        const active = a === audience;
        return (
          <button
            key={a}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSwitch(a)}
            className={[
              "cursor-pointer select-none border-b px-4 py-1.5 tracking-wide",
              i > 0 ? "border-l border-l-term-border" : "",
              active
                ? "border-b-term-bg bg-term-bg text-fg-bright"
                : "border-b-term-border bg-term-titlebar text-dim hover:text-fg-bright",
            ].join(" ")}
          >
            {a}
          </button>
        );
      })}
      <div className="flex-1 border-b border-term-border" aria-hidden="true" />
    </div>
  );
}
