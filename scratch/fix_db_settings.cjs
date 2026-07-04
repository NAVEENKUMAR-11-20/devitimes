const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase('https://pocketbase-production-ec1e.up.railway.app');

async function fix() {
  try {
    const records = await pb.collection('app_settings').getFullList();
    if (records.length > 0) {
      const record = records[0];
      const packed = `[INVENTORY_V1,9384501016,10,true,e30=]`;
      console.log('Original settings:', record.whatsapp_number);
      await pb.collection('app_settings').update(record.id, {
        whatsapp_number: packed
      });
      console.log('Successfully updated settings to:', packed);
    } else {
      console.log('No settings record found to fix!');
    }
  } catch (err) {
    console.error('Error fixing settings:', err);
  }
}
fix();
