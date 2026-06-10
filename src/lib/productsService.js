import pb from './pocketbase';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build a full image URL for a PocketBase file record.
 * Returns null if the record has no image.
 */
export function getProductImageUrl(record) {
  if (!record) return null;
  const prodimage = record.prodimage || record._rawImageName;
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
  return {
    id: record.id,
    status: record.status || (record.is_live ? 'LIVE' : 'HIDDEN'),
    pbId: record.id,                          // keep PB id separate
    collectionId: record.collectionId || '',  // add for compatibility
    collectionName: record.collectionName || '', // add for compatibility
    prodimage: record.prodimage || '',        // add for compatibility
    modelNumber: record.MODEL_NUMBER || '',
    size: (record.SIZE_DIMENSIONS && record.SIZE_DIMENSIONS !== 0) ? `${record.SIZE_DIMENSIONS} × ${record.SIZE_DIMENSIONS} MM` : '300 × 300 MM',
    packageNo: record.package_no || '',
    salePrice: Number(record.price) || 0,
    originalPrice: record.original_price !== undefined && record.original_price !== null ? Number(record.original_price) : null,
    isOnSale: record.is_on_sale !== undefined ? (String(record.is_on_sale) === 'true') : false,
    isLive: record.is_live !== undefined ? (String(record.is_live) === 'true') : true,
    images: imageUrl ? (isJson ? [] : [imageUrl]) : [],
    _jsonUrl: isJson ? imageUrl : null,
    _rawImageName: record.prodimage || '',    // original filename for updates
    name: record.MODEL_NUMBER || record.id,   // fallback display name
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
export async function fetchProductById(pbId) {
  console.log('[PB] Fetching product by ID:', pbId);
  try {
    const record = await pb.collection('products').getOne(pbId, {
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
    return records.map(mapRecord);
  } catch (err) {
    console.error('[PB] fetchAllProducts error:', err);
    return [];
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
export async function updateProduct(pbId, data) {
  console.log('[PB] updateProduct called with pbId:', pbId, 'data:', data);
  const formData = new FormData();
  if (data.MODEL_NUMBER    !== undefined) formData.append('MODEL_NUMBER',    data.MODEL_NUMBER);
  if (data.SIZE_DIMENSIONS !== undefined) {
    const sizeNum = parseInt(data.SIZE_DIMENSIONS || '', 10) || 0;
    formData.append('SIZE_DIMENSIONS', String(sizeNum));
  }
  if (data.package_no      !== undefined) formData.append('package_no',      String(data.package_no));
  if (data.price           !== undefined) formData.append('price',           String(data.price));
  if (data.is_live         !== undefined) formData.append('is_live',         String(data.is_live));
  
  // Support other fields if they exist in schema
  if (data.original_price  !== undefined) {
    formData.append('original_price', data.original_price !== null ? String(data.original_price) : '');
  }
  if (data.is_on_sale      !== undefined) {
    formData.append('is_on_sale', String(data.is_on_sale));
  }
  if (data.description     !== undefined) formData.append('description', data.description);
  if (data.category        !== undefined) formData.append('category', data.category);
  if (data.color           !== undefined) formData.append('color', data.color);

  if (data.imageFile !== undefined) {
    formData.append('prodimage', data.imageFile === null ? '' : data.imageFile);
  }

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
export async function deleteProduct(pbId) {
  await pb.collection('products').delete(pbId, {
    requestKey: null,
  });
}
