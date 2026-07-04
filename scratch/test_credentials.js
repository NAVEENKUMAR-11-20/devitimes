import pb from '../src/lib/pocketbase.js';

async function testCredentials() {
  const emails = [
    'admin@example.com',
    'admin@devitimes.com',
    'naveenkumar11202006@gmail.com',
    'contact@devitimes.com',
    'admin@admin.com',
    'admin@lumiere.com',
    'lumiere@admin.com',
    'naveen@devitimes.com',
    'naveen@lumiere.com'
  ];
  
  const passwords = [
    'naveen@admin',
    'lumiere@admin2024',
    'admin',
    'admin123',
    'naveenwork001'
  ];
  
  for (const email of emails) {
    for (const password of passwords) {
      try {
        console.log(`Trying ${email} / ${password}...`);
        const authData = await pb.admins.authWithPassword(email, password);
        console.log(`SUCCESS! Logged in as admin: ${email}`);
        return;
      } catch (err) {
        // ignore failure
      }
    }
  }
  console.log('All attempts failed.');
}

testCredentials();
