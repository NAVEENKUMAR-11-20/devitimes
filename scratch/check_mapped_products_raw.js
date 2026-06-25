import pb from '../src/lib/pocketbase.js';

function mapRecord(record) {
  const wholesalePrice = Number(record.WHOLESALE_PRICE) || 0;
  const retailPrice = Number(record.RETAIL_PRICE) || 0;
  return {
    id: record.id,
    modelNumber: record.MODEL_NO !== undefined ? String(record.MODEL_NO) : '',
    stock: record.STOCK !== undefined ? Number(record.STOCK) : 20, // Map STOCK!
  };
}

async function testFetch() {
  try {
    const records = await pb.collection('PRODUCT_DATAS').getFullList({ limit: 10 });
    console.log('Raw PocketBase items and mapped stock values:');
    records.slice(0, 5).forEach(r => {
      const mapped = mapRecord(r);
      console.log({
        id: r.id,
        MODEL_NO: r.MODEL_NO,
        STOCK_raw: r.STOCK,
        stock_mapped: mapped.stock
      });
    });
  } catch (err) {
    console.error('Error fetching:', err);
  }
}

testFetch();
