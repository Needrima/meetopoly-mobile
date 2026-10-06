import { useFormik } from 'formik';
import { router } from 'expo-router';

import { ApiError } from '@/api/client';
import { joinTableByCode } from '@/api/generated/endpoints';
import {
  inviteCodeFormSchema,
  normalizeInviteCodeInput,
  type InviteCodeFormValues,
} from '@/hooks/inviteCodeSchema';

function joinCodeErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.code) {
      case 'not_found':
        return 'Invite code not found or lobby expired';
      case 'table_full':
        return 'That lobby is full';
      case 'wrong_status':
        return 'That lobby has already started';
      case 'invalid_invite_code':
        return 'Invite code is invalid';
      default:
        return err.message || 'Could not join lobby';
    }
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return 'Could not join lobby';
}

/**
 * Phase 20.5 — Formik + Yup join-by-code; seats via POST /tables/join-code then lobby.
 */
export function useJoinByInviteCode() {
  const formik = useFormik<InviteCodeFormValues>({
    initialValues: { inviteCode: '' },
    validationSchema: inviteCodeFormSchema,
    validateOnChange: false,
    validateOnBlur: false,
    onSubmit: async (values, helpers) => {
      helpers.setStatus(undefined);
      const code = normalizeInviteCodeInput(values.inviteCode);
      if (!code) {
        helpers.setFieldError(
          'inviteCode',
          'Enter an 8-character invite code (letters and digits; no I, L, O, or U)',
        );
        return;
      }

      try {
        const table = await joinTableByCode({ inviteCode: code });
        const worldId =
          typeof table.worldId === 'string' ? table.worldId.trim() : '';
        if (!worldId) {
          throw new Error('Lobby is missing a World');
        }
        router.push({
          pathname: '/(app)/lobby/[worldId]',
          params: {
            worldId,
            mode: 'code',
            inviteCode: code,
          },
        });
      } catch (err) {
        helpers.setStatus(joinCodeErrorMessage(err));
      }
    },
  });

  return {
    values: formik.values,
    setInviteCode: (value: string) => {
      void formik.setFieldValue('inviteCode', value, false);
      if (formik.status) {
        formik.setStatus(undefined);
      }
      if (formik.errors.inviteCode) {
        void formik.setFieldError('inviteCode', undefined);
      }
    },
    submit: () => {
      void formik.submitForm();
    },
    error: (formik.status as string | undefined) ?? formik.errors.inviteCode ?? null,
    loading: formik.isSubmitting,
  } as const;
}
