'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { CATEGORY_NAMES } from '@/lib/categories';
import { TenderOpportunityCard, type OpportunityCardData } from '@/components/retailer/TenderOpportunityCard';

const URGENCY_OPTIONS = ['standard', 'urgent', 'flexible'] as const;
const SAVED_SEARCHES_KEY = 'tradeTender.retailer.savedSearches.v1';

type SavedSearch = {
  name: string;
  search: string;
  categories: string[];
  urgencies: string[];
};

function loadSavedSearches(): SavedSearch[] {
  try {
    const raw = window.localStorage.getItem(SAVED_SEARCHES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function OpportunitiesExplorer({ opportunities }: { opportunities: OpportunityCardData[] }) {
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [urgencies, setUrgencies] = useState<string[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [savedSearchName, setSavedSearchName] = useState('');

  useEffect(() => {
    setSavedSearches(loadSavedSearches());
  }, []);

  function toggle(list: string[], setList: (value: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  }

  function saveCurrentSearch() {
    const name = savedSearchName.trim();
    if (!name) return;
    const next = [...savedSearches.filter((item) => item.name !== name), { name, search, categories, urgencies }];
    setSavedSearches(next);
    window.localStorage.setItem(SAVED_SEARCHES_KEY, JSON.stringify(next));
    setSavedSearchName('');
  }

  function applySavedSearch(saved: SavedSearch) {
    setSearch(saved.search);
    setCategories(saved.categories);
    setUrgencies(saved.urgencies);
  }

  function removeSavedSearch(name: string) {
    const next = savedSearches.filter((item) => item.name !== name);
    setSavedSearches(next);
    window.localStorage.setItem(SAVED_SEARCHES_KEY, JSON.stringify(next));
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return opportunities.filter((item) => {
      if (term && !item.location.toLowerCase().includes(term) && !item.reference.toLowerCase().includes(term)) {
        return false;
      }
      if (categories.length > 0 && !categories.includes(item.category)) return false;
      if (urgencies.length > 0 && !urgencies.includes(item.urgency)) return false;
      return true;
    });
  }, [opportunities, search, categories, urgencies]);

  const newCount = opportunities.filter((item) => item.isNew).length;

  return (
    <div>
      <Card className="mb-6 flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Search by location or tender ID"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="max-w-xs"
          />
          {newCount > 0 && (
            <span className="text-sm font-semibold text-safety-amber">{newCount} new since you last checked</span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {CATEGORY_NAMES.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => toggle(categories, setCategories, category)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                categories.includes(category)
                  ? 'border-safety-amber bg-safety-amber/10 text-foundation-navy'
                  : 'border-slate-300 text-concrete-grey hover:border-steel-blue hover:text-foundation-navy'
              }`}
            >
              {category}
            </button>
          ))}
          {URGENCY_OPTIONS.map((urgency) => (
            <button
              key={urgency}
              type="button"
              onClick={() => toggle(urgencies, setUrgencies, urgency)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                urgencies.includes(urgency)
                  ? 'border-steel-blue bg-steel-blue/10 text-foundation-navy'
                  : 'border-slate-300 text-concrete-grey hover:border-steel-blue hover:text-foundation-navy'
              }`}
            >
              {urgency}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
          <Input
            placeholder="Name this search…"
            value={savedSearchName}
            onChange={(event) => setSavedSearchName(event.target.value)}
            className="max-w-[12rem]"
          />
          <Button variant="secondary" onClick={saveCurrentSearch} className="h-9 px-4 text-sm">
            Save search
          </Button>
          {savedSearches.map((saved) => (
            <span
              key={saved.name}
              className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-foundation-navy"
            >
              <button type="button" onClick={() => applySavedSearch(saved)} className="hover:underline">
                {saved.name}
              </button>
              <button
                type="button"
                aria-label={`Remove saved search ${saved.name}`}
                onClick={() => removeSavedSearch(saved.name)}
                className="text-concrete-grey hover:text-attention"
              >
                &#10005;
              </button>
            </span>
          ))}
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card className="py-16 text-center text-sm text-concrete-grey">
          No matching tenders. Try a different search or filter.
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((item) => (
            <TenderOpportunityCard key={item.tenderId} data={item} href={`/retailer/tenders/${item.tenderId}`} />
          ))}
        </div>
      )}
    </div>
  );
}
