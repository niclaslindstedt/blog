import { AUDIENCES, type Audience } from "./types.ts";
import { Tabs, type TabItem } from "./terminal/index.ts";

const TAB_ITEMS: readonly TabItem<Audience>[] = AUDIENCES.map((a) => ({ id: a, label: a }));

export function AudienceTabs({
  audience,
  closedAudiences,
  onSwitch,
  onCloseTab,
}: {
  audience: Audience;
  closedAudiences: readonly Audience[];
  onSwitch: (next: Audience) => void;
  onCloseTab: (id: Audience) => void;
}) {
  const visibleTabs = TAB_ITEMS.filter((t) => !closedAudiences.includes(t.id));

  // Wrapper carries data-no-drag so the Terminal titlebar drag handler
  // ignores clicks into the tab row. The generic Tabs component stays
  // unaware of the surrounding drag behavior.
  return (
    <div data-no-drag>
      <Tabs
        tabs={visibleTabs}
        active={audience}
        onSelect={onSwitch}
        onClose={onCloseTab}
        ariaLabel="Audience"
      />
    </div>
  );
}
