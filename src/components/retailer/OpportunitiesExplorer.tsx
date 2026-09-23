'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { CATEGORY_NAMES } from '@/lib/categories';
import { catalogServiceNames, type CategoryCatalog } from '@/lib/catalog';
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
  const [serviceNames, setServiceNames] = useState<string[]>(CATEGORY_NAMES);

  useEffect(() => {
    setSavedSearches(loadSavedSearches());
    fetch('/api/categories')
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { catalog?: CategoryCatalog } | null) => {
        if (data?.catalog) setServiceNames(catalogServiceNames(data.catalog));
      })
      .catch(() => undefined);
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
    return opportunities
      .filter((item) => {
        if (term && !item.location.toLowerCase().includes(term) && !item.reference.toLowerCase().includes(term)) {
          return false;
        }
        if (categories.length > 0 && !categories.includes(item.category)) return false;
        if (urgencies.length > 0 && !urgencies.includes(item.urgency)) return false;
        return true;
      })
      // Prioritise strong matches (category + location match), followed by category matches,
      // then unread items, and finally closing date.
      .sort((a, b) => {
        if (a.strongMatch !== b.strongMatch) return Number(b.strongMatch) - Number(a.strongMatch);
        if ((a.categoryMatch ?? false) !== (b.categoryMatch ?? false)) return Number(b.categoryMatch) - Number(a.categoryMatch);
        if (a.isNew !== b.isNew) return Number(b.isNew) - Number(a.isNew);
        return new Date(a.closingDate).getTime() - new Date(b.closingDate).getTime();
      });
  }, [opportunities, search, categories, urgencies]);

  const newCount = opportunities.filter((item) => item.isNew).length;

  return (
    <div>
      <Card className="mb-6 flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex min-w-0 flex-col gap-2">
            <label htmlFor="opportunity-search" className="text-sm font-semibold text-foundation-navy">Search tenders</label>
            <Input
              id="opportunity-search"
              placeholder="Search by location or tender ID"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="max-w-xs"
            />
          </div>
          {newCount > 0 && (
            <span className="text-sm font-semibold text-safety-amber">{newCount} new since you last checked</span>
          )}
        </div>

        <fieldset className="min-w-0">
          <legend className="mb-2 text-sm font-semibold text-foundation-navy">Filters</legend>
          <div className="flex flex-wrap gap-2">
          {serviceNames.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => toggle(categories, setCategories, category)}
              aria-pressed={categories.includes(category)}
              aria-label={`${categories.includes(category) ? 'Remove' : 'Add'} ${category} filter`}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                categories.includes(category)
                  ? 'border-trade-blue bg-trade-blue/10 text-foundation-navy'
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
              aria-pressed={urgencies.includes(urgency)}
              aria-label={`${urgencies.includes(urgency) ? 'Remove' : 'Add'} ${urgency} urgency filter`}
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
        </fieldset>

        <div className="flex flex-wrap items-end gap-2 border-t border-slate-100 pt-4">
          <div className="flex min-w-0 flex-col gap-2">
            <label htmlFor="saved-search-name" className="text-sm font-semibold text-foundation-navy">Saved search name</label>
            <Input
              id="saved-search-name"
              placeholder="Name this search…"
              value={savedSearchName}
              onChange={(event) => setSavedSearchName(event.target.value)}
              className="max-w-[12rem]"
            />
          </div>
          <Button variant="secondary" onClick={saveCurrentSearch} className="h-11 px-4 text-sm">
            Save search
          </Button>
          {savedSearches.map((saved) => (
            <span
              key={saved.name}
              className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-foundation-navy"
            >
              <button type="button" onClick={() => applySavedSearch(saved)} className="min-h-11 hover:underline" aria-label={`Apply saved search ${saved.name}`}>
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
          <p role="status">No matching tenders. Try a different search or filter.</p>
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
