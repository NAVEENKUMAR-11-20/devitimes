const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase('https://pocketbase-production-ec1e.up.railway.app');

async function checkSchema() {
  try {
    const col = await pb.collections.getOne('PRODUCT_DATAS');
    console.log('Collection schema:', JSON.stringify(col.schema || col.fields, null, 2));
  } catch (err) {
    console.log('Could not fetch schema publicly:', err.message || err);
    // Let's try to update a record with various candidate fields and see which one gets saved or accepted!
    const list = await pb.collection('PRODUCT_DATAS').getFullList({ limit: 1 });
    if (list.length > 0) {
      const id = list[0].id;
      console.log('Testing field updates on record:', id);
      const candidates = ['isLive', 'is_live', 'live', 'active', 'status', 'hidden', 'isHidden', 'visibility', 'IS_LIVE', 'STATUS', 'LIVE', 'HIDDEN', 'ACTIVE'];
      for (const field of candidates) {
        try {
          const payload = {};
          payload[field] = (field.toLowerCase() === 'status' || field === 'STATUS') ? 'HIDDEN' : false;
          const updated = await pb.collection('PRODUCT_DATAS').update(id, payload, { requestKey: null });
          if (updated[field] !== undefined) {
            console.log(`SUCCESS! Field "${field}" is present in updated record:`, updated[field]);
          } else {
            console.log(`Field "${field}" was sent but NOT returned in updated record.`);
          }
        } catch (e) {
          console.log(`Error updating field "${field}":`, e?.response?.message || e.message);
        }
      }
    }
  }
}
checkSchema();
