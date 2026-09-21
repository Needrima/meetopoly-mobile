import { useFormik, type FormikErrors } from 'formik';
import { useRouter } from 'expo-router';

import {
  loginFormSchema,
  passwordResetConfirmFormSchema,
  passwordResetEmailFormSchema,
  passwordResetVerifyFormSchema,
  signupEmailFormSchema,
  signupPasswordFormSchema,
  signupProfileFormSchema,
  signupVerifyFormSchema,
  type LoginFormValues,
  type PasswordResetConfirmFormValues,
  type PasswordResetEmailFormValues,
  type PasswordResetVerifyFormValues,
  type SignupEmailFormValues,
  type SignupPasswordFormValues,
  type SignupProfileFormValues,
  type SignupVerifyFormValues,
} from '@/hooks/authSchemas';
import {
  useLogin,
  usePasswordResetConfirm,
  usePasswordResetEmailDraft,
  usePasswordResetStart,
  usePasswordResetVerify,
  useSignupEmailDraft,
  useSignupPassword,
  useSignupProfile,
  useSignupStart,
  useSignupVerify,
} from '@/hooks/useAuth';
import { notify } from '@/lib/notify';

function firstError<T extends object>(
  errors: FormikErrors<T>,
  submitCount: number,
): string | null {
  if (submitCount < 1) {
    return null;
  }
  for (const value of Object.values(errors)) {
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }
  return null;
}

function apiMessage(error: unknown): string | null {
  return error instanceof Error ? error.message : null;
}

const formikValidateOpts = {
  validateOnBlur: true,
  validateOnChange: true,
  validateOnMount: true,
} as const;

export type AuthFormBind<T extends object> = {
  values: T;
  setFieldValue: <K extends keyof T & string>(field: K, value: T[K]) => void;
  submit: () => void;
  error: string | null;
  isSubmitting: boolean;
  /** False when Yup invalid, loading, or mutation pending. */
  canSubmit: boolean;
};

function toBind<T extends object>(
  formik: {
    values: T;
    setFieldValue: (field: string, value: unknown, shouldValidate?: boolean) => void;
    submitForm: () => Promise<unknown>;
    errors: FormikErrors<T>;
    submitCount: number;
    isSubmitting: boolean;
    isValid: boolean;
  },
  mutationPending: boolean,
  mutationError: unknown,
): AuthFormBind<T> {
  const validationError = firstError(formik.errors, formik.submitCount);
  const busy = formik.isSubmitting || mutationPending;
  return {
    values: formik.values,
    setFieldValue: (field, value) => {
      void formik.setFieldValue(field, value, true);
    },
    submit: () => {
      void formik.submitForm();
    },
    error: validationError ?? apiMessage(mutationError),
    isSubmitting: busy,
    canSubmit: formik.isValid && !busy,
  };
}

/** Email step — Yup + useFormik; submits via signupStart mutation. */
export function useSignupEmailForm(): AuthFormBind<SignupEmailFormValues> {
  const router = useRouter();
  const mutation = useSignupStart();

  const formik = useFormik<SignupEmailFormValues>({
    initialValues: { email: '' },
    validationSchema: signupEmailFormSchema,
    ...formikValidateOpts,
    onSubmit: async (values) => {
      await mutation.mutateAsync(values.email);
      router.push('/(auth)/verify');
    },
  });

  return toBind(formik, mutation.isPending, mutation.error);
}

/** Verify step — 6-digit code. */
export function useSignupVerifyForm(): AuthFormBind<SignupVerifyFormValues> & {
  email: string;
  resend: () => Promise<void>;
  isResending: boolean;
} {
  const router = useRouter();
  const emailDraft = useSignupEmailDraft();
  const verify = useSignupVerify();
  const resendMutation = useSignupStart();
  const email = emailDraft.data ?? '';

  const formik = useFormik<SignupVerifyFormValues>({
    initialValues: { code: '' },
    validationSchema: signupVerifyFormSchema,
    ...formikValidateOpts,
    onSubmit: async (values) => {
      if (!email) {
        router.replace('/(auth)/email');
        return;
      }
      await verify.mutateAsync({ email, code: values.code });
      router.push('/(auth)/password');
    },
  });

  return {
    ...toBind(formik, verify.isPending, verify.error),
    email,
    isResending: resendMutation.isPending,
    resend: async () => {
      if (!email) {
        return;
      }
      await resendMutation.mutateAsync(email);
    },
  };
}

