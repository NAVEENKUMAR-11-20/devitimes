import pb from '../src/lib/pocketbase.js';

async function checkAppSettingsSchema() {
  try {
    const list = await pb.collection('app_settings').getFullList();
    if (list.length > 0) {
      console.log('Fields in app_settings collection:', Object.keys(list[0]));
      console.log('Sample settings record:', JSON.stringify(list[0], null, 2));
    } else {
      console.log('No records in app_settings.');
    }
  } catch (err) {
    console.error('Error fetching app_settings:', err);
  }
}

checkAppSettingsSchema();
