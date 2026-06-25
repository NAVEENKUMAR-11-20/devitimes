const { updateProduct, fetchAllProducts } = require('../src/lib/productsService.js');

(async () => {
  try {
    console.log("Fetching products...");
    const products = await fetchAllProducts();
    if (products.length === 0) {
      console.log("No products found.");
      return;
    }
    const targetProduct = products[0];
    console.log("Target product:", targetProduct);

    console.log("Updating product...");
    const payload = {
      MODEL_NUMBER: targetProduct.modelNumber,
      SIZE_DIMENSIONS: targetProduct.size,
      package_no: targetProduct.packageNo,
      price: targetProduct.salePrice,
      stock_Number: 55, // Change stock to 55
      is_live: targetProduct.isLive,
    };
    console.log("Payload:", payload);
    const updated = await updateProduct(targetProduct.pbId, payload);
    console.log("Updated product result:", updated);

  } catch (err) {
    console.error("Update failed with error:", err);
  }
})();
