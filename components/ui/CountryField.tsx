import { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CountryPicker, {
  getCountryName,
  isCountryCode,
  type Country,
  type CountryCode,
} from 'react-native-country-picker-modal';

import { Dropdown } from '@/components/ui/Dropdown';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

function countryDisplayName(country: Country): string {
  if (typeof country.name === 'string') {
    return country.name;
  }
  return country.name.common;
}

export type CountryFieldProps = {
  /** ISO 3166-1 alpha-2 code, or empty when unset. */
  value: string;
  onChange: (countryCode: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

/**
 * Country picker: Meetopoly Dropdown trigger + searchable emoji-flag modal.
 * Stores ISO alpha-2 via `onChange`; shows the country name in the trigger.
 */
export function CountryField({
  value,
  onChange,
  placeholder = 'Select country',
  disabled = false,
}: CountryFieldProps) {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [label, setLabel] = useState<string | undefined>();

  const selectedCode: CountryCode | undefined = isCountryCode(value) ? value : undefined;

  useEffect(() => {
    if (!selectedCode) {
      setLabel(undefined);
      return;
    }

    let cancelled = false;
    void getCountryName(selectedCode).then((name) => {
      if (!cancelled) {
        setLabel(name);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [selectedCode]);

  return (
    <>
      <Dropdown
        placeholder={placeholder}
        value={label}
        open={visible}
        disabled={disabled}
        onPress={() => setVisible(true)}
      />
      <CountryPicker
        countryCode={selectedCode}
        visible={visible}
        withFilter
        withFlag
        withEmoji
        withFlagButton={false}
        withCloseButton
        renderFlagButton={() => null}
        modalInsets={{ top: insets.top, bottom: insets.bottom }}
        theme={{
          primaryColor: colors.accent,
          primaryColorVariant: colors.border,
          backgroundColor: colors.surface,
          onBackgroundTextColor: colors.ink,
          filterPlaceholderTextColor: colors.muted,
          fontFamily: fonts.body,
          fontSize: 16,
        }}
        onSelect={(country: Country) => {
          setLabel(countryDisplayName(country));
          onChange(country.cca2);
          setVisible(false);
        }}
        onClose={() => setVisible(false)}
        modalProps={{
          supportedOrientations: ['landscape', 'landscape-left', 'landscape-right'],
        }}
      />
    </>
  );
}
