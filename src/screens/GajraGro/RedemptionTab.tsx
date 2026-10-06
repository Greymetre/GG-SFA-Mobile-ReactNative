import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import AppText from '../../components/AppText/AppText';
import { colors } from '../../utils/Colors';
import { formatShortNumber } from '../../utils/misc';
import { shadowStyle } from '../../utils/typography';
import { GroRedemption, GroRedemptionPage, GroRedemptionPeriod, getGajraGroRedemptionsApi } from '../../api/query/GajraGroApi';
import { mechanicCategoryColour } from '../../components/atoms/MechanicCategoryBadge';

const PERIODS: { key: GroRedemptionPeriod; label: string }[] = [
  { key: 'month', label: 'This month' },
  { key: '3m', label: 'Last 3 months' },
  { key: '12m', label: 'Last 12 months' },
];

const Stat = ({ label, value, light }: { label: string; value: string; light?: boolean }) => (
  <View style={styles.stat}>
    <AppText size={16} family="InterBold" color={light ? colors.white : '#202432'} numLines={1}>{value}</AppText>
    <AppText size={11} family="InterMedium" color={light ? 'rgba(255,255,255,0.8)' : '#9094A3'} numLines={1}>{label}</AppText>
  </View>
);

const RedemptionCard = ({ row }: { row: GroRedemption }) => {
  const title = row.firm_name || row.contact_person || '-';
  const person = [row.contact_person !== title ? row.contact_person : '', row.mobile].filter(Boolean).join(' · ');
  // share of the period's earned points that was redeemed
  const share = row.earned > 0 ? Math.min(100, Math.round((row.redeemed / row.earned) * 100)) : 0;
  const colour = mechanicCategoryColour(row.category);

  return (
    <View style={[styles.card, shadowStyle]}>
      <View style={styles.cardHead}>
        <View style={styles.cardTitle}>
          <AppText size={15} family="InterBold" color="#202432" numLines={1}>{title}</AppText>
          {!!person && <AppText size={12} family="InterMedium" color="#9094A3" numLines={1}>{person}</AppText>}
          {!!(row.city || row.dealer) && (
            <AppText size={11} family="InterMedium" color="#A9A59A" numLines={1}>
              {[row.city, row.dealer && `Dealer: ${row.dealer}`].filter(Boolean).join(' · ')}
            </AppText>
          )}
        </View>
        {!!row.category && (
          <View style={[styles.badge, { backgroundColor: `${colour}1F` }]}>
            <AppText size={11} family="InterBold" color={colour}>{row.category.toUpperCase()}</AppText>
          </View>
        )}
      </View>

      <View style={styles.divider} />
      <View style={styles.stats}>
        <Stat label="Redeemed" value={formatShortNumber(row.redeemed)} />
        <Stat label="Earned" value={formatShortNumber(row.earned)} />
        <Stat label="Last redeemed" value={row.last_redeemed_month || '-'} />
      </View>

      {row.earned > 0 && (
        <View style={styles.shareRow}>
          <View style={styles.shareTrack}>
            <View style={[styles.shareFill, { width: `${share}%` }]} />
          </View>
          <AppText size={11} family="InterSemiBold" color="#6E6A60">{share}% of earned</AppText>
        </View>
      )}
    </View>
  );
};

