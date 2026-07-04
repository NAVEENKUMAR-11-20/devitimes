import pb from './pocketbase';

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getProductImageUrls(record) {
  if (!record) return [];
  
  // Find where the product images might be stored
  let prodimages = 
    record.PRODUCT_IMAGE || 
    record.product_image || 
    record.PRODUCT_IMAGES || 
    record.product_images || 
    record.images || 
    record.image || 
    record._rawImageName;
  
  if (!prodimages) return [];
  
  // If it's a string, try to parse it if it looks like a JSON array, otherwise treat as single filename or URL
  if (typeof prodimages === 'string') {
    const trimmed = prodimages.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        prodimages = JSON.parse(trimmed);
      } catch {
        prodimages = [trimmed];
      }
    } else if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
      return [trimmed];
    } else {
      prodimages = [trimmed];
    }
  }
  
  // If it is an array
  if (Array.isArray(prodimages)) {
    const pbUrl = (import.meta.env.VITE_API_URL || import.meta.env.VITE_POCKETBASE_URL || '').replace(/\/$/, '');
    const collectionName = record.collectionName || record.collectionId || 'PRODUCT_DATAS';
    const recordId = record.id || record.pbId;
    
    // Return URLs for elements that are valid strings (not empty, not placeholders)
    return prodimages
      .filter(item => typeof item === 'string' && item.trim().length > 0)
      .map(filename => {
        if (filename.startsWith('http://') || filename.startsWith('https://') || filename.startsWith('data:')) {
          return filename;
        }
        // Build URL using PocketBase file URL logic with VITE_POCKETBASE_URL
        return `${pbUrl}/api/files/${collectionName}/${recordId}/${filename}`;
      });
  }
  
  return [];
}

/**
 * Build a full image URL for a PocketBase file record.
 * Returns null if the record has no image.
 */
export function getProductImageUrl(record) {
  const urls = getProductImageUrls(record);
  return urls.length > 0 ? urls[0] : null;
}

/**
 * Map a raw PocketBase product record → app product shape
 */
