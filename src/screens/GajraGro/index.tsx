import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import AppText from '../../components/AppText/AppText';
import SpinningGear from '../../components/atoms/SpinningGear';
import { colors } from '../../utils/Colors';
import { formatShortNumber } from '../../utils/misc';
import { shadowStyle } from '../../utils/typography';
import { GajraGroReport, GroCategory, GroMechanic, getGajraGroApi } from '../../api/query/GajraGroApi';

const CATEGORY_COLORS: Record<GroCategory, string> = {
  Platinum: '#5B6B82',
  Diamond: '#1F8FBF',
  Gold: '#C9960C',
  Silver: '#8C939B',
  Bronze: '#B0703C',
};

const Stat = ({ label, value, light }: { label: string; value: string; light?: boolean }) => (
  <View style={styles.stat}>
    <AppText size={16} family="InterBold" color={light ? colors.white : '#202432'} numLines={1}>{value}</AppText>
    <AppText size={11} family="InterMedium" color={light ? 'rgba(255,255,255,0.8)' : '#9094A3'} numLines={1}>{label}</AppText>
  </View>
);

const MechanicCard = ({ row, months }: { row: GroMechanic; months: string[] }) => {
  const color = CATEGORY_COLORS[row.category] || '#8C939B';
  return (
    <View style={[styles.card, shadowStyle]}>
      <View style={styles.cardHead}>
        <View style={styles.cardTitle}>
          <AppText size={15} family="InterBold" color="#202432" numLines={1}>{row.firm_name || row.contact_person}</AppText>
          <AppText size={12} family="InterMedium" color="#9094A3" numLines={1}>
            {[row.contact_person !== row.firm_name ? row.contact_person : '', row.mobile].filter(Boolean).join(' · ')}
          </AppText>
          {!!(row.city || row.dealer) && (
            <AppText size={11} family="InterMedium" color="#A9A59A" numLines={1}>
              {[row.city, row.dealer && `Dealer: ${row.dealer}`].filter(Boolean).join(' · ')}
            </AppText>
          )}
        </View>
        <View style={[styles.badge, { backgroundColor: `${color}1F` }]}>
          <AppText size={11} family="InterBold" color={color}>{row.category.toUpperCase()}</AppText>
        </View>
      </View>

      <View style={styles.divider} />
      <View style={styles.stats}>
        <Stat label="Points (12M)" value={formatShortNumber(row.points)} />
        <Stat label="Redeemed" value={formatShortNumber(row.redeemed)} />
        <Stat label="Scans (12M)" value={formatShortNumber(row.scans)} />
        <Stat label="Active" value={`${row.active_months}/12`} />
      </View>

      <View style={styles.activityHead}>
        <AppText size={11} family="InterSemiBold" color="#6E6A60">Monthly scans</AppText>
        <AppText size={10} family="InterMedium" color="#A9A59A">coloured = scanned that month</AppText>
      </View>
      <View style={styles.activity}>
        {row.monthly.map((scans, i) => (
          <View key={`${months[i]}-${i}`} style={styles.activityCol}>
            <View style={[styles.activityBox, scans > 0 && { backgroundColor: color }]}>
              <AppText size={9} family="InterBold" color={scans > 0 ? colors.white : '#C9C4B8'}>
                {scans > 99 ? '99+' : scans}
              </AppText>
            </View>
            <AppText size={8} family="InterMedium" color="#9A958A">{months[i] || ''}</AppText>
          </View>
        ))}
      </View>

      <View style={styles.monthRow}>
        <AppText size={12} family="InterMedium" color="#6E6A60">This month</AppText>
        <AppText size={12} family="InterBold" color={row.this_month_scans > 0 ? '#1E9E4A' : '#A9A59A'}>
          {row.this_month_scans > 0
            ? `${formatShortNumber(row.this_month_points)} pts · ${row.this_month_scans} scans`
            : 'No scan yet'}
        </AppText>
      </View>
    </View>
  );
};

