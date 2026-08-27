import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';

export default function MapScreen({ lang, lastResult }) {
  const [location, setLocation] = useState(null);

  const t = (en, fr) => lang === 'fr' ? fr : en;

  useEffect(() => { getLocation(); }, []);

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation(loc.coords);
      }
    } catch(e) {}
  };

  const getScoreColor = (s) => s >= 70 ? '#3DAA6B' : s >= 40 ? '#F9A825' : '#E53935';

  const lat = lastResult?.lat || location?.latitude || 0;
  const lng = lastResult?.lng || location?.longitude || 0;

  const mapHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>* { margin:0; padding:0; } #map { width:100%; height:100vh; }</style>
</head>
<body>
<div id="map"></div>
<script>
  var map = L.map('map').setView([${lat || 0}, ${lng || 0}], ${lat ? 12 : 3});
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Esri', maxZoom: 18
  }).addTo(map);
  L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 18, opacity: 0.8
  }).addTo(map);
  ${lastResult ? `L.marker([${lastResult.lat}, ${lastResult.lng}]).addTo(map).bindPopup('<b>Score: ${lastResult.score}/100</b><br>${lastResult.ai_forest_type || ''}').openPopup();` : ''}
  ${location ? `L.circleMarker([${location.latitude}, ${location.longitude}], {color:'#3DAA6B',fillColor:'#3DAA6B',fillOpacity:0.8,radius:8}).addTo(map).bindPopup('Your location');` : ''}
</script>
</body>
</html>`;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🗺️ {t('Satellite Map', 'Carte Satellite')}</Text>
      </View>
      <WebView
        style={styles.map}
        source={{ html: mapHtml }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        allowsInlineMediaPlayback={true}
      />
      {lastResult && (
        <View style={styles.overlay}>
          <Text style={[styles.overlayScore, { color: getScoreColor(lastResult.score) }]}>
            {lastResult.score}/100
          </Text>
          <Text style={styles.overlayType}>
            {lang === 'fr' ? lastResult.ai_forest_type_fr : lastResult.ai_forest_type}
          </Text>
          <Text style={styles.overlayCoords}>
            📍 {lastResult.lat?.toFixed(4)}, {lastResult.lng?.toFixed(4)}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D3B2E' },
  header: { padding: 12, borderBottomWidth: 2, borderBottomColor: '#1B6B45' },
  title: { color: 'white', fontSize: 14, fontWeight: 'bold' },
  map: { flex: 1 },
  overlay: { position: 'absolute', bottom: 20, left: 20, right: 20, backgroundColor: 'rgba(10,46,32,0.95)', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#3DAA6B' },
  overlayScore: { fontSize: 22, fontWeight: 'bold', textAlign: 'center' },
  overlayType: { color: 'white', fontSize: 12, textAlign: 'center', marginTop: 3 },
  overlayCoords: { color: '#D6EFE1', fontSize: 10, textAlign: 'center', marginTop: 3 },
});