export function mapRecord(record) {
  const imageUrls = getProductImageUrls(record);
  const imageUrl = imageUrls.length > 0 ? imageUrls[0] : null;
  const isJson = imageUrl && imageUrl.toLowerCase().split('?')[0].endsWith('.json');
  const wholesalePrice = Number(record.WHOLESALE_PRICE) || 0;
  const retailPrice = Number(record.RETAIL_PRICE) || 0;
  let isLiveVal = true;
  if (record.STATUS !== undefined && record.STATUS !== null && record.STATUS !== '') isLiveVal = (String(record.STATUS).toLowerCase() === 'live' || String(record.STATUS).toLowerCase() === 'active' || String(record.STATUS) === 'true' || record.STATUS === true || record.STATUS === 1);
  else if (record.status !== undefined && record.status !== null && record.status !== '') isLiveVal = (String(record.status).toLowerCase() === 'live' || String(record.status).toLowerCase() === 'active' || String(record.status) === 'true' || record.status === true || record.status === 1);
  else if (record.is_live !== undefined && record.is_live !== null) isLiveVal = (String(record.is_live) === 'true' || record.is_live === true || record.is_live === 1);
  else if (record.isLive !== undefined && record.isLive !== null) isLiveVal = (String(record.isLive) === 'true' || record.isLive === true || record.isLive === 1);
  else if (record.live !== undefined && record.live !== null) isLiveVal = (String(record.live) === 'true' || record.live === true || record.live === 1);
  else if (record.active !== undefined && record.active !== null) isLiveVal = (String(record.active) === 'true' || record.active === true || record.active === 1);
  else if (record.hidden !== undefined && record.hidden !== null) isLiveVal = !(String(record.hidden) === 'true' || record.hidden === true || record.hidden === 1);
  else if (record.isHidden !== undefined && record.isHidden !== null) isLiveVal = !(String(record.isHidden) === 'true' || record.isHidden === true || record.isHidden === 1);
  else if (record.visibility !== undefined && record.visibility !== null) isLiveVal = (record.visibility === 'LIVE' || record.visibility === 'live' || record.visibility === 'active' || String(record.visibility) === 'true');
  
  const modelNoStr = record.MODEL_NO !== undefined && record.MODEL_NO !== null ? String(record.MODEL_NO) :
                     (record.modelNumber !== undefined && record.modelNumber !== null ? String(record.modelNumber) :
                     (record.model_no !== undefined && record.model_no !== null ? String(record.model_no) : ''));
  const sizeDmStr = record.SIZE_DM !== undefined && record.SIZE_DM !== null ? String(record.SIZE_DM) :
                    (record.size !== undefined && record.size !== null ? String(record.size) :
                    (record.sizeDM !== undefined && record.sizeDM !== null ? String(record.sizeDM) : '300 × 300 MM'));

  return {
    ...record,
    id: record.id,
    status: isLiveVal ? 'LIVE' : 'HIDDEN',
    STATUS: isLiveVal ? 'live' : 'hidden',
    pbId: record.id,                          // keep PB id separate
    collectionId: record.collectionId || '',  // add for compatibility
    collectionName: record.collectionName || '', // add for compatibility
    prodimage: record.PRODUCT_IMAGE || '',    // new schema field
    MODEL_NO: modelNoStr,
    modelNumber: modelNoStr,
    SIZE_DM: sizeDmStr,
    size: sizeDmStr,
    packageNo: record.PACKAGE_NO !== undefined && record.PACKAGE_NO !== null ? String(record.PACKAGE_NO) : '',
    wholesalePrice: wholesalePrice,
    retailPrice: retailPrice,
    product_type: record.PRODUCT_TYPE || '',
    salePrice: wholesalePrice, // default salePrice is wholesalePrice
    originalPrice: record.original_price !== undefined && record.original_price !== null ? Number(record.original_price) : null,
    isOnSale: record.is_on_sale !== undefined ? (String(record.is_on_sale) === 'true') : false,
    isLive: isLiveVal,
    images: imageUrls,
    _jsonUrl: isJson ? imageUrl : null,
    _rawImageName: record.PRODUCT_IMAGE || '',    // original filename for updates
    name: record.MODEL_NO !== undefined && record.MODEL_NO !== null ? String(record.MODEL_NO) : record.id,   // fallback display name
    category: 'Modern Minimalist',
    color: '',
    description: record.description || '',
    source: 'pocketbase',
    createdAt: record.created,
    updatedAt: record.updated || '',
    stock: record.STOCK !== undefined && record.STOCK !== null ? Number(record.STOCK) : 20,
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
    return [];
  }
}

/**
 * Create a new product.
 */
