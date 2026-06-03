import pb from './pocketbase';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build a full image URL for a PocketBase file record.
 * Returns null if the record has no image.
 */
export function getProductImageUrl(record) {
  if (!record || !record.prodimage) return null;
  return pb.files.getURL(record, record.prodimage);
}

/**
 * Map a raw PocketBase product record → app product shape
 */
function mapRecord(record) {
  return {
    id: record.id,
    status: record.status || (record.is_live ? 'LIVE' : 'HIDDEN'),
    pbId: record.id,                          // keep PB id separate
    modelNumber: record.MODEL_NUMBER || '',
    size: record.SIZE_DIMENSIONS || '',
    packageNo: record.package_no || '',
    salePrice: Number(record.price) || 0,
    originalPrice: null,
    isOnSale: false,
    stockCount: Number(record.stock) || 0,
    isLive: record.is_live !== undefined ? record.is_live : true,
    images: record.prodimage
      ? [pb.files.getURL(record, record.prodimage)]
      : [],
    _rawImageName: record.prodimage || '',    // original filename for updates
    name: record.MODEL_NUMBER || record.id,   // fallback display name
    category: 'Modern Minimalist',
    color: '',
    description: '',
    source: 'pocketbase',
    createdAt: record.created,
  };
}

// ─── API ──────────────────────────────────────────────────────────────────────

/**
 * Fetch all products from PocketBase.
 * Falls back to [] on error so the UI never breaks.
 */
export async function fetchAllProducts() {
  console.log('[PB] Fetching all products');
  try {
    const records = await pb.collection('products').getFullList({
      sort: '-created',
    });
    return records.map(mapRecord);
  } catch (err) {
    console.error('[PB] fetchAllProducts error:', err);
    return [];
  }
}

/**
 * Create a new product.
 * `data` shape: { MODEL_NUMBER, SIZE_DIMENSIONS, package_no, price, imageFile? }
 */
export async function createProduct(data) {
  console.log('[PB] Saving product with data:', data);
  const formData = new FormData();
  formData.append('MODEL_NUMBER',    data.MODEL_NUMBER    || '');
  formData.append('SIZE_DIMENSIONS', data.SIZE_DIMENSIONS || '');
  formData.append('package_no',      data.package_no      || '');
  formData.append('price',           String(data.price    || 0));
  formData.append('stock',           String(data.stock    || 0));
  // New fields with defaults
  formData.append('status',          data.status          || 'LIVE');
  formData.append('is_live',         data.is_live !== undefined ? String(data.is_live) : 'true');
  formData.append('isLive',          data.isLive !== undefined ? String(data.isLive) : 'true'); // duplicate for safety
  formData.append('category',        data.category        || 'Clock');
  if (data.imageFile) {
    formData.append('prodimage', data.imageFile);
  }

  const record = await pb.collection('products').create(formData);
  console.log('[PB] Saved product response:', record);
  return mapRecord(record);
}

/**
 * Update an existing product.
 * `data` shape same as createProduct; `pbId` is the PocketBase record id.
 */
export async function updateProduct(pbId, data) {
  const formData = new FormData();
  if (data.MODEL_NUMBER    !== undefined) formData.append('MODEL_NUMBER',    data.MODEL_NUMBER);
  if (data.SIZE_DIMENSIONS !== undefined) formData.append('SIZE_DIMENSIONS', data.SIZE_DIMENSIONS);
  if (data.package_no      !== undefined) formData.append('package_no',      data.package_no);
  if (data.price           !== undefined) formData.append('price',           String(data.price));
  if (data.stock            !== undefined) formData.append('stock',           String(data.stock));
  if (data.is_live         !== undefined) formData.append('is_live',         String(data.is_live));
  if (data.imageFile) {
    formData.append('prodimage', data.imageFile);
  }

  const record = await pb.collection('products').update(pbId, formData);
  return mapRecord(record);
}

/**
 * Delete a product by PocketBase record id.
 */
export async function deleteProduct(pbId) {
  await pb.collection('products').delete(pbId);
}
