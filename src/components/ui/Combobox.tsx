'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { fieldControlClasses } from '@/components/ui/Field';

export type ComboboxGroup = { label: string; options: string[] };

type ComboboxProps = {
  id: string;
  name: string;
  groups: ComboboxGroup[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
};

/** Accessible searchable/type-ahead select, grouped by category, with a hidden input for form submission. */
export function Combobox({ id, name, groups, value, onChange, placeholder, disabled, required }: ComboboxProps) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery(value);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [value]);

  const filteredGroups = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return groups;
    return groups
      .map((group) => ({
        label: group.label,
        options: group.options.filter((option) => option.toLowerCase().includes(term)),
      }))
      .filter((group) => group.options.length > 0);
  }, [groups, query]);

  const flatOptions = useMemo(() => filteredGroups.flatMap((group) => group.options), [filteredGroups]);

  function selectOption(option: string) {
    onChange(option);
    setQuery(option);
    setOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.min(index + 1, flatOptions.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter') {
      if (open && activeIndex >= 0 && flatOptions[activeIndex]) {
        event.preventDefault();
        selectOption(flatOptions[activeIndex]);
      }
    } else if (event.key === 'Escape') {
      setOpen(false);
      setQuery(value);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" name={name} value={value} required={required} />
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        aria-autocomplete="list"
        autoComplete="off"
        disabled={disabled}
        placeholder={placeholder}
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onKeyDown={handleKeyDown}
        className={fieldControlClasses}
      />
      {open && !disabled && (
        <ul
          id={`${id}-listbox`}
          role="listbox"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-soft-lg"
        >
          {flatOptions.length === 0 ? (
            <li className="px-4 py-2 text-sm text-concrete-grey">No matches found</li>
          ) : (
            filteredGroups.map((group) => (
              <li key={group.label}>
                <p className="px-4 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-concrete-grey">
                  {group.label}
                </p>
                <ul>
                  {group.options.map((option) => {
                    const flatIndex = flatOptions.indexOf(option);
                    return (
                      <li key={option}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={value === option}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => selectOption(option)}
                          className={`block w-full px-4 py-2 text-left text-sm hover:bg-safety-amber/10 ${
                            flatIndex === activeIndex ? 'bg-safety-amber/10' : ''
                          } ${value === option ? 'font-semibold text-foundation-navy' : 'text-foundation-navy/90'}`}
                        >
                          {option}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
