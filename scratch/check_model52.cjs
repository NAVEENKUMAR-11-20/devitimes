const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase('https://pocketbase-production-ec1e.up.railway.app');

async function check() {
  try {
    const list = await pb.collection('PRODUCT_DATAS').getFullList();
    const p = list.find(x => x.modelNumber === '52');
    if (p) {
      console.log('Product Model 52 details:', JSON.stringify(p, null, 2));
    } else {
      console.log('Product Model 52 not found in PRODUCT_DATAS collection!');
      console.log('First few products:', list.slice(0, 3).map(x => ({ id: x.id, modelNumber: x.modelNumber, product_type: x.product_type, retailPrice: x.retailPrice })));
    }
  } catch (err) {
    console.error('Error fetching PRODUCT_DATAS:', err);
  }
}
check();
