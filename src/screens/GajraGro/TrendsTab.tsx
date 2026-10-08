import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, LayoutChangeEvent, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient as SvgGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import AppText from '../../components/AppText/AppText';
import { colors } from '../../utils/Colors';
import { formatShortNumber } from '../../utils/misc';
import { shadowStyle } from '../../utils/typography';
import { GroCategory, GroMovementMonth, GroTrendMonth, GroTrends, getGajraGroTrendsApi } from '../../api/query/GajraGroApi';
import { mechanicCategoryColour } from '../../components/atoms/MechanicCategoryBadge';

type Metric = 'points' | 'scans' | 'active';

const METRICS: { key: Metric; label: string; title: string }[] = [
  { key: 'points', label: 'Points', title: 'Points issued' },
  { key: 'scans', label: 'Scans', title: 'Coupon scans' },
  { key: 'active', label: 'Mechanics', title: 'Mechanics scanning' },
];

// Bronze is left out, as on the CRM dashboard
const MOVE_TIERS: GroCategory[] = ['Platinum', 'Diamond', 'Gold', 'Silver'];

const INK = '#202432';
const MUTED = '#9094A3';
const GOOD = '#1E9E4A';
const BAD = '#D64545';
const ISSUED = '#E0A800';
const REDEEMED = '#202432';

const CHART_H = 210;
const PAD = { l: 40, r: 10, t: 26, b: 22 };

const num = (v: number) => Math.round(v || 0).toLocaleString('en-IN');
const short = (v: number) => formatShortNumber(Math.round(v || 0));
const monthYear = (m: string) => {
  const [y, mo] = m.split('-');
  return `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Number(mo) - 1]} ${y}`;
};
const growth = (cur: number, prev: number) => (prev ? ((cur - prev) * 100) / prev : null);
const growthText = (g: number | null) => (g === null ? '—' : `${g >= 0 ? '+' : ''}${g.toFixed(1)}%`);

// 1, 2, 2.5, 5 or 10 x a power of ten, at least v
const niceMax = (v: number) => {
  if (!v) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
};

// smooth line through [[x, y], ...]
const smooth = (pts: number[][]) =>
  pts.reduce((d, q, i) => {
    if (!i) return `M${q[0]},${q[1]}`;
    const p = pts[i - 1];
    const mx = (p[0] + q[0]) / 2;
    return `${d} C${mx},${p[1]} ${mx},${q[1]} ${q[0]},${q[1]}`;
  }, '');

const Chip = ({ label, selected, onPress, colour }: { label: string; selected: boolean; onPress: () => void; colour?: string }) => (
  <Pressable
    onPress={onPress}
    style={[styles.chip, colour ? { borderColor: colour } : null, selected && { backgroundColor: colour || colors.blue }]}
  >
    <AppText size={12} family="InterSemiBold" color={selected ? colors.white : colour || colors.blue}>{label}</AppText>
  </Pressable>
);

const StatBox = ({ title, value, sub, highlight, valueColor }: { title: string; value: string; sub: string; highlight?: boolean; valueColor?: string }) => (
  <View style={[styles.statBox, highlight && styles.statBoxHl]}>
    <AppText size={10} family="InterBold" color={MUTED} numLines={1}>{title.toUpperCase()}</AppText>
    <AppText size={18} family="InterBold" color={valueColor || INK} numLines={1}>{value}</AppText>
    <AppText size={11} family="InterMedium" color={MUTED} numLines={1}>{sub}</AppText>
  </View>
);

