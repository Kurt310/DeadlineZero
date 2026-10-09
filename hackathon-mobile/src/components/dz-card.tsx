import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { DZ } from '@/constants/deadline';

interface Props {
  children: ReactNode;
  backgroundColor?: string;
  borderColor?: string;
  padding?: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function DzCard({ children, backgroundColor, borderColor, padding = 16, onPress, style }: Props) {
  const body = (
    <View
      style={[
        styles.card,
        { backgroundColor: backgroundColor ?? DZ.cardSurface, borderColor: borderColor ?? DZ.borders, padding },
        style,
      ]}>
      {children}
    </View>
  );
  if (onPress) {
    return <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>{body}</Pressable>;
  }
  return body;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  pressed: { opacity: 0.85 },
});
