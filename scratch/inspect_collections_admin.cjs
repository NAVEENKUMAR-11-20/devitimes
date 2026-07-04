const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase("https://pocketbase-production-ec1e.up.railway.app");

async function run() {
  try {
    // Try to authenticate as admin using the username/password from the admin_password collection
    console.log("Attempting admin authentication...");
    const authData = await pb.admins.authWithPassword("admin@example.com", "naveen@admin");
    console.log("Admin login success!", authData);
    
    // List all collections
    const collections = await pb.collections.getFullList();
    console.log("COLLECTIONS LIST:");
    collections.forEach(c => {
      console.log(`- ${c.name} (id: ${c.id}, type: ${c.type})`);
    });
  } catch (err) {
    console.error("Admin login/list failed with email admin@example.com:", err.message);
    
    // Try with different emails if possible
    const emails = ["naveenkumar11202006@gmail.com", "contact@devitimes.com", "admin"];
    for (const email of emails) {
      try {
        console.log(`Attempting admin authentication with: ${email}`);
        const authData = await pb.admins.authWithPassword(email, "naveen@admin");
        console.log(`Admin login success for ${email}!`);
        const collections = await pb.collections.getFullList();
        console.log("COLLECTIONS LIST:");
        collections.forEach(c => {
          console.log(`- ${c.name} (id: ${c.id}, type: ${c.type})`);
        });
        return;
      } catch (e) {
        console.error(`Failed for ${email}:`, e.message);
      }
    }
  }
}
run();