// Grid lines with y-axis labels, month labels and a tap band per month
const ChartFrame = ({ width, max, labels, fmt, selected, onSelect, children }: {
  width: number; max: number; labels: string[]; fmt: (v: number) => string; selected: number; onSelect: (i: number) => void; children: React.ReactNode;
}) => {
  const iw = width - PAD.l - PAD.r;
  const ih = CHART_H - PAD.t - PAD.b;
  const step = iw / labels.length;
  return (
    <View>
      <Svg width={width} height={CHART_H}>
        {[0, 1, 2, 3, 4].map(k => {
          const gy = PAD.t + ih - (ih * k) / 4;
          return (
            <G key={k}>
              <Line x1={PAD.l} x2={width - PAD.r} y1={gy} y2={gy} stroke="#EFEAE0" strokeWidth={1} />
              <SvgText x={PAD.l - 6} y={gy + 3} fontSize={9} fill={MUTED} textAnchor="end">{fmt((max * k) / 4)}</SvgText>
            </G>
          );
        })}
        {labels.map((label, i) => (
          <SvgText
            key={`${label}-${i}`}
            x={PAD.l + step * (i + 0.5)}
            y={CHART_H - 6}
            fontSize={9}
            fontWeight={i === selected ? '700' : '400'}
            fill={i === selected ? INK : MUTED}
            textAnchor="middle"
          >
            {label}
          </SvgText>
        ))}
        <Line
          x1={PAD.l + step * (selected + 0.5)}
          x2={PAD.l + step * (selected + 0.5)}
          y1={PAD.t}
          y2={PAD.t + ih}
          stroke="#D6D9DE"
          strokeDasharray="3 3"
        />
        {children}
      </Svg>
      <View style={[styles.bands, { left: PAD.l, width: iw, top: PAD.t, height: ih + PAD.b }]}>
        {labels.map((label, i) => (
          <Pressable key={`${label}-${i}`} style={styles.band} onPress={() => onSelect(i)} />
        ))}
      </View>
    </View>
  );
};

