import { BASE_URL } from '../../api/AxiosClient';
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, View, StyleSheet, Platform, ActivityIndicator, RefreshControl } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import AppText from '../../components/AppText/AppText';
import { rw } from '../../utils/responsive';
import { colors } from '../../utils/Colors';
import store, { useAppSelector } from '../../components/redux/Store';
import { NavigationProp, ParamListBase, useFocusEffect, useNavigation } from '@react-navigation/native';

interface BeatItem {
    beatscheduleid: number;
    beat_id: number;
    beat_name: string;
    description: string;
    beat_date: string;
    total_customers: number;
    visited_customers: number;
    remaining_customers: number;
    order_count: number;
    new_customers: number;
    is_today: boolean;
}

const API_BASE = `${BASE_URL}api`;

// Stat tile palette: neutral for the total, green for what is done, amber for what is left.
const STAT_TOTAL = { bg: '#F1F3F7', border: '#E0E4EC', value: '#2B2B2B', label: '#6B7280' };
const STAT_VISITED = { bg: '#E9F7EF', border: '#CDEBD9', value: '#1B7F4B', label: '#4E8F6C' };
const STAT_REMAINING = { bg: '#FFF6DB', border: '#F6E2A8', value: '#A87A00', label: '#9A7B22' };

const ChevronRight = ({ color = '#9AA1AC' }: { color?: string }) => (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
        <Path d="M9 5l7 7-7 7" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

const StatTile = ({ label, value, tone }: { label: string; value: any; tone: typeof STAT_TOTAL }) => (
    <View style={[styles.statTile, { backgroundColor: tone.bg, borderColor: tone.border }]}>
        <AppText size={20} family="InterBold" color={tone.value} align="center">
            {Number(value ?? 0)}
        </AppText>
        <AppText size={11} family="InterMedium" color={tone.label} align="center" transform="uppercase" spacing={0.4}>
            {label}
        </AppText>
    </View>
);

const BeatsScreen = () => {
    const navigation = useNavigation<NavigationProp<ParamListBase>>();
    const { user } = useAppSelector(
        (state) => state.auth
    );
    const token = store.getState()?.auth?.token;
    const userId = user?.id;
    const [beats, setBeats] = useState<BeatItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const fetchBeats = async () => {
        if (!token || !userId) {
            setErrorMsg('Authentication information missing');
            setLoading(false);
            setRefreshing(false);
            return;
        }

        try {
            setErrorMsg(null);
            const today = new Date().toISOString().split('T')[0];

            const url = `${API_BASE}/getBeatList?beat_date=${today}&user_id=${userId}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const json = await response.json();

            // getBeatList returns a plain array (paginated only when pageSize is sent);
            // "No Record Found" comes back as status 'error' with an empty array
            const list = Array.isArray(json.data?.data) ? json.data.data : json.data;
            if (Array.isArray(list)) {
                setBeats(list);
            } else {
                setErrorMsg(json.message || 'Failed to load beat list');
            }
        } catch (err: any) {
            console.error('Beat fetch error:', err);
            setErrorMsg('Could not load beats. Please try again.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchBeats();
        }, [token, userId])
    )


    const onRefresh = () => {
        setRefreshing(true);
        fetchBeats();
    };

    const renderBeatItem = ({ item }: any) => {
        const total = Number(item?.total_customers ?? 0);
        const visited = Number(item?.visited_customers ?? 0);
        const percent = total > 0 ? Math.min(100, Math.round((visited / total) * 100)) : 0;
        const done = total > 0 && visited >= total;

        return (
            <Pressable
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                android_ripple={{ color: '#00000010' }}
                onPress={() => {
                    navigation.navigate("CustomerList", {
                        type: 'RETAILER',
                        beatId: item.beat_id,
                        beatName: item.beat_name,
                        beatDate: item.beat_date,
                    })
                }}>
                {/* Beat name + counter count */}
                <View style={styles.cardHeader}>
                    <View style={styles.accentBar} />
                    <View style={styles.headerCopy}>
                        <AppText size={16} family='InterSemiBold' color={colors.blue} numLines={2}>
                            {item?.beat_name}
                        </AppText>
                        <AppText size={12} family='InterMedium' color="#7A8290" style={styles.headerSub}>
                            {total} {total === 1 ? 'Counter' : 'Counters'}
                        </AppText>
                    </View>
                    <ChevronRight />
                </View>

                {/* Visit progress */}
                <View style={styles.progressRow}>
                    <View style={styles.progressTrack}>
                        <View
                            style={[
                                styles.progressFill,
                                { width: `${percent}%`, backgroundColor: done ? '#1B7F4B' : colors.gold },
                            ]}
                        />
                    </View>
                    <AppText size={12} family='InterSemiBold' color={done ? '#1B7F4B' : '#7A8290'}>
                        {percent}%
                    </AppText>
                </View>

                {/* Counter breakdown */}
                <View style={styles.statRow}>
                    <StatTile label="Total" value={total} tone={STAT_TOTAL} />
                    <StatTile label="Visited" value={visited} tone={STAT_VISITED} />
                    <StatTile label="Remaining" value={item?.remaining_customers} tone={STAT_REMAINING} />
                </View>
            </Pressable>
        );
    };

    if (!token || !userId) {
        return (
            <View style={styles.center}>
                <AppText size={16} color="red">
                    Please log in to view beats
                </AppText>
            </View>
        );
    }

    if (loading && !refreshing) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={colors.blue} />
            </View>
        );
    }

    return (
        <View style={styles.container}>

            <FlatList
                data={beats}
                renderItem={renderBeatItem}
                keyExtractor={item => String(item.beatscheduleid)}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={{ marginTop: 20 }}>
                        <AppText size={16} color="black" align='center'>
                            {errorMsg || 'No beats scheduled for today'}
                        </AppText>
                    </View>
                }
                ListFooterComponent={
                    errorMsg && !beats.length ? (
                        <AppText size={14} color="red" style={{ textAlign: 'center', marginTop: rw(20) }}>
                            {errorMsg}
                        </AppText>
                    ) : null
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bgColor
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: rw(20)
    },
    listContent: {
        paddingHorizontal: rw(14),
        paddingTop: rw(16),
        paddingBottom: rw(80),
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: rw(14),
        marginBottom: rw(12),
        borderWidth: 1,
        borderColor: '#EFEAE0',
        shadowOffset: { width: 0, height: 3 },
        shadowColor: '#2B2B2B',
        shadowOpacity: Platform.OS === 'ios' ? 0.06 : 0.12,
        shadowRadius: 8,
        elevation: 3,
        overflow: 'hidden',
    },
    cardPressed: {
        opacity: 0.94,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: rw(10),
    },
    accentBar: {
        width: 4,
        alignSelf: 'stretch',
        minHeight: rw(34),
        borderRadius: 2,
        backgroundColor: colors.gold,
    },
    headerCopy: {
        flex: 1,
        minWidth: 0,
    },
    headerSub: {
        marginTop: 2,
    },
    progressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: rw(10),
        marginTop: rw(12),
    },
    progressTrack: {
        flex: 1,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#EDEFF3',
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    },
    statRow: {
        flexDirection: 'row',
        gap: rw(8),
        marginTop: rw(12),
    },
    statTile: {
        flex: 1,
        borderRadius: 12,
        borderWidth: 1,
        paddingVertical: rw(10),
        paddingHorizontal: rw(4),
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
    },
});

export default BeatsScreen;