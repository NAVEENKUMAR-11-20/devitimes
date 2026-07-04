const pb = require('./src/lib/pocketbase').default || require('./src/lib/pocketbase');
const { createProduct, fetchAllProducts } = require('./src/lib/productsService');
(async () => {
  try {
    const prod = await createProduct({
      MODEL_NUMBER: 'TEST123',
      SIZE_DIMENSIONS: '100x100',
      package_no: '',
      price: 100,
      stock_count: 5,
      is_live: true,
      imageFile: null,
    });
    console.log('Created:', prod);
    const list = await fetchAllProducts();
    console.log('List count:', list.length);
  } catch (e) {
    console.error('Error:', e);
  }
})();
