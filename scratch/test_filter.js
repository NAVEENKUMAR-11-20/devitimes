import PocketBase from 'pocketbase';

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL);
pb.autoCancellation(false);

(async () => {
  try {
    console.log('Querying User collection (lowercase)...');
    const records = await pb.collection('User').getFullList({
      filter: 'User_ID = "lum-001"'
    });
    console.log('Result count:', records.length);
    console.log('Result:', JSON.stringify(records, null, 2));
  } catch (err) {
    console.error('Error:', err);
  }
})();
