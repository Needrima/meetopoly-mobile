import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ApiError } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import {
  getMe,
  login,
  logout,
  signupCompleteProfile,
  signupSetPassword,
  signupStart,
  signupVerify,
} from '@/api/services';
import {
  clearSignupDraft,
  getSecureItem,
  setSecureItem,
} from '@/api/sessionStore';
import type {
  AuthSessionResponse,
  LoginRequest,
  SignupProfileRequest,
  SignupVerifyResponse,
  UserProfile,
} from '@/api/types';
import { useSession } from '@/hooks/useSession';

function bearer(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export function useSignupStart() {
  return useMutation({
    mutationFn: async (email: string) => {
      await signupStart({ email });
      await setSecureItem('signupEmail', email.trim().toLowerCase());
    },
  });
}

export function useSignupVerify() {
  return useMutation({
    mutationFn: async (input: { email: string; code: string }): Promise<SignupVerifyResponse> => {
      const res = await signupVerify({
        email: input.email.trim().toLowerCase(),
        code: input.code.trim(),
      });
      await setSecureItem('signupToken', res.signupToken);
      return res;
    },
  });
}

export function useSignupPassword() {
  return useMutation({
    mutationFn: async (password: string) => {
      const token = await getSecureItem('signupToken');
      if (!token) {
        throw new ApiError(401, '{"error":"unauthorized","message":"Missing signup token"}', 'unauthorized');
      }
      await signupSetPassword({ password }, { headers: bearer(token) });
    },
  });
}

export function useSignupProfile() {
  const { setSession } = useSession();

  return useMutation({
    mutationFn: async (input: SignupProfileRequest): Promise<AuthSessionResponse> => {
      const token = await getSecureItem('signupToken');
      if (!token) {
        throw new ApiError(401, '{"error":"unauthorized","message":"Missing signup token"}', 'unauthorized');
      }
      const res = await signupCompleteProfile(
        {
          username: input.username.trim(),
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
    mutationFn: async (input: LoginRequest): Promise<AuthSessionResponse> => {
      const res = await login({
        email: input.email.trim().toLowerCase(),
        password: input.password,
      });
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
    queryKey: ['signupEmail'],
    queryFn: () => getSecureItem('signupEmail'),
    staleTime: Infinity,
  });
}
