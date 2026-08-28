import * as Notifications from 'expo-notifications';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Share, Alert } from 'react-native';

// ═══ NOTIFICATIONS ═══
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotifications() {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    return status;
  } catch(e) { return null; }
}

export async function sendDeforestationAlert(result, lang) {
  try {
    if (!result.deforestation_alert) return;
    const isFr = lang === 'fr';
    const alert = isFr ? result.deforestation_alert_fr : result.deforestation_alert;
    if (result.deforestation_alert.includes('CRITICAL') || 
        result.deforestation_alert.includes('WARNING') ||
        result.score < 40) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: isFr ? '🌲 Alerte Forêt CanopySat' : '🌲 Forest Alert CanopySat',
          body: `${alert} | Score: ${result.score}/100`,
          color: '#E53935',
        },
        trigger: null,
      });
    }
  } catch(e) {}
}

// ═══ SHARE RESULTS — using React Native Share API ═══
export async function shareResult(result, lang) {
  try {
    const isFr = lang === 'fr';
    const message = isFr ?
      `🌲 CanopySat — Analyse Forestière\n\n` +
      `📍 ${result.lat?.toFixed(4)}, ${result.lng?.toFixed(4)}\n` +
      `🏆 Score: ${result.score}/100\n` +
      `🤖 ${result.ai_forest_type_fr || result.ai_forest_type || ''}\n` +
      `🌿 Végétation: ${result.ndvi_current}\n` +
      `🌳 Couverture: ${result.forest_cover}%\n` +
      `🔥 Feux: ${result.fire_pixels} pixels\n` +
      `⚠️ ${result.deforestation_alert_fr || 'Stable'}\n\n` +
      `🌐 www.canopysat.org`
      :
      `🌲 CanopySat — Forest Analysis\n\n` +
      `📍 ${result.lat?.toFixed(4)}, ${result.lng?.toFixed(4)}\n` +
      `🏆 Score: ${result.score}/100\n` +
      `🤖 ${result.ai_forest_type || ''}\n` +
      `🌿 Vegetation: ${result.ndvi_current}\n` +
      `🌳 Forest cover: ${result.forest_cover}%\n` +
      `🔥 Fire pixels: ${result.fire_pixels}\n` +
      `⚠️ ${result.deforestation_alert || 'Stable'}\n\n` +
      `🌐 www.canopysat.org`;

    await Share.share({ message, title: 'CanopySat Forest Analysis' });
  } catch(e) {
    Alert.alert('Error', 'Could not share: ' + e.message);
  }
}

// ═══ EXPORT INVENTORY CSV ═══
export async function exportInventoryCSV(trees, lang) {
  try {
    const isFr = lang === 'fr';
    const headers = isFr ?
      'Espèce,DBH (cm),Hauteur (m),Santé,Biomasse (kg),Latitude,Longitude,Date,Notes' :
      'Species,DBH (cm),Height (m),Health,Biomass (kg),Latitude,Longitude,Date,Notes';
    
    const rows = trees.map(t =>
      `${t.species},${t.dbh},${t.height},${t.health},${t.biomass||0},${t.lat||''},${t.lng||''},${t.date},"${t.notes||''}"`
    ).join('\n');
    
    const csv = headers + '\n' + rows;
    const fileUri = FileSystem.cacheDirectory + 'canopysat_inventory.csv';
    await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
    
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: isFr ? "Exporter l'inventaire" : 'Export inventory',
      });
    } else {
      await Share.share({ message: csv, title: 'CanopySat Inventory' });
    }
    return true;
  } catch(e) {
    Alert.alert('Error', 'Export failed: ' + e.message);
    return false;
  }
}

// ═══ EMAIL INVENTORY ═══
export async function emailInventory(trees, lang) {
  try {
    const isFr = lang === 'fr';
    const totalBiomass = trees.reduce((s,t) => s + (t.biomass||0), 0).toFixed(1);
    const message = isFr ?
      `Inventaire CanopySat Field\n\nArbres: ${trees.length}\nBiomasse totale: ${totalBiomass} kg\n\n` +
      trees.map(t => `• ${t.species} — DBH:${t.dbh}cm H:${t.height}m AGB:${t.biomass}kg [${t.health}]`).join('\n')
      :
      `CanopySat Field Inventory\n\nTrees: ${trees.length}\nTotal biomass: ${totalBiomass} kg\n\n` +
      trees.map(t => `• ${t.species} — DBH:${t.dbh}cm H:${t.height}m AGB:${t.biomass}kg [${t.health}]`).join('\n');

    await Share.share({
      message,
      title: isFr ? 'Inventaire Forestier CanopySat' : 'CanopySat Forest Inventory'
    });
    return true;
  } catch(e) {
    Alert.alert('Error', 'Could not share: ' + e.message);
    return false;
  }
}