/** Password + confirm. */
export function useSignupPasswordForm(): AuthFormBind<SignupPasswordFormValues> {
  const router = useRouter();
  const mutation = useSignupPassword();

  const formik = useFormik<SignupPasswordFormValues>({
    initialValues: { password: '', confirm: '' },
    validationSchema: signupPasswordFormSchema,
    ...formikValidateOpts,
    onSubmit: async (values) => {
      await mutation.mutateAsync(values.password);
      router.push('/(auth)/profile');
    },
  });

  return toBind(formik, mutation.isPending, mutation.error);
}

/** Username + country. */
export function useSignupProfileForm(): AuthFormBind<SignupProfileFormValues> {
  const router = useRouter();
  const mutation = useSignupProfile();

  const formik = useFormik<SignupProfileFormValues>({
    initialValues: { username: '', country: '' },
    validationSchema: signupProfileFormSchema,
    ...formikValidateOpts,
    onSubmit: async (values) => {
      await mutation.mutateAsync({
        username: values.username,
        country: values.country,
      });
      router.replace('/(app)');
    },
  });

  return toBind(formik, mutation.isPending, mutation.error);
}

/** Login. */
export function useLoginForm(): AuthFormBind<LoginFormValues> {
  const router = useRouter();
  const mutation = useLogin();

  const formik = useFormik<LoginFormValues>({
    initialValues: { email: '', password: '' },
    validationSchema: loginFormSchema,
    ...formikValidateOpts,
    onSubmit: async (values) => {
      const res = await mutation.mutateAsync({
        email: values.email,
        password: values.password,
      });
      if (res.needsProfile) {
        notify({
          type: 'info',
          title: 'Finish your profile',
          message: 'Pick a username and country to enter Meetopoly.',
        });
        router.replace('/(auth)/profile');
        return;
      }
      router.replace('/(app)');
    },
  });

  return toBind(formik, mutation.isPending, mutation.error);
}

/** Password reset — email step. */
export function usePasswordResetEmailForm(): AuthFormBind<PasswordResetEmailFormValues> {
  const router = useRouter();
  const mutation = usePasswordResetStart();

  const formik = useFormik<PasswordResetEmailFormValues>({
    initialValues: { email: '' },
    validationSchema: passwordResetEmailFormSchema,
    ...formikValidateOpts,
    onSubmit: async (values) => {
      const res = await mutation.mutateAsync(values.email);
      if (!res.sent) {
        notify({
          type: 'error',
          title: 'Email not found',
          message: 'Email not found or has not completed onbaording.',
        });
        return;
      }
      router.push('/(auth)/forgot-verify');
    },
  });

  return toBind(formik, mutation.isPending, mutation.error);
}

/** Password reset — OTP step. */
export function usePasswordResetVerifyForm(): AuthFormBind<PasswordResetVerifyFormValues> & {
  email: string;
  resend: () => Promise<void>;
  isResending: boolean;
} {
  const router = useRouter();
  const emailDraft = usePasswordResetEmailDraft();
  const verify = usePasswordResetVerify();
  const resendMutation = usePasswordResetStart();
  const email = emailDraft.data ?? '';

  const formik = useFormik<PasswordResetVerifyFormValues>({
    initialValues: { code: '' },
    validationSchema: passwordResetVerifyFormSchema,
    ...formikValidateOpts,
    onSubmit: async (values) => {
      if (!email) {
        router.replace('/(auth)/forgot');
        return;
      }
      await verify.mutateAsync({ email, code: values.code });
      router.push('/(auth)/forgot-password');
    },
  });

  return {
    ...toBind(formik, verify.isPending, verify.error),
    email,
    isResending: resendMutation.isPending,
    resend: async () => {
      if (!email) {
        return;
      }
      const res = await resendMutation.mutateAsync(email);
      if (res.sent) {
        notify({ type: 'success', title: 'Code sent', message: 'Check your email for a new code.' });
      }
    },
  };
}

/** Password reset — new password + confirm. */
export function usePasswordResetConfirmForm(): AuthFormBind<PasswordResetConfirmFormValues> {
  const router = useRouter();
  const mutation = usePasswordResetConfirm();

  const formik = useFormik<PasswordResetConfirmFormValues>({
    initialValues: { password: '', confirm: '' },
    validationSchema: passwordResetConfirmFormSchema,
    ...formikValidateOpts,
    onSubmit: async (values) => {
      await mutation.mutateAsync(values.password);
      notify({
        type: 'success',
        title: 'Password updated',
        message: 'Sign in with your new password.',
      });
      router.replace('/(auth)/login');
    },
  });

  return toBind(formik, mutation.isPending, mutation.error);
}
