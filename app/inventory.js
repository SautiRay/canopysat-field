import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, TextInput, Alert, SafeAreaView, FlatList, Modal
} from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { exportInventoryCSV, emailInventory } from './utils';

const SPECIES = [
  'Acacia', 'Eucalyptus', 'Teak', 'Mahogany', 'Cedar',
  'Pine', 'Oak', 'Bamboo', 'Mangrove', 'Other'
];

export default function InventoryScreen({ lang }) {
  const [trees, setTrees] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    species: '', dbh: '', height: '', health: 'Good', notes: ''
  });
  const [location, setLocation] = useState(null);

  const t = (en, fr) => lang === 'fr' ? fr : en;

  useEffect(() => { loadTrees(); getLocation(); }, []);

  const loadTrees = async () => {
    try {
      const saved = await AsyncStorage.getItem('forestInventory');
      if (saved) setTrees(JSON.parse(saved));
    } catch(e) {}
  };

  const saveTrees = async (newTrees) => {
    try {
      await AsyncStorage.setItem('forestInventory', JSON.stringify(newTrees));
    } catch(e) {}
  };

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation(loc.coords);
      }
    } catch(e) {}
  };

  const addTree = () => {
    if (!form.species) {
      Alert.alert(t('Error', 'Erreur'), t('Please select a species', 'Veuillez sélectionner une espèce'));
      return;
    }

    const tree = {
      id: Date.now().toString(),
      species: form.species,
      dbh: parseFloat(form.dbh) || 0,
      height: parseFloat(form.height) || 0,
      health: form.health,
      notes: form.notes,
      lat: location?.latitude?.toFixed(6),
      lng: location?.longitude?.toFixed(6),
      date: new Date().toISOString().split('T')[0],
      biomass: calculateBiomass(parseFloat(form.dbh) || 0, parseFloat(form.height) || 0)
    };

    const newTrees = [tree, ...trees];
    setTrees(newTrees);
    saveTrees(newTrees);
    setForm({ species: '', dbh: '', height: '', health: 'Good', notes: '' });
    setShowForm(false);
  };

  const calculateBiomass = (dbh, height) => {
    if (!dbh || !height) return 0;
    // Simplified allometric equation: AGB = 0.0673 * (ρ * D² * H)^0.976
    // Using average wood density ρ = 0.6
    return Math.round(0.0673 * Math.pow(0.6 * dbh * dbh * height, 0.976) * 10) / 10;
  };

  const deleteTree = (id) => {
    Alert.alert(
      t('Delete tree', 'Supprimer arbre'),
      t('Are you sure?', 'Êtes-vous sûr?'),
      [
        { text: t('Cancel', 'Annuler'), style: 'cancel' },
        { text: t('Delete', 'Supprimer'), style: 'destructive', onPress: () => {
          const newTrees = trees.filter(t => t.id !== id);
          setTrees(newTrees);
          saveTrees(newTrees);
        }}
      ]
    );
  };

  const totalBiomass = trees.reduce((sum, t) => sum + (t.biomass || 0), 0);
  const avgDbh = trees.length ? (trees.reduce((s, t) => s + t.dbh, 0) / trees.length).toFixed(1) : 0;

  const healthColor = (h) => h === 'Good' || h === 'Bon' ? '#3DAA6B' : h === 'Fair' || h === 'Moyen' ? '#F9A825' : '#E53935';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🌲 {t('Forest Inventory', 'Inventaire Forestier')}</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(true)}>
          <Text style={styles.addBtnTxt}>+ {t('Add tree', 'Ajouter')}</Text>
        </TouchableOpacity>
      </View>

      {/* Summary */}
      {trees.length > 0 && (
        <View style={styles.summary}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNum}>{trees.length}</Text>
            <Text style={styles.summaryLabel}>{t('Trees', 'Arbres')}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNum}>{avgDbh}</Text>
            <Text style={styles.summaryLabel}>{t('Avg DBH (cm)', 'DBH moy (cm)')}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNum}>{totalBiomass.toFixed(1)}</Text>
            <Text style={styles.summaryLabel}>{t('Total AGB (kg)', 'Biomasse (kg)')}</Text>
          </View>
        </View>
      )}

      {trees.length > 0 && (
        <View style={styles.exportRow}>
          <TouchableOpacity style={styles.exportBtn} onPress={() => exportInventoryCSV(trees, lang)}>
            <Text style={styles.exportTxt}>📊 {t('Export CSV', 'Exporter CSV')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.exportBtn} onPress={() => emailInventory(trees, lang)}>
            <Text style={styles.exportTxt}>📧 {t('Send Email', 'Envoyer Email')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {trees.length === 0 && !showForm ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🌲</Text>
          <Text style={styles.emptyTxt}>
            {t('No trees recorded yet. Start your forest inventory!', 'Aucun arbre enregistré. Commencez votre inventaire!')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={trees}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.treeCard}>
              <View style={styles.treeHeader}>
                <Text style={styles.treeName}>🌳 {item.species}</Text>
                <View style={[styles.healthBadge, { backgroundColor: healthColor(item.health) }]}>
                  <Text style={styles.healthTxt}>{item.health}</Text>
                </View>
              </View>
              <View style={styles.treeDetails}>
                <Text style={styles.treeDetail}>📏 DBH: {item.dbh} cm</Text>
                <Text style={styles.treeDetail}>📐 H: {item.height} m</Text>
                <Text style={styles.treeDetail}>⚖️ AGB: {item.biomass} kg</Text>
              </View>
              {item.lat && <Text style={styles.treeCoords}>📍 {item.lat}, {item.lng}</Text>}
              <Text style={styles.treeDate}>📅 {item.date}</Text>
              {item.notes ? <Text style={styles.treeNotes}>💬 {item.notes}</Text> : null}
              <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteTree(item.id)}>
                <Text style={styles.deleteTxt}>🗑️ {t('Delete', 'Supprimer')}</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      {/* Add Tree Modal */}
      <Modal visible={showForm} animationType="slide" transparent>
        <View style={styles.modal}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🌳 {t('Add Tree', 'Ajouter un arbre')}</Text>

            <Text style={styles.formLabel}>{t('Species *', 'Espèce *')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.speciesRow}>
              {SPECIES.map(s => (
                <TouchableOpacity
                  key={s}
                  style={[styles.speciesBtn, form.species === s && styles.speciesBtnActive]}
                  onPress={() => setForm({...form, species: s})}>
                  <Text style={styles.speciesTxt}>{s}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.formLabel}>DBH (cm) - {t('Diameter at breast height', 'Diamètre à hauteur poitrine')}</Text>
            <TextInput
              style={styles.input}
              value={form.dbh}
              onChangeText={v => setForm({...form, dbh: v})}
              keyboardType="numeric"
              placeholder="e.g. 25"
              placeholderTextColor="#2D6A4F"
            />

            <Text style={styles.formLabel}>{t('Height (m)', 'Hauteur (m)')}</Text>
            <TextInput
              style={styles.input}
              value={form.height}
              onChangeText={v => setForm({...form, height: v})}
              keyboardType="numeric"
              placeholder="e.g. 15"
              placeholderTextColor="#2D6A4F"
            />

            <Text style={styles.formLabel}>{t('Health status', 'État sanitaire')}</Text>
            <View style={styles.healthRow}>
              {[['Good', 'Bon'], ['Fair', 'Moyen'], ['Poor', 'Mauvais']].map(([en, fr]) => (
                <TouchableOpacity
                  key={en}
                  style={[styles.healthBtn, form.health === en && styles.healthBtnActive]}
                  onPress={() => setForm({...form, health: en})}>
                  <Text style={styles.healthBtnTxt}>{lang === 'fr' ? fr : en}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.formLabel}>{t('Notes', 'Notes')}</Text>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              value={form.notes}
              onChangeText={v => setForm({...form, notes: v})}
              multiline
              placeholder={t('Optional observations...', 'Observations optionnelles...')}
              placeholderTextColor="#2D6A4F"
            />

            {location && (
              <Text style={styles.gpsInfo}>
                📍 GPS: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
              </Text>
            )}

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowForm(false)}>
                <Text style={styles.cancelTxt}>{t('Cancel', 'Annuler')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={addTree}>
                <Text style={styles.saveTxt}>{t('Save Tree', 'Enregistrer')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D3B2E' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 2, borderBottomColor: '#1B6B45' },
  title: { color: 'white', fontSize: 14, fontWeight: 'bold' },
  addBtn: { backgroundColor: '#2D8A5A', padding: 8, borderRadius: 8 },
  addBtnTxt: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  summary: { flexDirection: 'row', backgroundColor: '#1B4332', padding: 12, justifyContent: 'space-around' },
  summaryItem: { alignItems: 'center' },
  summaryNum: { color: '#3DAA6B', fontSize: 20, fontWeight: 'bold' },
  summaryLabel: { color: '#D6EFE1', fontSize: 9, marginTop: 2 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  emptyIcon: { fontSize: 50, marginBottom: 15 },
  emptyTxt: { color: '#D6EFE1', fontSize: 13, textAlign: 'center', lineHeight: 20 },
  list: { padding: 12 },
  treeCard: { backgroundColor: '#1B4332', borderRadius: 10, padding: 12, marginBottom: 10 },
  treeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  treeName: { color: 'white', fontSize: 14, fontWeight: 'bold' },
  healthBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  healthTxt: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  treeDetails: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  treeDetail: { color: '#D6EFE1', fontSize: 11 },
  treeCoords: { color: '#3DAA6B', fontSize: 9, marginBottom: 2 },
  treeDate: { color: '#2D6A4F', fontSize: 9 },
  treeNotes: { color: '#D6EFE1', fontSize: 10, marginTop: 4, fontStyle: 'italic' },
  deleteBtn: { marginTop: 8, padding: 6, borderRadius: 6, borderWidth: 1, borderColor: '#E53935', alignItems: 'center' },
  deleteTxt: { color: '#E53935', fontSize: 11 },
  modal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#0A2E20', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  modalTitle: { color: 'white', fontSize: 16, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  formLabel: { color: '#3DAA6B', fontSize: 11, marginBottom: 5, marginTop: 10 },
  speciesRow: { marginBottom: 5 },
  speciesBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, borderWidth: 1, borderColor: '#1B6B45', marginRight: 6 },
  speciesBtnActive: { backgroundColor: '#3DAA6B', borderColor: '#3DAA6B' },
  speciesTxt: { color: 'white', fontSize: 11 },
  input: { backgroundColor: '#1B4332', borderRadius: 8, padding: 10, color: 'white', fontSize: 13, marginBottom: 5 },
  inputMulti: { height: 60, textAlignVertical: 'top' },
  healthRow: { flexDirection: 'row', gap: 8, marginBottom: 5 },
  healthBtn: { flex: 1, padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#1B6B45', alignItems: 'center' },
  healthBtnActive: { backgroundColor: '#3DAA6B', borderColor: '#3DAA6B' },
  healthBtnTxt: { color: 'white', fontSize: 11 },
  gpsInfo: { color: '#3DAA6B', fontSize: 10, textAlign: 'center', marginVertical: 8 },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 15 },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#1B6B45', alignItems: 'center' },
  cancelTxt: { color: '#D6EFE1', fontSize: 13 },
  saveBtn: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#2D8A5A', alignItems: 'center' },
  saveTxt: { color: 'white', fontSize: 13, fontWeight: 'bold' },
  exportRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingBottom: 8, backgroundColor: '#0A2E20' },
  exportBtn: { flex: 1, backgroundColor: '#1B4332', borderRadius: 8, padding: 8, alignItems: 'center', borderWidth: 1, borderColor: '#1B6B45' },
  exportTxt: { color: '#3DAA6B', fontSize: 11, fontWeight: 'bold' },
});
