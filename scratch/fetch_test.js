import pb from '../src/lib/pocketbase.js';

async function test() {
  try {
    const records = await pb.collection('products').getFullList({
      sort: '-created',
    });
    console.log("Total records:", records.length);
    records.forEach(r => {
      console.log({
        id: r.id,
        MODEL_NUMBER: r.MODEL_NUMBER,
        SIZE_DIMENSIONS: r.SIZE_DIMENSIONS,
        package_no: r.package_no,
        price: r.price,
        stock_Number: r.stock_Number,
        category: r.category,
        description: r.description,
        is_live: r.is_live,
      });
    });
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
