import pb from '../src/lib/pocketbase.js';

async function listCollections() {
  try {
    // In PocketBase, we can query the collections by fetching collections list
    // or checking the schema of collections using the pb admin client.
    // If we aren't authenticated as admin, we might only be able to try fetching from common collection names
    // or inspect pb.collections or similar.
    // Let's try to query some typical collection names or see if there is an endpoint.
    // Actually, let's try to query 'app_settings', 'retail_users', 'admin_password', 'PRODUCT_DATAS'.
    // Let's print out what records exist in app_settings.
    const appSettings = await pb.collection('app_settings').getFullList();
    console.log('app_settings records:', JSON.stringify(appSettings, null, 2));
    
    // Let's check if there are other collections like 'orders' or 'inventory' or 'stocks'
    const collectionsToTry = ['orders', 'inventory', 'stocks', 'stock', 'product_stock', 'wholesale_orders'];
    for (const coll of collectionsToTry) {
      try {
        const list = await pb.collection(coll).getList(1, 1);
        console.log(`Collection '${coll}' exists with ${list.totalItems} items.`);
        if (list.items.length > 0) {
          console.log(`Sample from ${coll}:`, JSON.stringify(list.items[0], null, 2));
        }
      } catch (err) {
        // collection probably doesn't exist or no permission
      }
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

listCollections();
