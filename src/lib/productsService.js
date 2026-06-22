import pb from './pocketbase';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build a full image URL for a PocketBase file record.
 * Returns null if the record has no image.
 */
export function getProductImageUrl(record) {
  if (!record) return null;
  const prodimage = record.PRODUCT_IMAGE || record._rawImageName || record.images;
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
  const wholesalePrice = Number(record.WHOLESALE_PRICE) || 0;
  const retailPrice = Number(record.RETAIL_PRICE) || 0;
  return {
    id: record.id,
    status: record.status || (record.is_live ? 'LIVE' : 'HIDDEN'),
    pbId: record.id,                          // keep PB id separate
    collectionId: record.collectionId || '',  // add for compatibility
    collectionName: record.collectionName || '', // add for compatibility
    prodimage: record.PRODUCT_IMAGE || '',    // new schema field
    modelNumber: record.MODEL_NO !== undefined ? String(record.MODEL_NO) : '',
    size: record.SIZE_DM || '300 × 300 MM',
    packageNo: record.PACKAGE_NO !== undefined ? String(record.PACKAGE_NO) : '',
    wholesalePrice: wholesalePrice,
    retailPrice: retailPrice,
    product_type: record.PRODUCT_TYPE || '',
    salePrice: wholesalePrice, // default salePrice is wholesalePrice
    originalPrice: record.original_price !== undefined && record.original_price !== null ? Number(record.original_price) : null,
    isOnSale: record.is_on_sale !== undefined ? (String(record.is_on_sale) === 'true') : false,
    isLive: record.is_live !== undefined ? (String(record.is_live) === 'true') : true,
    images: imageUrl ? (isJson ? [] : [imageUrl]) : [],
    _jsonUrl: isJson ? imageUrl : null,
    _rawImageName: record.PRODUCT_IMAGE || '',    // original filename for updates
    name: record.MODEL_NO !== undefined ? String(record.MODEL_NO) : record.id,   // fallback display name
    category: 'Modern Minimalist',
    color: '',
    description: record.description || '',
    source: 'pocketbase',
    createdAt: record.created,
    updatedAt: record.updated || '',
  };
}

/**
 * Fetch a single product by ID.
 */
export async function fetchProductById(pbId, collectionName = 'PRODUCT_DATAS') {
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
    const records = await pb.collection('PRODUCT_DATAS').getFullList({
      sort: '-created',
      requestKey: null,
    });
    return records.map(mapRecord);
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
  formData.append('MODEL_NO',        data.MODEL_NO !== undefined ? String(data.MODEL_NO) : '');
  formData.append('SIZE_DM',         data.SIZE_DM || '');
  formData.append('PACKAGE_NO',      data.PACKAGE_NO !== undefined ? String(data.PACKAGE_NO) : '');
  formData.append('WHOLESALE_PRICE', String(data.WHOLESALE_PRICE || 0));
  formData.append('RETAIL_PRICE',    String(data.RETAIL_PRICE || 0));
  if (data.PRODUCT_TYPE) {
    formData.append('PRODUCT_TYPE',  data.PRODUCT_TYPE);
  }
  
  // Extra fields for compatibility with existing UI filters
  formData.append('status',          data.status          || 'LIVE');
  formData.append('is_live',         data.is_live !== undefined ? String(data.is_live) : 'true');
  formData.append('isLive',          data.isLive !== undefined ? String(data.isLive) : 'true');
  
  if (data.original_price  !== undefined) {
    formData.append('original_price', data.original_price !== null ? String(data.original_price) : '');
  }
  if (data.is_on_sale      !== undefined) {
    formData.append('is_on_sale', String(data.is_on_sale));
  }
  if (data.description     !== undefined) formData.append('description', data.description);

  if (data.imageFile) {
    formData.append('PRODUCT_IMAGE', data.imageFile);
  }

  const record = await pb.collection('PRODUCT_DATAS').create(formData, {
    requestKey: null,
  });
  console.log('[PB] Saved product response:', record);
  return mapRecord(record);
}

/**
 * Update an existing product.
 */
export async function updateProduct(pbId, data, collectionName = 'PRODUCT_DATAS') {
  console.log('[PB] updateProduct called with pbId:', pbId, 'data:', data, 'collection:', collectionName);
  const formData = new FormData();
  
  if (data.MODEL_NO !== undefined) formData.append('MODEL_NO', String(data.MODEL_NO));
  if (data.SIZE_DM !== undefined) formData.append('SIZE_DM', String(data.SIZE_DM));
  if (data.PACKAGE_NO !== undefined) formData.append('PACKAGE_NO', String(data.PACKAGE_NO));
  if (data.WHOLESALE_PRICE !== undefined) formData.append('WHOLESALE_PRICE', String(data.WHOLESALE_PRICE));
  if (data.RETAIL_PRICE !== undefined) formData.append('RETAIL_PRICE', String(data.RETAIL_PRICE));
  if (data.PRODUCT_TYPE !== undefined) formData.append('PRODUCT_TYPE', data.PRODUCT_TYPE);
  
  if (data.imageFile !== undefined) {
    formData.append('PRODUCT_IMAGE', data.imageFile === null ? '' : data.imageFile);
  }

  if (data.is_live !== undefined) formData.append('is_live', String(data.is_live));
  
  // Support other fields if they exist in schema
  if (data.original_price !== undefined) {
    formData.append('original_price', data.original_price !== null ? String(data.original_price) : '');
  }
  if (data.is_on_sale !== undefined) {
    formData.append('is_on_sale', String(data.is_on_sale));
  }
  if (data.description !== undefined) formData.append('description', data.description);

  try {
    const record = await pb.collection('PRODUCT_DATAS').update(pbId, formData, {
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
export async function deleteProduct(pbId, collectionName = 'PRODUCT_DATAS') {
  await pb.collection(collectionName).delete(pbId, {
    requestKey: null,
  });
}