const GajraGro = () => {
  const [report, setReport] = useState<GajraGroReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<GroCategory | 'All'>('All');

  const fetchData = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const res: any = await getGajraGroApi();
      if (typeof res === 'string') {
        setError(res);
      } else {
        setReport(res?.data?.data || null);
        setError('');
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Could not load Gajra Gro+ data. Pull down to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (report?.rows || []).filter(row =>
      (category === 'All' || row.category === category) &&
      (!query || [row.firm_name, row.contact_person, row.mobile, row.city, row.dealer]
        .some(value => (value || '').toLowerCase().includes(query))),
    );
  }, [report, search, category]);

  if (loading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  const summary = report?.summary;
  const header = summary ? (
    <View>
      <View style={[styles.hero, shadowStyle]}>
        <LinearGradient colors={['#6B3F08', '#A8740F', '#D9A520']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <SpinningGear size={120} teeth={12} color="rgba(255,255,255,0.07)" duration={24000} style={styles.heroGear} />
        <AppText size={12} family="InterBold" color="rgba(255,255,255,0.8)" style={styles.heroLabel}>GRO MECHANICS</AppText>
        <AppText size={32} family="InterBold" color={colors.white}>{summary.mechanics}</AppText>
        <AppText size={12} family="InterMedium" color="rgba(255,255,255,0.8)">Scanned in {report?.period}</AppText>
        <View style={styles.heroStats}>
          <Stat light label="Points (12M)" value={formatShortNumber(summary.points)} />
          <Stat light label="Redeemed" value={formatShortNumber(summary.redeemed)} />
          <Stat light label="Scans (12M)" value={formatShortNumber(summary.scans)} />
        </View>
        <View style={styles.heroMonth}>
          <AppText size={12} family="InterSemiBold" color={colors.white}>
            This month: {summary.this_month_active} active · {formatShortNumber(summary.this_month_points)} pts · {summary.this_month_scans} scans
          </AppText>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chips}>
        {(['All', ...summary.categories.map(c => c.category)] as (GroCategory | 'All')[]).map(name => {
          const selected = category === name;
          const count = name === 'All' ? summary.mechanics : summary.categories.find(c => c.category === name)?.count || 0;
          const color = name === 'All' ? colors.blue : CATEGORY_COLORS[name];
          return (
            <Pressable
              key={name}
              onPress={() => setCategory(name)}
              style={[styles.chip, { borderColor: color }, selected && { backgroundColor: color }]}
            >
              <AppText size={12} family="InterSemiBold" color={selected ? colors.white : color}>{name} ({count})</AppText>
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
    </View>
  ) : null;

  return (
    <View style={styles.screen}>
      <FlatList
        data={rows}
        keyExtractor={row => String(row.customer_id)}
        renderItem={({ item }) => <MechanicCard row={item} months={report?.months || []} />}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <AppText size={14} family="InterMedium" color="#8A8578" align="center" style={styles.empty}>
            {error || (report ? 'No Gajra Gro mechanic matches.' : 'No Gajra Gro data available.')}
          </AppText>
        }
        ListFooterComponent={report?.synced_at ? (
          <AppText size={11} family="InterMedium" color="#A9A59A" align="center" style={styles.footer}>
            Gajra Gro data last synced {report.synced_at}
          </AppText>
        ) : null}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={10}
        windowSize={7}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgColor },
  center: { alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, paddingBottom: 40 },
  empty: { marginTop: 30, paddingHorizontal: 20 },
  footer: { marginTop: 8 },

  hero: { borderRadius: 18, overflow: 'hidden', padding: 16, backgroundColor: '#A8740F' },
  heroGear: { top: -40, right: -30 },
  heroLabel: { letterSpacing: 0.6 },
  heroStats: { flexDirection: 'row', marginTop: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.16)' },
  heroMonth: { marginTop: 10, alignSelf: 'flex-start', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: 'rgba(255,255,255,0.18)' },

  chipScroll: { marginHorizontal: -16, marginTop: 14 },
  chips: { paddingHorizontal: 16, gap: 8 },
  chip: { borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
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
  activityHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  activity: { flexDirection: 'row', marginTop: 6 },
  activityCol: { flex: 1, alignItems: 'center', gap: 3 },
  activityBox: { width: '88%', height: 20, borderRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EFEDE6' },
  monthRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F3EFE6' },
});

export default GajraGro;
