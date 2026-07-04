const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase("https://pocketbase-production-ec1e.up.railway.app");

async function run() {
  try {
    const list = await pb.collection('admin_password').getFullList();
    console.log("Current admin_password list:", list);
  } catch (err) {
    console.log("List failed, trying to create record...");
    try {
      const created = await pb.collection('admin_password').create({
        password: "lumiere@admin2024"
      });
      console.log("Created successfully:", created);
    } catch (createErr) {
      console.error("Create failed too:", createErr.status, createErr.message, createErr.data);
    }
  }
}
run();
