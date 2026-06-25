const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase("https://pocketbase-production-ec1e.up.railway.app");

async function run() {
  try {
    const users = await pb.collection('User').getFullList();
    console.log("Users in User collection:", users);
  } catch (err) {
    console.error("Error occurred:", err.status, err.message, err.data);
  }
}
run();
