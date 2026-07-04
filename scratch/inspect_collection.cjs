const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase("https://pocketbase-production-ec1e.up.railway.app");

async function run() {
  try {
    // We cannot view collection schema directly without admin, but we can check if we can write without auth,
    // or see what auth is available. Let's see if the collection is accessible.
    console.log("Checking authStore status:", pb.authStore.isValid, pb.authStore.model);
    
    // Let's try to update the record without logging in
    const list = await pb.collection('retail_users').getFullList();
    console.log("List without auth:", list);
  } catch (err) {
    console.error("Error occurred:", err);
  }
}
run();
