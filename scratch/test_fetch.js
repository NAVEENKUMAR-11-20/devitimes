import { fetchAllProducts } from '../src/lib/productsService.js';
(async () => {
  const products = await fetchAllProducts();
  console.log('Fetched', products.length, 'products');
  console.log(products.map(p=>({id:p.id, model:p.modelNumber, live:p.isLive})))
})();
