const simpleContactPatterns = [
  /(?:\+44|0044|0)\s*(?:\(?\d{2,4}\)?[\s.-]*){2,5}\d{2,4}\b/i,
  /\b[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+\b/i,
  /(?:https?:\/\/|www\.)[^\s]+/i,
  /\b(?:zoom|teams|meet|calendly)\b/i,
  /\b(?:whatsapp|telegram|signal|facebook|linkedin|instagram|google)\b/i,
  /\b(?:call|text|message|contact|email|phone)\s+(?:me|us|our|the)\b|\b(?:message|contact)\s+(?:privately|directly|offline)\b/i,
  /\b(?:company\s*(?:no|number)|crn)\s*[:#]?\s*\d{6,8}\b/i,
  /\b(?:ltd|limited|plc|llp|inc|trading\s+as)\b/i,
  /\b(?:depot|warehouse|yard|branch|industrial estate|unit\s+\d+)\b/i,
  /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/i,
];

export function getModerationMessage(fieldName: string, value?: string | null): string | null {
  if (!value || !value.trim()) return null;

  const normalized = value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+at\s+/g, '@')
    .replace(/\s+dot\s+/g, '.')
    .replace(/[\u200b-\u200d\ufeff]/g, '');

  const matches = simpleContactPatterns.filter((pattern) => pattern.test(normalized));
  if (matches.length === 0) return null;

  const fieldLabel = fieldName.toLowerCase().includes('description') ? 'project notes' : fieldName;
  return `Please remove contact details, company identifiers, or off-platform contact instructions from this ${fieldLabel}. Share project details only here.`;
}

export function stripDetectedContactDetails(value?: string | null): string {
  if (!value) return '';

  let cleaned = value;
  const patterns = [
    /(?:\+44|0044|0)\s*(?:\(?\d{2,4}\)?[\s.-]*){2,5}\d{2,4}\b/gi,
    /\b[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+\b/gi,
    /(?:https?:\/\/|www\.)[^\s]+/gi,
    /\b(?:zoom|teams|meet|calendly)\b/gi,
    /\b(?:whatsapp|telegram|signal|facebook|linkedin|instagram|google)\b/gi,
    /\b(?:call|text|message|contact|email|phone)\s+(?:me|us|our|the)\b|\b(?:message|contact)\s+(?:privately|directly|offline)\b/gi,
    /\b(?:company\s*(?:no|number)|crn)\s*[:#]?\s*\d{6,8}\b/gi,
    /\b(?:ltd|limited|plc|llp|inc|trading\s+as)\b/gi,
    /\b(?:depot|warehouse|yard|branch|industrial estate|unit\s+\d+)\b/gi,
  ];

  for (const pattern of patterns) {
    cleaned = cleaned.replace(pattern, ' ');
  }

  cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();
  return cleaned;
}

export function containsTenderContactWarning(value?: string | null): boolean {
  return getModerationMessage('description', value) !== null;
}
