import pb from './pocketbase';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build a full image URL for a PocketBase file record.
 * Returns null if the record has no image.
 */
export function getProductImageUrl(record) {
  if (!record) return null;
  const prodimage = record.prodimage || record._rawImageName || record.images;
  if (!prodimage) return null;
  const pbRecord = {
    id: record.id || record.pbId,
    collectionId: record.collectionId,
    collectionName: record.collectionName,
  };
  return pb.files.getURL(pbRecord, prodimage);
}

/**
 * Map a raw PocketBase product record → app product shape
 */
export function mapRecord(record) {
  const imageUrl = getProductImageUrl(record);
  const isJson = imageUrl && imageUrl.toLowerCase().split('?')[0].endsWith('.json');
  const wholesalePrice = Number(record.price) || 0;
  const retailPrice = Number(record.stock_Number) || 0;
  return {
    id: record.id,
    status: record.status || (record.is_live ? 'LIVE' : 'HIDDEN'),
    pbId: record.id,                          // keep PB id separate
    collectionId: record.collectionId || '',  // add for compatibility
    collectionName: record.collectionName || '', // add for compatibility
    prodimage: record.prodimage || record.images || '',        // add for compatibility
    modelNumber: record.MODEL_NUMBER || (record.model_no !== undefined ? String(record.model_no) : ''),
    size: record.size || ((record.SIZE_DIMENSIONS && record.SIZE_DIMENSIONS !== 0) ? `${record.SIZE_DIMENSIONS} × ${record.SIZE_DIMENSIONS} MM` : '300 × 300 MM'),
    packageNo: record.package_no || '',
    wholesalePrice: wholesalePrice,
    retailPrice: retailPrice,
    product_type: record.product_type || '',
    salePrice: wholesalePrice, // default salePrice is wholesalePrice
    originalPrice: record.original_price !== undefined && record.original_price !== null ? Number(record.original_price) : null,
    isOnSale: record.is_on_sale !== undefined ? (String(record.is_on_sale) === 'true') : false,
    isLive: record.is_live !== undefined ? (String(record.is_live) === 'true') : true,
    images: imageUrl ? (isJson ? [] : [imageUrl]) : [],
    _jsonUrl: isJson ? imageUrl : null,
    _rawImageName: record.prodimage || record.images || '',    // original filename for updates
    name: record.MODEL_NUMBER || (record.model_no !== undefined ? String(record.model_no) : '') || record.id,   // fallback display name
    category: record.category || 'Modern Minimalist',
    color: record.color || '',
    description: record.description || '',
    source: 'pocketbase',
    createdAt: record.created,
    updatedAt: record.updated || '',
  };
}

/**
 * Fetch a single product by ID.
 */
export async function fetchProductById(pbId, collectionName = 'products') {
  console.log('[PB] Fetching product by ID:', pbId, 'from collection:', collectionName);
  try {
    const record = await pb.collection(collectionName).getOne(pbId, {
      requestKey: null,
    });
    const mapped = mapRecord(record);
    if (mapped._jsonUrl) {
      try {
        const fetchUrl = mapped._jsonUrl + (mapped._jsonUrl.includes('?') ? '&' : '?') + 't=' + Date.now();
        const res = await fetch(fetchUrl, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            mapped.images = data;
          }
        }
      } catch (e) {
        console.error('Failed to fetch JSON gallery for mapped product:', pbId, e);
      }
    }
    return mapped;
  } catch (err) {
    console.error('[PB] fetchProductById error:', err);
    throw err;
  }
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
      requestKey: null,
    });
    return records
      .map(mapRecord)
      .filter(p => (p.product_type !== 'retail' && p.product_type !== 'RETAIL') || p.wholesalePrice > 0);
  } catch (err) {
    console.error('[PB] fetchAllProducts error:', err);
    throw err;
  }
}

/**
 * Create a new product.
 */
export async function createProduct(data) {
  console.log('[PB] Saving product with data:', data);
  const formData = new FormData();
  formData.append('MODEL_NUMBER',    data.MODEL_NUMBER    || '');
  const sizeNum = parseInt(data.SIZE_DIMENSIONS || '', 10) || 0;
  formData.append('SIZE_DIMENSIONS', String(sizeNum));
  formData.append('package_no',      String(data.package_no || ''));
  formData.append('price',           String(data.price    || 0));
  if (data.stock_Number !== undefined) {
    formData.append('stock_Number',  String(data.stock_Number));
  }
  // New fields with defaults
  formData.append('status',          data.status          || 'LIVE');
  formData.append('is_live',         data.is_live !== undefined ? String(data.is_live) : 'true');
  formData.append('isLive',          data.isLive !== undefined ? String(data.isLive) : 'true'); // duplicate for safety
  formData.append('category',        data.category        || 'Modern Minimalist');
  
  if (data.original_price  !== undefined) {
    formData.append('original_price', data.original_price !== null ? String(data.original_price) : '');
  }
  if (data.is_on_sale      !== undefined) {
    formData.append('is_on_sale', String(data.is_on_sale));
  }
  if (data.description     !== undefined) formData.append('description', data.description);
  if (data.color           !== undefined) formData.append('color', data.color);

  if (data.imageFile) {
    formData.append('prodimage', data.imageFile);
  }

  const record = await pb.collection('products').create(formData, {
    requestKey: null,
  });
  console.log('[PB] Saved product response:', record);
  return mapRecord(record);
}

