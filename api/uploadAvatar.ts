import { ApiError, apiMutator } from '@/api/client';
import type { UserProfile } from '@/api/types';

/** Matches backend `MaxAvatarBytes` (1 MiB). */
const MAX_AVATAR_BYTES = 1 << 20;

export type AvatarUploadFile = {
  uri: string;
  name: string;
  type: string;
};

/**
 * POST /me/avatar — Expo Fetch–safe multipart.
 * Orval / classic RN `{ uri, name, type }` parts throw
 * "Unsupported FormDataPart implementation" under Expo's winter fetch.
 * Read the picker URI into a real Blob, then append that.
 */
export async function uploadAvatarFile(
  file: AvatarUploadFile,
): Promise<UserProfile> {
  const local = await fetch(file.uri);
  if (!local.ok) {
    throw new ApiError(
      400,
      '{"error":"invalid_image","message":"Could not read selected image"}',
      'invalid_image',
    );
  }
  const raw = await local.blob();
  const typed =
    raw.type && raw.type.startsWith('image/')
      ? raw
      : new Blob([raw], { type: file.type || 'image/jpeg' });

  if (typed.size > MAX_AVATAR_BYTES) {
    throw new ApiError(
      413,
      '{"error":"image_too_large","message":"Avatar must be 1 MiB or smaller"}',
      'image_too_large',
    );
  }

  const formData = new FormData();
  formData.append('file', typed, file.name);

  return apiMutator<UserProfile>('/me/avatar', {
    method: 'POST',
    body: formData,
  });
}
