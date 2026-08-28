'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Textarea } from '@/components/ui/Field';

type Category = { id: string | null; service: string; name: string; items: string[]; active: boolean };

export function CategoryEditor() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const response = await fetch('/api/super-user/categories');
    if (!response.ok) { setMessage('Unable to load categories.'); setLoading(false); return; }
    const data = await response.json() as { categories: Category[] };
    setCategories(data.categories);
    setDrafts(Object.fromEntries(data.categories.map((category) => [keyFor(category), category.items.join('\n')])));
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function save(category: Category) {
    setSaving(keyFor(category));
    setMessage(null);
    const items = (drafts[keyFor(category)] ?? '').split('\n').map((item) => item.trim()).filter(Boolean);
    const response = await fetch('/api/super-user/categories', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ service: category.service, name: category.name, items, active: category.active }) });
    setSaving(null);
    if (!response.ok) { setMessage((await response.json().catch(() => null))?.error ?? 'Unable to save category.'); return; }
    setCategories((current) => current.map((item) => keyFor(item) === keyFor(category) ? { ...item, items } : item));
    setMessage(`${category.name} saved.`);
  }

  async function toggle(category: Category) {
    setSaving(keyFor(category));
    setMessage(null);
    const items = (drafts[keyFor(category)] ?? '').split('\n').map((item) => item.trim()).filter(Boolean);
    const response = await fetch('/api/super-user/categories', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ service: category.service, name: category.name, items, active: !category.active }) });
    setSaving(null);
    if (!response.ok) { setMessage((await response.json().catch(() => null))?.error ?? 'Unable to update category.'); return; }
    setCategories((current) => current.map((item) => keyFor(item) === keyFor(category) ? { ...item, active: !item.active } : item));
    setMessage(`${category.name} ${category.active ? 'deactivated' : 'activated'}.`);
  }

  if (loading) return <p className="text-sm text-concrete-grey">Loading categories...</p>;
  return <div className="space-y-6">{message && <p role="status" className="rounded-lg border border-steel-blue/20 bg-steel-blue/5 px-4 py-3 text-sm font-semibold text-steel-blue">{message}</p>}{categories.map((category) => <Card key={keyFor(category)}><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-steel-blue">{category.service}</p><h2 className="font-heading text-lg font-bold text-foundation-navy">{category.name}</h2></div><Button variant={category.active ? 'danger' : 'secondary'} onClick={() => toggle(category)} loading={saving === keyFor(category)}>{category.active ? 'Deactivate' : 'Activate'}</Button></div><label className="mt-4 block text-sm font-semibold text-foundation-navy" htmlFor={`items-${keyFor(category)}`}>Items, one per line</label><Textarea id={`items-${keyFor(category)}`} rows={Math.min(10, Math.max(3, (drafts[keyFor(category)] ?? '').split('\n').length))} value={drafts[keyFor(category)] ?? ''} onChange={(event) => setDrafts({ ...drafts, [keyFor(category)]: event.target.value })} /><Button className="mt-3" onClick={() => save(category)} loading={saving === keyFor(category)}>Save category</Button></Card>)}</div>;
}

function keyFor(category: Category): string { return `${category.service}:${category.name}`; }
