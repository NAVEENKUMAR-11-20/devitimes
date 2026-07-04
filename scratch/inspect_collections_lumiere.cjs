const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase("https://pocketbase-production-ec1e.up.railway.app");

async function testPassword(password) {
  const emails = ["admin@example.com", "naveenkumar11202006@gmail.com", "contact@devitimes.com", "admin"];
  for (const email of emails) {
    try {
      console.log(`Trying admin login for ${email} with password ${password}...`);
      const authData = await pb.admins.authWithPassword(email, password);
      console.log(`\nSUCCESS! Logged in as ${email}`);
      const collections = await pb.collections.getFullList();
      console.log("COLLECTIONS LIST:");
      collections.forEach(c => {
        console.log(`- ${c.name} (id: ${c.id}, type: ${c.type})`);
      });
      return true;
    } catch (err) {
      // failed
    }
  }
  return false;
}

async function run() {
  const passwords = ["lumiere@admin2024", "naveen@admin", "admin", "admin123"];
  for (const pwd of passwords) {
    const success = await testPassword(pwd);
    if (success) return;
  }
  console.log("All admin auth attempts failed.");
}
run();
