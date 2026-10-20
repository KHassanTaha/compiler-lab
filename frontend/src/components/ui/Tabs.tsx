interface Tab {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
}

/** Animated-underline tabs. */
export function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div role="tablist" className="flex gap-1 border-b border-brand-border">
      {tabs.map((tab) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.id)}
            className={`relative px-4 py-2 text-sm font-medium transition-colors ${
              selected ? "text-brand-gold-600" : "text-brand-brown-500 hover:text-brand-brown-700"
            }`}
          >
            {tab.label}
            {selected && (
              <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-brand-gold-500" />
            )}
          </button>
        );
      })}
    </div>
  );
}
