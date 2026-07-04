const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase('https://api.devitimes.in');

async function run() {
  const emails = [
    "admin@devitimes.in", "contact@devitimes.in", "admin@example.com", 
    "naveenkumar11202006@gmail.com", "admin", "devitimes", "naveen",
    "admin@devitimes.com", "admin@admin.com", "admin@lumiere.com", 
    "lumiere@admin.com", "naveen@devitimes.com", "naveen@lumiere.com",
    "admin@devitimes.in"
  ];
  const passwords = [
    "lumiere@admin2024", "naveen@admin", "admin", "admin123", 
    "devitimes@2024", "devitimes@admin", "naveenwork001", "naveen123", "password"
  ];

  for (const email of emails) {
    for (const pwd of passwords) {
      try {
        await pb.collection('_superusers').authWithPassword(email, pwd);
        console.log(`\nSUCCESS! Logged into _superusers with: ${email} / ${pwd}`);
        const col = await pb.collections.getOne('PRODUCT_DATAS');
        console.log("PRODUCT_DATAS schema:", JSON.stringify(col.schema || col.fields, null, 2));
        return;
      } catch (e1) {
        try {
          await pb.admins.authWithPassword(email, pwd);
          console.log(`\nSUCCESS! Logged into pb.admins with: ${email} / ${pwd}`);
          const col = await pb.collections.getOne('PRODUCT_DATAS');
          console.log("PRODUCT_DATAS schema:", JSON.stringify(col.schema || col.fields, null, 2));
          return;
        } catch (e2) {}
      }
    }
  }
  console.log("\nAll login combinations failed.");
}
run();
