import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, SafeAreaView
} from 'react-native';
import * as Location from 'expo-location';

const CANOPYSAT_API = 'https://www.canopysat.org';

export default function HomeScreen() {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [lang, setLang] = useState('en');

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      getCurrentLocation();
    }
  };

  const getCurrentLocation = async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      setLocation(loc.coords);
    } catch (e) {
      Alert.alert('GPS Error', 'Could not get location');
    }
  };

  const analyzeForest = async () => {
    if (!location) {
      Alert.alert(
        lang === 'fr' ? 'GPS requis' : 'GPS required',
        lang === 'fr' ? 'Activez le GPS' : 'Please enable GPS'
      );
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(`${CANOPYSAT_API}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: location.latitude,
          lng: location.longitude,
          size: 10,
          lang: lang
        })
      });
      const data = await response.json();
      if (data.success) {
        setResult(data);
      } else {
        Alert.alert('Error', data.error || 'Analysis failed');
      }
    } catch (e) {
      Alert.alert('Error', 'Connection failed: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 70) return '#3DAA6B';
    if (score >= 40) return '#F9A825';
    return '#E53935';
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🛰️ CANOPYSAT FIELD</Text>
        <View style={styles.langSwitch}>
          <TouchableOpacity
            style={[styles.langBtn, lang === 'en' && styles.langBtnActive]}
            onPress={() => setLang('en')}>
            <Text style={styles.langBtnText}>EN</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.langBtn, lang === 'fr' && styles.langBtnActive]}
            onPress={() => setLang('fr')}>
            <Text style={styles.langBtnText}>FR</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* GPS Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            📍 {lang === 'fr' ? 'Position GPS' : 'GPS Location'}
          </Text>
          {location ? (
            <View>
              <Text style={styles.gpsText}>
                Lat: {location.latitude.toFixed(6)}
              </Text>
              <Text style={styles.gpsText}>
                Lng: {location.longitude.toFixed(6)}
              </Text>
              <Text style={styles.gpsAccuracy}>
                ±{location.accuracy ? Math.round(location.accuracy) : '?'}m
              </Text>
            </View>
          ) : (
            <Text style={styles.gpsWaiting}>
              {lang === 'fr' ? 'Recherche GPS...' : 'Getting GPS...'}
            </Text>
          )}
          <TouchableOpacity style={styles.refreshBtn} onPress={getCurrentLocation}>
            <Text style={styles.refreshBtnText}>🔄 {lang === 'fr' ? 'Actualiser' : 'Refresh'}</Text>
          </TouchableOpacity>
        </View>

        {/* Analyze Button */}
        <TouchableOpacity
          style={[styles.analyzeBtn, loading && styles.analyzeBtnDisabled]}
          onPress={analyzeForest}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.analyzeBtnText}>
              🔍 {lang === 'fr' ? 'ANALYSER LA FORÊT' : 'ANALYZE FOREST'}
            </Text>
          )}
        </TouchableOpacity>

        {loading && (
          <Text style={styles.loadingText}>
            {lang === 'fr' ? 'Connexion aux satellites...' : 'Connecting to satellites...'}
          </Text>
        )}

        {/* Results */}
        {result && (
          <View style={styles.resultCard}>
            {/* Score */}
            <View style={styles.scoreBox}>
              <Text style={[styles.scoreNum, { color: getScoreColor(result.score) }]}>
                {result.score}
              </Text>
              <Text style={styles.scoreLabel}>
                FOREST INTEGRITY SCORE / 100
              </Text>
              <Text style={[styles.scoreStatus, { color: getScoreColor(result.score) }]}>
                {result.score >= 70
                  ? (lang === 'fr' ? '🌿 Forêt Saine' : '🌿 Healthy Forest')
                  : result.score >= 40
                  ? (lang === 'fr' ? '⚠️ Forêt Dégradée' : '⚠️ Degraded Forest')
                  : (lang === 'fr' ? '🔴 Forêt Critique' : '🔴 Critical Forest')}
              </Text>
            </View>

            {/* AI Classification */}
            {result.ai_forest_type && (
              <View style={styles.aiBox}>
                <Text style={styles.aiLabel}>🤖 AI CLASSIFICATION</Text>
                <Text style={styles.aiValue}>{result.ai_forest_type}</Text>
                {result.dev_stage && (
                  <Text style={styles.aiSub}>🌱 {result.dev_stage}</Text>
                )}
                {result.biomass_class && (
                  <Text style={styles.aiSub}>⚖️ {result.biomass_class}</Text>
                )}
              </View>
            )}

            {/* Indicators */}
            <View style={styles.indicators}>
              <ResultRow label={lang === 'fr' ? '🌿 Végétation' : '🌿 Vegetation'} value={result.ndvi_current} />
              <ResultRow label={lang === 'fr' ? '📈 Tendance 3 ans' : '📈 Trend 3y'} value={(result.ndvi_change >= 0 ? '+' : '') + result.ndvi_change} color={result.ndvi_change >= 0 ? '#3DAA6B' : '#E53935'} />
              <ResultRow label="📡 Sentinel-1 Radar" value={result.sentinel1_vv ? result.sentinel1_vv + ' dB' : 'N/A'} />
              <ResultRow label={lang === 'fr' ? '🌳 Couverture' : '🌳 Forest cover'} value={result.forest_cover + '%'} />
              <ResultRow label={lang === 'fr' ? '🔥 Feux (pixels)' : '🔥 Fire pixels'} value={result.fire_pixels + ' px'} color={result.fire_pixels > 0 ? '#E53935' : '#3DAA6B'} />
              {result.deforestation_alert && (
                <View style={[styles.alertBox, {
                  backgroundColor: result.deforestation_alert.includes('CRITICAL') ? '#E53935'
                    : result.deforestation_alert.includes('WARNING') ? '#F9A825'
                    : '#3DAA6B'
                }]}>
                  <Text style={styles.alertText}>
                    ⚠️ {lang === 'fr' ? result.deforestation_alert_fr : result.deforestation_alert}
                  </Text>
                </View>
              )}
            </View>

            {/* Satellites */}
            <Text style={styles.satellitesText}>
              🛰️ {result.satellites_used ? result.satellites_used.join(' · ') : ''}
            </Text>
            <Text style={styles.dateText}>📅 {result.analysis_date}</Text>
          </View>
        )}

        {/* Satellites Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            🛰️ {lang === 'fr' ? 'Satellites Actifs (5)' : 'Active Satellites (5)'}
          </Text>
          {[
            'ESA Sentinel-2A/2B — 10m',
            'NASA Landsat 8 & 9 — 30m',
            'ESA Sentinel-1 — Radar',
            'NASA MODIS — Fire detection',
            'NASA/NOAA VIIRS — Fire alerts'
          ].map((sat, i) => (
            <Text key={i} style={styles.satItem}>🟢 {sat}</Text>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const ResultRow = ({ label, value, color }) => (
  <View style={styles.resultRow}>
    <Text style={styles.resultLabel}>{label}</Text>
    <Text style={[styles.resultValue, color && { color }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D3B2E' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 15,
    borderBottomWidth: 2, borderBottomColor: '#1B6B45'
  },
  headerTitle: { color: 'white', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
  langSwitch: { flexDirection: 'row', gap: 5 },
  langBtn: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12, borderWidth: 1, borderColor: '#3DAA6B'
  },
  langBtnActive: { backgroundColor: '#3DAA6B' },
  langBtnText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  content: { flex: 1, padding: 15 },
  card: {
    backgroundColor: '#1B4332', borderRadius: 10,
    padding: 15, marginBottom: 15
  },
  cardTitle: { color: '#3DAA6B', fontSize: 13, fontWeight: 'bold', marginBottom: 10 },
  gpsText: { color: 'white', fontSize: 14, marginBottom: 3 },
  gpsAccuracy: { color: '#D6EFE1', fontSize: 11, marginTop: 3 },
  gpsWaiting: { color: '#D6EFE1', fontSize: 13, fontStyle: 'italic' },
  refreshBtn: {
    marginTop: 10, padding: 8, backgroundColor: '#0D3B2E',
    borderRadius: 6, alignItems: 'center',
    borderWidth: 1, borderColor: '#3DAA6B'
  },
  refreshBtnText: { color: '#3DAA6B', fontSize: 12 },
  analyzeBtn: {
    backgroundColor: '#2D8A5A', padding: 16,
    borderRadius: 10, alignItems: 'center', marginBottom: 10
  },
  analyzeBtnDisabled: { backgroundColor: '#1B4332' },
  analyzeBtnText: { color: 'white', fontSize: 15, fontWeight: 'bold', letterSpacing: 1 },
  loadingText: { color: '#D6EFE1', textAlign: 'center', fontSize: 12, marginBottom: 10 },
  resultCard: {
    backgroundColor: '#1B4332', borderRadius: 10,
    padding: 15, marginBottom: 15
  },
  scoreBox: { alignItems: 'center', marginBottom: 15 },
  scoreNum: { fontSize: 56, fontWeight: 'bold' },
  scoreLabel: { color: '#D6EFE1', fontSize: 10, letterSpacing: 1 },
  scoreStatus: { fontSize: 16, fontWeight: 'bold', marginTop: 4 },
  aiBox: {
    backgroundColor: '#0D3B2E', borderRadius: 8,
    padding: 10, marginBottom: 12,
    borderWidth: 1, borderColor: '#3DAA6B'
  },
  aiLabel: { color: '#3DAA6B', fontSize: 10, letterSpacing: 1 },
  aiValue: { color: 'white', fontSize: 15, fontWeight: 'bold', marginTop: 3 },
  aiSub: { color: '#D6EFE1', fontSize: 11, marginTop: 2 },
  indicators: { borderTopWidth: 1, borderTopColor: '#2D6A4F', paddingTop: 10 },
  resultRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#0D3B2E'
  },
  resultLabel: { color: '#D6EFE1', fontSize: 12 },
  resultValue: { color: '#3DAA6B', fontSize: 12, fontWeight: 'bold' },
  alertBox: { borderRadius: 6, padding: 8, marginTop: 8, alignItems: 'center' },
  alertText: { color: 'white', fontSize: 11, fontWeight: 'bold', textAlign: 'center' },
  satellitesText: { color: '#2D6A4F', fontSize: 9, marginTop: 8, textAlign: 'center' },
  dateText: { color: '#2D6A4F', fontSize: 9, textAlign: 'center' },
  satItem: { color: '#D6EFE1', fontSize: 11, marginBottom: 4 }
});
