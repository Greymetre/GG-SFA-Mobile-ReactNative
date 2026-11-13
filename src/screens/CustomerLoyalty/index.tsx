import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AppText from '../../components/AppText/AppText';
import { colors } from '../../utils/Colors';
import {
  CustomerLoyalty as CustomerLoyaltyData,
  CustomerLoyaltyScan,
  getCustomerLoyaltyApi,
} from '../../api/query/CustomerApi';

const number = (value: number | string | null | undefined) =>
  Number(value || 0).toLocaleString('en-IN');

const scanDate = (value?: string | null) => {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  }
  const date = new Date(value.replace(' ', 'T'));
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
};

const redemptionDate = (value?: string | null) => {
  if (!value) return '';
  const [year, month] = value.slice(0, 7).split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('en-IN', {
    month: 'long', year: 'numeric',
  });
};

const ScanCard = ({ scan, index }: { scan: CustomerLoyaltyScan; index: number }) => (
  <View style={styles.scanCard}>
    <View style={styles.scanTop}>
      <View style={styles.scanNumber}>
        <AppText size={12} family="InterBold" color={colors.blue}>{index + 1}</AppText>
      </View>
      <View style={styles.scanInfo}>
        <AppText size={14} family="InterSemiBold" color="#202432">
          {scan.coupon_code || scan.point_type || 'Coupon Scan'}
        </AppText>
        <AppText size={11} family="InterRegular" color="#8A8F9D">
          {scanDate(scan.transaction_at) || 'Date not available'}
        </AppText>
      </View>
      <View style={styles.pointsPill}>
        <AppText size={12} family="InterBold" color="#1B7F4B">+{number(scan.points)} pts</AppText>
      </View>
    </View>
    {scan.quantity > 1 && (
      <AppText size={11} family="InterMedium" color="#5C5C5C" style={styles.quantity}>
        {number(scan.quantity)} coupons scanned
      </AppText>
    )}
  </View>
);

