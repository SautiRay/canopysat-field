import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Image, Alert, SafeAreaView, FlatList
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function PhotoScreen({ lang }) {
  const [photos, setPhotos] = useState([]);

  const t = (en, fr) => lang === 'fr' ? fr : en;

  useEffect(() => { loadPhotos(); }, []);

  const loadPhotos = async () => {
    try {
      const saved = await AsyncStorage.getItem('fieldPhotos');
      if (saved) setPhotos(JSON.parse(saved));
    } catch(e) {}
  };

  const savePhotos = async (newPhotos) => {
    try {
      await AsyncStorage.setItem('fieldPhotos', JSON.stringify(newPhotos));
    } catch(e) {}
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('Permission denied', 'Permission refusée'));
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled) {
      let coords = null;
      try {
        const loc = await Location.getCurrentPositionAsync({});
        coords = loc.coords;
      } catch(e) {}

      const photo = {
        id: Date.now().toString(),
        uri: result.assets[0].uri,
        date: new Date().toISOString().split('T')[0],
        lat: coords?.latitude?.toFixed(6),
        lng: coords?.longitude?.toFixed(6),
        note: ''
      };

      const newPhotos = [photo, ...photos];
      setPhotos(newPhotos);
      savePhotos(newPhotos);
    }
  };

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled) {
      const photo = {
        id: Date.now().toString(),
        uri: result.assets[0].uri,
        date: new Date().toISOString().split('T')[0],
        lat: null, lng: null, note: ''
      };
      const newPhotos = [photo, ...photos];
      setPhotos(newPhotos);
      savePhotos(newPhotos);
    }
  };

  const deletePhoto = (id) => {
    Alert.alert(
      t('Delete photo', 'Supprimer la photo'),
      t('Are you sure?', 'Êtes-vous sûr?'),
      [
        { text: t('Cancel', 'Annuler'), style: 'cancel' },
        { text: t('Delete', 'Supprimer'), style: 'destructive', onPress: () => {
          const newPhotos = photos.filter(p => p.id !== id);
          setPhotos(newPhotos);
          savePhotos(newPhotos);
        }}
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📸 {t('Field Photos', 'Photos Terrain')}</Text>
        <Text style={styles.count}>{photos.length} {t('photos', 'photos')}</Text>
      </View>

      <View style={styles.btnRow}>
        <TouchableOpacity style={styles.btn} onPress={takePhoto}>
          <Text style={styles.btnTxt}>📷 {t('Take Photo', 'Prendre Photo')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={pickPhoto}>
          <Text style={styles.btnTxt}>🖼️ {t('Gallery', 'Galerie')}</Text>
        </TouchableOpacity>
      </View>

      {photos.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📸</Text>
          <Text style={styles.emptyTxt}>
            {t('No photos yet. Take your first field photo!', 'Aucune photo. Prenez votre première photo terrain!')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={photos}
          keyExtractor={item => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          renderItem={({ item }) => (
            <View style={styles.photoCard}>
              <Image source={{ uri: item.uri }} style={styles.photo} />
              <View style={styles.photoInfo}>
                <Text style={styles.photoDate}>📅 {item.date}</Text>
                {item.lat && (
                  <Text style={styles.photoCoords}>📍 {item.lat}, {item.lng}</Text>
                )}
              </View>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => deletePhoto(item.id)}>
                <Text style={styles.deleteTxt}>🗑️</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D3B2E' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 2, borderBottomColor: '#1B6B45' },
  title: { color: 'white', fontSize: 14, fontWeight: 'bold' },
  count: { color: '#3DAA6B', fontSize: 12 },
  btnRow: { flexDirection: 'row', padding: 12, gap: 8 },
  btn: { flex: 1, backgroundColor: '#2D8A5A', padding: 12, borderRadius: 8, alignItems: 'center' },
  btnSecondary: { backgroundColor: '#1B6B45' },
  btnTxt: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  emptyIcon: { fontSize: 50, marginBottom: 15 },
  emptyTxt: { color: '#D6EFE1', fontSize: 13, textAlign: 'center', lineHeight: 20 },
  grid: { padding: 8 },
  photoCard: { flex: 1, margin: 4, backgroundColor: '#1B4332', borderRadius: 8, overflow: 'hidden' },
  photo: { width: '100%', height: 150 },
  photoInfo: { padding: 6 },
  photoDate: { color: '#D6EFE1', fontSize: 9 },
  photoCoords: { color: '#3DAA6B', fontSize: 8, marginTop: 2 },
  deleteBtn: { position: 'absolute', top: 5, right: 5, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, padding: 4 },
  deleteTxt: { fontSize: 12 },
});