// Monthly Performance: points issued (area) and redeemed (line), or scans / mechanics as bars, with the average
const PerformanceCard = ({ trend, period }: { trend: GroTrendMonth[]; period: string }) => {
  const [metric, setMetric] = useState<Metric>('points');
  const [width, setWidth] = useState(0);
  const n = trend.length;
  const [selected, setSelected] = useState(n - 1);
  const M = METRICS.find(m => m.key === metric)!;
  const fmt = metric === 'points' ? short : num;

  const vals = trend.map(m => m[metric]);
  const last = vals[n - 1];
  const prev = n > 1 ? vals[n - 2] : 0;
  const best = vals.indexOf(Math.max(...vals));
  const avg = vals.reduce((a, v) => a + v, 0) / (n || 1);
  const above = vals.filter(v => v > avg).length;
  const g = growth(last, prev);

  const iw = width - PAD.l - PAD.r;
  const ih = CHART_H - PAD.t - PAD.b;
  const step = iw / n;
  const series = metric === 'points' ? trend.map(m => Math.max(m.points, m.redeemed)) : vals;
  const max = niceMax(Math.max(0, ...series));
  const x = (i: number) => PAD.l + step * (i + 0.5);
  const y = (v: number) => PAD.t + ih - (v / max) * ih;

  let marks: React.ReactNode = null;
  if (width > 0 && metric === 'points') {
    const issued = trend.map((m, i) => [x(i), y(m.points)]);
    const redeemed = trend.map((m, i) => [x(i), y(m.redeemed)]);
    marks = (
      <>
        <Path d={`${smooth(issued)} L${x(n - 1)},${PAD.t + ih} L${x(0)},${PAD.t + ih} Z`} fill="url(#perfArea)" />
        <Path d={smooth(redeemed)} stroke={REDEEMED} strokeWidth={2} fill="none" />
        <Path d={smooth(issued)} stroke={ISSUED} strokeWidth={2.5} fill="none" />
        {issued.map((p, i) => (
          <G key={i}>
            <Circle cx={p[0]} cy={p[1]} r={i === selected ? 5 : 3} fill={colors.white} stroke={ISSUED} strokeWidth={2} />
            <Circle cx={redeemed[i][0]} cy={redeemed[i][1]} r={i === selected ? 4.5 : 2.5} fill={colors.white} stroke={REDEEMED} strokeWidth={1.8} />
          </G>
        ))}
      </>
    );
  } else if (width > 0) {
    const bw = Math.min(18, step * 0.6);
    marks = vals.map((v, i) => (
      <Rect
        key={i}
        x={x(i) - bw / 2}
        y={y(v)}
        width={bw}
        height={Math.max(0, PAD.t + ih - y(v))}
        rx={4}
        fill={metric === 'scans' ? 'url(#perfBar)' : i === n - 1 ? colors.gold : INK}
        opacity={i === selected ? 1 : 0.55}
      />
    ));
  }

  const peakTag = `Peak · ${fmt(vals[best])}`;
  const tw = peakTag.length * 5.6 + 12;
  const sel = trend[Math.min(selected, n - 1)];

  return (
    <View style={[styles.card, shadowStyle]}>
      <AppText size={15} family="InterBold" color={INK}>Monthly Performance</AppText>
      <AppText size={11} family="InterMedium" color={MUTED}>{M.title} per month · {period}</AppText>

      <View style={styles.chipRow}>
        {METRICS.map(m => (
          <Chip key={m.key} label={m.label} selected={metric === m.key} onPress={() => setMetric(m.key)} />
        ))}
      </View>

      <View style={styles.statGrid}>
        <StatBox highlight title={monthYear(trend[n - 1].month)} value={fmt(last)} sub={M.title.toLowerCase()} />
        <StatBox
          title="vs previous month"
          value={growthText(g)}
          valueColor={g === null ? INK : g >= 0 ? GOOD : BAD}
          sub={n > 1 ? `${fmt(prev)} in ${trend[n - 2].label}` : ' '}
        />
        <StatBox title="Best month" value={fmt(vals[best])} sub={monthYear(trend[best].month)} />
        <StatBox title="Monthly average" value={fmt(avg)} sub={`${above} of ${n} months above avg`} />
      </View>

      <View style={styles.legend}>
        {metric === 'points' ? (
          <>
            <LegendKey colour={ISSUED} label="Issued" />
            <LegendKey colour={REDEEMED} label="Redeemed" />
          </>
        ) : (
          <LegendKey colour={metric === 'scans' ? ISSUED : INK} label={M.title} />
        )}
        <LegendKey colour="#9AA0A8" label="Average" />
      </View>

      <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && (
          <ChartFrame width={width} max={max} labels={trend.map(m => m.label)} fmt={fmt} selected={selected} onSelect={setSelected}>
            <Defs>
              <SvgGradient id="perfArea" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#F5C518" stopOpacity={0.35} />
                <Stop offset="1" stopColor="#F5C518" stopOpacity={0} />
              </SvgGradient>
              <SvgGradient id="perfBar" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#FACC15" />
                <Stop offset="1" stopColor="#EAB308" />
              </SvgGradient>
            </Defs>
            {marks}
            <Line x1={PAD.l} x2={width - PAD.r} y1={y(avg)} y2={y(avg)} stroke="#9AA0A8" strokeDasharray="5 5" strokeWidth={1.2} />
            <SvgText x={width - PAD.r} y={y(avg) - 4} fontSize={9} fontWeight="700" fill="#6B7280" textAnchor="end">avg {fmt(avg)}</SvgText>
            <G>
              <Rect
                x={Math.min(width - PAD.r - tw, Math.max(PAD.l, x(best) - tw / 2))}
                y={Math.max(0, y(vals[best]) - 24)}
                width={tw}
                height={17}
                rx={8.5}
                fill={INK}
              />
              <SvgText
                x={Math.min(width - PAD.r - tw / 2, Math.max(PAD.l + tw / 2, x(best)))}
                y={Math.max(0, y(vals[best]) - 24) + 12}
                fontSize={9}
                fontWeight="700"
                fill={colors.gold}
                textAnchor="middle"
              >
                {peakTag}
              </SvgText>
            </G>
          </ChartFrame>
        )}
      </View>

      {!!sel && (
        <View style={styles.detail}>
          <AppText size={12} family="InterBold" color={INK}>{monthYear(sel.month)}</AppText>
          <AppText size={11} family="InterMedium" color="#6E6A60">
            Issued {num(sel.points)} · Redeemed {num(sel.redeemed)}
          </AppText>
          <AppText size={11} family="InterMedium" color="#6E6A60">
            {num(sel.scans)} scans · {num(sel.active)} mechanics
          </AppText>
        </View>
      )}
      <AppText size={10} family="InterMedium" color="#A9A59A" style={styles.hint}>Tap a month for its figures</AppText>
    </View>
  );
};

const LegendKey = ({ colour, label }: { colour: string; label: string }) => (
  <View style={styles.legendKey}>
    <View style={[styles.legendDot, { backgroundColor: colour }]} />
    <AppText size={11} family="InterMedium" color={MUTED}>{label}</AppText>
  </View>
);

