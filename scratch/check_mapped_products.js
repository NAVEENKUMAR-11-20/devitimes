import { fetchAllProducts } from '../src/lib/productsService.js';

async function testFetch() {
  try {
    const products = await fetchAllProducts();
    console.log('Mapped products list sample (first 3):');
    products.slice(0, 3).forEach(p => {
      console.log({
        id: p.id,
        modelNumber: p.modelNumber,
        stock: p.stock,
        rawStock: p.STOCK // from PocketBase record
      });
    });
  } catch (err) {
    console.error('Error fetching mapped products:', err);
  }
}

testFetch();
