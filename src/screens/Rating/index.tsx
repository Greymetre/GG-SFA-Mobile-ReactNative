import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, FlatList, Pressable, RefreshControl, StatusBar, StyleSheet, TextInput, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppText from '../../components/AppText/AppText';
import SpinningGear from '../../components/atoms/SpinningGear';
import MediaImage from '../../components/atoms/MediaImage';
import { brandGradient, colors } from '../../utils/Colors';
import { shadowStyle } from '../../utils/typography';
import { AsmRating, AsmRatingReport, RatingKey, getAsmRatingApi } from '../../api/query/RatingApi';
import RatingDetailModal from './RatingDetailModal';
import { styles } from './styles';

const GREEN = '#1E9E4A';
const AMBER = '#E08A00';
const RED = '#D93025';

// Final rating (0-2): >= 1.5 good, >= 1 average, else needs attention - same bands as the web report
const ratingColor = (rating: number) => (rating >= 1.5 ? GREEN : rating >= 1 ? AMBER : RED);
const paramColor = (rating: number) => [RED, AMBER, GREEN][rating] || RED;

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0].toUpperCase()).join('');

const PARAMS: { key: RatingKey; label: string; value: (row: AsmRating) => string }[] = [
  { key: 'category', label: 'Category', value: row => `${Math.round(row.category.pct)}%` },
  { key: 'orders', label: 'Orders', value: row => `${Math.round(row.orders.pct)}%` },
  { key: 'activation', label: 'Activation', value: row => `${row.activation}` },
  { key: 'visit', label: 'Visits', value: row => `${row.visit}` },
];

const Avatar = ({ row, size, light }: { row: AsmRating; size: number; light?: boolean }) => (
  <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }, light && styles.avatarLight]}>
    <AppText size={size * 0.34} family="InterBold" color={light ? colors.white : colors.blue}>{initials(row.name)}</AppText>
    {!!row.profile_image && (
      <MediaImage path={row.profile_image} placeholder={{ uri: '' }} style={[StyleSheet.absoluteFill, { borderRadius: size / 2 }]} />
    )}
  </View>
);

const ZONE_COLORS: Record<string, string> = { NORTH: '#1F5FAF', EAST: '#7B3FB5', WEST: '#0E8F7E', SOUTH: '#C2410C' };
const zoneColor = (zone: string) => ZONE_COLORS[(zone || '').trim().toUpperCase()] || '#6B6B6B';
const ratingLabel = (rating: number) => (rating >= 1.5 ? 'Excellent' : rating >= 1 ? 'Good' : 'Needs focus');

// Share of the maximum rating (2), as a bar
const ScoreBar = ({ rating, color, track }: { rating: number; color: string; track: string }) => (
  <View style={[styles.bar, { backgroundColor: track }]}>
    <View style={[styles.barFill, { width: `${Math.min(100, (rating / 2) * 100)}%`, backgroundColor: color }]} />
  </View>
);

// location · sub zone · zone, without repeats (sub zone is often named like its zone)
const place = (row: AsmRating) =>
  [row.location, row.sub_zone, row.zone]
    .filter(Boolean)
    .filter((value, i, all) => all.findIndex(other => other.trim().toLowerCase() === value.trim().toLowerCase()) === i)
    .join(' · ');

const SectionTitle = ({ title, right }: { title: string; right?: string }) => (
  <View style={styles.sectionHead}>
    <AppText size={16} family="InterBold" color="#202432">{title}</AppText>
    {!!right && <AppText size={12} family="InterMedium" color="#8A8578">{right}</AppText>}
  </View>
);

