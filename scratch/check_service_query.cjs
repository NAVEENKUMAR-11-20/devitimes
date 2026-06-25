const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase("https://pocketbase-production-ec1e.up.railway.app");

function mapRecord(record) {
  const prodimage = record.PRODUCT_IMAGE
    ? (Array.isArray(record.PRODUCT_IMAGE) ? record.PRODUCT_IMAGE[0] : record.PRODUCT_IMAGE)
    : (record.prodimage || record._rawImageName || record.images || '');
    
  const imageUrl = prodimage ? pb.files.getURL(record, prodimage) : null;
  const isJson = imageUrl && imageUrl.toLowerCase().split('?')[0].endsWith('.json');
  
  const wholesalePrice = Number(record.WHOLESALE_PRICE !== undefined ? record.WHOLESALE_PRICE : record.price) || 0;
  const retailPrice = Number(record.RETAIL_PRICE !== undefined ? record.RETAIL_PRICE : record.stock_Number) || 0;
  
  const modelNo = record.MODEL_NO !== undefined ? String(record.MODEL_NO) : (record.MODEL_NUMBER || (record.model_no !== undefined ? String(record.model_no) : ''));
  const sizeDm = record.SIZE_DM !== undefined ? Number(record.SIZE_DM) : (record.SIZE_DIMENSIONS || 0);
  const packageNo = record.PACKAGE_NO !== undefined ? String(record.PACKAGE_NO) : (record.package_no || '');
  const productType = record.PRODUCT_TYPE !== undefined ? String(record.PRODUCT_TYPE) : (record.product_type || '');

  return {
    id: record.id,
    status: record.status || (record.is_live !== false ? 'LIVE' : 'HIDDEN'),
    pbId: record.id,                          // keep PB id separate
    collectionId: record.collectionId || '',  // add for compatibility
    collectionName: record.collectionName || '', // add for compatibility
    prodimage: prodimage,        // add for compatibility
    modelNumber: modelNo,
    size: sizeDm ? `${sizeDm} × ${sizeDm} MM` : '300 × 300 MM',
    sizeDm: sizeDm,
    packageNo: packageNo,
    wholesalePrice: wholesalePrice,
    retailPrice: retailPrice,
    product_type: productType,
    salePrice: wholesalePrice, // default salePrice is wholesalePrice
    originalPrice: record.original_price !== undefined && record.original_price !== null ? Number(record.original_price) : null,
    isOnSale: record.is_on_sale !== undefined ? (String(record.is_on_sale) === 'true') : false,
    isLive: record.is_live !== undefined ? (String(record.is_live) === 'true') : true,
    images: imageUrl ? (isJson ? [] : [imageUrl]) : [],
    _jsonUrl: isJson ? imageUrl : null,
    _rawImageName: prodimage,    // original filename for updates
    name: modelNo || record.id,   // fallback display name
    category: record.category || 'Modern Minimalist',
    color: record.color || '',
    description: record.description || '',
    source: 'pocketbase',
    createdAt: record.created,
    updatedAt: record.updated || '',
  };
}

async function run() {
  try {
    const list = await pb.collection('PRODUCT_DATAS').getFullList({
      sort: '-created',
      requestKey: null,
    });
    console.log("SUCCESS! Got records count:", list.length);
    const mapped = list.map(mapRecord);
    console.log("Mapped records details:");
    console.log(JSON.stringify(mapped, null, 2));
  } catch (err) {
    console.error("ERROR:", err);
  }
}
run();
