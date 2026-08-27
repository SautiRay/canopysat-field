import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, SafeAreaView
} from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CANOPYSAT_API = 'https://www.canopysat.org';

const T = {
  en: {
    title: '🛰️ CANOPYSAT FIELD',
    gps: '📍 GPS Location',
    refresh: '🔄 Refresh',
    analyze: '🔍 ANALYZE FOREST',
    analyzing: '⏳ Analyzing...',
    connecting: 'Connecting to satellites...',
    gpsWaiting: 'Getting GPS...',
    score: 'FOREST INTEGRITY SCORE / 100',
    healthy: '🌿 Healthy Forest',
    degraded: '⚠️ Degraded Forest',
    critical: '🔴 Critical Forest',
    ai: '🤖 AI CLASSIFICATION',
    veg: '🌿 Vegetation (NDVI)',
    trend3: '📈 Trend 3y (Sentinel-2)',
    trend10: '📡 Trend 10y (Landsat)',
    trend40: '🕰️ Trend 40y (Landsat 1984)',
    s1: '📡 Sentinel-1 Radar',
    cover: '🌳 Forest cover',
    fires: '🔥 Fire pixels (FIRMS)',
    status: '🌲 Forest status',
    annual: '📉 Annual NDVI rate',
    defor: '⚠️ Deforestation Alert',
    change3: '📊 Area change (3y)',
    change10: '📊 Area change (10y)',
    rate: '📉 Annual rate',
    leaf: '🍃 Leaf type',
    stage: '🌱 Dev. stage',
    biomass: '⚖️ Biomass',
    height: '📏 Canopy height',
    sats: '🛰️ Active Satellites (5)',
    pdf: '📄 Download PDF Report',
    pdfLoading: '⏳ Generating PDF...',
    offline: '📶 Last cached result',
    date: '📅 Date',
  },
  fr: {
    title: '🛰️ CANOPYSAT FIELD',
    gps: '📍 Position GPS',
    refresh: '🔄 Actualiser',
    analyze: '🔍 ANALYSER LA FORÊT',
    analyzing: '⏳ Analyse en cours...',
    connecting: 'Connexion aux satellites...',
    gpsWaiting: 'Recherche GPS...',
    score: "SCORE D'INTÉGRITÉ FORESTIÈRE / 100",
    healthy: '🌿 Forêt Saine',
    degraded: '⚠️ Forêt Dégradée',
    critical: '🔴 Forêt Critique',
    ai: '🤖 CLASSIFICATION IA',
    veg: '🌿 Végétation (NDVI)',
    trend3: '📈 Tendance 3 ans (Sentinel-2)',
    trend10: '📡 Tendance 10 ans (Landsat)',
    trend40: '🕰️ Tendance 40 ans (Landsat 1984)',
    s1: '📡 Sentinel-1 Radar',
    cover: '🌳 Couverture forestière',
    fires: '🔥 Pixels feux (FIRMS)',
    status: '🌲 Statut forestier',
    annual: '📉 Taux annuel NDVI',
    defor: '⚠️ Alerte Déforestation',
    change3: '📊 Changement surface (3 ans)',
    change10: '📊 Changement surface (10 ans)',
    rate: '📉 Taux annuel',
    leaf: '🍃 Type de feuilles',
    stage: '🌱 Stade développement',
    biomass: '⚖️ Biomasse',
    height: '📏 Hauteur canopée',
    sats: '🛰️ Satellites Actifs (5)',
    pdf: '📄 Télécharger Rapport PDF',
    pdfLoading: '⏳ Génération PDF...',
    offline: '📶 Dernier résultat en cache',
    date: '📅 Date',
  }
};

