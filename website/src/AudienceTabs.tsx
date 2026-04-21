import { AUDIENCES, type Audience } from "./types.ts";
import { Tabs, type TabItem } from "./Tabs.tsx";

const TAB_ITEMS: readonly TabItem<Audience>[] = AUDIENCES.map((a) => ({ id: a, label: a }));

export function AudienceTabs({
  audience,
  onSwitch,
}: {
  audience: Audience;
  onSwitch: (next: Audience) => void;
}) {
  // "Close" in a fixed two-audience model means focusing the other view —
  // matches iTerm2's close-current → next-tab-takes-focus semantics.
  const handleClose = (id: Audience) => {
    const other = AUDIENCES.find((a) => a !== id);
    if (other) onSwitch(other);
  };

  // Wrapper carries data-no-drag so the Terminal titlebar drag handler
  // ignores clicks into the tab row. The generic Tabs component stays
  // unaware of the surrounding drag behavior.
  return (
    <div data-no-drag>
      <Tabs
        tabs={TAB_ITEMS}
        active={audience}
        onSelect={onSwitch}
        onClose={handleClose}
        ariaLabel="Audience"
      />
    </div>
  );
}
