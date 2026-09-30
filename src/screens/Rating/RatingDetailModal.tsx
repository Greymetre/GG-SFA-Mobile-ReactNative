import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Line } from 'react-native-svg';
import AppText from '../../components/AppText/AppText';
import { colors } from '../../utils/Colors';
import { AsmRating, AsmRatingDetail, RatingDriver, getAsmRatingDetailApi } from '../../api/query/RatingApi';

const GREEN = '#1E9E4A';
const AMBER = '#E08A00';
const RED = '#D93025';
const ratingColor = (rating: number) => (rating >= 1.5 ? GREEN : rating >= 1 ? AMBER : RED);
const driverColor = (rating: number) => [RED, AMBER, GREEN][rating] || RED;

const DRIVER_NAMES: Record<string, string> = {
  category: 'Mechanic Category',
  orders: 'Orders vs Target',
  activation: 'New Mechanic Activation',
  visit: 'Customer Visits',
};

const CHART_HEIGHT = 130;
const BAR_WIDTH = 24;

// Least-squares line through the monthly ratings: [value at first month, change per month]
const trendLine = (values: number[]) => {
  const n = values.length;
  if (n < 2) return [values[0] || 0, 0];
  const meanX = (n - 1) / 2;
  const meanY = values.reduce((sum, v) => sum + v, 0) / n;
  let num = 0;
  let den = 0;
  values.forEach((v, i) => {
    num += (i - meanX) * (v - meanY);
    den += (i - meanX) ** 2;
  });
  const slope = den ? num / den : 0;
  return [meanY - slope * meanX, slope];
};

const pct = (v: number) => `${Number.isInteger(v) ? v : v.toFixed(1)}`;

const DriverCard = ({ driver }: { driver: RatingDriver }) => {
  const color = driverColor(driver.rating);
  return (
    <View style={styles.driver}>
      <View style={styles.driverInfo}>
        <AppText size={15} family="InterBold" color="#202432" numLines={1}>{DRIVER_NAMES[driver.key] || driver.title}</AppText>
        <AppText size={12} family="InterMedium" color="#6E6A60">{driver.detail}</AppText>
        <AppText size={11} family="InterMedium" color="#A09B8E">
          Weight {Math.round(driver.weight * 100)}% · Score {driver.score.toFixed(2)}/{driver.max_score.toFixed(2)}
        </AppText>
      </View>
      <View style={styles.driverValue}>
        <AppText size={18} family="InterBold" color={color}>{pct(driver.value)}{driver.unit}</AppText>
        <View style={[styles.driverRating, { backgroundColor: `${color}1A` }]}>
          <AppText size={10} family="InterBold" color={color}>{driver.rating}/2</AppText>
        </View>
      </View>
    </View>
  );
};

