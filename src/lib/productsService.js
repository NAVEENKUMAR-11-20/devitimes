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
    const pbUrl = (import.meta.env.VITE_POCKETBASE_URL || '').replace(/\/$/, '');
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
    images: imageUrls,
    _jsonUrl: isJson ? imageUrl : null,
    _rawImageName: record.PRODUCT_IMAGE || '',    // original filename for updates
    name: record.MODEL_NO !== undefined ? String(record.MODEL_NO) : record.id,   // fallback display name
    category: 'Modern Minimalist',
    color: '',
    description: record.description || '',
    source: 'pocketbase',
    createdAt: record.created,
    updatedAt: record.updated || '',
    stock: record.STOCK !== undefined ? Number(record.STOCK) : 20,
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
      fields: 'id,collectionId,collectionName,PRODUCT_IMAGE,MODEL_NO,SIZE_DM,PACKAGE_NO,WHOLESALE_PRICE,RETAIL_PRICE,PRODUCT_TYPE,original_price,is_on_sale,is_live,description,created,updated,STOCK'
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
  if (data.stock !== undefined) {
    formData.append('STOCK', String(data.stock));
  } else if (data.STOCK !== undefined) {
    formData.append('STOCK', String(data.STOCK));
  }

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
  const formData = new FormData();
  
  if (data.MODEL_NO !== undefined) formData.append('MODEL_NO', String(data.MODEL_NO));
  if (data.SIZE_DM !== undefined) formData.append('SIZE_DM', String(data.SIZE_DM));
  if (data.PACKAGE_NO !== undefined) formData.append('PACKAGE_NO', String(data.PACKAGE_NO));
  if (data.WHOLESALE_PRICE !== undefined) formData.append('WHOLESALE_PRICE', String(data.WHOLESALE_PRICE));
  if (data.RETAIL_PRICE !== undefined) formData.append('RETAIL_PRICE', String(data.RETAIL_PRICE));
  if (data.PRODUCT_TYPE !== undefined) formData.append('PRODUCT_TYPE', data.PRODUCT_TYPE);
  
  // Handle file deletions using the minus modifier
  if (data.deletedImageNames && data.deletedImageNames.length > 0) {
    data.deletedImageNames.forEach(name => {
      formData.append('PRODUCT_IMAGE-', name);
    });
  }

  // Handle new file additions using the plus modifier
  if (data.newImageFiles && data.newImageFiles.length > 0) {
    data.newImageFiles.forEach(file => {
      formData.append('PRODUCT_IMAGE+', file);
    });
  }

  // Fallback for single file updates if still used elsewhere (ensures we don't clear with null unless explicitly desired)
  if (data.imageFile !== undefined && data.imageFile !== null) {
    formData.append('PRODUCT_IMAGE+', data.imageFile);
  }

  if (data.is_live !== undefined) formData.append('is_live', String(data.is_live));
  if (data.stock !== undefined) {
    formData.append('STOCK', String(data.stock));
  } else if (data.STOCK !== undefined) {
    formData.append('STOCK', String(data.STOCK));
  }
  
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