export default function HomeScreen({ lang, setLang, onResult, lastResult }) {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(lastResult);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const t = (k) => T[lang][k] || k;

  useEffect(() => {
    requestLocationPermission();
    loadCachedResult();
  }, []);

  const loadCachedResult = async () => {
    try {
      const cached = await AsyncStorage.getItem('lastResult');
      if (cached && !result) {
        setResult(JSON.parse(cached));
        setIsOffline(true);
      }
    } catch(e) {}
  };

  const requestLocationPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') getCurrentLocation();
  };

  const getCurrentLocation = async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocation(loc.coords);
    } catch(e) {
      Alert.alert('GPS Error', 'Could not get location');
    }
  };

  const analyzeForest = async () => {
    if (!location) {
      Alert.alert(t('gps'), lang === 'fr' ? 'Activez le GPS' : 'Please enable GPS');
      return;
    }
    setLoading(true);
    setResult(null);
    setIsOffline(false);

    try {
      const response = await fetch(`${CANOPYSAT_API}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: location.latitude, lng: location.longitude, size: 10, lang })
      });
      const data = await response.json();
      if (data.success) {
        setResult(data);
        onResult(data);
        await AsyncStorage.setItem('lastResult', JSON.stringify(data));
      } else {
        Alert.alert('Error', data.error || 'Analysis failed');
      }
    } catch(e) {
      Alert.alert('Error', 'Connection failed. Check your internet connection.');
      const cached = await AsyncStorage.getItem('lastResult');
      if (cached) { setResult(JSON.parse(cached)); setIsOffline(true); }
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    if (!result) return;
    setPdfLoading(true);
    try {
      const { openBrowserAsync } = await import('expo-web-browser');
      const params = new URLSearchParams({
        lat: result.lat, lng: result.lng, lang
      });
      await openBrowserAsync(`${CANOPYSAT_API}/report?${params}`);
    } catch(e) {
      Alert.alert('Error', 'Could not open PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  const getScoreColor = (s) => s >= 70 ? '#3DAA6B' : s >= 40 ? '#F9A825' : '#E53935';
  const fmt = (v) => v != null ? (v >= 0 ? '+' : '') + v : 'N/A';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('title')}</Text>
        <View style={styles.langSwitch}>
          <TouchableOpacity style={[styles.langBtn, lang === 'en' && styles.langActive]} onPress={() => setLang('en')}>
            <Text style={styles.langText}>EN</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.langBtn, lang === 'fr' && styles.langActive]} onPress={() => setLang('fr')}>
            <Text style={styles.langText}>FR</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* GPS Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('gps')}</Text>
          {location ? (
            <View>
              <Text style={styles.gpsText}>Lat: {location.latitude.toFixed(6)}</Text>
              <Text style={styles.gpsText}>Lng: {location.longitude.toFixed(6)}</Text>
              <Text style={styles.gpsAcc}>±{location.accuracy ? Math.round(location.accuracy) : '?'}m accuracy</Text>
            </View>
          ) : (
            <Text style={styles.gpsWait}>{t('gpsWaiting')}</Text>
          )}
          <TouchableOpacity style={styles.refreshBtn} onPress={getCurrentLocation}>
            <Text style={styles.refreshText}>{t('refresh')}</Text>
          </TouchableOpacity>
        </View>

        {/* Analyze Button */}
        <TouchableOpacity style={[styles.analyzeBtn, loading && styles.analyzeBtnOff]} onPress={analyzeForest} disabled={loading}>
          {loading ? <ActivityIndicator color="white" /> : <Text style={styles.analyzeTxt}>{t('analyze')}</Text>}
        </TouchableOpacity>
        {loading && <Text style={styles.connectTxt}>{t('connecting')}</Text>}

        {/* Offline banner */}
        {isOffline && result && (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineTxt}>📶 {t('offline')}</Text>
          </View>
        )}

        {/* Results */}
        {result && (
          <View style={styles.resultCard}>
            {/* Score */}
            <View style={styles.scoreBox}>
              <Text style={[styles.scoreNum, { color: getScoreColor(result.score) }]}>{result.score}</Text>
              <Text style={styles.scoreLabel}>{t('score')}</Text>
              <Text style={[styles.scoreStatus, { color: getScoreColor(result.score) }]}>
                {result.score >= 70 ? t('healthy') : result.score >= 40 ? t('degraded') : t('critical')}
              </Text>
            </View>

            {/* AI Classification */}
            {result.ai_forest_type && (
              <View style={styles.aiBox}>
                <Text style={styles.aiLabel}>{t('ai')}</Text>
                <Text style={styles.aiValue}>{lang === 'fr' ? result.ai_forest_type_fr : result.ai_forest_type}</Text>
                {result.leaf_type && <Text style={styles.aiSub}>{t('leaf')}: {lang === 'fr' ? result.leaf_type_fr : result.leaf_type}</Text>}
                {result.dev_stage && <Text style={styles.aiSub}>{t('stage')}: {lang === 'fr' ? result.dev_stage_fr : result.dev_stage}</Text>}
                {result.biomass_class && <Text style={styles.aiSub}>{t('biomass')}: {lang === 'fr' ? result.biomass_class_fr : result.biomass_class}{result.estimated_agb ? ` (~${result.estimated_agb} t/ha)` : ''}</Text>}
                {result.canopy_height && <Text style={styles.aiSub}>{t('height')}: ~{result.canopy_height}m</Text>}
              </View>
            )}

            {/* All indicators */}
            <View style={styles.indicators}>
              <Row label={t('veg')} value={result.ndvi_current} />
              <Row label={t('trend3')} value={fmt(result.ndvi_change)} color={result.ndvi_change >= 0 ? '#3DAA6B' : '#E53935'} />
              {result.landsat_change_10y != null && <Row label={t('trend10')} value={fmt(result.landsat_change_10y)} color={result.landsat_change_10y >= 0 ? '#3DAA6B' : '#E53935'} />}
              {result.landsat_change_40y != null && <Row label={t('trend40')} value={fmt(result.landsat_change_40y)} color={result.landsat_change_40y >= 0 ? '#3DAA6B' : '#E53935'} />}
              {result.sentinel1_vv && <Row label={t('s1')} value={`${result.sentinel1_vv} dB`} />}
              <Row label={t('cover')} value={`${result.forest_cover}%`} />
              <Row label={t('fires')} value={`${result.fire_pixels} px (~${result.fire_events_estimated} events)`} color={result.fire_pixels > 100 ? '#E53935' : '#3DAA6B'} />
              {result.forest_status && <Row label={t('status')} value={lang === 'fr' ? result.forest_status_fr : result.forest_status} color='#3DAA6B' />}
              {result.annual_rate != null && <Row label={t('annual')} value={`${(result.annual_rate * 100).toFixed(3)}% / ${lang === 'fr' ? 'an' : 'year'}`} color={result.annual_rate >= 0 ? '#3DAA6B' : '#E53935'} />}
              <Row label={t('date')} value={result.analysis_date} />
            </View>

            {/* Deforestation Alert */}
            {result.deforestation_alert && (
              <View style={[styles.alertBox, {
                backgroundColor: result.deforestation_alert.includes('CRITICAL') ? '#E53935'
                  : result.deforestation_alert.includes('WARNING') ? '#F9A825'
                  : result.deforestation_alert.includes('CAUTION') ? '#FF8C00'
                  : '#3DAA6B'
              }]}>
                <Text style={styles.alertTitle}>
                  {lang === 'fr' ? result.deforestation_alert_fr : result.deforestation_alert}
                </Text>
                {result.forest_change_ha != null && (
                  <Text style={styles.alertDetail}>
                    3y: {fmt(result.forest_change_ha)} ha ({fmt(result.forest_change_pct)}%) | Rate: {fmt(result.annual_ha_rate)} ha/yr
                  </Text>
                )}
                {result.forest_change_ha_10y != null && (
                  <Text style={styles.alertDetail}>
                    10y: {fmt(result.forest_change_ha_10y)} ha ({fmt(result.forest_change_pct_10y)}%) | Rate: {fmt(result.annual_ha_rate_10y)} ha/yr
                  </Text>
                )}
              </View>
            )}

            {/* Satellites */}
            <Text style={styles.satsTxt}>🛰️ {result.satellites_used ? result.satellites_used.join(' · ') : ''}</Text>

            {/* PDF Button */}
            <TouchableOpacity style={styles.pdfBtn} onPress={downloadPDF} disabled={pdfLoading}>
              <Text style={styles.pdfTxt}>{pdfLoading ? t('pdfLoading') : t('pdf')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Satellites Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('sats')}</Text>
          {['ESA Sentinel-2A/2B — 10m — Every 5 days',
            'NASA Landsat 8 & 9 — 30m — Since 1984',
            'ESA Sentinel-1 — Radar — Through clouds',
            'NASA MODIS Terra/Aqua — Fire detection',
            'NASA/NOAA VIIRS — Global fire alerts'
          ].map((s, i) => <Text key={i} style={styles.satItem}>🟢 {s}</Text>)}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const Row = ({ label, value, color }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={[styles.rowValue, color && { color }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D3B2E' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 2, borderBottomColor: '#1B6B45' },
  headerTitle: { color: 'white', fontSize: 14, fontWeight: 'bold', letterSpacing: 1 },
  langSwitch: { flexDirection: 'row', gap: 4 },
  langBtn: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, borderWidth: 1, borderColor: '#3DAA6B' },
  langActive: { backgroundColor: '#3DAA6B' },
  langText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
  scroll: { flex: 1, padding: 12 },
  card: { backgroundColor: '#1B4332', borderRadius: 10, padding: 12, marginBottom: 12 },
  cardTitle: { color: '#3DAA6B', fontSize: 12, fontWeight: 'bold', marginBottom: 8 },
  gpsText: { color: 'white', fontSize: 13, marginBottom: 2 },
  gpsAcc: { color: '#D6EFE1', fontSize: 10, marginTop: 2 },
  gpsWait: { color: '#D6EFE1', fontSize: 12, fontStyle: 'italic' },
  refreshBtn: { marginTop: 8, padding: 7, backgroundColor: '#0D3B2E', borderRadius: 6, alignItems: 'center', borderWidth: 1, borderColor: '#3DAA6B' },
  refreshText: { color: '#3DAA6B', fontSize: 11 },
  analyzeBtn: { backgroundColor: '#2D8A5A', padding: 14, borderRadius: 10, alignItems: 'center', marginBottom: 8 },
  analyzeBtnOff: { backgroundColor: '#1B4332' },
  analyzeTxt: { color: 'white', fontSize: 14, fontWeight: 'bold', letterSpacing: 1 },
  connectTxt: { color: '#D6EFE1', textAlign: 'center', fontSize: 11, marginBottom: 8 },
  offlineBanner: { backgroundColor: '#F9A825', borderRadius: 6, padding: 6, marginBottom: 8, alignItems: 'center' },
  offlineTxt: { color: 'white', fontSize: 11, fontWeight: 'bold' },
  resultCard: { backgroundColor: '#1B4332', borderRadius: 10, padding: 12, marginBottom: 12 },
  scoreBox: { alignItems: 'center', marginBottom: 12 },
  scoreNum: { fontSize: 52, fontWeight: 'bold' },
  scoreLabel: { color: '#D6EFE1', fontSize: 9, letterSpacing: 1 },
  scoreStatus: { fontSize: 15, fontWeight: 'bold', marginTop: 3 },
  aiBox: { backgroundColor: '#0D3B2E', borderRadius: 8, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: '#3DAA6B' },
  aiLabel: { color: '#3DAA6B', fontSize: 9, letterSpacing: 1 },
  aiValue: { color: 'white', fontSize: 14, fontWeight: 'bold', marginTop: 2 },
  aiSub: { color: '#D6EFE1', fontSize: 10, marginTop: 2 },
  indicators: { borderTopWidth: 1, borderTopColor: '#2D6A4F', paddingTop: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#0D3B2E' },
  rowLabel: { color: '#D6EFE1', fontSize: 11, flex: 1 },
  rowValue: { color: '#3DAA6B', fontSize: 11, fontWeight: 'bold', textAlign: 'right' },
  alertBox: { borderRadius: 8, padding: 10, marginTop: 8 },
  alertTitle: { color: 'white', fontSize: 11, fontWeight: 'bold', textAlign: 'center' },
  alertDetail: { color: 'rgba(255,255,255,0.9)', fontSize: 9, textAlign: 'center', marginTop: 3 },
  satsTxt: { color: '#2D6A4F', fontSize: 8, marginTop: 8, textAlign: 'center' },
  pdfBtn: { backgroundColor: '#0D3B2E', borderWidth: 1, borderColor: '#3DAA6B', borderRadius: 8, padding: 10, alignItems: 'center', marginTop: 8 },
  pdfTxt: { color: '#3DAA6B', fontSize: 12, fontWeight: 'bold' },
  satItem: { color: '#D6EFE1', fontSize: 10, marginBottom: 3 },
});
