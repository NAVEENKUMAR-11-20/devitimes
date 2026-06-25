const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase("https://pocketbase-production-ec1e.up.railway.app");

async function run() {
  try {
    const list = await pb.collection('pbc_4092854851').getFullList({
      requestKey: null,
    });
    console.log("SUCCESS querying pbc_4092854851! Got records:", list.length);
    if (list.length > 0) {
      console.log("First product sample:", JSON.stringify(list[0], null, 2));
    }
  } catch (err) {
    console.error("ERROR querying pbc_4092854851:", err.status, err.message, JSON.stringify(err.data));
  }
}
run();
