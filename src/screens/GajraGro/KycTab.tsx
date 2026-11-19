import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Gallery from 'react-native-awesome-gallery';
import Toast from 'react-native-toast-message';
import AppText from '../../components/AppText/AppText';
import MediaImage from '../../components/atoms/MediaImage';
import { CrossIcon } from '../../assets/svgs/SvgsFile';
import { colors } from '../../utils/Colors';
import { shadowStyle } from '../../utils/typography';
import { GroKycCustomer, GroKycDocument, gajraGroKycActionApi, getGajraGroKycApi } from '../../api/query/GajraGroApi';

const formatDate = (iso: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map(w => w.charAt(0)).join('').toUpperCase() || '?';

const Tag = ({ text, bg, fg }: { text: string; bg: string; fg: string }) => (
  <View style={[styles.tag, { backgroundColor: bg }]}>
    <AppText size={11} family="InterBold" color={fg}>{text}</AppText>
  </View>
);

// Label / value rows like the web customer page ("—" when empty)
const InfoPanel = ({ title, rows }: { title: string; rows: [string, string][] }) => (
  <View style={[styles.panel, shadowStyle]}>
    <View style={styles.panelHead}>
      <AppText size={12} family="InterBold" color="#202432" style={styles.panelTitle}>{title.toUpperCase()}</AppText>
    </View>
    {rows.map(([label, value], i) => (
      <View key={label} style={[styles.infoRow, i === rows.length - 1 && styles.infoRowLast]}>
        <AppText size={13} family="InterMedium" color="#9094A3">{label}</AppText>
        <AppText size={13} family={value ? 'InterSemiBold' : 'InterRegular'} color={value ? '#202432' : '#C9CCD2'} style={styles.infoValue}>
          {value || '—'}
        </AppText>
      </View>
    ))}
  </View>
);

const CustomerCard = ({ row, onPress }: { row: GroKycCustomer; onPress: () => void }) => {
  const place = [row.address.city, row.address.state].filter(Boolean).join(', ');
  return (
    <Pressable style={[styles.card, shadowStyle]} onPress={onPress}>
      <View style={styles.avatar}>
        <AppText size={16} family="InterBold" color="#92400E">{initials(row.name)}</AppText>
      </View>
      <View style={styles.cardBody}>
        <AppText size={15} family="InterBold" color="#202432" numLines={1}>{row.name || '-'}</AppText>
        <AppText size={12} family="InterMedium" color="#9094A3" numLines={1}>
          {[row.mobile, place].filter(Boolean).join(' · ')}
        </AppText>
        <View style={styles.tags}>
          {!!row.customer_type && <Tag text={row.customer_type} bg="#F6F2E7" fg="#2B2B2B" />}
          <Tag text={`${row.pending_count} pending`} bg="#DBEAFE" fg="#1E40AF" />
          {row.assigned_to_me === false && !!row.assigned_user && (
            <Tag text={`Assigned: ${row.assigned_user}`} bg="#EDE9FE" fg="#5B21B6" />
          )}
        </View>
      </View>
      <AppText size={22} family="InterMedium" color="#C9CCD2">›</AppText>
    </Pressable>
  );
};

const DocumentCard = ({
  doc,
  busy,
  onImage,
  onAction,
}: {
  doc: GroKycDocument;
  busy: boolean;
  onImage: (index: number) => void;
  onAction: (action: 'approve' | 'reject') => void;
}) => {
  const checkedNote = doc.checked && !doc.verified
    ? ['Checked', doc.checked_by && `by ${doc.checked_by}`, formatDate(doc.checked_at)].filter(Boolean).join(' · ')
    : '';
  return (
    <View style={[styles.panel, shadowStyle]}>
      <View style={[styles.panelHead, styles.docHead]}>
        <AppText size={14} family="InterBold" color="#202432">{doc.label}</AppText>
        {doc.verified
          ? <Tag text="Verified" bg="#DCFCE7" fg="#166534" />
          : doc.approved
            ? <Tag text="Approved · verification pending" bg="#EDE9FE" fg="#5B21B6" />
            : doc.pending
            ? <Tag text="Waiting for approval" bg="#DBEAFE" fg="#1E40AF" />
            : <Tag text="Not checked" bg="#FEF3C7" fg="#92400E" />}
      </View>
      <View style={styles.docBody}>
        {doc.images.length > 0 && (
          <View style={styles.docImages}>
            {doc.images.map((img, i) => (
              <Pressable key={img.url} style={styles.docImageBox} onPress={() => onImage(i)}>
                <MediaImage path={img.url} style={styles.docImage} resizeMode="contain" />
                <AppText size={11} family="InterMedium" color="#9094A3" style={styles.docImageLabel}>{img.label}</AppText>
              </Pressable>
            ))}
          </View>
        )}
        {doc.fields.map(f => (
          <View key={f.label} style={styles.infoRow}>
            <AppText size={13} family="InterMedium" color="#9094A3">{f.label}</AppText>
            <AppText size={13} family="InterSemiBold" color="#202432" style={styles.infoValue}>{f.value}</AppText>
          </View>
        ))}
        {!!checkedNote && (
          <AppText size={12} family="InterMedium" color="#1E40AF" style={styles.checkedNote}>✓ {checkedNote}</AppText>
        )}
        {doc.approved && !doc.verified && (
          <AppText size={12} family="InterMedium" color="#5B21B6" style={styles.checkedNote}>
            ✓ {['Approved', doc.approved_by && `by ${doc.approved_by}`, formatDate(doc.approved_at)].filter(Boolean).join(' · ')}. The sales team will verify it.
          </AppText>
        )}
        {doc.pending && (
          <View style={styles.actions}>
            <Pressable disabled={busy} style={[styles.actionBtn, styles.rejectBtn, busy && styles.disabled]} onPress={() => onAction('reject')}>
              <AppText size={14} family="InterBold" color="#DC2626">Reject</AppText>
            </Pressable>
            <Pressable disabled={busy} style={[styles.actionBtn, styles.approveBtn, busy && styles.disabled]} onPress={() => onAction('approve')}>
              {busy
                ? <ActivityIndicator color={colors.white} />
                : <AppText size={14} family="InterBold" color={colors.white}>Approve</AppText>}
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
};

// KYC tab: customers assigned to me (Gajra Gro "Assigned User") whose KYC documents the sales team has checked in
// the Gajra Gro CRM; I approve or reject each checked document here.
const KycTab = () => {
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState<GroKycCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busyDoc, setBusyDoc] = useState<string | null>(null);
  const [gallery, setGallery] = useState<{ images: string[]; index: number } | null>(null);

  const load = useCallback(async (mode: 'load' | 'refresh') => {
    mode === 'refresh' ? setRefreshing(true) : setLoading(true);
    try {
      const res: any = await getGajraGroKycApi();
      if (typeof res === 'string') {
        setError(res);
        return;
      }
      setRows(res?.data?.data?.rows || []);
      setError('');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Could not load KYC. Pull down to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load('load');
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      [r.name, r.mobile, r.address.city, r.customer_type].some(v => (v || '').toLowerCase().includes(q)),
    );
  }, [rows, search]);

  const selected = rows.find(r => r.gro_customer_id === selectedId) || null;

  const runAction = async (customer: GroKycCustomer, doc: GroKycDocument, action: 'approve' | 'reject') => {
    const key = `${customer.gro_customer_id}:${doc.key}`;
    setBusyDoc(key);
    try {
      const res: any = await gajraGroKycActionApi({ gro_customer_id: customer.gro_customer_id, document: doc.key, action });
      if (typeof res === 'string') return; // a 400 is already shown as a toast
      Toast.show({ type: 'success', text1: action === 'approve' ? 'Approved. Sent to the sales team for verification.' : 'Document rejected' });
      // Update the customer in place; drop them from the list once nothing is pending
      setRows(prev => prev
        .map(r => {
          if (r.gro_customer_id !== customer.gro_customer_id) return r;
          const documents = action === 'approve'
            ? r.documents.map(d => (d.key === doc.key ? { ...d, pending: false, approved: true, approved_at: new Date().toISOString() } : d))
            : r.documents.filter(d => d.key !== doc.key); // rejected documents are cleared on Gajra Gro
          return { ...r, documents, pending_count: documents.filter(d => d.pending).length };
        })
        .filter(r => r.pending_count > 0));
      if (customer.pending_count <= 1) setSelectedId(null);
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Could not update the document. Please try again.' });
    } finally {
      setBusyDoc(null);
    }
  };

  const confirmAction = (customer: GroKycCustomer, doc: GroKycDocument, action: 'approve' | 'reject') => {
    Alert.alert(
      action === 'approve' ? `Approve ${doc.label}?` : `Reject ${doc.label}?`,
      action === 'approve'
        ? `${customer.name}'s ${doc.label} will be marked approved. The sales team will then verify it on Gajra Gro.`
        : `${customer.name}'s ${doc.label} will be cleared on Gajra Gro and the customer has to upload it again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: action === 'approve' ? 'Approve' : 'Reject', style: action === 'reject' ? 'destructive' : 'default', onPress: () => runAction(customer, doc, action) },
      ],
    );
  };

  return (
    <>
      <FlatList
        style={styles.screen}
        data={loading ? [] : filtered}
        keyExtractor={row => row.gro_customer_id}
        renderItem={({ item }) => <CustomerCard row={item} onPress={() => setSelectedId(item.gro_customer_id)} />}
        ListHeaderComponent={
          <View>
            <View style={[styles.hero, shadowStyle]}>
              <AppText size={12} family="InterBold" color="#92400E" style={styles.heroLabel}>KYC WAITING FOR YOUR APPROVAL</AppText>
              <AppText size={30} family="InterBold" color="#202432">{loading ? '-' : rows.length}</AppText>
              <AppText size={12} family="InterMedium" color="#6E6A60">
                Customers assigned to you whose documents the sales team has checked
              </AppText>
            </View>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search customer, mobile or city"
              placeholderTextColor="#A9A59A"
              style={styles.search}
            />
            {loading && <ActivityIndicator size="large" color={colors.gold} style={{ marginTop: 20 }} />}
          </View>
        }
        ListEmptyComponent={loading ? null : (
          <AppText size={14} family="InterMedium" color="#8A8578" align="center" style={styles.empty}>
            {error || (search ? 'No customer matches your search.' : 'No KYC is waiting for your approval.')}
          </AppText>
        )}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} />}
      />

      <Modal visible={!!selected} animationType="slide" onRequestClose={() => setSelectedId(null)} statusBarTranslucent>
        {selected && (
          <View style={[styles.sheet, { paddingTop: insets.top }]}>
            <View style={styles.sheetBar}>
              <AppText size={16} family="InterBold" color="#202432">Customer KYC</AppText>
              <Pressable style={styles.closeBtn} onPress={() => setSelectedId(null)}>
                <CrossIcon size={22} color="#202432" />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={[styles.sheetBody, { paddingBottom: insets.bottom + 30 }]}>
              <View style={[styles.profile, shadowStyle]}>
                <View style={styles.profileAvatar}>
                  <AppText size={24} family="InterBold" color="#92400E">{initials(selected.name)}</AppText>
                </View>
                <View style={styles.cardBody}>
                  <AppText size={18} family="InterBold" color="#202432">{selected.name}</AppText>
                  <View style={styles.tags}>
                    {!!selected.customer_type && <Tag text={selected.customer_type} bg="#F6F2E7" fg="#2B2B2B" />}
                    <Tag text={`${selected.pending_count} pending`} bg="#DBEAFE" fg="#1E40AF" />
                  </View>
                  <AppText size={12} family="InterMedium" color="#9094A3" style={{ marginTop: 6 }}>
                    {[selected.mobile, [selected.address.city, selected.address.state].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}
                  </AppText>
                </View>
              </View>

              <InfoPanel title="Personal Information" rows={[
                ['Full Name', selected.personal.full_name || selected.name],
                ['Mobile', selected.personal.mobile],
                ...(selected.personal.email ? [['Email', selected.personal.email] as [string, string]] : []),
              ]} />
              <InfoPanel title="Address Info" rows={[
                ['Address', selected.address.address],
                ['City', selected.address.city],
                ['District', selected.address.district],
                ['State', selected.address.state],
                ['Pincode', selected.address.pincode],
              ]} />
              <InfoPanel title="Customer Information" rows={[
                ...(selected.customer.executive ? [['Executive', selected.customer.executive] as [string, string]] : []),
                ['Parent Customer', selected.customer.parent],
                ['Customer Code', selected.customer.customer_code],
                ['Manager Name', selected.customer.manager_name],
                ['Manager Phone', selected.customer.manager_phone],
              ]} />

              <AppText size={15} family="InterBold" color="#202432" style={styles.sectionTitle}>KYC Documents</AppText>
              {selected.documents.map(doc => (
                <DocumentCard
                  key={doc.key}
                  doc={doc}
                  busy={busyDoc === `${selected.gro_customer_id}:${doc.key}`}
                  onImage={index => setGallery({ images: doc.images.map(i => i.url), index })}
                  onAction={action => confirmAction(selected, doc, action)}
                />
              ))}
            </ScrollView>

            {/* Image viewer inside the sheet (a second Modal on top of this one is unreliable on iOS) */}
            {gallery && (
              <View style={[StyleSheet.absoluteFill, styles.galleryWrap]}>
                <Pressable style={[styles.galleryClose, { marginTop: insets.top }]} onPress={() => setGallery(null)}>
                  <CrossIcon size={30} color="white" />
                </Pressable>
                <Gallery
                  data={gallery.images}
                  initialIndex={gallery.index}
                  style={{ flex: 1 }}
                  pinchEnabled
                  doubleTapEnabled
                  doubleTapScale={2.5}
                  maxScale={6}
                  disableSwipeUp
                  disableVerticalSwipe
                  loop={false}
                />
              </View>
            )}
          </View>
        )}
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgColor },
  list: { padding: 16, paddingTop: 4, paddingBottom: 40 },
  empty: { marginTop: 30, paddingHorizontal: 20 },

  hero: { borderRadius: 18, padding: 16, backgroundColor: colors.goldSoft, gap: 2 },
  heroLabel: { letterSpacing: 0.6 },
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

  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.white, borderRadius: 16, padding: 14, marginBottom: 12 },
  avatar: { width: 46, height: 46, borderRadius: 12, backgroundColor: '#FFF4D6', alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1, gap: 2 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  tag: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },

  sheet: { flex: 1, backgroundColor: colors.bgColor },
  sheetBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EFEAE0', backgroundColor: colors.white },
  closeBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  sheetBody: { padding: 16, gap: 14 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.white, borderRadius: 18, padding: 16 },
  profileAvatar: { width: 64, height: 64, borderRadius: 16, backgroundColor: '#FFF4D6', alignItems: 'center', justifyContent: 'center' },

  panel: { backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: '#ECEEF2', overflow: 'hidden' },
  panelHead: { paddingHorizontal: 14, paddingVertical: 11, backgroundColor: '#F7F8FA', borderBottomWidth: 1, borderBottomColor: '#ECEEF2' },
  panelTitle: { letterSpacing: 0.4 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 14, marginHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#ECEEF2' },
  infoRowLast: { borderBottomWidth: 0 },
  infoValue: { flex: 1, textAlign: 'right' },
  sectionTitle: { marginTop: 6 },

  docHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  docBody: { paddingBottom: 12 },
  docImages: { flexDirection: 'row', gap: 10, padding: 14, paddingBottom: 4 },
  docImageBox: { flex: 1 },
  docImage: { width: '100%', height: 140, borderRadius: 10, backgroundColor: '#F7F8FA' },
  docImageLabel: { marginTop: 4 },
  checkedNote: { marginHorizontal: 14, marginTop: 10 },
  actions: { flexDirection: 'row', gap: 10, marginHorizontal: 14, marginTop: 12 },
  actionBtn: { flex: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rejectBtn: { borderWidth: 1.5, borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' },
  approveBtn: { backgroundColor: '#16A34A' },
  disabled: { opacity: 0.6 },

  galleryWrap: { backgroundColor: 'rgba(0,0,0,0.95)' },
  galleryClose: { width: 55, height: 55, justifyContent: 'center', alignItems: 'center', alignSelf: 'flex-end', marginRight: 8 },
});

export default KycTab;