/**
 * Update an existing product.
 */
export async function updateProduct(pbId, data, collectionName = 'products') {
  console.log('[PB] updateProduct called with pbId:', pbId, 'data:', data, 'collection:', collectionName);
  const formData = new FormData();
  
  if (data.MODEL_NUMBER !== undefined) formData.append('MODEL_NUMBER', data.MODEL_NUMBER);
  if (data.model_no !== undefined) formData.append('MODEL_NUMBER', data.model_no);
  
  if (data.SIZE_DIMENSIONS !== undefined) {
    const sizeNum = parseInt(data.SIZE_DIMENSIONS || '', 10) || 0;
    formData.append('SIZE_DIMENSIONS', String(sizeNum));
  }
  if (data.size !== undefined) {
    const sizeNum = parseInt(data.size || '', 10) || 0;
    formData.append('SIZE_DIMENSIONS', String(sizeNum));
  }
  
  if (data.price !== undefined) formData.append('price', String(data.price));
  if (data.price_for_retail !== undefined) formData.append('stock_Number', String(data.price_for_retail));
  if (data.stock_Number !== undefined) formData.append('stock_Number', String(data.stock_Number));
  
  if (data.imageFile !== undefined) {
    formData.append('prodimage', data.imageFile === null ? '' : data.imageFile);
  }
  if (data.images !== undefined) {
    formData.append('prodimage', data.images === null ? '' : data.images);
  }

  if (data.package_no !== undefined) formData.append('package_no', String(data.package_no));
  if (data.is_live !== undefined) formData.append('is_live', String(data.is_live));
  
  // Support other fields if they exist in schema
  if (data.original_price !== undefined) {
    formData.append('original_price', data.original_price !== null ? String(data.original_price) : '');
  }
  if (data.is_on_sale !== undefined) {
    formData.append('is_on_sale', String(data.is_on_sale));
  }
  if (data.description !== undefined) formData.append('description', data.description);
  if (data.category !== undefined) formData.append('category', data.category);
  if (data.color !== undefined) formData.append('color', data.color);

  try {
    const record = await pb.collection('products').update(pbId, formData, {
      requestKey: null,
    });
    console.log('[PB] PocketBase update response raw record:', record);
    return mapRecord(record);
  } catch (err) {
    console.error('[PB] PocketBase update error:', err);
    throw err;
  }
}

/**
 * Delete a product by PocketBase record id.
 */
export async function deleteProduct(pbId, collectionName = 'products') {
  await pb.collection(collectionName).delete(pbId, {
    requestKey: null,
  });
}

// ─── Retail Products Specific API ─────────────────────────────────────────────

export async function createRetailProduct(data) {
  try {
    return await createProduct({
      MODEL_NUMBER: data.model_no,
      SIZE_DIMENSIONS: data.size,
      package_no: data.package_no,
      price: 0,
      stock_Number: data.price_for_retail,
      imageFile: data.images,
    });
  } catch (err) {
    console.error('[PB] createRetailProduct error:', err);
    throw err;
  }
}

export async function fetchRetailProducts() {
  try {
    const records = await pb.collection('products').getFullList({
      sort: '-created',
      requestKey: null,
    });
    return records
      .filter(r => (r.product_type === 'retail' || r.product_type === 'RETAIL') || (Number(r.stock_Number) > 0))
      .map(r => ({
        id: r.id,
        pbId: r.id,
        collectionId: r.collectionId,
        collectionName: 'retail_products',
        modelNumber: r.MODEL_NUMBER || '',
        size: r.size || ((r.SIZE_DIMENSIONS && r.SIZE_DIMENSIONS !== 0) ? `${r.SIZE_DIMENSIONS} × ${r.SIZE_DIMENSIONS} MM` : '300 × 300 MM'),
        packageNo: r.package_no || '',
        salePrice: Number(r.stock_Number) || 0,
        isLive: r.is_live !== undefined ? (String(r.is_live) === 'true') : true,
        images: r.prodimage ? [pb.files.getURL(r, r.prodimage)] : [],
        name: r.MODEL_NUMBER || r.id,
        product_type: r.product_type || '',
      }));
  } catch (err) {
    console.error('[PB] fetchRetailProducts error:', err);
    return [];
  }
}

/**
 * Fetch all retail products from PocketBase (mapped to app shape).
 */
export async function fetchAllRetailProducts() {
  console.log('[PB] Fetching all retail products');
  try {
    const records = await pb.collection('products').getFullList({
      sort: '-created',
      requestKey: null,
    });
    return records
      .map(mapRecord)
      .filter(p => (p.product_type === 'retail' || p.product_type === 'RETAIL') || p.retailPrice > 0)
      .map(p => {
        p.salePrice = p.retailPrice;
        p.originalPrice = null;
        p.isOnSale = false;
        return p;
      });
  } catch (err) {
    console.error('[PB] fetchAllRetailProducts error:', err);
    throw err;
  }
}
