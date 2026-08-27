import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';

export default function MapScreen({ lang, lastResult }) {
  const [location, setLocation] = useState(null);
  const [search, setSearch] = useState('');
  const webViewRef = useRef(null);

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

  const searchLocation = async () => {
    if (!search) return;
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(search)}&limit=1`
      );
      const data = await response.json();
      if (data.length > 0) {
        const { lat, lon } = data[0];
        webViewRef.current?.injectJavaScript(`
          map.setView([${lat}, ${lon}], 12);
          L.marker([${lat}, ${lon}]).addTo(map).bindPopup('${search}').openPopup();
          true;
        `);
        setSearch('');
      }
    } catch(e) {}
  };

  const goToMyLocation = () => {
    if (location) {
      webViewRef.current?.injectJavaScript(`
        map.setView([${location.latitude}, ${location.longitude}], 14);
        true;
      `);
    }
  };

  const goToResult = () => {
    if (lastResult) {
      webViewRef.current?.injectJavaScript(`
        map.setView([${lastResult.lat}, ${lastResult.lng}], 13);
        true;
      `);
    }
  };

  const getScoreColor = (s) => s >= 70 ? '#3DAA6B' : s >= 40 ? '#F9A825' : '#E53935';

  const lat = lastResult?.lat || location?.latitude || 0;
  const lng = lastResult?.lng || location?.longitude || 0;

  const mapHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { overflow:hidden; }
    #map { width:100vw; height:100vh; }
    .leaflet-control-zoom { border: none !important; }
    .leaflet-control-zoom a { background: #0D3B2E !important; color: white !important; border: 1px solid #3DAA6B !important; }
  </style>
</head>
<body>
<div id="map"></div>
<script>
  var map = L.map('map', { zoomControl: true }).setView([${lat || 10}, ${lng || 10}], ${lat ? 12 : 3});
  
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Esri World Imagery', maxZoom: 19
  }).addTo(map);
  
  L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19, opacity: 0.8
  }).addTo(map);

  ${lastResult ? `
  var resultMarker = L.marker([${lastResult.lat}, ${lastResult.lng}], {
    icon: L.divIcon({
      html: '<div style="background:#3DAA6B;color:white;padding:4px 8px;border-radius:8px;font-size:12px;font-weight:bold;white-space:nowrap;">${lastResult.score}/100</div>',
      className: '', iconAnchor: [20, 10]
    })
  }).addTo(map);
  resultMarker.bindPopup('<b>Forest Score: ${lastResult.score}/100</b><br>${lastResult.ai_forest_type || ''}<br>Lat: ${lastResult.lat?.toFixed(4)}, Lng: ${lastResult.lng?.toFixed(4)}').openPopup();
  ` : ''}

  ${location ? `
  L.circleMarker([${location.latitude}, ${location.longitude}], {
    color:'#3DAA6B', fillColor:'#3DAA6B', fillOpacity:0.9, radius:10,
    weight: 3
  }).addTo(map).bindPopup('<b>📍 Your location</b>');
  ` : ''}
</script>
</body>
</html>`;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🗺️ {t('Satellite Map', 'Carte Satellite')}</Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder={t('Search a forest or country...', 'Rechercher une forêt ou pays...')}
          placeholderTextColor="#2D6A4F"
          returnKeyType="search"
          onSubmitEditing={searchLocation}
        />
        <TouchableOpacity style={styles.searchBtn} onPress={searchLocation}>
          <Text style={styles.searchBtnTxt}>🔍</Text>
        </TouchableOpacity>
      </View>

      {/* Quick buttons */}
      <View style={styles.quickBtns}>
        <TouchableOpacity style={styles.quickBtn} onPress={goToMyLocation}>
          <Text style={styles.quickBtnTxt}>📍 {t('My location', 'Ma position')}</Text>
        </TouchableOpacity>
        {lastResult && (
          <TouchableOpacity style={styles.quickBtn} onPress={goToResult}>
            <Text style={styles.quickBtnTxt}>🌲 {t('Last analysis', 'Dernière analyse')}</Text>
          </TouchableOpacity>
        )}
      </View>

      <WebView
        ref={webViewRef}
        style={styles.map}
        source={{ html: mapHtml }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        allowsInlineMediaPlayback={true}
        scrollEnabled={false}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D3B2E' },
  header: { padding: 12, borderBottomWidth: 2, borderBottomColor: '#1B6B45' },
  title: { color: 'white', fontSize: 14, fontWeight: 'bold' },
  searchBar: { flexDirection: 'row', padding: 8, gap: 6, backgroundColor: '#0A2E20' },
  searchInput: { flex: 1, backgroundColor: '#1B4332', borderRadius: 8, padding: 8, color: 'white', fontSize: 12 },
  searchBtn: { backgroundColor: '#2D8A5A', borderRadius: 8, padding: 8, justifyContent: 'center' },
  searchBtnTxt: { fontSize: 16 },
  quickBtns: { flexDirection: 'row', gap: 6, paddingHorizontal: 8, paddingBottom: 6, backgroundColor: '#0A2E20' },
  quickBtn: { backgroundColor: '#1B4332', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#1B6B45' },
  quickBtnTxt: { color: '#D6EFE1', fontSize: 10 },
  map: { flex: 1 },
  overlay: { position: 'absolute', bottom: 20, left: 20, right: 20, backgroundColor: 'rgba(10,46,32,0.95)', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#3DAA6B' },
  overlayScore: { fontSize: 22, fontWeight: 'bold', textAlign: 'center' },
  overlayType: { color: 'white', fontSize: 12, textAlign: 'center', marginTop: 3 },
  overlayCoords: { color: '#D6EFE1', fontSize: 10, textAlign: 'center', marginTop: 3 },
});
