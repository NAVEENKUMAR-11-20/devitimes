const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase('https://pocketbase-production-ec1e.up.railway.app');

async function checkAll() {
  try {
    const list = await pb.collection('PRODUCT_DATAS').getFullList();
    const allKeys = new Set();
    const visibilityKeys = new Set();
    const candidates = ['islive', 'is_live', 'live', 'active', 'status', 'hidden', 'ishidden', 'visibility'];
    
    list.forEach(item => {
      Object.keys(item).forEach(k => {
        allKeys.add(k);
        if (candidates.includes(k.toLowerCase())) {
          visibilityKeys.add(k);
        }
      });
    });
    
    console.log('Total records:', list.length);
    console.log('All unique keys across all records:', Array.from(allKeys));
    console.log('Visibility related keys found:', Array.from(visibilityKeys));
    
    // Check if any record has a visibility key
    list.forEach((item, idx) => {
      visibilityKeys.forEach(vk => {
        if (item[vk] !== undefined) {
          console.log(`Record ${idx} (${item.MODEL_NO || item.id}) has ${vk}:`, item[vk]);
        }
      });
    });
  } catch (err) {
    console.error('Error:', err);
  }
}
checkAll();
