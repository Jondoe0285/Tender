export const ATTACHMENT_KINDS = ['DRAWING', 'SPECIFICATION', 'RAMS', 'METHOD_STATEMENT', 'INSURANCE', 'OTHER'] as const;
export type AttachmentKind = (typeof ATTACHMENT_KINDS)[number];

export const ATTACHMENT_KIND_LABELS: Record<AttachmentKind, string> = {
  DRAWING: 'Drawing',
  SPECIFICATION: 'Specification',
  RAMS: 'RAMS',
  METHOD_STATEMENT: 'Method statement',
  INSURANCE: 'Insurance',
  OTHER: 'Other',
};

export function isAttachmentKind(value: string): value is AttachmentKind {
  return (ATTACHMENT_KINDS as readonly string[]).includes(value);
}
