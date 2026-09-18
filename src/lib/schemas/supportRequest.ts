import { z } from 'zod';

const dataSubjectRights = ['ACCESS_EXPORT', 'RECTIFICATION', 'ERASURE', 'RESTRICTION', 'OBJECTION'] as const;

export function containsProhibitedSupportContent(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const request = value as Record<string, unknown>;
  const content = [request.title, request.description].filter((field): field is string => typeof field === 'string').join('\n');
  if (/\b(?:password|passcode|pwd)\s*[:=]/i.test(content)) return true;
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(content)) return true;
  if (/(?:\+44\s?|0)(?:\d\s?){9,10}\b/.test(content)) return true;

  return (content.match(/(?:\d[ -]?){13,19}/g) ?? []).some((candidate) => {
    const digits = candidate.replace(/\D/g, '');
    if (digits.length < 13 || digits.length > 19) return false;
    let sum = 0;
    for (let index = digits.length - 1; index >= 0; index -= 1) {
      let digit = Number(digits[index]);
      if ((digits.length - 1 - index) % 2 === 1) digit = digit > 4 ? digit * 2 - 9 : digit * 2;
      sum += digit;
    }
    return sum % 10 === 0;
  });
}

export const supportRequestSchema = z.object({
  type: z.enum(['SUPPORT', 'CHANGE', 'PAYMENT', 'DATA_PRIVACY']),
  dataSubjectRight: z.enum(dataSubjectRights).optional(),
  title: z.string().trim().min(5).max(120),
  description: z.string().trim().min(20).max(2_000),
}).superRefine((value, context) => {
  if (value.type === 'DATA_PRIVACY' && !value.dataSubjectRight) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['dataSubjectRight'], message: 'Select a data protection right' });
  }
  if (value.type !== 'DATA_PRIVACY' && value.dataSubjectRight) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['dataSubjectRight'], message: 'This is only valid for data protection requests' });
  }
  if (containsProhibitedSupportContent(value)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Remove passwords, card details, email addresses, and phone numbers before submitting' });
  }
});

export const supportRequestReviewSchema = z.object({
  action: z.enum(['triage', 'request-info', 'approve', 'reject', 'resolve']),
  note: z.string().trim().min(5).max(1_000),
  triageCategory: z.enum(['ACCESS', 'ACCOUNT', 'PAYMENT', 'TECHNICAL', 'PRIVACY', 'COMPLAINT', 'CHANGE']).optional(),
  escalationLevel: z.enum(['NONE', 'STANDARD', 'URGENT', 'OWNER']).optional(),
  resolutionEvidence: z.string().trim().min(5).max(2_000).optional(),
});