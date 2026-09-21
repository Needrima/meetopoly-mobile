import * as Yup from 'yup';

/** Shared Yup schemas for Meetopoly auth forms (aligned with backend rules). */

export const emailSchema = Yup.string()
  .trim()
  .email('Enter a valid email address')
  .required('Email is required');

export const verificationCodeSchema = Yup.string()
  .trim()
  .matches(/^[0-9]{6}$/, 'Enter the 6-digit code')
  .required('Verification code is required');

export const passwordSchema = Yup.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .matches(/[A-Za-z]/, 'Password must include a letter')
  .matches(/[0-9]/, 'Password must include a digit')
  .required('Password is required');

export const usernameSchema = Yup.string()
  .trim()
  .matches(/^[A-Za-z0-9_]{3,20}$/, 'Username must be 3–20 characters: letters, digits, underscore')
  .required('Username is required');

export const countrySchema = Yup.string()
  .trim()
  .uppercase()
  .matches(/^[A-Z]{2}$/, 'Country must be a 2-letter ISO code (e.g. NG)')
  .required('Country is required');

export const signupEmailFormSchema = Yup.object({
  email: emailSchema,
});

export const signupVerifyFormSchema = Yup.object({
  code: verificationCodeSchema,
});

export const signupPasswordFormSchema = Yup.object({
  password: passwordSchema,
  confirm: Yup.string()
    .oneOf([Yup.ref('password')], 'Passwords do not match')
    .required('Confirm your password'),
});

export const signupProfileFormSchema = Yup.object({
  username: usernameSchema,
  country: countrySchema,
});

export const loginFormSchema = Yup.object({
  email: emailSchema,
  password: Yup.string().required('Password is required'),
});

export const passwordResetEmailFormSchema = Yup.object({
  email: emailSchema,
});

export const passwordResetVerifyFormSchema = Yup.object({
  code: verificationCodeSchema,
});

export const passwordResetConfirmFormSchema = signupPasswordFormSchema;

export type SignupEmailFormValues = Yup.InferType<typeof signupEmailFormSchema>;
export type SignupVerifyFormValues = Yup.InferType<typeof signupVerifyFormSchema>;
export type SignupPasswordFormValues = Yup.InferType<typeof signupPasswordFormSchema>;
export type SignupProfileFormValues = Yup.InferType<typeof signupProfileFormSchema>;
export type LoginFormValues = Yup.InferType<typeof loginFormSchema>;
export type PasswordResetEmailFormValues = Yup.InferType<typeof passwordResetEmailFormSchema>;
export type PasswordResetVerifyFormValues = Yup.InferType<typeof passwordResetVerifyFormSchema>;
export type PasswordResetConfirmFormValues = Yup.InferType<typeof passwordResetConfirmFormSchema>;
