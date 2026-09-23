/**
 * Board tile icon lookup. Registry is codegen’d from city-icons/.
 * Regenerate: `npm run icons:generate`
 */
import type { FC } from 'react';
import type { SvgProps } from 'react-native-svg';

import { iconRegistry } from '@/components/board/iconRegistry.generated';

export type BoardIcon = FC<SvgProps>;

export function resolveBoardIcon(
  iconPath: string | undefined | null,
): BoardIcon | null {
  if (!iconPath) {
    return null;
  }
  return iconRegistry[iconPath] ?? null;
}
