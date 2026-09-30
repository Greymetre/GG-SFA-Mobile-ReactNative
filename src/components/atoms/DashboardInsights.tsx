import React, { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import AppText from '../AppText/AppText';
import { rw } from '../../utils/responsive';

type ZoneItem = { zone?: string; name?: string; parent_zone?: string; target?: number; achievement?: number; percentage?: number; percent?: number; pct?: number; achievement_percentage?: number };
type StateItem = { state?: string; name?: string; sales_value?: number; sales_value_lacs?: number; percentage?: number };
type HighlightItem = { label?: string; title?: string; description?: string; desc?: string; icon?: string; iconBg?: string };
type AlertItem = { title?: string; description?: string; desc?: string; severity?: 'high' | 'medium' | 'low'; icon?: string; zone?: string; type?: string; destination?: 'attendance' | 'target' | 'user_activity' | 'inactive_customers' };
type InactiveCustomer = { id?: number | string; name?: string; mobile?: string };

export const ZonePerformanceCard = ({ data }: { data: any }) => {
  const zones: ZoneItem[] = data?.zone_performance_mtd || data?.zone_performance || [];
  const visibleZones = zones.filter(item => {
    const zoneName = String(item.zone || item.name || '').trim().toLowerCase().replace(/\s+/g, ' ');
    return zoneName !== 'ho' && zoneName !== 'head office';
  });
  const sorted = [...visibleZones].sort((a, b) =>
    (b.percentage ?? b.percent ?? b.pct ?? b.achievement_percentage ?? 0) -
    (a.percentage ?? a.percent ?? a.pct ?? a.achievement_percentage ?? 0),
  );

  if (!sorted.length) {
    return (
      <View style={styles.card}>
        <AppText size={13} color="#6b7280" align="center">No sub zone performance data for this month yet</AppText>
      </View>
    );
  }

  const topPercentage = Number(
    sorted[0]?.percentage ?? sorted[0]?.percent ?? sorted[0]?.pct ?? sorted[0]?.achievement_percentage ?? 0,
  );

  return (
    <View style={styles.card}>
      <>
          <View style={styles.topZone}>
            <View style={styles.icon}><AppText size={18}>🏆</AppText></View>
            <View style={{ flex: 1 }}>
              <AppText size={11} color="#6b7280" family="InterMedium">Top Performing Sub Zone</AppText>
              <AppText size={14} color="#1f2437" family="InterSemiBold">
                {sorted[0]?.name || sorted[0]?.zone} — {Math.round(topPercentage)}% MTD Achievement
              </AppText>
            </View>
          </View>
          {sorted.map((item, index) => {
            const percentage = Math.max(0, Number(item.percentage ?? item.percent ?? item.pct ?? item.achievement_percentage ?? 0));
            const barWidth = Math.min(100, percentage);
            return (
              <View key={`${item.zone || item.name}-${index}`} style={styles.zoneRow}>
                <View style={styles.rowBetween}>
                  <View style={[styles.row, { flex: 1 }]}>
                    <View style={[styles.rank, index === 0 && styles.rankTop]}><AppText size={11} color="white" family="InterSemiBold">{index + 1}</AppText></View>
                    <View style={{ flex: 1 }}>
                      <AppText size={13} color="#1f2437" family="InterSemiBold" numLines={1}>{item.name || item.zone}</AppText>
                      {!!item.parent_zone && item.parent_zone !== (item.name || item.zone) && (
                        <AppText size={10} color="#8a8fa3" numLines={1}>{item.parent_zone} Zone</AppText>
                      )}
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <AppText size={13} color={index === 0 ? '#1f8a4c' : '#2B2B2B'} family="InterSemiBold">{Math.round(percentage)}%</AppText>
                    <AppText size={10} color="#8a8fa3">
                      ₹{(Number(item.achievement || 0) / 100000).toFixed(2)}L / ₹{(Number(item.target || 0) / 100000).toFixed(2)}L
                    </AppText>
                  </View>
                </View>
                <View style={styles.track}><View style={[styles.fill, { width: `${barWidth}%`, backgroundColor: index === 0 ? '#1f8a4c' : '#8b93ff' }]} /></View>
              </View>
            );
          })}
      </>
    </View>
  );
};

export const StatePerformanceCard = ({ data }: { data: any }) => {
  const states: StateItem[] = Array.isArray(data?.state_performance_mtd) ? data.state_performance_mtd : [];

  if (!states.length) {
    return (
      <View style={styles.card}>
        <AppText size={13} color="#6b7280" align="center">No state performance data available</AppText>
      </View>
    );
  }
  const topSalesValue = Number(states[0]?.sales_value || 0);

  return (
    <View style={styles.card}>
      <View style={styles.topZone}>
        <View style={styles.icon}><AppText size={18}>🏆</AppText></View>
        <View style={{ flex: 1 }}>
          <AppText size={11} color="#6b7280" family="InterMedium">Top Performing State</AppText>
          <AppText size={14} color="#1f2437" family="InterSemiBold">
            {states[0]?.state || states[0]?.name} — ₹{Number(states[0]?.sales_value_lacs || 0).toFixed(2)}L MTD Sales
          </AppText>
        </View>
      </View>

      {states.slice(0, 10).map((item, index) => {
        const percentage = Math.max(0, Number(item.percentage || 0));
        const relativePerformance = topSalesValue > 0
          ? (Number(item.sales_value || 0) / topSalesValue) * 100
          : 0;
        return (
          <View key={`${item.state || item.name}-${index}`} style={styles.zoneRow}>
            <View style={styles.rowBetween}>
              <View style={[styles.row, { flex: 1 }]}>
                <View style={[styles.rank, index === 0 && styles.rankTop]}>
                  <AppText size={11} color="white" family="InterSemiBold">{index + 1}</AppText>
                </View>
                <AppText size={13} color="#1f2437" family="InterSemiBold" style={{ flex: 1 }}>
                  {item.state || item.name}
                </AppText>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <AppText size={13} color={index === 0 ? '#1f8a4c' : '#2B2B2B'} family="InterSemiBold">
                  ₹{Number(item.sales_value_lacs || 0).toFixed(2)}L
                </AppText>
                <AppText size={10} color="#8a8fa3">{percentage.toFixed(1)}% of MTD sales</AppText>
              </View>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.min(100, relativePerformance)}%`, backgroundColor: index === 0 ? '#1f8a4c' : '#8b93ff' }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
};

export const DashboardHighlights = ({ data }: { data: any }) => {
  // live highlights from the dashboard API (api/attendance/today-summary); ones without data are not sent
  const highlights: HighlightItem[] = Array.isArray(data?.highlights) ? data.highlights : [];
  if (!highlights.length) {
    return (
      <View style={styles.card}>
        <AppText size={13} color="#6b7280" align="center">
          {data ? 'No highlights for this month yet' : 'Loading highlights…'}
        </AppText>
      </View>
    );
  }
  return (
    <View>
      {highlights.map((item, index) => (
        <View key={`${item.title}-${index}`} style={styles.highlightCard}>
          <View style={[styles.icon, { backgroundColor: item.iconBg || '#0e9f8f' }]}><AppText size={16}>{item.icon || '↗'}</AppText></View>
          <View style={{ flex: 1 }}>
            {!!item.label && <AppText size={10} color="#8a8fa3" family="InterSemiBold">{item.label.toUpperCase()}</AppText>}
            <AppText size={14} color="#1f2437" family="InterSemiBold">{item.title}</AppText>
            <AppText size={12} color="#6b7280">{item.description || item.desc}</AppText>
          </View>
        </View>
      ))}
    </View>
  );
};

export const DashboardAlerts = ({ data, onAlertPress }: { data: any; onAlertPress?: (alert: AlertItem) => void }) => {
  const [showInactiveRetailers, setShowInactiveRetailers] = useState(false);

  const targetZones: ZoneItem[] = data?.zone_performance_mtd || data?.zone_performance || [];
  const laggingZone = targetZones
    .filter(item => {
      const name = String(item.zone || item.name || '').trim().toLowerCase().replace(/\s+/g, ' ');
      return name !== 'ho' && name !== 'head office' && Number(item.target || 0) > 0;
    })
    .sort((a, b) =>
      Number(a.percentage ?? a.percent ?? a.pct ?? a.achievement_percentage ?? 0) -
      Number(b.percentage ?? b.percent ?? b.pct ?? b.achievement_percentage ?? 0),
    )[0];
  const laggingZoneName = String(laggingZone?.zone || laggingZone?.name || '').replace(/\s+zone$/i, '').trim();
  const laggingPercentage = Number(
    laggingZone?.percentage ?? laggingZone?.percent ?? laggingZone?.pct ?? laggingZone?.achievement_percentage ?? 0,
  );
  const laggingTargetAlert: AlertItem = laggingZoneName
    ? {
        title: `${laggingZoneName} Lagging On Target`,
        desc: `Only ${Math.round(laggingPercentage)}% of the MTD target has been achieved — the lowest among all sub zones.`,
        severity: 'high',
        icon: '⚠️',
        zone: laggingZoneName,
        destination: 'target',
      }
    : {
        title: 'Target Performance Unavailable',
        desc: 'No sub zone has a sales target this month.',
        severity: 'medium',
        icon: '!',
      };

  // retailers of the team with no order in the last 30 days (api/attendance/today-summary)
  const inactiveRetailerData = data?.inactive_retailers_30_days;
  const inactiveRetailers: InactiveCustomer[] = Array.isArray(inactiveRetailerData?.customers) ? inactiveRetailerData.customers : [];
  const inactiveRetailerCount = Number(inactiveRetailerData?.count ?? inactiveRetailers.length);
  const inactiveRetailerAlert: AlertItem = {
    title: inactiveRetailerCount > 0 ? 'Inactive Retailers' : 'No Inactive Retailers',
    desc: `${inactiveRetailerCount} retailer${inactiveRetailerCount === 1 ? '' : 's'} did not place any order in the last 30 days${inactiveRetailerCount > 0 ? ' — tap to view.' : '.'}`,
    severity: inactiveRetailerCount > 0 ? 'medium' : 'low',
    icon: inactiveRetailerCount > 0 ? '🔴' : '✓',
    destination: 'inactive_customers',
  };

  const alerts: AlertItem[] = [laggingTargetAlert, inactiveRetailerAlert];

  return (
    <View>
      {alerts.map((item, index) => {
        const severity = item.severity || 'low';
        const color = severity === 'high' ? '#d5453f' : severity === 'medium' ? '#e0942f' : '#2B2B2B';
        const soft = severity === 'high' ? '#fbe7e6' : severity === 'medium' ? '#fbeedd' : '#e6eefb';
        const showsCustomerSheet = item.destination === 'inactive_customers';
        const isActionable = showsCustomerSheet || Boolean(item.zone && item.destination && onAlertPress);
        const AlertContainer: any = isActionable ? Pressable : View;
        return (
          <AlertContainer
            key={`${item.title}-${index}`}
            style={[styles.alertCard, { borderLeftColor: color }]}
            onPress={isActionable ? () => {
              if (showsCustomerSheet) {
                setShowInactiveRetailers(true);
                return;
              }
              onAlertPress?.(item);
            } : undefined}
          >
            <View style={[styles.icon, { backgroundColor: soft }]}><AppText size={16}>{item.icon || '!'}</AppText></View>
            <View style={{ flex: 1 }}>
              <View style={styles.rowBetween}>
                <AppText size={13} color="#1f2437" family="InterSemiBold" style={{ flex: 1 }}>{item.title}</AppText>
                <View style={[styles.severity, { backgroundColor: soft }]}><AppText size={9} color={color} family="InterSemiBold">{severity.toUpperCase()}</AppText></View>
              </View>
              <AppText size={12} color="#6b7280">{item.description || item.desc}</AppText>
            </View>
          </AlertContainer>
        );
      })}

      <Modal
        visible={showInactiveRetailers}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setShowInactiveRetailers(false)}
      >
        <View style={styles.sheetOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowInactiveRetailers(false)} />
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <AppText size={18} color="#1f2437" family="InterBold">Inactive Retailers</AppText>
                <AppText size={12} color="#6b7280">No orders placed in the last 30 days</AppText>
              </View>
              <Pressable style={styles.sheetClose} onPress={() => setShowInactiveRetailers(false)}>
                <AppText size={18} color="#4b5563">✕</AppText>
              </Pressable>
            </View>

            <View style={styles.sheetCount}>
              <AppText size={12} color="#b5473e" family="InterSemiBold">
                {inactiveRetailerCount} RETAILER{inactiveRetailerCount === 1 ? '' : 'S'}
              </AppText>
            </View>
            {inactiveRetailerCount > inactiveRetailers.length && (
              <AppText size={11} color="#6b7280" style={{ marginTop: 6 }}>
                Showing the first {inactiveRetailers.length} (A–Z)
              </AppText>
            )}

            <FlatList
              style={styles.customerScroll}
              data={inactiveRetailers}
              keyExtractor={(customer, index) => `${customer.id || customer.name}-${index}`}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.customerList}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              renderItem={({ item: customer, index }) => (
                <View style={styles.customerRow}>
                  <View style={styles.customerNumber}>
                    <AppText size={12} color="#2B2B2B" family="InterSemiBold">{index + 1}</AppText>
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText size={14} color="#1f2437" family="InterMedium">
                      {customer.name || 'Unnamed retailer'}
                    </AppText>
                    <AppText size={12} color="#6b7280">
                      {customer.mobile || 'Mobile number unavailable'}
                    </AppText>
                  </View>
                </View>
              )}
              ListEmptyComponent={(
                <AppText size={13} color="#6b7280" align="center">No inactive retailers found.</AppText>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { marginHorizontal: rw(19), marginTop: rw(12), backgroundColor: 'white', borderRadius: 16, padding: rw(18), shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 4 },
  topZone: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#e6f6ec', borderRadius: 12, padding: 12, marginBottom: 18 },
  icon: { width: 38, height: 38, borderRadius: 11, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' },
  zoneRow: { marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rank: { width: 22, height: 22, borderRadius: 7, backgroundColor: '#8b93ff', alignItems: 'center', justifyContent: 'center' },
  rankTop: { backgroundColor: '#1f8a4c' },
  track: { height: 6, borderRadius: 99, backgroundColor: '#e3e5ee', marginTop: 7, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 99 },
  highlightCard: { marginHorizontal: rw(19), marginTop: rw(10), backgroundColor: 'white', borderRadius: 14, padding: 14, flexDirection: 'row', gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  alertCard: { marginHorizontal: rw(19), marginTop: rw(10), backgroundColor: 'white', borderRadius: 12, padding: 14, borderLeftWidth: 4, flexDirection: 'row', gap: 12 },
  severity: { borderRadius: 99, paddingHorizontal: 7, paddingVertical: 2, marginLeft: 8 },
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheetContainer: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: rw(19), paddingTop: 10, paddingBottom: 28, height: '72%' },
  sheetHandle: { width: 42, height: 4, borderRadius: 99, backgroundColor: '#d3d5df', alignSelf: 'center', marginBottom: 16 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sheetClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f2f6', alignItems: 'center', justifyContent: 'center' },
  sheetCount: { alignSelf: 'flex-start', backgroundColor: '#fbe7e6', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5, marginTop: 14 },
  customerScroll: { flex: 1, marginTop: 4 },
  customerList: { paddingTop: 10, paddingBottom: 12 },
  customerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eceef4' },
  customerNumber: { width: 30, height: 30, borderRadius: 9, backgroundColor: '#FFF3C4', alignItems: 'center', justifyContent: 'center' },
});
