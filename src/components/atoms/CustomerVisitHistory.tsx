import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from '../AppText/AppText';
import { colors } from '../../utils/Colors';
import { CrossIcon } from '../../assets/svgs/SvgsFile';
import { CustomerVisit, getCustomerVisitsApi } from '../../api/query/CustomerApi';

type Props = {
  visible: boolean;
  customerId?: number | string | null;
  customerName?: string;
  onClose: () => void;
};

const formatDate = (date?: string | null) => {
  const value = date ? new Date(`${date}T00:00:00`) : null;
  return value && !isNaN(value.getTime())
    ? value.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '';
};

// "14:05:00" -> "2:05 PM"
const formatTime = (time?: string | null) => {
  const [h, m] = String(time || '').split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return '';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};

const formatDuration = (minutes: number | null) => {
  if (minutes == null) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${m}m` : `${m} min`;
};

const VisitRow = ({ visit }: { visit: CustomerVisit }) => {
  const checkedOut = !!visit.checkout_date;
  const sameDay = visit.checkout_date === visit.checkin_date;
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <View style={{ flex: 1 }}>
          <AppText size={14} family="InterBold" color="#202432">{visit.user_name || 'User'}</AppText>
          <AppText size={12} family="InterMedium" color="#9094A3">{formatDate(visit.checkin_date)}</AppText>
        </View>
        <View style={[styles.badge, { backgroundColor: checkedOut ? '#E9F7EF' : '#FFF6DB' }]}>
          <AppText size={11} family="InterBold" color={checkedOut ? '#1B7F4B' : '#A87A00'}>
            {checkedOut ? formatDuration(visit.duration_minutes) || 'DONE' : 'IN PROGRESS'}
          </AppText>
        </View>
      </View>

      <View style={styles.timeline}>
        <View style={styles.timelineRow}>
          <View style={[styles.dot, { backgroundColor: '#1B7F4B' }]} />
          <View style={{ flex: 1 }}>
            <AppText size={13} family="InterSemiBold" color="#202432">Check In · {formatTime(visit.checkin_time)}</AppText>
            {!!visit.checkin_address && (
              <AppText size={11} family="InterRegular" color="#7A8290" numLines={2}>{visit.checkin_address}</AppText>
            )}
          </View>
        </View>
        <View style={styles.line} />
        <View style={styles.timelineRow}>
          <View style={[styles.dot, { backgroundColor: checkedOut ? '#D64545' : '#D5D9E0' }]} />
          <View style={{ flex: 1 }}>
            <AppText size={13} family="InterSemiBold" color={checkedOut ? '#202432' : '#9094A3'}>
              {checkedOut
                ? `Check Out · ${formatTime(visit.checkout_time)}${sameDay ? '' : ` (${formatDate(visit.checkout_date)})`}`
                : 'Not checked out yet'}
            </AppText>
            {!!visit.checkout_address && (
              <AppText size={11} family="InterRegular" color="#7A8290" numLines={2}>{visit.checkout_address}</AppText>
            )}
          </View>
        </View>
      </View>

      {(!!visit.report_title || !!visit.report_description || !!visit.orders) && (
        <View style={styles.extra}>
          {!!(visit.report_title || visit.report_description) && (
            <AppText size={12} family="InterMedium" color="#5C5C5C">
              Visit report: {[visit.report_title, visit.report_description].filter(Boolean).join(' – ')}
            </AppText>
          )}
          {!!visit.orders && (
            <AppText size={12} family="InterSemiBold" color="#1B7F4B" style={{ marginTop: 4 }}>
              {visit.orders.count} order{visit.orders.count > 1 ? 's' : ''} · ₹ {visit.orders.value.toLocaleString('en-IN')}
            </AppText>
          )}
        </View>
      )}
    </View>
  );
};

// Bottom sheet with the customer's check-in / check-out history, loaded 20 at a time
const CustomerVisitHistory = ({ visible, customerId, customerName, onClose }: Props) => {
  const insets = useSafeAreaInsets();
  const [visits, setVisits] = useState<CustomerVisit[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);

  const load = useCallback(async (nextPage: number) => {
    if (!customerId) return;
    const id = ++requestId.current;
    setLoading(true);
    try {
      const res: any = await getCustomerVisitsApi(customerId, nextPage);
      if (id !== requestId.current) return;
      if (typeof res === 'string' || res?.data?.status !== 'success') {
        setError(typeof res === 'string' ? res : res?.data?.message || 'Could not load visits');
        return;
      }
      const rows: CustomerVisit[] = res.data.data || [];
      setVisits(prev => (nextPage > 1 ? [...prev, ...rows] : rows));
      setPage(nextPage);
      setTotal(res.data.pagination?.total || 0);
      setHasMore(!!res.data.pagination?.has_more);
      setError('');
    } catch (e: any) {
      if (id === requestId.current) setError(e?.response?.data?.message || 'Could not load visits');
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    if (visible) load(1);
  }, [visible, load]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.sheetHead}>
            <View style={{ flex: 1 }}>
              <AppText size={17} family="InterBold" color="#202432">Visit History{total ? ` (${total})` : ''}</AppText>
              {!!customerName && (
                <AppText size={12} family="InterMedium" color="#9094A3" numLines={1}>{customerName}</AppText>
              )}
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={styles.close}>
              <CrossIcon size={20} color="#2B2B2B" />
            </Pressable>
          </View>

          <FlatList
            data={visits}
            keyExtractor={visit => String(visit.id)}
            renderItem={({ item }) => <VisitRow visit={item} />}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12 }}
            onEndReached={() => hasMore && !loading && load(page + 1)}
            onEndReachedThreshold={0.4}
            ListEmptyComponent={loading ? null : (
              <AppText size={14} family="InterMedium" color="#8A8578" align="center" style={{ marginTop: 30 }}>
                {error || 'No check-in for this customer yet.'}
              </AppText>
            )}
            ListFooterComponent={loading ? <ActivityIndicator color={colors.gold} style={{ marginVertical: 16 }} /> : null}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { maxHeight: '85%', minHeight: '50%', backgroundColor: colors.bgColor, borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 10 },
  close: { height: 34, width: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },

  card: { backgroundColor: colors.white, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#EFEAE0' },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  timeline: { marginTop: 12 },
  timelineRow: { flexDirection: 'row', gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  line: { width: 2, height: 12, backgroundColor: '#E5E1D8', marginLeft: 4, marginVertical: 2 },
  extra: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F3EFE6' },
});

export default CustomerVisitHistory;
