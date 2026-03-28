import { useState, useRef, useEffect } from "react";
import { Command } from "cmdk";

interface Option {
  value: string;
  label: string;
  gruppe?: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Bitte wählen...",
  searchPlaceholder = "Suchen...",
  emptyText = "Keine Ergebnisse.",
  className = "",
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  // Composite key: "kassenart_id::Label" to uniquely identify each option
  const selectedOption = options.find((o) => `${o.value}::${o.label}` === value);
  const displayLabel = selectedOption?.label;

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Group options
  const grouped: Record<string, Option[]> = {};
  for (const opt of options) {
    const g = opt.gruppe || "";
    if (!grouped[g]) grouped[g] = [];
    grouped[g].push(opt);
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => { setOpen(!open); setSearch(""); }}
        className="w-full py-3 px-4 rounded-xl border-2 border-border bg-input-background text-left focus:border-accent focus:outline-none flex items-center justify-between"
      >
        <span className={displayLabel ? "text-foreground" : "text-muted-foreground"}>
          {displayLabel || placeholder}
        </span>
        <svg className="w-4 h-4 text-muted-foreground shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={open ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-card border-2 border-border rounded-xl shadow-lg overflow-hidden">
          <Command shouldFilter={true}>
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder={searchPlaceholder}
              className="w-full px-4 py-3 border-b border-border bg-input-background text-foreground text-sm focus:outline-none"
              autoFocus
            />
            <Command.List className="max-h-60 overflow-y-auto">
              <Command.Empty className="px-4 py-3 text-sm text-muted-foreground">
                {emptyText}
              </Command.Empty>
              {Object.entries(grouped).map(([gruppe, opts]) => (
                <Command.Group
                  key={gruppe}
                  heading={gruppe}
                  className="[&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide"
                >
                  {opts.map((opt, i) => {
                    const optKey = `${opt.value}::${opt.label}`;
                    return (
                      <Command.Item
                        key={`${opt.value}-${i}`}
                        value={opt.label}
                        onSelect={() => {
                          onChange(optKey);
                          setOpen(false);
                        }}
                        className="px-4 py-2.5 text-sm text-foreground cursor-pointer hover:bg-accent/10 data-[selected=true]:bg-accent/10 flex items-center justify-between"
                      >
                        {opt.label}
                        {value === optKey && (
                          <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </Command.Item>
                    );
                  })}
                </Command.Group>
              ))}
            </Command.List>
          </Command>
        </div>
      )}
    </div>
  );
}
