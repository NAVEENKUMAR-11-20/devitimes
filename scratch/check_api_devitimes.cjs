const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase('https://api.devitimes.in');

async function run() {
  try {
    console.log("Checking records on https://api.devitimes.in ...");
    const list = await pb.collection('PRODUCT_DATAS').getFullList();
    console.log("Total records found:", list.length);
    if (list.length > 0) {
      console.log("Keys of first record:", Object.keys(list[0]));
      console.log("Sample record:", JSON.stringify(list[0], null, 2));
    }

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
    
    console.log('All unique keys across all records on devitimes.in:', Array.from(allKeys));
    console.log('Visibility related keys found on devitimes.in:', Array.from(visibilityKeys));

    // Now let's try admin login!
    console.log("\nAttempting admin login on devitimes.in...");
    try {
      await pb.collection('_superusers').authWithPassword('admin', 'lumiere@admin2024');
      console.log("Logged in as _superusers!");
    } catch (e1) {
      try {
        await pb.admins.authWithPassword('admin@example.com', 'lumiere@admin2024');
        console.log("Logged in as pb.admins!");
      } catch (e2) {
        console.log("Admin login failed:", e1.message, e2.message);
      }
    }

    if (pb.authStore.isValid) {
      console.log("\nFetching collection schema for PRODUCT_DATAS...");
      try {
        const col = await pb.collections.getOne('PRODUCT_DATAS');
        console.log("Schema fields:", JSON.stringify(col.schema || col.fields, null, 2));
      } catch (e) {
        console.log("Could not fetch collection schema:", e.message);
      }
    }
  } catch (err) {
    console.error("Error:", err);
  }
}
run();
