import * as Yup from 'yup';

/** Crockford Base32 without I/L/O/U — matches backend `normalizeInviteCode`. */
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/**
 * Strip spaces/hyphens and uppercase. Empty string if not exactly 8 Crockford chars.
 */
export function normalizeInviteCodeInput(raw: string): string {
  const s = raw.replace(/[\s-]/g, '').toUpperCase();
  if (s.length !== 8) {
    return '';
  }
  for (const ch of s) {
    if (!CROCKFORD.includes(ch)) {
      return '';
    }
  }
  return s;
}

export const inviteCodeFormSchema = Yup.object({
  inviteCode: Yup.string()
    .transform((v) => (typeof v === 'string' ? v.replace(/[\s-]/g, '').toUpperCase() : v))
    .matches(
      /^[0-9A-HJKMNPQRSTVWXYZ]{8}$/,
      'Enter an 8-character invite code (letters and digits; no I, L, O, or U)',
    )
    .required('Invite code is required'),
});

export type InviteCodeFormValues = Yup.InferType<typeof inviteCodeFormSchema>;
