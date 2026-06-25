const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase("https://pocketbase-production-ec1e.up.railway.app");

async function run() {
  try {
    const list = await pb.collection('retail_users').getFullList();
    console.log("Current list:", list);
    if (list.length > 0) {
      const record = list[0];
      console.log("Attempting to update record id:", record.id);
      const updated = await pb.collection('retail_users').update(record.id, {
        username: "work001_test",
        password: "naveenwork001_test"
      });
      console.log("Updated record:", updated);
      
      // Revert back
      await pb.collection('retail_users').update(record.id, {
        username: record.username,
        password: record.password
      });
      console.log("Reverted back successfully!");
    }
  } catch (err) {
    console.error("Error occurred:", err.status, err.message, err.data);
  }
}
run();