/** Popup for a rating card: 6-month rating trend and the rating drivers of the month tapped in the chart */
const RatingDetailModal = ({ row, onClose }: { row: AsmRating | null; onClose: () => void }) => {
  const [detail, setDetail] = useState<AsmRatingDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(0);
  const [chartWidth, setChartWidth] = useState(0);

  useEffect(() => {
    if (!row) return;
    let alive = true;
    setDetail(null);
    setError('');
    setLoading(true);
    getAsmRatingDetailApi(row.user_id)
      .then((res: any) => {
        if (!alive) return;
        if (typeof res === 'string') {
          setError(res);
          return;
        }
        const data: AsmRatingDetail | null = res?.data?.data || null;
        setDetail(data);
        setSelected(Math.max(0, (data?.months.length || 1) - 1));
      })
      .catch((e: any) => alive && setError(e?.response?.data?.message || 'Could not load rating details.'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [row]);

  const months = useMemo(() => detail?.months || [], [detail]);
  const [intercept, slope] = useMemo(() => trendLine(months.map(m => m.rating)), [months]);
  const month = months[selected];
  const drivers = useMemo(
    () => [...(month?.parameters || [])].sort((a, b) => a.rating - b.rating || b.weight - a.weight),
    [month],
  );
  const attention = drivers.filter(d => d.rating < 2).length;

  const colWidth = months.length ? chartWidth / months.length : 0;
  const y = (rating: number) => CHART_HEIGHT * (1 - Math.max(0, Math.min(2, rating)) / 2);

  return (
    <Modal visible={!!row} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        {/* tap outside the sheet to close; kept behind the sheet so it never takes the sheet's scroll touches */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.head}>
            <LinearGradient colors={['#6B3F08', '#A8740F', '#D9A520']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <View style={styles.headText}>
              <AppText size={11} family="InterBold" color="rgba(255,255,255,0.8)" style={styles.headLabel}>ASM RATING DETAILS</AppText>
              <AppText size={20} family="InterBold" color={colors.white} numLines={1}>{row?.name}</AppText>
              <AppText size={12} family="InterMedium" color="rgba(255,255,255,0.85)" numLines={1}>
                {[row?.employee_code, row?.location, row?.zone].filter(Boolean).join(' · ')}
              </AppText>
            </View>
            <Pressable style={styles.close} onPress={onClose} hitSlop={8}>
              <AppText size={18} family="InterBold" color={colors.white}>✕</AppText>
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.gold} />
            </View>
          ) : !months.length ? (
            <View style={styles.center}>
              <AppText size={14} family="InterMedium" color="#8A8578" align="center">{error || 'No rating data found.'}</AppText>
            </View>
          ) : (
            <ScrollView style={styles.scroll} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} nestedScrollEnabled>
              <AppText size={13} family="InterMedium" color="#6E6A60">Tap a month to see what drove its rating.</AppText>
              <View style={styles.trendRow}>
                <AppText size={13} family="InterMedium" color="#6E6A60">Average trend</AppText>
                <View style={[styles.trendChip, slope < 0 && styles.trendChipDown]}>
                  <AppText size={13} family="InterBold" color={slope >= 0 ? GREEN : RED}>
                    {slope >= 0 ? '+' : ''}{slope.toFixed(2)} per month
                  </AppText>
                </View>
              </View>

              <View style={styles.chart}>
                <View style={styles.chartRow}>
                  {months.map(m => (
                    <AppText key={m.month} size={12} family="InterBold" color={ratingColor(m.rating)} align="center" style={styles.chartCol}>
                      {m.rating.toFixed(2)}
                    </AppText>
                  ))}
                </View>
                <View style={styles.bars} onLayout={e => setChartWidth(e.nativeEvent.layout.width)}>
                  {months.map((m, i) => (
                    <Pressable key={m.month} style={styles.chartCol} onPress={() => setSelected(i)}>
                      <View style={[styles.barTrack, i === selected && styles.barTrackOn]}>
                        <View style={[styles.barFill, { height: CHART_HEIGHT - y(m.rating), backgroundColor: ratingColor(m.rating) }]} />
                      </View>
                    </Pressable>
                  ))}
                  {months.length > 1 && chartWidth > 0 && (
                    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
                      <Line
                        x1={colWidth / 2 - 14}
                        y1={y(intercept - slope * (14 / colWidth))}
                        x2={chartWidth - colWidth / 2 + 14}
                        y2={y(intercept + slope * (months.length - 1 + 14 / colWidth))}
                        stroke="#8A5A0E"
                        strokeWidth={2.5}
                        strokeDasharray="9,6"
                      />
                    </Svg>
                  )}
                </View>
                <View style={styles.chartRow}>
                  {months.map((m, i) => (
                    <AppText
                      key={m.month}
                      size={13}
                      family={i === selected ? 'InterBold' : 'InterMedium'}
                      color={i === selected ? '#8A5A0E' : '#8A8578'}
                      align="center"
                      style={styles.chartCol}
                    >
                      {m.label}
                    </AppText>
                  ))}
                </View>
              </View>

              <AppText size={12} family="InterMedium" color="#8A8578" style={styles.periodLine}>
                {month.period} · rating {month.rating.toFixed(2)} / 2
              </AppText>
              {attention > 0 && (
                <>
                  <View style={styles.sectionHead}>
                    <AppText size={17} family="InterBold" color="#202432">Needs Attention</AppText>
                    <View style={styles.countChip}>
                      <AppText size={12} family="InterBold" color="#8A5A0E">{attention} of {drivers.length}</AppText>
                    </View>
                  </View>
                  <AppText size={12} family="InterMedium" color="#8A8578" style={styles.sectionSub}>
                    Drivers below full rating (2/2), weakest first.
                  </AppText>
                  {drivers.filter(d => d.rating < 2).map(driver => <DriverCard key={driver.key} driver={driver} />)}
                </>
              )}
              {attention === 0 && (
                <View style={styles.allGood}>
                  <AppText size={14} family="InterBold" color={GREEN} align="center">🎉 All parameters at full rating (2/2)</AppText>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20,18,12,0.55)',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 48,
  },
  sheet: { maxHeight: '100%', backgroundColor: '#FBFAF6', borderRadius: 22, overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 16, overflow: 'hidden' },
  headText: { flex: 1, gap: 2 },
  headLabel: { letterSpacing: 0.6 },
  close: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  center: { minHeight: 220, alignItems: 'center', justifyContent: 'center', padding: 24 },
  scroll: { flexShrink: 1 },
  body: { padding: 18, paddingBottom: 22 },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  trendChip: { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#E3F6EA' },
  trendChipDown: { backgroundColor: '#FDE8E6' },

  chart: {
    marginTop: 14,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EFEAE0',
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  chartRow: { flexDirection: 'row' },
  chartCol: { flex: 1, alignItems: 'center' },
  bars: { flexDirection: 'row', height: CHART_HEIGHT, marginVertical: 8 },
  barTrack: {
    width: BAR_WIDTH,
    height: CHART_HEIGHT,
    borderRadius: BAR_WIDTH / 2,
    backgroundColor: '#EFEDF3',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barTrackOn: { borderWidth: 2, borderColor: '#8A5A0E' },
  barFill: { width: '100%', borderRadius: BAR_WIDTH / 2 },

  periodLine: { marginTop: 18 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  countChip: { backgroundColor: colors.goldSoft, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 5 },
  allGood: { marginTop: 14, borderRadius: 14, backgroundColor: '#E3F6EA', padding: 14 },
  sectionSub: { marginTop: 4, marginBottom: 12 },

  driver: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EFEAE0',
    padding: 14,
    marginBottom: 10,
  },
  driverInfo: { flex: 1, gap: 3 },
  driverValue: { alignItems: 'flex-end', gap: 4 },
  driverRating: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
});

export default RatingDetailModal;
