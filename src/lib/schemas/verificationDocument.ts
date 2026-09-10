import { z } from 'zod';
import { verifyTenderAttachment, MAX_TENDER_ATTACHMENT_BYTES } from '@/lib/attachment-utils';
import { VERIFICATION_DOCUMENT_TYPES } from '@/lib/verification-documents';

const documentTypeSchema = z.enum(VERIFICATION_DOCUMENT_TYPES.map((doc) => doc.type) as [string, ...string[]]);

export const uploadVerificationDocumentSchema = z.object({
  documentType: documentTypeSchema,
  name: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(128),
  sizeBytes: z.number().int().nonnegative(),
  dataBase64: z.string().min(1).max(Math.ceil(MAX_TENDER_ATTACHMENT_BYTES * 4 / 3) + 4),
  expiryDate: z.coerce.date().refine((value) => value.getTime() > Date.now(), 'Expiry date must be in the future'),
}).transform((document, context) => {
  try {
    return { ...document, ...verifyTenderAttachment(document) };
  } catch (error) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: error instanceof Error ? error.message : 'Document is invalid',
      path: ['dataBase64'],
    });
    return z.NEVER;
  }
});

export type UploadVerificationDocumentInput = z.infer<typeof uploadVerificationDocumentSchema>;
