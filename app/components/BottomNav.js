import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

const tabs = [
  { key: 'home', icon: '🔍', labelEn: 'Analyze', labelFr: 'Analyser' },
  { key: 'map', icon: '🗺️', labelEn: 'Map', labelFr: 'Carte' },
  { key: 'photos', icon: '📸', labelEn: 'Photos', labelFr: 'Photos' },
  { key: 'inventory', icon: '🌲', labelEn: 'Inventory', labelFr: 'Inventaire' },
];

export default function BottomNav({ current, onNavigate, lang }) {
  return (
    <View style={styles.nav}>
      {tabs.map(tab => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.tab, current === tab.key && styles.activeTab]}
          onPress={() => onNavigate(tab.key)}>
          <Text style={styles.icon}>{tab.icon}</Text>
          <Text style={[styles.label, current === tab.key && styles.activeLabel]}>
            {lang === 'fr' ? tab.labelFr : tab.labelEn}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: 'row',
    backgroundColor: '#0A2E20',
    borderTopWidth: 2,
    borderTopColor: '#1B6B45',
    paddingBottom: 5,
  },
  tab: {
    flex: 1, alignItems: 'center',
    paddingVertical: 8,
  },
  activeTab: { borderTopWidth: 2, borderTopColor: '#3DAA6B' },
  icon: { fontSize: 20 },
  label: { color: '#D6EFE1', fontSize: 10, marginTop: 2 },
  activeLabel: { color: '#3DAA6B', fontWeight: 'bold' },
});
