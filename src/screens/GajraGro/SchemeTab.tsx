import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import FastImage from 'react-native-fast-image';
import AppText from '../../components/AppText/AppText';
import { colors } from '../../utils/Colors';
import { shadowStyle } from '../../utils/typography';
import { GroScheme, GroSchemeStatus, getGajraGroSchemesApi } from '../../api/query/GajraGroApi';

const STATUS_COLORS: Record<GroSchemeStatus, string> = {
  Running: '#1E9E4A',
  Upcoming: '#C98A00',
  Expired: '#8C939B',
};

const formatDate = (value?: string | null) => {
  const date = value ? new Date(value) : null;
  return date && !isNaN(date.getTime())
    ? date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '';
};

// Schemes ending after this year are the always-on programmes; their end date is not shown
const isOngoing = (scheme: GroScheme) => !!scheme.endedAt && new Date(scheme.endedAt).getFullYear() >= 2040;

// "12 days left" / "Starts in 3 days" / "Expired 5 Sep 2026" / "Ongoing"
const timing = (scheme: GroScheme) => {
  const day = 24 * 3600 * 1000;
  const now = Date.now();
  if (scheme.status === 'Upcoming' && scheme.startedAt) {
    const days = Math.max(1, Math.ceil((new Date(scheme.startedAt).getTime() - now) / day));
    return `Starts in ${days} day${days > 1 ? 's' : ''}`;
  }
  if (scheme.status === 'Expired') {
    return scheme.endedAt ? `Expired ${formatDate(scheme.endedAt)}` : 'Expired';
  }
  if (!scheme.endedAt || isOngoing(scheme)) return 'Ongoing';
  const days = Math.max(0, Math.ceil((new Date(scheme.endedAt).getTime() - now) / day));
  return days === 0 ? 'Ends today' : `${days} day${days > 1 ? 's' : ''} left`;
};

const SchemeCard = ({ scheme }: { scheme: GroScheme }) => {
  const statusColor = STATUS_COLORS[scheme.status] || '#8C939B';
  const period = isOngoing(scheme)
    ? `Since ${formatDate(scheme.startedAt)}`
    : [formatDate(scheme.startedAt), formatDate(scheme.endedAt)].filter(Boolean).join(' – ');

  return (
    <View style={[styles.card, shadowStyle]}>
      {!!scheme.image && (
        <FastImage source={{ uri: scheme.image }} style={styles.image} resizeMode="cover" />
      )}

      <View style={styles.cardHead}>
        <View style={[styles.accent, { backgroundColor: statusColor }]} />
        <View style={styles.cardTitle}>
          <AppText size={15} family="InterBold" color="#202432" numLines={2}>{scheme.name}</AppText>
          {!!period && <AppText size={12} family="InterMedium" color="#9094A3">{period}</AppText>}
        </View>
        <View style={[styles.badge, { backgroundColor: `${statusColor}1F` }]}>
          <AppText size={11} family="InterBold" color={statusColor}>{scheme.status.toUpperCase()}</AppText>
        </View>
      </View>

      {!!scheme.description && scheme.description !== scheme.name && (
        <AppText size={13} family="InterRegular" color="#5C5C5C" style={{ marginTop: 10 }}>
          {scheme.description}
        </AppText>
      )}

      <View style={styles.tags}>
        {!!scheme.audience && (
          <View style={[styles.tag, scheme.audience === 'Mechanic' && { backgroundColor: colors.goldSoft }]}>
            <AppText size={11} family="InterSemiBold" color="#6E6A60">{scheme.audience}</AppText>
          </View>
        )}
        {!!scheme.type && (
          <View style={styles.tag}>
            <AppText size={11} family="InterSemiBold" color="#6E6A60" style={{ textTransform: 'capitalize' }}>{scheme.type}</AppText>
          </View>
        )}
        <AppText size={11} family="InterSemiBold" color={statusColor} style={styles.timing}>{timing(scheme)}</AppText>
      </View>
    </View>
  );
};

const FILTERS: (GroSchemeStatus | 'All')[] = ['All', 'Running', 'Upcoming', 'Expired'];

const SchemeTab = () => {
  const [schemes, setSchemes] = useState<GroScheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<GroSchemeStatus | 'All'>('All');

  const fetchData = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const res: any = await getGajraGroSchemesApi();
      if (typeof res === 'string') {
        setError(res);
      } else {
        setSchemes(res?.data?.data?.rows || []);
        setError('');
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Could not load schemes. Pull down to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const rows = useMemo(
    () => schemes.filter(scheme => filter === 'All' || scheme.status === filter),
    [schemes, filter],
  );

  if (loading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.screen}
      data={rows}
      keyExtractor={scheme => scheme.id}
      renderItem={({ item }) => <SchemeCard scheme={item} />}
      ListHeaderComponent={
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chips}>
          {FILTERS.map(name => {
            const selected = filter === name;
            const color = name === 'All' ? colors.blue : STATUS_COLORS[name];
            const count = name === 'All' ? schemes.length : schemes.filter(s => s.status === name).length;
            return (
              <Pressable
                key={name}
                onPress={() => setFilter(name)}
                style={[styles.chip, { borderColor: color }, selected && { backgroundColor: color }]}
              >
                <AppText size={12} family="InterSemiBold" color={selected ? colors.white : color}>{name} ({count})</AppText>
              </Pressable>
            );
          })}
        </ScrollView>
      }
      ListEmptyComponent={
        <AppText size={14} family="InterMedium" color="#8A8578" align="center" style={styles.empty}>
          {error || 'No scheme to show.'}
        </AppText>
      }
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} />}
    />
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgColor },
  center: { alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, paddingTop: 4, paddingBottom: 40 },
  empty: { marginTop: 30, paddingHorizontal: 20 },

  chipScroll: { marginHorizontal: -16, marginBottom: 14 },
  chips: { paddingHorizontal: 16, gap: 8 },
  chip: { borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },

  card: { backgroundColor: colors.white, borderRadius: 16, padding: 14, marginBottom: 12 },
  image: { width: '100%', height: 150, borderRadius: 12, marginBottom: 12, backgroundColor: '#F3EFE6' },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  accent: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
  cardTitle: { flex: 1, gap: 3 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 12 },
  tag: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: '#F3EFE6' },
  timing: { marginLeft: 'auto' },
});

export default SchemeTab;