const RedemptionTab = () => {
  const [data, setData] = useState<GroRedemptionPage | null>(null);
  const [rows, setRows] = useState<GroRedemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState<GroRedemptionPeriod>('12m');
  const [search, setSearch] = useState('');
  const requestId = useRef(0);

  const fetchPage = useCallback(async (page: number, mode: 'load' | 'refresh' | 'more') => {
    const id = ++requestId.current;
    mode === 'refresh' ? setRefreshing(true) : mode === 'more' ? setLoadingMore(true) : setLoading(true);
    try {
      const res: any = await getGajraGroRedemptionsApi({ page, period, search: search.trim() || undefined });
      if (id !== requestId.current) return; // a newer period / search is loading
      if (typeof res === 'string') {
        setError(res);
      } else {
        const next: GroRedemptionPage | null = res?.data?.data || null;
        setData(next);
        setRows(prev => (page > 1 ? [...prev, ...(next?.rows || [])] : next?.rows || []));
        setError('');
      }
    } catch (e: any) {
      if (id === requestId.current) {
        setError(e?.response?.data?.message || 'Could not load redemptions. Pull down to retry.');
      }
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    }
  }, [period, search]);

  // Reload from page 1 on a period change, and 400 ms after typing stops
  useEffect(() => {
    const timer = setTimeout(() => fetchPage(1, 'load'), search ? 400 : 0);
    return () => clearTimeout(timer);
  }, [fetchPage, search]);

  const loadMore = () => {
    if (!loading && !loadingMore && data?.has_more) {
      fetchPage((data?.page || 1) + 1, 'more');
    }
  };

  const summary = data?.summary;

  return (
    <FlatList
      style={styles.screen}
      data={loading ? [] : rows}
      keyExtractor={row => String(row.customer_id)}
      renderItem={({ item }) => <RedemptionCard row={item} />}
      ListHeaderComponent={
        <View>
          <View style={[styles.hero, shadowStyle]}>
            <LinearGradient colors={['#14532D', '#1E7A45', '#2FA35F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <AppText size={12} family="InterBold" color="rgba(255,255,255,0.8)" style={styles.heroLabel}>POINTS REDEEMED</AppText>
            <AppText size={32} family="InterBold" color={colors.white}>{formatShortNumber(summary?.redeemed || 0)}</AppText>
            <AppText size={12} family="InterMedium" color="rgba(255,255,255,0.8)">{data?.period_label || ' '}</AppText>
            <View style={styles.heroStats}>
              <Stat light label="Mechanics redeemed" value={String(summary?.mechanics || 0)} />
              <Stat light label="Their points earned" value={formatShortNumber(summary?.earned || 0)} />
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chips}>
            {PERIODS.map(item => {
              const selected = period === item.key;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => setPeriod(item.key)}
                  style={[styles.chip, selected && styles.chipSelected]}
                >
                  <AppText size={12} family="InterSemiBold" color={selected ? colors.white : colors.blue}>{item.label}</AppText>
                </Pressable>
              );
            })}
          </ScrollView>

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search mechanic, mobile, city or dealer"
            placeholderTextColor="#A9A59A"
            style={styles.search}
          />
          {loading && <ActivityIndicator size="large" color={colors.gold} style={{ marginTop: 20 }} />}
        </View>
      }
      ListEmptyComponent={loading ? null : (
        <AppText size={14} family="InterMedium" color="#8A8578" align="center" style={styles.empty}>
          {error || 'No mechanic redeemed points in this period.'}
        </AppText>
      )}
      ListFooterComponent={loadingMore
        ? <ActivityIndicator color={colors.gold} style={{ marginVertical: 12 }} />
        : data?.synced_at && rows.length > 0 ? (
          <AppText size={11} family="InterMedium" color="#A9A59A" align="center" style={styles.footer}>
            Gajra Gro data last synced {data.synced_at}
          </AppText>
        ) : null}
      onEndReached={loadMore}
      onEndReachedThreshold={0.4}
      contentContainerStyle={styles.list}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchPage(1, 'refresh')} />}
    />
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgColor },
  list: { padding: 16, paddingTop: 4, paddingBottom: 40 },
  empty: { marginTop: 30, paddingHorizontal: 20 },
  footer: { marginTop: 8 },

  hero: { borderRadius: 18, overflow: 'hidden', padding: 16, backgroundColor: '#1E7A45' },
  heroLabel: { letterSpacing: 0.6 },
  heroStats: { flexDirection: 'row', marginTop: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.16)' },

  chipScroll: { marginHorizontal: -16, marginTop: 14 },
  chips: { paddingHorizontal: 16, gap: 8 },
  chip: { borderWidth: 1.5, borderColor: colors.blue, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  chipSelected: { backgroundColor: colors.blue },
  search: {
    marginTop: 12,
    marginBottom: 14,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EDE6D3',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#202432',
  },

  card: { backgroundColor: colors.white, borderRadius: 16, padding: 14, marginBottom: 12 },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cardTitle: { flex: 1, gap: 2 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  divider: { height: 1, backgroundColor: '#EFEAE0', marginVertical: 12 },
  stats: { flexDirection: 'row' },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  shareRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  shareTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: '#EFEDE6', overflow: 'hidden' },
  shareFill: { height: '100%', borderRadius: 3, backgroundColor: '#1E9E4A' },
});

export default RedemptionTab;
