import 'dotenv/config';
import PocketBase from 'pocketbase';

const pb = new PocketBase(process.env.VITE_POCKETBASE_URL || 'https://api.devitimes.in');

async function test() {
  await pb.admins.authWithPassword(
    process.env.PB_SUPERUSER_EMAIL || 'teamdenvex@gmail.com', 
    process.env.PB_SUPERUSER_PASSWORD || 'admin22'
  );
  
  const col = await pb.collections.getOne('orders');
  console.log(JSON.stringify(col.schema, null, 2));
}

test().catch(console.error);
