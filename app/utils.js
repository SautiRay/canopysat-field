import * as Notifications from 'expo-notifications';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as MailComposer from 'expo-mail-composer';

// ═══ NOTIFICATIONS SETUP ═══
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotifications() {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return null;
  return status;
}

export async function sendDeforestationAlert(result, lang) {
  if (!result.deforestation_alert) return;
  
  const isFr = lang === 'fr';
  const alert = isFr ? result.deforestation_alert_fr : result.deforestation_alert;
  const score = result.score;
  
  if (result.deforestation_alert.includes('CRITICAL') || 
      result.deforestation_alert.includes('WARNING') ||
      score < 40) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: isFr ? '🌲 CanopySat Field — Alerte Forêt' : '🌲 CanopySat Field — Forest Alert',
        body: `${alert} | Score: ${score}/100`,
        data: { lat: result.lat, lng: result.lng },
        color: '#E53935',
      },
      trigger: null,
    });
  }
}

// ═══ SHARE RESULTS ═══
export async function shareResult(result, lang) {
  const isFr = lang === 'fr';
  
  const text = isFr ? 
    `🌲 CanopySat — Analyse Forestière\n\n` +
    `📍 Coordonnées: ${result.lat?.toFixed(4)}, ${result.lng?.toFixed(4)}\n` +
    `🏆 Score: ${result.score}/100\n` +
    `🤖 Classification: ${result.ai_forest_type_fr || result.ai_forest_type}\n` +
    `🌿 Végétation: ${result.ndvi_current}\n` +
    `🌳 Couverture: ${result.forest_cover}%\n` +
    `🔥 Feux: ${result.fire_pixels} pixels\n` +
    `⚠️ ${result.deforestation_alert_fr || 'Stable'}\n\n` +
    `🛰️ Analysé par CanopySat Field\n` +
    `🌐 www.canopysat.org`
    :
    `🌲 CanopySat — Forest Analysis\n\n` +
    `📍 Location: ${result.lat?.toFixed(4)}, ${result.lng?.toFixed(4)}\n` +
    `🏆 Score: ${result.score}/100\n` +
    `🤖 Classification: ${result.ai_forest_type}\n` +
    `🌿 Vegetation: ${result.ndvi_current}\n` +
    `🌳 Forest cover: ${result.forest_cover}%\n` +
    `🔥 Fire pixels: ${result.fire_pixels}\n` +
    `⚠️ ${result.deforestation_alert || 'Stable'}\n\n` +
    `🛰️ Analyzed by CanopySat Field\n` +
    `🌐 www.canopysat.org`;

  try {
    const fileUri = FileSystem.cacheDirectory + 'canopysat_result.txt';
    await FileSystem.writeAsStringAsync(fileUri, text);
    await Sharing.shareAsync(fileUri, {
      mimeType: 'text/plain',
      dialogTitle: isFr ? 'Partager le résultat' : 'Share result',
    });
  } catch(e) {
    console.error('Share error:', e);
  }
}

// ═══ EXPORT INVENTORY CSV ═══
export async function exportInventoryCSV(trees, lang) {
  const isFr = lang === 'fr';
  
  const headers = isFr ?
    'Espèce,DBH (cm),Hauteur (m),Santé,Biomasse AGB (kg),Latitude,Longitude,Date,Notes' :
    'Species,DBH (cm),Height (m),Health,Biomass AGB (kg),Latitude,Longitude,Date,Notes';
  
  const rows = trees.map(t => 
    `${t.species},${t.dbh},${t.height},${t.health},${t.biomass || 0},${t.lat || ''},${t.lng || ''},${t.date},"${t.notes || ''}"`
  ).join('\n');
  
  const csv = headers + '\n' + rows;
  
  try {
    const fileUri = FileSystem.cacheDirectory + 'canopysat_inventory.csv';
    await FileSystem.writeAsStringAsync(fileUri, csv);
    await Sharing.shareAsync(fileUri, {
      mimeType: 'text/csv',
      dialogTitle: isFr ? 'Exporter l\'inventaire' : 'Export inventory',
      UTI: 'public.comma-separated-values-text'
    });
    return true;
  } catch(e) {
    console.error('Export error:', e);
    return false;
  }
}

// ═══ EXPORT INVENTORY PDF via email ═══
export async function emailInventory(trees, lang) {
  const isFr = lang === 'fr';
  
  const subject = isFr ? 
    `Inventaire Forestier CanopySat — ${new Date().toLocaleDateString()}` :
    `Forest Inventory CanopySat — ${new Date().toLocaleDateString()}`;
  
  const body = isFr ?
    `Inventaire forestier exporté depuis CanopySat Field\n\n` +
    `Nombre d'arbres: ${trees.length}\n` +
    `Biomasse totale: ${trees.reduce((s,t) => s + (t.biomass||0), 0).toFixed(1)} kg\n\n` +
    trees.map(t => `• ${t.species} — DBH: ${t.dbh}cm — H: ${t.height}m — AGB: ${t.biomass}kg — ${t.health}`).join('\n')
    :
    `Forest inventory exported from CanopySat Field\n\n` +
    `Number of trees: ${trees.length}\n` +
    `Total biomass: ${trees.reduce((s,t) => s + (t.biomass||0), 0).toFixed(1)} kg\n\n` +
    trees.map(t => `• ${t.species} — DBH: ${t.dbh}cm — H: ${t.height}m — AGB: ${t.biomass}kg — ${t.health}`).join('\n');

  try {
    await MailComposer.composeAsync({
      subject,
      body,
      recipients: [],
    });
    return true;
  } catch(e) {
    return false;
  }
}
