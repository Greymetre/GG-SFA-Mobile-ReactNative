import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import AppText from '../AppText/AppText';

// Mechanic loyalty categories (Gajra Gro points / scans), best first, with the colours SFA uses for them
export const MECHANIC_CATEGORY_COLOURS: Record<string, string> = {
  Platinum: '#475569',
  Diamond: '#2563EB',
  Gold: '#CA8A04',
  Silver: '#8B95A5',
  Bronze: '#C2410C',
};
const UNCLASSIFIED_COLOUR = '#64748B';

export const mechanicCategoryColour = (category?: string | null) =>
  (category && MECHANIC_CATEGORY_COLOURS[category]) || UNCLASSIFIED_COLOUR;

// A customer row is a mechanic when the API flags it or its type name says so
export const isMechanicCustomer = (customer: any) =>
  !!customer?.is_mechanic ||
  /mechanic/i.test(String(customer?.customer_type || customer?.type || customer?.customertypes?.customertype_name || ''));

type Props = {
  category?: string | null;
  style?: StyleProp<ViewStyle>;
};

// Pill with the mechanic's category; "Not classified" when it has none
const MechanicCategoryBadge = ({ category, style }: Props) => {
  const colour = mechanicCategoryColour(category);
  return (
    <View style={[styles.badge, { backgroundColor: colour + '1F' }, style]}>
      <View style={[styles.dot, { backgroundColor: colour }]} />
      <AppText size={12} color={colour} family="InterSemiBold">
        {category || 'Not classified'}
      </AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  dot: {
    height: 7,
    width: 7,
    borderRadius: 4,
  },
});

export default MechanicCategoryBadge;