const CustomerLoyalty = ({ route }: any) => {
  const customerId = route?.params?.customerId;
  const customerName = route?.params?.customerName;
  const [data, setData] = useState<CustomerLoyaltyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [activeHistory, setActiveHistory] = useState<'scans' | 'redemptions'>('scans');

  const load = useCallback(async (refresh = false) => {
    if (!customerId) {
      setError('Customer is not available.');
      setLoading(false);
      return;
    }
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      const response: any = await getCustomerLoyaltyApi(customerId);
      if (response?.data?.status !== 'success') {
        throw new Error(response?.data?.message || 'Could not load loyalty details.');
      }
      setData(response.data.data);
      setError('');
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Could not load loyalty details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [customerId]);

  useFocusEffect(useCallback(() => {
    load();
  }, [load]));

  if (loading && !data) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.blue} /></View>;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.blue} />}
    >
      {!!customerName && (
        <AppText size={16} family="InterSemiBold" color="#202432" style={styles.customerName}>
          {customerName}
        </AppText>
      )}

      {!!error && !data ? (
        <View style={styles.messageCard}>
          <AppText size={14} family="InterMedium" color="#B42318" align="center">{error}</AppText>
        </View>
      ) : (
        <>
          <View style={styles.hero}>
            <AppText size={13} family="InterMedium" color="rgba(255,255,255,0.8)">Available Balance</AppText>
            <AppText size={32} family="InterBold" color={colors.white}>{number(data?.remaining_balance)} pts</AppText>
          </View>

          <View style={styles.grid}>
            {[
              { label: 'Total Points', value: number(data?.total_points), colour: '#1B7F4B' },
              { label: 'Redeemed Points', value: number(data?.redeemed_points), colour: '#D05A26' },
              { label: 'Remaining Balance', value: number(data?.remaining_balance), colour: colors.blue },
              { label: 'No. of Scans', value: number(data?.total_scans), colour: '#7A4EA3' },
            ].map(item => (
              <View key={item.label} style={styles.statCard}>
                <AppText size={12} family="InterMedium" color="#6B707C">{item.label}</AppText>
                <AppText size={21} family="InterBold" color={item.colour}>{item.value}</AppText>
              </View>
            ))}
          </View>

          <AppText size={17} family="InterBold" color="#202432" style={styles.sectionTitle}>Loyalty History</AppText>
          <View style={styles.tabs}>
            <Pressable
              style={[styles.tab, activeHistory === 'scans' && styles.activeTab]}
              onPress={() => setActiveHistory('scans')}
            >
              <AppText size={13} family="InterSemiBold" color={activeHistory === 'scans' ? colors.white : colors.blue}>
                Scan History
              </AppText>
            </Pressable>
            <Pressable
              style={[styles.tab, activeHistory === 'redemptions' && styles.activeTab]}
              onPress={() => setActiveHistory('redemptions')}
            >
              <AppText size={13} family="InterSemiBold" color={activeHistory === 'redemptions' ? colors.white : colors.blue}>
                Redemption History
              </AppText>
            </Pressable>
          </View>

          {activeHistory === 'scans' ? (
            data?.recent_scans?.length ? data.recent_scans.map((scan, index) => (
              <ScanCard key={String(scan.id)} scan={scan} index={index} />
            )) : (
              <View style={styles.messageCard}>
                <AppText size={14} family="InterMedium" color="#8A8578" align="center">
                  No coupon scan history available.
                </AppText>
              </View>
            )
          ) : (
            data?.recent_redemptions?.length ? data.recent_redemptions.map((redemption, index) => (
              <View key={String(redemption.id)} style={styles.scanCard}>
                <View style={styles.scanTop}>
                  <View style={[styles.scanNumber, styles.redemptionNumber]}>
                    <AppText size={12} family="InterBold" color="#D05A26">{index + 1}</AppText>
                  </View>
                  <View style={styles.scanInfo}>
                    <AppText size={14} family="InterSemiBold" color="#202432">Points Redeemed</AppText>
                    <AppText size={11} family="InterRegular" color="#8A8F9D">
                      {redemptionDate(redemption.transaction_at)}
                    </AppText>
                  </View>
                  <View style={[styles.pointsPill, styles.redeemedPill]}>
                    <AppText size={12} family="InterBold" color="#D05A26">-{number(redemption.points)} pts</AppText>
                  </View>
                </View>
              </View>
            )) : (
              <View style={styles.messageCard}>
                <AppText size={14} family="InterMedium" color="#8A8578" align="center">
                  No redemption history available.
                </AppText>
              </View>
            )
          )}
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.offWHite },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.offWHite },
  customerName: { marginBottom: 12 },
  hero: { backgroundColor: colors.blue, borderRadius: 18, padding: 20, gap: 5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10, marginTop: 12 },
  statCard: { width: '48.5%', minHeight: 88, backgroundColor: colors.white, borderRadius: 14, padding: 14, justifyContent: 'space-between' },
  sectionTitle: { marginTop: 24, marginBottom: 12 },
  tabs: { flexDirection: 'row', backgroundColor: colors.white, borderRadius: 12, padding: 4, marginBottom: 12 },
  tab: { flex: 1, minHeight: 40, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  activeTab: { backgroundColor: colors.blue },
  scanCard: { backgroundColor: colors.white, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#EFEAE0' },
  scanTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  scanNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#FFF3C4', alignItems: 'center', justifyContent: 'center' },
  scanInfo: { flex: 1, gap: 3 },
  pointsPill: { backgroundColor: '#E9F7EF', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 6 },
  redemptionNumber: { backgroundColor: '#FFF0E8' },
  redeemedPill: { backgroundColor: '#FFF0E8' },
  quantity: { marginTop: 10, marginLeft: 38 },
  messageCard: { backgroundColor: colors.white, borderRadius: 14, padding: 24 },
});

export default CustomerLoyalty;
