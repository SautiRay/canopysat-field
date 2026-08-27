import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import HomeScreen from './app/index';
import MapScreen from './app/map';
import PhotoScreen from './app/photos';
import InventoryScreen from './app/inventory';
import BottomNav from './app/components/BottomNav';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('home');
  const [lang, setLang] = useState('en');
  const [lastResult, setLastResult] = useState(null);

  const renderScreen = () => {
    switch(currentScreen) {
      case 'home': return <HomeScreen lang={lang} setLang={setLang} onResult={setLastResult} lastResult={lastResult} />;
      case 'map': return <MapScreen lang={lang} lastResult={lastResult} />;
      case 'photos': return <PhotoScreen lang={lang} />;
      case 'inventory': return <InventoryScreen lang={lang} />;
      default: return <HomeScreen lang={lang} setLang={setLang} onResult={setLastResult} lastResult={lastResult} />;
    }
  };

  return (
    <View style={styles.container}>
      {renderScreen()}
      <BottomNav current={currentScreen} onNavigate={setCurrentScreen} lang={lang} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D3B2E' }
});
