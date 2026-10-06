import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import AppText from '../../components/AppText/AppText';
import { colors } from '../../utils/Colors';
import ReportTab from './ReportTab';
import SchemeTab from './SchemeTab';
import RedemptionTab from './RedemptionTab';

const TABS = [
  { key: 'scheme', label: 'Scheme' },
  { key: 'redemption', label: 'Redemption' },
  { key: 'report', label: 'Milestone' },
] as const;

type TabKey = typeof TABS[number]['key'];

// Gajra Gro+ screen: Scheme / Redemption / Milestone (the team's Gro mechanics, report tab)
const GajraGro = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('scheme');
  // A tab is mounted on first open and kept, so switching back does not reload it
  const [opened, setOpened] = useState<TabKey[]>(['scheme']);

  const openTab = (key: TabKey) => {
    setActiveTab(key);
    setOpened(prev => (prev.includes(key) ? prev : [...prev, key]));
  };

  return (
    <View style={styles.screen}>
      <View style={styles.tabBar}>
        {TABS.map(tab => {
          const selected = activeTab === tab.key;
          return (
            <Pressable key={tab.key} style={[styles.tab, selected && styles.activeTab]} onPress={() => openTab(tab.key)}>
              <AppText
                size={14}
                family={selected ? 'InterSemiBold' : 'InterMedium'}
                color={selected ? colors.white : '#2B2B2B'}
              >
                {tab.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {opened.includes('scheme') && (
        <View style={[styles.page, activeTab !== 'scheme' && styles.hidden]}><SchemeTab /></View>
      )}
      {opened.includes('redemption') && (
        <View style={[styles.page, activeTab !== 'redemption' && styles.hidden]}><RedemptionTab /></View>
      )}
      {opened.includes('report') && (
        <View style={[styles.page, activeTab !== 'report' && styles.hidden]}><ReportTab /></View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgColor },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    padding: 5,
    borderRadius: 30,
    backgroundColor: colors.white,
    shadowOffset: { width: 0, height: 3 },
    shadowColor: 'rgba(0,0,0,0.12)',
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 4,
  },
  tab: { flex: 1, height: 40, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  activeTab: { backgroundColor: colors.blue },
  page: { flex: 1 },
  hidden: { display: 'none' },
});

export default GajraGro;
