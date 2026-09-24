import { type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors, fonts, tapMinHeight } from '../theme';

export function Eyebrow({ children }: { children: ReactNode }) {
  return <Text style={styles.eyebrow}>{children}</Text>;
}

export function Title({ children }: { children: ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Body({ children }: { children: ReactNode }) {
  return <Text style={styles.body}>{children}</Text>;
}

export function Label({ children }: { children: ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

export function Field({
  label,
  value,
  onChangeText,
  ...props
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
} & Omit<TextInputProps, 'value' | 'onChangeText'>) {
  return (
    <View style={styles.field}>
      <Label>{label}</Label>
      <TextInput accessibilityLabel={label} onChangeText={onChangeText} style={styles.input} value={value} {...props} />
    </View>
  );
}

export function Notice({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <Text accessibilityLiveRegion="polite" style={styles.notice}>{children}</Text>;
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable accessibilityLabel={label} accessibilityRole="button" disabled={disabled || loading} onPress={onPress} style={[styles.primary, (disabled || loading) && styles.disabled]}>
      {loading ? <ActivityIndicator color={colors.siteWhite} /> : <Text style={styles.primaryText}>{label}</Text>}
    </Pressable>
  );
}

export function SecondaryButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable accessibilityLabel={label} accessibilityRole="button" disabled={disabled} onPress={onPress} style={styles.secondary}>
      <Text style={styles.secondaryText}>{label}</Text>
    </Pressable>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

export function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

export function OptionList({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ label: string; value: string }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.field}>
      <Label>{label}</Label>
      <ScrollView horizontal style={styles.optionRow} contentContainerStyle={styles.optionRowContent}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={option.value}
              onPress={() => onChange(option.value)}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function ChipSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: Array<{ label: string; value: string }>;
  selected: string[];
  onChange: (selected: string[]) => void;
}) {
  function toggle(value: string) {
    onChange(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  }
  return (
    <View style={styles.field}>
      <Label>{label}</Label>
      <View style={styles.chipWrap}>
        {options.map((option) => {
          const isSelected = selected.includes(option.value);
          return (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected }}
              key={option.value}
              onPress={() => toggle(option.value)}
              style={[styles.chip, isSelected && styles.chipSelected]}
            >
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function Checkbox({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{ checked }} onPress={onToggle} style={styles.checkRow}>
      <Text style={styles.checkbox}>{checked ? 'X' : ''}</Text>
      <Text style={styles.body}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    color: colors.tradeBlue,
    fontFamily: fonts.headlineSemi,
    fontSize: 13,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.foundationNavy,
    fontFamily: fonts.headline,
    fontSize: 28,
    marginTop: 8,
  },
  body: {
    color: colors.concreteGrey,
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 22,
    marginTop: 6,
  },
  label: {
    color: colors.foundationNavy,
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    marginBottom: 6,
  },
  field: {
    marginBottom: 14,
  },
  input: {
    backgroundColor: colors.siteWhite,
    borderColor: colors.concreteGrey,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.foundationNavy,
    fontFamily: fonts.body,
    fontSize: 16,
    minHeight: tapMinHeight,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  notice: {
    color: colors.attention,
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    marginBottom: 12,
    marginTop: 4,
  },
  primary: {
    alignItems: 'center',
    backgroundColor: colors.tradeBlue,
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: tapMinHeight,
    paddingHorizontal: 20,
  },
  primaryText: {
    color: colors.siteWhite,
    fontFamily: fonts.headlineSemi,
    fontSize: 16,
  },
  secondary: {
    alignItems: 'center',
    alignSelf: 'stretch',
    borderColor: colors.foundationNavy,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: tapMinHeight,
    marginTop: 10,
    paddingHorizontal: 16,
  },
  secondaryText: {
    color: colors.foundationNavy,
    fontFamily: fonts.headlineSemi,
    fontSize: 15,
  },
  disabled: {
    opacity: 0.55,
  },
  card: {
    backgroundColor: colors.siteWhite,
    borderColor: colors.skyBlue,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 16,
    padding: 16,
  },
  metric: {
    flex: 1,
    minWidth: '45%',
    marginBottom: 12,
  },
  metricValue: {
    color: colors.foundationNavy,
    fontFamily: fonts.headline,
    fontSize: 24,
  },
  metricLabel: {
    color: colors.concreteGrey,
    fontFamily: fonts.body,
    fontSize: 14,
    marginTop: 4,
  },
  optionRow: {
    maxHeight: 52,
  },
  optionRowContent: {
    gap: 8,
    paddingRight: 8,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: tapMinHeight,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipSelected: {
    backgroundColor: colors.tradeBlue,
    borderColor: colors.tradeBlue,
  },
  chipText: {
    color: colors.foundationNavy,
    fontFamily: fonts.bodySemi,
    fontSize: 14,
  },
  chipTextSelected: {
    color: colors.siteWhite,
  },
  checkRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
    minHeight: tapMinHeight,
  },
  checkbox: {
    borderColor: colors.foundationNavy,
    borderWidth: 1,
    color: colors.foundationNavy,
    fontFamily: fonts.headlineSemi,
    height: 22,
    textAlign: 'center',
    width: 22,
  },
});
