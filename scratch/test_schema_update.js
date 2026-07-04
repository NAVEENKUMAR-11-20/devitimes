import pb from '../src/lib/pocketbase.js';

async function testSchemaUpdate() {
  try {
    const list = await pb.collection('PRODUCT_DATAS').getFullList({ limit: 1 });
    if (list.length === 0) {
      console.log('No products found.');
      return;
    }
    
    const prod = list[0];
    console.log('Original product:', prod);
    
    // We will try to update the product with different field names
    const fieldsToTry = {
      stock_Number: 99,
      stock_count: 99,
      stock: 99,
      quantity: 99,
      qty: 99,
      stock_qty: 99
    };
    
    console.log('Attempting update with possible fields...');
    const updated = await pb.collection('PRODUCT_DATAS').update(prod.id, fieldsToTry);
    console.log('Updated product response from server:', updated);
  } catch (err) {
    console.error('Update failed with error:', err.status, err.message, err.data);
  }
}

testSchemaUpdate();