const MoM = ({ cur, prev }: { cur: number; prev: number }) => {
  if (!prev) return <AppText size={12} family="InterBold" color={MUTED}>{cur ? 'new' : '—'}</AppText>;
  const g = ((cur - prev) * 100) / prev;
  return (
    <AppText size={12} family="InterBold" color={g > 0 ? GOOD : g < 0 ? BAD : MUTED}>
      {g > 0 ? '▲ +' : g < 0 ? '▼ ' : ''}{g.toFixed(1)}%
    </AppText>
  );
};

// Tier Movement: one tier's mechanics at each month end, then last month vs the one before for all tiers
const MovementCard = ({ movement }: { movement: GroMovementMonth[] }) => {
  const [tier, setTier] = useState<GroCategory>('Platinum');
  const [width, setWidth] = useState(0);
  const n = movement.length;
  const [selected, setSelected] = useState(n - 1);
  const colour = mechanicCategoryColour(tier);

  const first = movement[0];
  const prev = movement[n - 2];
  const last = movement[n - 1];
  const vals = movement.map(m => m.counts[tier] || 0);
  const best = vals.indexOf(Math.max(...vals));
  const cur = vals[n - 1];
  const before = vals[n - 2];
  const since = cur - vals[0];
  const g = growth(cur, before);

  const iw = width - PAD.l - PAD.r;
  const ih = CHART_H - PAD.t - PAD.b;
  const step = iw / n;
  const max = niceMax(Math.max(0, ...vals) * 1.1);
  const x = (i: number) => PAD.l + step * (i + 0.5);
  const y = (v: number) => PAD.t + ih - (v / max) * ih;
  const pts = vals.map((v, i) => [x(i), y(v)]);
  const peakTag = `Peak · ${num(vals[best])}`;
  const tw = peakTag.length * 5.6 + 12;

  const sum = (m: GroMovementMonth) => MOVE_TIERS.reduce((t, k) => t + (m.counts[k] || 0), 0);
  const sel = movement[Math.min(selected, n - 1)];

  // biggest climb since the first month, last month's movers and the four tiers together
  const pct = (a: number, b: number) => (a ? ((b - a) * 100) / a : null);
  const lines: string[] = [];
  let top: { tier: GroCategory; g: number } | null = null;
  MOVE_TIERS.forEach(t => {
    const tg = pct(first.counts[t] || 0, last.counts[t] || 0);
    if (tg !== null && (!top || tg > top.g)) top = { tier: t, g: tg };
  });
  const topTier = top as { tier: GroCategory; g: number } | null;
  if (topTier && topTier.g > 0) {
    lines.push(`${topTier.tier} grew from ${num(first.counts[topTier.tier] || 0)} (${first.label}) to ${num(last.counts[topTier.tier] || 0)} (${last.label}), ${growthText(topTier.g)}.`);
  }
  const up: string[] = [];
  const down: string[] = [];
  MOVE_TIERS.forEach(t => {
    const tg = pct(prev.counts[t] || 0, last.counts[t] || 0);
    if (tg !== null && tg > 0) up.push(`${t} ${growthText(tg)}`);
    if (tg !== null && tg < 0) down.push(`${t} ${growthText(tg)}`);
  });
  if (up.length) lines.push(`Up vs ${prev.label}: ${up.join(', ')}.`);
  if (down.length) lines.push(`Down vs ${prev.label}: ${down.join(', ')} (moved to another tier or stopped scanning).`);
  const totalG = pct(sum(first), sum(last));
  if (totalG !== null) lines.push(`Platinum to Silver together: ${num(sum(first))} → ${num(sum(last))} since ${first.label} (${growthText(totalG)}).`);

  return (
    <View style={[styles.card, shadowStyle]}>
      <AppText size={15} family="InterBold" color={INK}>Tier Movement</AppText>
      <AppText size={11} family="InterMedium" color={MUTED}>
        {tier} mechanics at each month end · {first.label} – {monthYear(last.month)} · tier re-computed monthly on the trailing 12 months
      </AppText>

      <View style={styles.chipRow}>
        {MOVE_TIERS.map(t => (
          <Chip key={t} label={t} colour={mechanicCategoryColour(t)} selected={tier === t} onPress={() => setTier(t)} />
        ))}
      </View>

      <View style={styles.statGrid}>
        <StatBox highlight title={monthYear(last.month)} value={num(cur)} sub={`${tier.toLowerCase()} mechanics`} />
        <StatBox
          title="vs previous month"
          value={growthText(g)}
          valueColor={g === null ? INK : g >= 0 ? GOOD : BAD}
          sub={`${num(before)} in ${prev.label}`}
        />
        <StatBox
          title={`Since ${first.label}`}
          value={`${since > 0 ? '+' : ''}${num(since)}`}
          sub={`${num(vals[0])} → ${num(cur)} · ${growthText(growth(cur, vals[0]))}`}
        />
        <StatBox title="Best month" value={num(vals[best])} sub={monthYear(movement[best].month)} />
      </View>

      <View style={{ marginTop: 10 }} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && (
          <ChartFrame
            width={width}
            max={max}
            labels={movement.map(m => m.label)}
            fmt={v => (v % 1 ? v.toFixed(1) : num(v))}
            selected={selected}
            onSelect={setSelected}
          >
            <Defs>
              <SvgGradient id="moveArea" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colour} stopOpacity={0.28} />
                <Stop offset="1" stopColor={colour} stopOpacity={0} />
              </SvgGradient>
            </Defs>
            <Path d={`${smooth(pts)} L${x(n - 1)},${PAD.t + ih} L${x(0)},${PAD.t + ih} Z`} fill="url(#moveArea)" />
            <Path d={smooth(pts)} stroke={colour} strokeWidth={2.5} fill="none" />
            {pts.map((p, i) => (
              <Circle key={i} cx={p[0]} cy={p[1]} r={i === selected ? 5.5 : 3.5} fill={colors.white} stroke={colour} strokeWidth={2} />
            ))}
            <Rect
              x={Math.min(width - PAD.r - tw, Math.max(PAD.l, x(best) - tw / 2))}
              y={Math.max(0, y(vals[best]) - 24)}
              width={tw}
              height={17}
              rx={8.5}
              fill={INK}
            />
            <SvgText
              x={Math.min(width - PAD.r - tw / 2, Math.max(PAD.l + tw / 2, x(best)))}
              y={Math.max(0, y(vals[best]) - 24) + 12}
              fontSize={9}
              fontWeight="700"
              fill={colors.gold}
              textAnchor="middle"
            >
              {peakTag}
            </SvgText>
          </ChartFrame>
        )}
      </View>

      {!!sel && (
        <View style={styles.detail}>
          <AppText size={12} family="InterBold" color={INK}>
            {monthYear(sel.month)} · {tier} {num(sel.counts[tier] || 0)}
            {selected > 0 ? ` (${vals[selected] - vals[selected - 1] >= 0 ? '+' : ''}${num(vals[selected] - vals[selected - 1])} vs ${movement[selected - 1].label})` : ''}
          </AppText>
          <AppText size={11} family="InterMedium" color="#6E6A60">
            {MOVE_TIERS.filter(t => t !== tier).map(t => `${t} ${num(sel.counts[t] || 0)}`).join(' · ')}
          </AppText>
        </View>
      )}

      <AppText size={11} family="InterBold" color={MUTED} style={styles.tableTitle}>
        {`${prev.label} → ${last.label} MOVEMENT`}
      </AppText>
      <View style={styles.tableHead}>
        <AppText size={10} family="InterBold" color={MUTED} style={styles.tierCol}>TIER</AppText>
        <AppText size={10} family="InterBold" color={MUTED} style={styles.numCol}>{prev.label.toUpperCase()}</AppText>
        <AppText size={10} family="InterBold" color={MUTED} style={styles.numCol}>{last.label.toUpperCase()}</AppText>
        <AppText size={10} family="InterBold" color={MUTED} style={styles.numCol}>MOM</AppText>
      </View>
      {MOVE_TIERS.map(t => {
        const a = prev.counts[t] || 0;
        const b = last.counts[t] || 0;
        return (
          <View key={t} style={styles.tableRow}>
            <View style={[styles.tierCol, styles.tierCell]}>
              <View style={[styles.legendDot, { backgroundColor: mechanicCategoryColour(t) }]} />
              <AppText size={12} family="InterBold" color={INK}>{t}</AppText>
            </View>
            <AppText size={12} family="InterMedium" color="#4A4A4A" style={styles.numCol}>{num(a)}</AppText>
            <AppText size={12} family="InterBold" color={INK} style={styles.numCol}>{num(b)}</AppText>
            <View style={styles.numCol}><MoM cur={b} prev={a} /></View>
          </View>
        );
      })}
      <View style={[styles.tableRow, styles.totalRow]}>
        <AppText size={12} family="InterBold" color={INK} style={styles.tierCol}>Total</AppText>
        <AppText size={12} family="InterBold" color={INK} style={styles.numCol}>{num(sum(prev))}</AppText>
        <AppText size={12} family="InterBold" color={INK} style={styles.numCol}>{num(sum(last))}</AppText>
        <View style={styles.numCol}><MoM cur={sum(last)} prev={sum(prev)} /></View>
      </View>

      <View style={styles.insight}>
        <AppText size={12} family="InterMedium" color="#4A4535" lineHeight={18}>
          📌 {lines.join(' ') || 'No change in the tiers yet.'}
        </AppText>
      </View>
    </View>
  );
};

