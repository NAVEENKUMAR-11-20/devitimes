const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase("https://pocketbase-production-ec1e.up.railway.app");

async function run() {
  try {
    // Let's create a temporary user and try to delete it
    console.log("Creating temporary user...");
    const tempUser = await pb.collection('User').create({
      User_ID: 'TEMP-999',
      Full_Name: 'Temporary User',
      moblieno: '1234567890',
      password: 'password123'
    });
    console.log("Created successfully, id:", tempUser.id);
    
    console.log("Attempting to delete temporary user...");
    await pb.collection('User').delete(tempUser.id);
    console.log("Deleted successfully!");
  } catch (err) {
    console.error("Error occurred:", err.status, err.message, err.data);
  }
}
run();
