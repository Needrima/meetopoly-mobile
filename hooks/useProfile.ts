import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useFormik } from 'formik';
import * as Yup from 'yup';

import { ApiError } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import { deleteAvatar, patchMe } from '@/api/services';
import { uploadAvatarFile } from '@/api/uploadAvatar';
import type { UserProfile } from '@/api/types';
import { usernameSchema } from '@/hooks/authSchemas';
import { useSession } from '@/hooks/useSession';
import { notify } from '@/lib/notify';

/** Matches backend `MaxAvatarBytes` (1 MiB). */
export const MAX_AVATAR_BYTES = 1 << 20;

export type AvatarFileInput = {
  uri: string;
  name: string;
  type: string;
  /** Optional file size in bytes (from picker). */
  size?: number | null;
};

function applyProfile(
  profile: UserProfile,
  setUser: (u: UserProfile | null) => void,
  queryClient: ReturnType<typeof useQueryClient>,
) {
  setUser(profile);
  queryClient.setQueryData(queryKeys.me, profile);
}

function mimeFromUri(uri: string, pickerType?: string | null): string {
  if (pickerType && pickerType.startsWith('image/')) {
    return pickerType;
  }
  const lower = uri.toLowerCase();
  if (lower.endsWith('.png')) {
    return 'image/png';
  }
  if (lower.endsWith('.webp')) {
    return 'image/webp';
  }
  return 'image/jpeg';
}

function fileNameFromUri(uri: string, mime: string): string {
  const leaf = uri.split('/').pop()?.split('?')[0];
  if (leaf && /\.(jpe?g|png|webp)$/i.test(leaf)) {
    return leaf;
  }
  if (mime === 'image/png') {
    return 'avatar.png';
  }
  if (mime === 'image/webp') {
    return 'avatar.webp';
  }
  return 'avatar.jpg';
}

export function useUpdateUsername() {
  const { setUser } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (username: string) => patchMe({ username }),
    onSuccess: (profile) => {
      applyProfile(profile, setUser, queryClient);
      notify({
        type: 'success',
        title: 'Username updated',
        message: profile.username ? `You’re now ${profile.username}` : undefined,
      });
    },
  });
}

export function useUploadAvatar() {
  const { setUser } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: AvatarFileInput) => {
      if (file.size != null && file.size > MAX_AVATAR_BYTES) {
        throw new ApiError(
          413,
          '{"error":"image_too_large","message":"Avatar must be 1 MiB or smaller"}',
          'image_too_large',
        );
      }
      // Orval appends a non-Blob part; use RN-safe Blob upload instead.
      return uploadAvatarFile({
        uri: file.uri,
        name: file.name,
        type: file.type,
      });
    },
    onSuccess: (profile) => {
      applyProfile(profile, setUser, queryClient);
      notify({
        type: 'success',
        title: 'Photo updated',
        message: 'Your avatar is live on the board and in hubs.',
      });
    },
  });
}

export function useDeleteAvatar() {
  const { setUser } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => deleteAvatar(),
    onSuccess: (profile) => {
      applyProfile(profile, setUser, queryClient);
      notify({
        type: 'success',
        title: 'Photo removed',
        message: 'You’re back to initials.',
      });
    },
  });
}

/**
 * Settings avatar — library pick (edit) + DELETE /me/avatar (trash).
 */
export function useAvatarActions() {
  const upload = useUploadAvatar();
  const remove = useDeleteAvatar();

  const pickAndUpload = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      notify({
        type: 'error',
        title: 'Photos',
        message: 'Allow photo library access to update your avatar.',
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (result.canceled || !result.assets?.[0]) {
      return;
    }

    const asset = result.assets[0];
    const mime = mimeFromUri(asset.uri, asset.mimeType);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime)) {
      notify({
        type: 'error',
        title: 'Photo',
        message: 'Use a JPEG, PNG, or WebP image (max 1 MiB).',
      });
      return;
    }

    if (asset.fileSize != null && asset.fileSize > MAX_AVATAR_BYTES) {
      notify({
        type: 'error',
        title: 'Photo',
        message: 'Avatar must be 1 MiB or smaller.',
      });
      return;
    }

    try {
      await upload.mutateAsync({
        uri: asset.uri,
        name: fileNameFromUri(asset.uri, mime),
        type: mime,
        size: asset.fileSize ?? null,
      });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not upload photo';
      notify({ type: 'error', title: 'Photo', message });
    }
  };

  const deletePhoto = async () => {
    try {
      await remove.mutateAsync();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not remove photo';
      notify({ type: 'error', title: 'Photo', message });
    }
  };

  return {
    pickAndUpload,
    deletePhoto,
    uploading: upload.isPending,
    removing: remove.isPending,
    busy: upload.isPending || remove.isPending,
  };
}

const settingsUsernameSchema = Yup.object({
  username: usernameSchema,
});

export type SettingsUsernameValues = Yup.InferType<typeof settingsUsernameSchema>;

/**
 * Settings username form — Formik + Yup; submit via PATCH /me.
 */
export function useSettingsUsernameForm(currentUsername: string) {
  const update = useUpdateUsername();

  const formik = useFormik<SettingsUsernameValues>({
    enableReinitialize: true,
    initialValues: { username: currentUsername },
    validationSchema: settingsUsernameSchema,
    validateOnChange: false,
    validateOnBlur: false,
    onSubmit: async (values, helpers) => {
      helpers.setStatus(undefined);
      try {
        await update.mutateAsync(values.username.trim());
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Could not update username';
        helpers.setStatus(message);
        notify({ type: 'error', title: 'Username', message });
      }
    },
  });

  const trimmed = formik.values.username.trim();
  const unchanged =
    trimmed.toLowerCase() === currentUsername.trim().toLowerCase();

  return {
    values: formik.values,
    setFieldValue: (field: 'username', value: string) => {
      formik.setStatus(undefined);
      void formik.setFieldValue(field, value);
    },
    submit: () => {
      void formik.submitForm();
    },
    isSubmitting: formik.isSubmitting || update.isPending,
    error:
      typeof formik.status === 'string'
        ? formik.status
        : formik.errors.username,
    canSubmit:
      trimmed.length > 0 &&
      !unchanged &&
      !formik.isSubmitting &&
      !update.isPending,
  };
}
