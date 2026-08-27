import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import MapView, { Marker, Polygon } from 'react-native-maps';
import * as Location from 'expo-location';

export default function MapScreen({ lang, lastResult }) {
  const [location, setLocation] = useState(null);
  const [region, setRegion] = useState({
    latitude: 0, longitude: 0,
    latitudeDelta: 60, longitudeDelta: 60
  });

  const t = (en, fr) => lang === 'fr' ? fr : en;

  useEffect(() => {
    getLocation();
  }, []);

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation(loc.coords);
        setRegion({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1
        });
      }
    } catch(e) {}
  };

  const goToResult = () => {
    if (lastResult) {
      setRegion({
        latitude: lastResult.lat,
        longitude: lastResult.lng,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1
      });
    }
  };

  const getScoreColor = (s) => s >= 70 ? '#3DAA6B' : s >= 40 ? '#F9A825' : '#E53935';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🗺️ {t('Satellite Map', 'Carte Satellite')}</Text>
        {lastResult && (
          <TouchableOpacity style={styles.btn} onPress={goToResult}>
            <Text style={styles.btnTxt}>📍 {t('Last analysis', 'Dernière analyse')}</Text>
          </TouchableOpacity>
        )}
      </View>

      <MapView
        style={styles.map}
        region={region}
        onRegionChangeComplete={setRegion}
        mapType="satellite"
        showsUserLocation={true}
        showsMyLocationButton={true}>

        {/* Current location marker */}
        {location && (
          <Marker
            coordinate={{ latitude: location.latitude, longitude: location.longitude }}
            title={t('Your location', 'Votre position')}
            pinColor="#3DAA6B"
          />
        )}

        {/* Last analysis marker */}
        {lastResult && (
          <Marker
            coordinate={{ latitude: lastResult.lat, longitude: lastResult.lng }}
            title={`Score: ${lastResult.score}/100`}
            description={lastResult.ai_forest_type || ''}
            pinColor={getScoreColor(lastResult.score)}
          />
        )}
      </MapView>

      {/* Result overlay */}
      {lastResult && (
        <View style={styles.overlay}>
          <Text style={styles.overlayScore} style={{ color: getScoreColor(lastResult.score) }}>
            {lastResult.score}/100
          </Text>
          <Text style={styles.overlayType}>
            {lang === 'fr' ? lastResult.ai_forest_type_fr : lastResult.ai_forest_type}
          </Text>
          <Text style={styles.overlayCoords}>
            {lastResult.lat?.toFixed(4)}, {lastResult.lng?.toFixed(4)}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D3B2E' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 2, borderBottomColor: '#1B6B45' },
  title: { color: 'white', fontSize: 14, fontWeight: 'bold' },
  btn: { backgroundColor: '#1B6B45', padding: 6, borderRadius: 8 },
  btnTxt: { color: 'white', fontSize: 11 },
  map: { flex: 1 },
  overlay: { position: 'absolute', bottom: 20, left: 20, right: 20, backgroundColor: 'rgba(10,46,32,0.9)', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#3DAA6B' },
  overlayScore: { fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
  overlayType: { color: 'white', fontSize: 13, textAlign: 'center', marginTop: 3 },
  overlayCoords: { color: '#D6EFE1', fontSize: 10, textAlign: 'center', marginTop: 3 },
});