export async function createProduct(data) {
  console.log('[PB] Saving product with data:', data);
  const formData = new FormData();
  formData.append('MODEL_NO',        data.MODEL_NO !== undefined && data.MODEL_NO !== null ? String(data.MODEL_NO).trim() : '');
  formData.append('SIZE_DM',         data.SIZE_DM !== undefined && data.SIZE_DM !== null ? String(data.SIZE_DM).trim() : '');
  
  if (data.PACKAGE_NO !== undefined && data.PACKAGE_NO !== null && data.PACKAGE_NO !== '') {
    const pkgNum = Number(data.PACKAGE_NO);
    formData.append('PACKAGE_NO', String(!isNaN(pkgNum) ? pkgNum : 0));
  } else {
    formData.append('PACKAGE_NO', '0');
  }
  
  formData.append('WHOLESALE_PRICE', String(Number(data.WHOLESALE_PRICE || 0)));
  formData.append('RETAIL_PRICE',    String(Number(data.RETAIL_PRICE || 0)));
  if (data.PRODUCT_TYPE || data.product_type) {
    formData.append('PRODUCT_TYPE',  data.PRODUCT_TYPE || data.product_type);
  }
  
  const isLiveVal = data.STATUS !== undefined ? (String(data.STATUS).toLowerCase() === 'live' || String(data.STATUS).toLowerCase() === 'active' || data.STATUS === true || String(data.STATUS) === 'true' || data.STATUS === 1) :
                    (data.status !== undefined ? (String(data.status).toLowerCase() === 'live' || String(data.status).toLowerCase() === 'active' || data.status === true || String(data.status) === 'true' || data.status === 1) :
                    (data.is_live !== undefined ? (data.is_live === true || String(data.is_live) === 'true' || data.is_live === 1) :
                    (data.isLive !== undefined ? (data.isLive === true || String(data.isLive) === 'true' || data.isLive === 1) : true)));
  
  formData.append('STATUS',          isLiveVal ? 'live' : 'hidden');
  formData.append('is_live',         String(isLiveVal));
  
  if (data.original_price !== undefined && data.original_price !== null && data.original_price !== '') {
    formData.append('original_price', String(Number(data.original_price)));
  }
  if (data.is_on_sale !== undefined && data.is_on_sale !== null) {
    formData.append('is_on_sale', String(Boolean(data.is_on_sale)));
  }
  if (data.description !== undefined && data.description !== null) formData.append('description', data.description || '');
  
  const stockVal = data.stock !== undefined ? data.stock : (data.STOCK !== undefined ? data.STOCK : 20);
  formData.append('STOCK', String(Number(stockVal) || 0));

  if (data.imageFiles && data.imageFiles.length > 0) {
    data.imageFiles.forEach(file => {
      formData.append('PRODUCT_IMAGE', file);
    });
  } else if (data.imageFile) {
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

  const hasFiles = (data.deletedImageNames && data.deletedImageNames.length > 0) ||
                   (data.newImageFiles && data.newImageFiles.length > 0) ||
                   (data.imageFile !== undefined && data.imageFile !== null) ||
                   (data.imageFiles && data.imageFiles.length > 0);

  let isLiveVal = undefined;
  if (data.STATUS !== undefined) isLiveVal = (String(data.STATUS).toLowerCase() === 'live' || String(data.STATUS).toLowerCase() === 'active' || data.STATUS === true || String(data.STATUS) === 'true' || data.STATUS === 1);
  else if (data.status !== undefined) isLiveVal = (String(data.status).toLowerCase() === 'live' || String(data.status).toLowerCase() === 'active' || data.status === true || String(data.status) === 'true' || data.status === 1);
  else if (data.is_live !== undefined) isLiveVal = (data.is_live === true || String(data.is_live) === 'true' || data.is_live === 1);
  else if (data.isLive !== undefined) isLiveVal = (data.isLive === true || String(data.isLive) === 'true' || data.isLive === 1);
  else if (data.live !== undefined) isLiveVal = (data.live === true || String(data.live) === 'true' || data.live === 1);
  else if (data.active !== undefined) isLiveVal = (data.active === true || String(data.active) === 'true' || data.active === 1);
  else if (data.hidden !== undefined) isLiveVal = !(data.hidden === true || String(data.hidden) === 'true' || data.hidden === 1);

  if (!hasFiles) {
    const payload = {};
    if (data.MODEL_NO !== undefined) payload.MODEL_NO = data.MODEL_NO !== null ? String(data.MODEL_NO).trim() : '';
    if (data.SIZE_DM !== undefined) payload.SIZE_DM = data.SIZE_DM !== null ? String(data.SIZE_DM).trim() : '';
    if (data.PACKAGE_NO !== undefined && data.PACKAGE_NO !== null) {
      payload.PACKAGE_NO = data.PACKAGE_NO === '' ? 0 : (Number(data.PACKAGE_NO) || 0);
    }
    if (data.WHOLESALE_PRICE !== undefined && data.WHOLESALE_PRICE !== null && data.WHOLESALE_PRICE !== '') {
      payload.WHOLESALE_PRICE = Number(data.WHOLESALE_PRICE) || 0;
    }
    if (data.RETAIL_PRICE !== undefined && data.RETAIL_PRICE !== null && data.RETAIL_PRICE !== '') {
      payload.RETAIL_PRICE = Number(data.RETAIL_PRICE) || 0;
    }
    if (data.PRODUCT_TYPE !== undefined || data.product_type !== undefined) {
      payload.PRODUCT_TYPE = data.PRODUCT_TYPE || data.product_type || '';
    }
    if (isLiveVal !== undefined) {
      payload.STATUS = isLiveVal ? 'live' : 'hidden';
      payload.is_live = Boolean(isLiveVal);
    }
    if (data.stock !== undefined && data.stock !== null && data.stock !== '') {
      payload.STOCK = Number(data.stock) || 0;
    } else if (data.STOCK !== undefined && data.STOCK !== null && data.STOCK !== '') {
      payload.STOCK = Number(data.STOCK) || 0;
    }
    if (data.original_price !== undefined) {
      payload.original_price = data.original_price !== null && data.original_price !== '' ? Number(data.original_price) : null;
    }
    if (data.is_on_sale !== undefined && data.is_on_sale !== null) {
      payload.is_on_sale = Boolean(data.is_on_sale);
    }
    if (data.description !== undefined && data.description !== null) payload.description = data.description || '';

    try {
      const record = await pb.collection('PRODUCT_DATAS').update(pbId, payload, { requestKey: null });
      console.log('[PB] PocketBase update response raw record (JSON):', record);
      return mapRecord(record);
    } catch (err) {
      console.error('[PB] PocketBase update error (JSON):', err);
      throw err;
    }
  }

  const formData = new FormData();
  if (data.MODEL_NO !== undefined) formData.append('MODEL_NO', data.MODEL_NO !== null ? String(data.MODEL_NO).trim() : '');
  if (data.SIZE_DM !== undefined) formData.append('SIZE_DM', data.SIZE_DM !== null ? String(data.SIZE_DM).trim() : '');
  if (data.PACKAGE_NO !== undefined && data.PACKAGE_NO !== null) {
    if (data.PACKAGE_NO === '') {
      formData.append('PACKAGE_NO', '0');
    } else {
      const pkgNum = Number(data.PACKAGE_NO);
      formData.append('PACKAGE_NO', String(!isNaN(pkgNum) ? pkgNum : 0));
    }
  }
  if (data.WHOLESALE_PRICE !== undefined && data.WHOLESALE_PRICE !== null && data.WHOLESALE_PRICE !== '') {
    formData.append('WHOLESALE_PRICE', String(Number(data.WHOLESALE_PRICE) || 0));
  }
  if (data.RETAIL_PRICE !== undefined && data.RETAIL_PRICE !== null && data.RETAIL_PRICE !== '') {
    formData.append('RETAIL_PRICE', String(Number(data.RETAIL_PRICE) || 0));
  }
  if (data.PRODUCT_TYPE !== undefined || data.product_type !== undefined) {
    formData.append('PRODUCT_TYPE', data.PRODUCT_TYPE || data.product_type || '');
  }
  if (data.deletedImageNames && data.deletedImageNames.length > 0) {
    data.deletedImageNames.forEach(name => {
      formData.append('PRODUCT_IMAGE-', name);
    });
  }
  if (data.newImageFiles && data.newImageFiles.length > 0) {
    data.newImageFiles.forEach(file => {
      formData.append('PRODUCT_IMAGE+', file);
    });
  }
  if (data.imageFiles && data.imageFiles.length > 0) {
    data.imageFiles.forEach(file => {
      formData.append('PRODUCT_IMAGE+', file);
    });
  } else if (data.imageFile !== undefined && data.imageFile !== null) {
    formData.append('PRODUCT_IMAGE+', data.imageFile);
  }
  if (isLiveVal !== undefined) {
    formData.append('STATUS', isLiveVal ? 'live' : 'hidden');
    formData.append('is_live', String(isLiveVal));
  }
  if (data.stock !== undefined && data.stock !== null && data.stock !== '') {
    formData.append('STOCK', String(Number(data.stock) || 0));
  } else if (data.STOCK !== undefined && data.STOCK !== null && data.STOCK !== '') {
    formData.append('STOCK', String(Number(data.STOCK) || 0));
  }
  if (data.original_price !== undefined) {
    formData.append('original_price', data.original_price !== null && data.original_price !== '' ? String(Number(data.original_price)) : '');
  }
  if (data.is_on_sale !== undefined && data.is_on_sale !== null) {
    formData.append('is_on_sale', String(Boolean(data.is_on_sale)));
  }
  if (data.description !== undefined && data.description !== null) formData.append('description', data.description || '');

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