const TopPerformer = ({ row, period }: { row: AsmRating; period: string }) => (
  <View style={styles.section}>
    <SectionTitle title="🏆 All India Top Performer" right={period} />
    <View style={[styles.topCard, shadowStyle]}>
      <LinearGradient colors={['#6B3F08', '#A8740F', '#D9A520']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <SpinningGear size={120} teeth={12} color="rgba(255,255,255,0.07)" duration={24000} style={styles.topGear} />

      <View style={styles.topRow}>
        <View>
          <View style={styles.topAvatarRing}>
            <Avatar row={row} size={54} light />
          </View>
          <View style={styles.topRankBadge}>
            <AppText size={10} family="InterBold" color="#6B3F08">#1</AppText>
          </View>
        </View>
        <View style={styles.topInfo}>
          <AppText size={17} family="InterBold" color={colors.white} numLines={1}>{row.name}</AppText>
          <AppText size={12} family="InterMedium" color="rgba(255,255,255,0.85)" numLines={1}>
            ASM{row.employee_code ? ` · ${row.employee_code}` : ''}
          </AppText>
          <AppText size={12} family="InterMedium" color="rgba(255,255,255,0.85)" numLines={1}>📍 {place(row)}</AppText>
        </View>
        <View style={styles.topScore}>
          <View style={styles.topScoreRow}>
            <AppText size={28} family="InterBold" color={colors.white}>{row.rating.toFixed(2)}</AppText>
            <AppText size={12} family="InterSemiBold" color="rgba(255,255,255,0.75)" style={styles.topOutOf}>/2</AppText>
          </View>
          <View style={styles.topBarWrap}>
            <ScoreBar rating={row.rating} color={colors.goldLight} track="rgba(255,255,255,0.25)" />
          </View>
        </View>
      </View>

      <View style={styles.topParams}>
        {PARAMS.map((param, i) => (
          <View key={param.key} style={[styles.topParam, i > 0 && styles.topParamDivider]}>
            <View style={styles.topParamValue}>
              <View style={[styles.topParamDot, { backgroundColor: paramColor(row.ratings[param.key]) }]} />
              <AppText size={14} family="InterBold" color={colors.white} numLines={1}>{param.value(row)}</AppText>
            </View>
            <AppText size={10} family="InterMedium" color="rgba(255,255,255,0.75)" align="center" numLines={1}>{param.label}</AppText>
          </View>
        ))}
      </View>
    </View>
  </View>
);

type SubZoneRow = AsmRating & { group: string };

// Best ASM of a sub zone
const SubZoneCard = ({ row }: { row: SubZoneRow }) => {
  const accent = zoneColor(row.zone);
  const color = ratingColor(row.rating);
  return (
    <View style={[styles.zoneCard, shadowStyle]}>
      <View style={[styles.zoneAccent, { backgroundColor: accent }]} />
      <View style={styles.zoneHead}>
        <AppText size={10} family="InterBold" color={accent} numLines={1} style={styles.zoneGroup}>
          {(row.zone || '—').toUpperCase()}{row.group && row.group !== row.zone ? ` · ${row.group.toUpperCase()}` : ''}
        </AppText>
        <AppText size={13}>🥇</AppText>
      </View>
      <View style={styles.zoneBody}>
        <Avatar row={row} size={40} />
        <View style={styles.zoneInfo}>
          <AppText size={14} family="InterBold" color="#202432" numLines={1}>{row.name}</AppText>
          <AppText size={11} family="InterMedium" color="#9094A3" numLines={1}>
            {[row.employee_code, row.location].filter(Boolean).join(' · ') || 'ASM'}
          </AppText>
        </View>
      </View>
      <View style={styles.zoneScoreRow}>
        <View style={styles.zoneScore}>
          <AppText size={18} family="InterBold" color={color}>{row.rating.toFixed(2)}</AppText>
          <AppText size={11} family="InterSemiBold" color="#9094A3" style={styles.zoneOutOf}>/2</AppText>
        </View>
        <View style={[styles.zoneTag, { backgroundColor: `${color}1A` }]}>
          <AppText size={10} family="InterBold" color={color}>{ratingLabel(row.rating)}</AppText>
        </View>
      </View>
      <ScoreBar rating={row.rating} color={color} track="#F1ECDF" />
    </View>
  );
};

const TICKER_SPEED = 35; // px per second

/**
 * Sub zone cards running right to left without stopping, like a news ticker. The cards are drawn twice in a
 * row; when the first set has fully moved out, the strip jumps back to the start, which looks identical, so
 * the run never breaks. Holding a card pauses it. If all cards fit on screen they just stand still.
 */
const SubZoneCarousel = ({ rows }: { rows: SubZoneRow[] }) => {
  const offset = useRef(new Animated.Value(0)).current;
  const position = useRef(0);
  const [viewWidth, setViewWidth] = useState(0);
  const [setWidth, setSetWidth] = useState(0);
  const running = setWidth > 0 && viewWidth > 0 && setWidth > viewWidth;

  useEffect(() => {
    const id = offset.addListener(({ value }) => { position.current = value; });
    return () => offset.removeListener(id);
  }, [offset]);

  // run from the current position to the end of the first set, then start over
  const start = useCallback(() => {
    if (!running) return;
    const remaining = setWidth + position.current;
    Animated.timing(offset, {
      toValue: -setWidth,
      duration: (remaining / TICKER_SPEED) * 1000,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        offset.setValue(0);
        position.current = 0;
        start();
      }
    });
  }, [running, setWidth, offset]);

  useEffect(() => {
    offset.setValue(0);
    position.current = 0;
    start();
    return () => offset.stopAnimation();
  }, [start, offset]);

  return (
    <Pressable
      style={styles.zoneScroll}
      onLayout={e => setViewWidth(e.nativeEvent.layout.width)}
      onPressIn={() => offset.stopAnimation()}
      onPressOut={start}
    >
      <Animated.View style={[styles.tickerTrack, { transform: [{ translateX: offset }] }]}>
        <View style={styles.tickerSet} onLayout={e => setSetWidth(e.nativeEvent.layout.width)}>
          {rows.map(row => <SubZoneCard key={`${row.zone}-${row.group}`} row={row} />)}
        </View>
        {running && (
          <View style={styles.tickerSet}>
            {rows.map(row => <SubZoneCard key={`copy-${row.zone}-${row.group}`} row={row} />)}
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
};

const RatingCard = ({ row, onPress }: { row: AsmRating; onPress: () => void }) => (
  <Pressable style={({ pressed }) => [styles.card, shadowStyle, pressed && styles.cardPressed]} onPress={onPress}>
    <View style={styles.cardHeader}>
      <View style={styles.rank}>
        <AppText size={13} family="InterBold" color={colors.blue}>#{row.rank}</AppText>
      </View>
      <View style={styles.cardTitle}>
        <AppText size={17} family="InterBold" color="#202432" numLines={1}>{row.name}</AppText>
        <AppText size={13} family="InterMedium" color="#9094A3" numLines={1}>
          {[row.employee_code, row.location, row.zone].filter(Boolean).join(' · ')}
        </AppText>
      </View>
      <View style={[styles.badge, { backgroundColor: ratingColor(row.rating) }]}>
        <AppText size={11} family="InterSemiBold" color={colors.white}>RATING </AppText>
        <AppText size={18} family="InterBold" color={colors.white}>{row.rating.toFixed(2)}</AppText>
      </View>
    </View>
    <View style={styles.divider} />
    <View style={styles.params}>
      {PARAMS.map(param => (
        <View key={param.key} style={styles.param}>
          <AppText size={12} family="InterMedium" color="#9094A3" align="center">{param.label}</AppText>
          <AppText size={16} family="InterBold" color={paramColor(row.ratings[param.key])} align="center">{param.value(row)}</AppText>
          <AppText size={11} family="InterSemiBold" color="#B0ACA0" align="center">{row.ratings[param.key]}/2</AppText>
        </View>
      ))}
    </View>
  </Pressable>
);

const RatingScreen = () => {
  const [report, setReport] = useState<AsmRatingReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<AsmRating | null>(null);

  const fetchRating = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const res: any = await getAsmRatingApi();
      if (typeof res === 'string') {
        setError(res);
      } else {
        setReport(res?.data?.data || null);
        setError('');
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Could not load ratings. Pull down to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRating();
  }, [fetchRating]);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const all = report?.rows || [];
    if (!query) return all;
    return all.filter(row =>
      [row.name, row.employee_code, row.location, row.zone].some(value => (value || '').toLowerCase().includes(query)),
    );
  }, [report, search]);

  const header = report ? (
    <View>
      {report.top && <TopPerformer row={report.top} period={report.period} />}
      {(report.sub_zone_top || []).length > 0 && (
        <View style={styles.section}>
          <SectionTitle title="Sub Zone Top Performers" right={`${report.sub_zone_top.length} sub zones`} />
          <SubZoneCarousel rows={report.sub_zone_top} />
        </View>
      )}
      <View style={styles.listHead}>
        <AppText size={16} family="InterBold" color="#202432">Ratings ({report.count})</AppText>
        <View style={styles.asmChip}>
          <AppText size={14} family="InterBold" color={colors.white}>ASM</AppText>
        </View>
      </View>
      <AppText size={13} family="InterMedium" color="#8A8578" style={styles.listSub}>
        {report.period} · average {report.average.toFixed(2)} / 2
      </AppText>
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search ASM, code, location or zone"
        placeholderTextColor="#A9A59A"
        style={styles.search}
      />
    </View>
  ) : null;

  return (
    <View style={styles.screen}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <View style={styles.header}>
        <LinearGradient {...brandGradient} style={StyleSheet.absoluteFill} />
        <SpinningGear size={140} teeth={12} color="rgba(255,255,255,0.4)" duration={20000} style={styles.headerGear} />
        <SafeAreaView edges={['top']}>
          <AppText size={22} family="InterBold" color={colors.blue} style={styles.headerTitle}>Rating</AppText>
        </SafeAreaView>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.gold} />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={row => String(row.user_id)}
          renderItem={({ item }) => <RatingCard row={item} onPress={() => setSelected(item)} />}
          ListHeaderComponent={header}
          ListEmptyComponent={
            <AppText size={14} family="InterMedium" color="#8A8578" align="center" style={styles.empty}>
              {error || (search ? 'No ASM matches your search.' : 'No ratings available for last month.')}
            </AppText>
          }
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchRating(true)} />}
        />
      )}
      <RatingDetailModal row={selected} onClose={() => setSelected(null)} />
    </View>
  );
};

export default RatingScreen;
