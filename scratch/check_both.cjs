const PocketBase = require('pocketbase/cjs');

async function testHost(host) {
  console.log(`\nTesting host: ${host}`);
  const pb = new PocketBase(host);
  try {
    const list = await pb.collection('products').getFullList({
      sort: '-created',
      requestKey: null,
    });
    console.log(`  SUCCESS! Got products: ${list.length}`);
  } catch (err) {
    console.log(`  ERROR querying 'products': ${err.status} ${err.message}`);
  }

  try {
    const list = await pb.collection('retail_products').getFullList({
      sort: '-created',
      requestKey: null,
    });
    console.log(`  SUCCESS! Got retail_products: ${list.length}`);
  } catch (err) {
    console.log(`  ERROR querying 'retail_products': ${err.status} ${err.message}`);
  }
  
  try {
    const list = await pb.collection('User').getFullList({
      sort: '-created',
      requestKey: null,
    });
    console.log(`  SUCCESS! Got User: ${list.length}`);
  } catch (err) {
    console.log(`  ERROR querying 'User': ${err.status} ${err.message}`);
  }
}

async function run() {
  await testHost("https://pocketbase-production-ec1e.up.railway.app");
  await testHost("https://pocketbase-production-ecle.up.railway.app");
}
run();
