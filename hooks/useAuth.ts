import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/api/client";
import { queryKeys } from "@/api/queryKeys";
import {
  getMe,
  login,
  logout,
  passwordResetConfirm,
  passwordResetStart,
  passwordResetVerify,
  signupCompleteProfile,
  signupSetPassword,
  signupStart,
  signupStatus,
  signupVerify,
} from "@/api/services";
import {
  clearSignupDraft,
  getSecureItem,
  setSecureItem,
  clearResetDraft,
} from "@/api/sessionStore";
import type {
  AuthSessionResponse,
  LoginRequest,
  LoginResponse,
  PasswordResetStartResponse,
  PasswordResetVerifyResponse,
  SignupProfileRequest,
  SignupStatusResponse,
  SignupVerifyResponse,
  UserProfile,
} from "@/api/types";
import { useSession } from "@/hooks/useSession";
import { formatUsername } from "@/lib/formatUsername";

function bearer(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export type SignupResumeTarget = "login" | "profile";

/**
 * Auto-resume onboarding when a signup token exists.
 * Only password-set + incomplete profile resumes to profile; otherwise draft is discarded.
 */
export async function resolveSignupResume(): Promise<SignupResumeTarget> {
  const token = await getSecureItem("signupToken");
  if (!token) {
    return "login";
  }
  try {
    const status: SignupStatusResponse = await signupStatus({
      headers: bearer(token),
    });
    if (status.passwordSet && !status.profileComplete) {
      await setSecureItem("signupEmail", status.email);
      return "profile";
    }
    await clearSignupDraft();
    return "login";
  } catch {
    await clearSignupDraft();
    return "login";
  }
}

export function useSignupStart() {
  return useMutation({
    mutationFn: async (email: string) => {
      await signupStart({ email });
      await setSecureItem("signupEmail", email.trim().toLowerCase());
    },
  });
}

export function useSignupVerify() {
  return useMutation({
    mutationFn: async (input: {
      email: string;
      code: string;
    }): Promise<SignupVerifyResponse> => {
      const res = await signupVerify({
        email: input.email.trim().toLowerCase(),
        code: input.code.trim(),
      });
      await setSecureItem("signupToken", res.signupToken);
      return res;
    },
  });
}

export function useSignupPassword() {
  return useMutation({
    mutationFn: async (password: string) => {
      const token = await getSecureItem("signupToken");
      if (!token) {
        throw new ApiError(
          401,
          '{"error":"unauthorized","message":"Missing signup token"}',
          "unauthorized",
        );
      }
      await signupSetPassword({ password }, { headers: bearer(token) });
    },
  });
}

export function useSignupProfile() {
  const { setSession } = useSession();

  return useMutation({
    mutationFn: async (
      input: SignupProfileRequest,
    ): Promise<AuthSessionResponse> => {
      const token = await getSecureItem("signupToken");
      if (!token) {
        throw new ApiError(
          401,
          '{"error":"unauthorized","message":"Missing signup token"}',
          "unauthorized",
        );
      }
      const res = await signupCompleteProfile(
        {
          username: formatUsername(input.username.trim()),
          country: input.country.trim().toUpperCase(),
        },
        { headers: bearer(token) },
      );
      await setSession(res.token, res.user);
      return res;
    },
  });
}

export function useLogin() {
  const { setSession } = useSession();

  return useMutation({
    mutationFn: async (input: LoginRequest): Promise<LoginResponse> => {
      const res = await login({
        email: input.email.trim().toLowerCase(),
        password: input.password,
      });
      if (res.needsProfile) {
        if (!res.signupToken) {
          throw new ApiError(
            500,
            '{"error":"internal_error","message":"Missing signup token for profile resume"}',
            "internal_error",
          );
        }
        await setSecureItem("signupToken", res.signupToken);
        await setSecureItem("signupEmail", res.user.email);
        return res;
      }
      if (!res.token) {
        throw new ApiError(
          500,
          '{"error":"internal_error","message":"Missing session token"}',
          "internal_error",
        );
      }
      await setSession(res.token, res.user);
      return res;
    },
  });
}

export function useLogout() {
  const { clearSession, token } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (token) {
        try {
          await logout();
        } catch {
          // Local clear still wins if revoke fails (offline, expired).
        }
      }
      await clearSession();
      await clearSignupDraft();
      await clearResetDraft();
      queryClient.removeQueries({ queryKey: queryKeys.me });
    },
  });
}

export function useMe(enabled: boolean) {
  const { token, setUser, clearSession } = useSession();

  return useQuery<UserProfile, Error>({
    queryKey: queryKeys.me,
    enabled: enabled && Boolean(token),
    queryFn: async () => {
      try {
        const profile = await getMe();
        setUser(profile);
        return profile;
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          await clearSession();
        }
        throw err;
      }
    },
  });
}

export function useSignupEmailDraft() {
  return useQuery({
    queryKey: ["signupEmail"],
    queryFn: () => getSecureItem("signupEmail"),
    staleTime: Infinity,
  });
}

export function usePasswordResetStart() {
  return useMutation({
    mutationFn: async (email: string): Promise<PasswordResetStartResponse> => {
      const normalized = email.trim().toLowerCase();
      const res = await passwordResetStart({ email: normalized });
      if (res.sent) {
        await setSecureItem("resetEmail", normalized);
      }
      return res;
    },
  });
}

export function usePasswordResetVerify() {
  return useMutation({
    mutationFn: async (input: {
      email: string;
      code: string;
    }): Promise<PasswordResetVerifyResponse> => {
      const res = await passwordResetVerify({
        email: input.email.trim().toLowerCase(),
        code: input.code.trim(),
      });
      await setSecureItem("resetToken", res.resetToken);
      return res;
    },
  });
}

export function usePasswordResetConfirm() {
  return useMutation({
    mutationFn: async (password: string) => {
      const token = await getSecureItem("resetToken");
      if (!token) {
        throw new ApiError(
          401,
          '{"error":"unauthorized","message":"Missing reset token"}',
          "unauthorized",
        );
      }
      await passwordResetConfirm({ password }, { headers: bearer(token) });
      await clearResetDraft();
    },
  });
}

export function usePasswordResetEmailDraft() {
  return useQuery({
    queryKey: ["resetEmail"],
    queryFn: () => getSecureItem("resetEmail"),
    staleTime: Infinity,
  });
}
