import pb from 'file:///c:/Users/admin/Desktop/devitimes/src/lib/pocketbase.js';

async function inspect() {
  try {
    const collections = await pb.collections.getFullList();
    for (const col of collections) {
      if (col.name === 'products' || col.name === 'retail_products') {
        console.log(`COLLECTION: ${col.name}`);
        console.log(JSON.stringify(col.schema, null, 2));
      }
    }
  } catch (e) {
    console.error('Inspection failed:', e);
  }
}

inspect();