// Trends tab: the CRM dashboard's Monthly Performance and Tier Movement charts
const TrendsTab = () => {
  const [data, setData] = useState<GroTrends | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const res: any = await getGajraGroTrendsApi();
      if (typeof res === 'string') {
        setError(res);
      } else {
        setData(res?.data?.data || null);
        setError('');
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Could not load trends. Pull down to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  const hasTrend = !!data?.trend?.length;
  const hasMovement = (data?.movement?.length || 0) >= 2;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} />}
    >
      {!hasTrend && !hasMovement ? (
        <AppText size={14} family="InterMedium" color="#8A8578" align="center" style={styles.empty}>
          {error || 'No Gajra Gro data yet.'}
        </AppText>
      ) : (
        <>
          {data?.scope === 'all' && (
            <AppText size={11} family="InterMedium" color="#8A8578" style={styles.scope}>Showing all mechanics</AppText>
          )}
          {hasTrend && <PerformanceCard trend={data!.trend} period={data!.period} />}
          {hasMovement && <MovementCard movement={data!.movement} />}
          {!!data?.missing_months?.length && (
            <AppText size={11} family="InterMedium" color="#B45309" style={styles.footer}>
              Not synced from Gajra Gro yet: {data.missing_months.map(monthYear).join(', ')}. These months count as zero.
            </AppText>
          )}
          {!!data?.synced_at && (
            <AppText size={11} family="InterMedium" color="#A9A59A" align="center" style={styles.footer}>
              Gajra Gro data last synced {data.synced_at}
            </AppText>
          )}
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgColor },
  center: { alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, paddingTop: 4, paddingBottom: 40 },
  empty: { marginTop: 30, paddingHorizontal: 20 },
  scope: { marginBottom: 8, marginLeft: 2 },
  footer: { marginTop: 4, marginBottom: 6 },

  card: { backgroundColor: colors.white, borderRadius: 16, padding: 14, marginBottom: 14 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: { borderWidth: 1.5, borderColor: colors.blue, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },

  statGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8, marginTop: 12 },
  statBox: { width: '48.5%', padding: 10, borderRadius: 12, backgroundColor: '#F8F9FB', borderWidth: 1, borderColor: '#EFEAE0', gap: 2 },
  statBoxHl: { backgroundColor: colors.goldSoft, borderColor: '#FDE68A' },

  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12, marginBottom: 2 },
  legendKey: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 9, height: 9, borderRadius: 3 },

  bands: { position: 'absolute', flexDirection: 'row' },
  band: { flex: 1 },
  detail: { marginTop: 4, padding: 10, borderRadius: 10, backgroundColor: '#F7F4EC', gap: 2 },
  hint: { marginTop: 6, textAlign: 'center' },

  tableTitle: { marginTop: 16, marginBottom: 6, letterSpacing: 0.6 },
  tableHead: { flexDirection: 'row', paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: '#EFEAE0' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3EFE6' },
  totalRow: { backgroundColor: colors.goldSoft, borderBottomWidth: 0, borderRadius: 8, paddingHorizontal: 4, marginTop: 2 },
  tierCol: { flex: 1.4 },
  tierCell: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  numCol: { flex: 1, alignItems: 'flex-end', textAlign: 'right' },
  insight: { marginTop: 14, padding: 12, borderRadius: 12, backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A' },
});

export default TrendsTab;
