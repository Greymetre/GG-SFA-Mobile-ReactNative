import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated as RNAnimated,
  Easing,
  FlatList,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { NavigationProp, ParamListBase, useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import AppText from '../../components/AppText/AppText';
import { useAppSelector } from '../../components/redux/Store';
import { BackIcon, MicIcon, SendIcon } from '../../assets/svgs/SvgsFile';
import AiIcon, { INTENT_ICONS } from '../../assets/svgs/AiIcons';
import {
  ChatButton,
  ChatMessage,
  ChatTable,
  ChatbotNoAccessError,
  getChatHistory,
  sendChatMessage,
} from '../../api/query/ChatbotApi';
import { cancelListening, listenForSpeech, stopListening } from '../../utils/speechToText';
import { brandGradient, colors } from '../../utils/Colors';
import { rw } from '../../utils/responsive';

const INK = '#1C1C1E';
const BODY = '#374151';
const MUTED = '#8A8F98';
const LINE = '#ECE7DA';
const GOLD = ['#FFE27A', '#F2B705', '#D99A00'];
const GOLD_SOFT = '#FFF8E1';
const GOLD_BORDER = '#F6DD8E';
const GOLD_TEXT = '#7C5A05';

/** Gold orb with the sparkle: the assistant's avatar */
const AiOrb = ({ size = 28 }: { size?: number }) => (
  <LinearGradient colors={GOLD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}>
    <AiIcon name="sparkle" size={size * 0.55} color={INK} />
  </LinearGradient>
);

/**
 * One line of a bot reply. Lines wrapped in _..._ are notes: "_Samjha: ..._" / "_Understood: ..._" is what the bot understood,
 * "_Sorry: ..._" a warning. **text** is bold. (Same format as the web panel chat, public/assets/js/chatbot.js)
 */
const ReplyLine = ({ line }: { line: string }) => {
  const note = /^_(.+)_$/.exec(line.trim());
  if (note) {
    const body = note[1];
    if (/^(Samjha|Understood)\b/.test(body)) {
      return (
        <View style={styles.understood}>
          <AiIcon name="sparkle" size={13} color="#D99A00" />
          <AppText size={11.5} color={GOLD_TEXT} family="InterMedium" style={{ flexShrink: 1 }}>{body}</AppText>
        </View>
      );
    }
    const sorry = /^Sorry\b/.test(body);
    return (
      <View style={[styles.note, sorry && styles.noteSorry]}>
        <AiIcon name="info" size={13} color={sorry ? '#B45309' : MUTED} />
        <AppText size={12} color={sorry ? '#92400E' : MUTED} style={{ flexShrink: 1 }}>{body}</AppText>
      </View>
    );
  }
  if (!line.trim()) return <View style={{ height: 6 }} />;
  return (
    <AppText size={14.5} color={BODY} lineHeight={22}>
      {line.split(/(\*\*.+?\*\*)/g).map((part, i) =>
        /^\*\*.+\*\*$/.test(part)
          ? <AppText key={i} size={14.5} color={INK} family="InterSemiBold">{part.slice(2, -2)}</AppText>
          : part,
      )}
    </AppText>
  );
};

const isNumeric = (cell: any) => cell !== '' && cell != null && /^[₹\s\-+]*[\d,]+(\.\d+)?\s*%?$/.test(String(cell));

const ReplyTable = ({ table }: { table: ChatTable }) => {
  if (!table?.rows?.length) return null;
  const numeric = table.head.map((_, i) => table.rows.every(row => row[i] === '' || row[i] == null || isNumeric(row[i])));
  // each column as wide as its longest value, within limits
  const widths = table.head.map((h, i) => {
    const longest = Math.max(String(h ?? '').length, ...table.rows.map(row => String(row[i] ?? '').length));
    return Math.min(190, Math.max(numeric[i] ? 72 : 96, longest * 7.4 + 24));
  });
  return (
    <View style={styles.tableCard}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} bounces={false}>
        <View>
          <View style={[styles.tableRow, styles.tableHead]}>
            {table.head.map((h, i) => (
              <View key={i} style={[styles.cell, { width: widths[i] }]}>
                <AppText size={11.5} color={colors.white} family="InterSemiBold" align={numeric[i] ? 'right' : 'left'}>{h}</AppText>
              </View>
            ))}
          </View>
          {table.rows.map((row, r) => (
            <View key={r} style={[styles.tableRow, r % 2 === 1 && { backgroundColor: '#FBFAF6' }, r === table.rows.length - 1 && { borderBottomWidth: 0 }]}>
              {row.map((value, i) => (
                <View key={i} style={[styles.cell, { width: widths[i] }]}>
                  <AppText size={12.5} color={i === 0 ? INK : BODY} family={i === 0 || numeric[i] ? 'InterMedium' : undefined} align={numeric[i] ? 'right' : 'left'}>
                    {value == null ? '' : String(value)}
                  </AppText>
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
      <View style={styles.tableFoot}>
        <AppText size={10.5} color={MUTED}>{table.rows.length} rows{table.head.length > 2 ? '  •  side mein scroll karein' : ''}</AppText>
      </View>
    </View>
  );
};

const Chips = ({ buttons, refine, onPress, disabled }: { buttons: ChatButton[]; refine?: boolean; onPress: (b: ChatButton) => void; disabled: boolean }) => {
  if (!buttons.length) return null;
  return (
    <View style={[styles.chips, refine && styles.refineWrap]}>
      {refine && <AppText size={11} color={MUTED} family="InterMedium" style={{ alignSelf: 'center', marginRight: 2 }}>Badlein</AppText>}
      {buttons.map((button, i) => (
        <Pressable
          key={`${button.label}-${i}`}
          disabled={disabled}
          onPress={() => onPress(button)}
          style={({ pressed }) => [refine ? styles.refineChip : styles.chip, pressed && styles.chipPressed, disabled && { opacity: 0.5 }]}
        >
          {!refine && INTENT_ICONS[button.intent] ? <AiIcon name={INTENT_ICONS[button.intent]} size={13} color="#B7860B" /> : null}
          <AppText size={refine ? 11.5 : 12.5} color={INK} family="InterMedium">{button.label}</AppText>
        </Pressable>
      ))}
    </View>
  );
};

/** Three bouncing dots while the reply is on its way */
const TypingDots = () => {
  const dots = useRef([0, 1, 2].map(() => new RNAnimated.Value(0))).current;
  useEffect(() => {
    const loop = RNAnimated.loop(
      RNAnimated.stagger(150, dots.map(dot => RNAnimated.sequence([
        RNAnimated.timing(dot, { toValue: 1, duration: 280, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        RNAnimated.timing(dot, { toValue: 0, duration: 280, easing: Easing.in(Easing.ease), useNativeDriver: true }),
      ]))),
    );
    loop.start();
    return () => loop.stop();
  }, [dots]);
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {dots.map((dot, i) => (
        <RNAnimated.View
          key={i}
          style={[styles.dot, { opacity: dot.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }), transform: [{ translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }] }]}
        />
      ))}
    </View>
  );
};

const Assistant = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const user = useAppSelector((s: any) => s.auth?.user);
  const firstName = String(user?.name || '').trim().split(' ')[0];
  const listRef = useRef<FlatList<ChatMessage>>(null);
  // messages from history are shown as they are; only new ones slide in
  const animateFrom = useRef(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [suggestions, setSuggestions] = useState<ChatButton[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [noAccess, setNoAccess] = useState<string | null>(null);

  useEffect(() => {
    getChatHistory()
      .then(history => {
        animateFrom.current = history.messages.length;
        setMessages(history.messages);
        setSuggestions(history.suggestions);
      })
      .catch(error => {
        if (error instanceof ChatbotNoAccessError) setNoAccess(error.message);
        else Toast.show({ type: 'error', text1: 'Purani chat load nahi hui', position: 'top' });
      })
      .finally(() => setLoading(false));
    return () => { cancelListening(); };
  }, []);

  // after the slide-in animation, so a tall reply (table + chips) is fully in view
  const scrollDown = () => setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 320);

  const send = useCallback(async (text: string, button?: ChatButton) => {
    const message = text.trim();
    if (!message || busy) return;
    setBusy(true);
    setMessages(prev => [...prev, { sender: 'user', text: message }]);
    scrollDown();
    try {
      const reply = await sendChatMessage(message, button);
      setMessages(prev => [...prev, reply]);
    } catch (error: any) {
      if (error instanceof ChatbotNoAccessError) setNoAccess(error.message);
    } finally {
      setBusy(false);
      scrollDown();
    }
  }, [busy]);

  const submit = () => {
    const text = input;
    setInput('');
    send(text);
  };

  const handleMic = async () => {
    if (listening) {
      stopListening();
      return;
    }
    setListening(true);
    try {
      const spoken = await listenForSpeech();
      if (spoken) send(spoken);
      else Toast.show({ type: 'info', text1: "Didn't catch that", text2: 'Mic dabakar dobara boliye', position: 'top' });
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Voice nahi chala', text2: error?.message || 'Dobara try kijiye', position: 'top' });
    } finally {
      setListening(false);
    }
  };

  const newChat = () => {
    if (busy) return;
    animateFrom.current = 0;
    setMessages([]);
  };

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const entering = index >= animateFrom.current ? FadeInDown.duration(260) : undefined;
    if (item.sender === 'user') {
      return (
        <Animated.View entering={entering} style={styles.userRow}>
          <View style={styles.userBubble}>
            <AppText size={15} color={colors.white} lineHeight={21}>{item.text}</AppText>
          </View>
        </Animated.View>
      );
    }
    const buttons = item.buttons || [];
    return (
      <Animated.View entering={entering} style={styles.botBlock}>
        <View style={styles.botLabel}>
          <AiOrb size={22} />
          <AppText size={12} color={INK} family="InterSemiBold">Gajra AI</AppText>
        </View>
        <View style={[styles.botCard, item.isError && styles.errorCard]}>
          {String(item.text || '').split('\n').map((line, i) => <ReplyLine key={i} line={line} />)}
          {item.table ? <ReplyTable table={item.table} /> : null}
          <Chips buttons={buttons.filter(b => !b.refine)} onPress={b => send(b.label, b)} disabled={busy} />
          <Chips buttons={buttons.filter(b => b.refine)} refine onPress={b => send(b.label, b)} disabled={busy} />
        </View>
      </Animated.View>
    );
  };

  const welcome = (
    <Animated.View entering={FadeInDown.duration(350)} style={styles.welcome}>
      <View style={styles.heroGlow}>
        <AiOrb size={64} />
      </View>
      <AppText size={22} color={INK} family="InterBold" align="center" style={{ marginTop: 16 }}>
        Namaste{firstName ? `, ${firstName}` : ''}
      </AppText>
      <AppText size={15} color={BODY} align="center" style={{ marginTop: 6, lineHeight: 22 }}>
        Aaj main aapki kya madad karun?
      </AppText>
      <AppText size={12.5} color={MUTED} align="center" style={{ marginTop: 4, lineHeight: 18, paddingHorizontal: rw(10) }}>
        Plan, target, sales, customers, attendance... Hindi ya Hinglish mein poochiye, likhkar ya bolkar.
      </AppText>
      <View style={styles.cards}>
        {suggestions.map(s => (
          <Pressable key={s.intent} style={({ pressed }) => [styles.card, pressed && styles.chipPressed]} onPress={() => send(s.label, s)}>
            <View style={styles.cardIcon}>
              <AiIcon name={INTENT_ICONS[s.intent] || 'sparkle'} size={18} color={INK} />
            </View>
            <AppText size={13} color={INK} family="InterMedium" style={{ flex: 1 }} lineHeight={17}>{s.label}</AppText>
          </Pressable>
        ))}
      </View>
    </Animated.View>
  );

  const header = (
    <View style={styles.header}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <LinearGradient {...brandGradient} style={StyleSheet.absoluteFill} />
      <SafeAreaView edges={['top']}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.headerBtn} hitSlop={8} accessibilityLabel="Back">
            <BackIcon color={INK} />
          </Pressable>
          <View style={styles.headerAvatar}>
            <AiIcon name="sparkle" size={20} color={colors.goldLight} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText size={17} color={INK} family="InterBold" numLines={1}>Gajra AI Assistant</AppText>
            <View style={styles.status}>
              <View style={styles.onlineDot} />
              <AppText size={11.5} color="#4B5563" numLines={1}>Online  •  Aapke CRM data se jawab</AppText>
            </View>
          </View>
          {messages.length > 0 && !noAccess ? (
            <Pressable onPress={newChat} style={styles.headerBtn} hitSlop={8} accessibilityLabel="Nayi chat">
              <AiIcon name="newChat" size={19} color={INK} />
            </Pressable>
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );

  if (loading || noAccess) {
    return (
      <View style={styles.container}>
        {header}
        <View style={[styles.center, { padding: rw(28) }]}>
          {loading ? <ActivityIndicator size="large" color="#D99A00" /> : (
            <>
              <AiOrb size={56} />
              <AppText size={15} color={BODY} align="center" style={{ marginTop: 16, lineHeight: 22 }}>{noAccess}</AppText>
            </>
          )}
        </View>
      </View>
    );
  }

  const canSend = !busy && !!input.trim();

  return (
    <View style={styles.container}>
      {header}
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(_, index) => String(index)}
          renderItem={renderMessage}
          ListEmptyComponent={welcome}
          ListFooterComponent={busy ? (
            <Animated.View entering={FadeInDown.duration(200)} style={styles.botBlock}>
              <View style={styles.botLabel}>
                <AiOrb size={22} />
                <AppText size={12} color={INK} family="InterSemiBold">Gajra AI</AppText>
              </View>
              <View style={[styles.botCard, styles.typingCard]}>
                <TypingDots />
                <AppText size={12.5} color={MUTED}>Aapke CRM data se jawab bana raha hoon</AppText>
              </View>
            </Animated.View>
          ) : null}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => { if (messages.length) listRef.current?.scrollToEnd({ animated: true }); }}
        />

        <SafeAreaView edges={['bottom']} style={styles.footer}>
          {listening && (
            <View style={styles.listeningBar}>
              <View style={styles.recDot} />
              <AppText size={12} color="#B91C1C" family="InterMedium">Sun raha hoon... bolne ke baad mic dobara dabaiye</AppText>
            </View>
          )}
          <View style={[styles.composer, listening && { borderColor: '#FCA5A5' }]}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Gajra AI se poochiye..."
              placeholderTextColor="#A1A1AA"
              maxLength={500}
              multiline
              editable={!listening}
            />
            <Pressable
              onPress={handleMic}
              disabled={busy}
              hitSlop={6}
              accessibilityLabel={listening ? 'Bolna band karo' : 'Bolkar poochiye'}
              style={[styles.roundBtn, { backgroundColor: listening ? '#EF4444' : '#F4F1E8' }]}
            >
              <MicIcon size={19} color={listening ? colors.white : INK} />
            </Pressable>
            <Pressable onPress={submit} disabled={!canSend} hitSlop={6} accessibilityLabel="Bhejo">
              {canSend ? (
                <LinearGradient colors={GOLD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.roundBtn}>
                  <SendIcon size={19} color={INK} />
                </LinearGradient>
              ) : (
                <View style={[styles.roundBtn, { backgroundColor: '#E5E7EB' }]}>
                  <SendIcon size={19} color="#9CA3AF" />
                </View>
              )}
            </Pressable>
          </View>
          <AppText size={10} color={MUTED} align="center" style={{ marginTop: 7 }}>
            AI sawal samajhta hai, saare numbers aapke CRM se aate hain
          </AppText>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F5EF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    overflow: 'hidden',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    backgroundColor: colors.goldLight,
    shadowColor: '#B8860B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 2,
  },
  headerRow: { height: 68, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: rw(14) },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: INK,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  status: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#16A34A' },

  listContent: { paddingHorizontal: rw(16), paddingTop: rw(16), paddingBottom: rw(24), flexGrow: 1 },

  welcome: { alignItems: 'center', paddingTop: rw(18) },
  heroGlow: {
    padding: 10,
    borderRadius: 50,
    backgroundColor: 'rgba(242,183,5,0.14)',
    shadowColor: '#F2B705',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
  },
  cards: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: rw(22), rowGap: 10, width: '100%' },
  card: {
    width: '48.6%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 11,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: LINE,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  cardIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: GOLD_SOFT, alignItems: 'center', justifyContent: 'center' },

  userRow: { alignItems: 'flex-end', marginBottom: 16, paddingLeft: '18%' },
  userBubble: { backgroundColor: INK, paddingVertical: 10, paddingHorizontal: 15, borderRadius: 18, borderBottomRightRadius: 5 },

  botBlock: { marginBottom: 18 },
  botLabel: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 7 },
  botCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderTopLeftRadius: 5,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: LINE,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  errorCard: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  typingCard: { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'flex-start' },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#D99A00' },

  understood: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: GOLD_SOFT,
    borderColor: GOLD_BORDER,
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginVertical: 4 },
  noteSorry: { backgroundColor: '#FFFBEB', borderRadius: 8, padding: 8 },

  tableCard: { marginTop: 10, borderRadius: 12, borderWidth: 1, borderColor: LINE, overflow: 'hidden', backgroundColor: colors.white },
  tableRow: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E7E3D8' },
  tableHead: { backgroundColor: INK, borderBottomWidth: 0 },
  cell: { paddingVertical: 9, paddingHorizontal: 10, justifyContent: 'center' },
  tableFoot: { paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#FAF8F2', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: LINE },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 12 },
  refineWrap: { marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: LINE },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: GOLD_BORDER,
    backgroundColor: '#FFFDF5',
  },
  refineChip: { paddingVertical: 5, paddingHorizontal: 11, borderRadius: 16, backgroundColor: '#F3F1EA' },
  chipPressed: { backgroundColor: GOLD_SOFT, borderColor: '#F2B705' },

  footer: {
    backgroundColor: colors.white,
    paddingHorizontal: rw(12),
    paddingTop: 10,
    paddingBottom: 6,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 8,
  },
  listeningBar: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8, paddingHorizontal: 4 },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    padding: 5,
    paddingLeft: 4,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#E5E1D6',
    backgroundColor: '#FBFAF7',
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 110,
    paddingHorizontal: 12,
    paddingTop: 11,
    paddingBottom: 11,
    fontSize: 15,
    color: INK,
  },
  roundBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
});

export default Assistant;
