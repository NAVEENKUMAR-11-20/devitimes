import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import ClockSvg from '../../components/ClockSvg';
import {
  fetchAllProducts,
  updateProduct as pbUpdateProduct,
  deleteProduct as pbDeleteProduct,
} from '../../lib/productsService';
import pb from '../../lib/pocketbase';

// Helper to read file as base64 without losing quality (formerly compressImage)
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      resolve(event.target.result);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

// Convert base64 data URI to File
const base64ToFile = (base64Str, filename) => {
  const arr = base64Str.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
};

const adminGalleriesCache = {};

const AdminProducts = () => {
  // ── PocketBase state ──────────────────────────────────────────────────────
  const [products, setProducts]   = useState([]);
  const [pbLoading, setPbLoading] = useState(true);
  const [pbError,   setPbError]   = useState('');

  const loadProducts = async () => {
    try {
      setPbLoading(true);
      setPbError('');
      const data = await fetchAllProducts();
      console.log('[PB] Fetched products for AdminProducts:', data);
      setProducts(data || []);
    } catch (err) {
      setPbError('Failed to load products from PocketBase.');
      console.error(err);
      setProducts([]);
    } finally {
      setPbLoading(false);
    }
  };

  useEffect(() => { loadProducts(); }, []);

  // Fetch JSON galleries in the background for products that have them
  useEffect(() => {
    let isMounted = true;
    products.forEach(prod => {
      if (!prod._jsonUrl || prod._jsonFetched) return;

      const cacheKey = prod._jsonUrl + '?' + (prod.updatedAt || '');
      const cacheVal = adminGalleriesCache[cacheKey];
      
      // Case 1: Already loaded and cached
      if (Array.isArray(cacheVal)) {
        setProducts(prev => prev.map(p => p.id === prod.id ? { ...p, images: cacheVal, _jsonFetched: true } : p));
        return;
      }

      // Case 2: Currently fetching
      if (cacheVal === 'fetching') {
        return;
      }

      // Case 3: Failed/empty
      if (cacheVal === 'failed') {
        setProducts(prev => prev.map(p => p.id === prod.id ? { ...p, _jsonFetched: true } : p));
        return;
      }

      // Case 4: Not started yet
      adminGalleriesCache[cacheKey] = 'fetching';
      const fetchUrl = prod._jsonUrl + (prod._jsonUrl.includes('?') ? '&' : '?') + 't=' + (prod.updatedAt ? encodeURIComponent(prod.updatedAt) : Date.now());
      fetch(fetchUrl, { cache: 'no-store' })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (Array.isArray(data)) {
            adminGalleriesCache[cacheKey] = data;
            if (isMounted) {
              setProducts(prev => prev.map(p => p.id === prod.id ? { ...p, images: data, _jsonFetched: true } : p));
            }
          } else {
            adminGalleriesCache[cacheKey] = 'failed';
            if (isMounted) {
              setProducts(prev => prev.map(p => p.id === prod.id ? { ...p, _jsonFetched: true } : p));
            }
          }
        })
        .catch(err => {
          console.error('Error loading gallery for admin:', prod.id, err);
          adminGalleriesCache[cacheKey] = 'failed';
          if (isMounted) {
            setProducts(prev => prev.map(p => p.id === prod.id ? { ...p, _jsonFetched: true } : p));
          }
        });
    });
    return () => { isMounted = false; };
  }, [products]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Search & Filter State
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, LIVE, HIDDEN

  // Sorting State
  const [sortField, setSortField] = useState('name');
  const [sortAscending, setSortAscending] = useState(true);

  // Edit Modal State
  const [editingProduct, setEditingProduct] = useState(null);
  const [editForm, setEditForm] = useState({
    color: '', salePrice: 0, originalPrice: 0,
    description: '', isOnSale: false, isLive: true, images: []
  });

  // Cropper modal state for image gallery edit
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropTargetIndex, setCropTargetIndex] = useState(null); // index of target image in editForm.images
  const [cropImageSrc, setCropImageSrc] = useState('');
  const [cropBox, setCropBox] = useState({ x: 50, y: 50, size: 200 });
  const [imgDimensions, setImgDimensions] = useState({ width: 0, height: 0, naturalWidth: 0, naturalHeight: 0 });
  const dragStartRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const cropImageRef = useRef(null);

  // Delete Confirmation Modal State
  const [deletingProductId, setDeletingProductId] = useState(null);

  // Disable body scroll when delete modal or crop modal is open
  useEffect(() => {
    if (deletingProductId || showCropModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [deletingProductId, showCropModal]);

  // Handle image dimensions loaded
  const handleImageLoad = (e) => {
    const { width, height } = e.target.getBoundingClientRect();
    const naturalWidth = e.target.naturalWidth;
    const naturalHeight = e.target.naturalHeight;
    setImgDimensions({ width, height, naturalWidth, naturalHeight });
    
    // Initialize crop box to be a square at the center of the image
    const minDim = Math.min(width, height);
    const boxSize = minDim * 0.7; // 70% of min dimension
    const boxX = (width - boxSize) / 2;
    const boxY = (height - boxSize) / 2;
    setCropBox({ x: boxX, y: boxY, size: boxSize });
  };

  const handleStartAction = (e, action) => {
    e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    dragStartRef.current = {
      mouseX: clientX,
      mouseY: clientY,
      boxX: cropBox.x,
      boxY: cropBox.y,
      boxSize: cropBox.size,
      action
    };
  };

  // Drag and resize mouse/touch window listeners
  useEffect(() => {
    const handleMove = (e) => {
      if (!dragStartRef.current) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const start = dragStartRef.current;
      const dx = clientX - start.mouseX;
      const dy = clientY - start.mouseY;

      if (start.action === 'dragging') {
        let newX = start.boxX + dx;
        let newY = start.boxY + dy;
        newX = Math.max(0, Math.min(newX, imgDimensions.width - start.boxSize));
        newY = Math.max(0, Math.min(newY, imgDimensions.height - start.boxSize));
        setCropBox({ x: newX, y: newY, size: start.boxSize });
      } else if (start.action === 'resizing-se') {
        const diff = Math.max(dx, dy);
        const newSize = Math.max(40, Math.min(start.boxSize + diff, imgDimensions.width - start.boxX, imgDimensions.height - start.boxY));
        setCropBox(prev => ({ ...prev, size: newSize }));
      } else if (start.action === 'resizing-sw') {
        const diff = -dx;
        const maxSize = Math.min(start.boxSize + start.boxX, imgDimensions.height - start.boxY);
        const newSize = Math.max(40, Math.min(start.boxSize + diff, maxSize));
        const newX = start.boxX - (newSize - start.boxSize);
        setCropBox({ x: newX, y: start.boxY, size: newSize });
      } else if (start.action === 'resizing-ne') {
        const diff = dx;
        const maxSize = Math.min(imgDimensions.width - start.boxX, start.boxSize + start.boxY);
        const newSize = Math.max(40, Math.min(start.boxSize + diff, maxSize));
        const newY = start.boxY - (newSize - start.boxSize);
        setCropBox({ x: start.boxX, y: newY, size: newSize });
      } else if (start.action === 'resizing-nw') {
        const diff = -dx;
        const maxSize = Math.min(start.boxSize + start.boxX, start.boxSize + start.boxY);
        const newSize = Math.max(40, Math.min(start.boxSize + diff, maxSize));
        const newX = start.boxX - (newSize - start.boxSize);
        const newY = start.boxY - (newSize - start.boxSize);
        setCropBox({ x: newX, y: newY, size: newSize });
      }
    };

    const handleEnd = () => {
      dragStartRef.current = null;
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [cropBox, imgDimensions]);

  // Update preview canvas whenever cropBox or image loaded updates
  useEffect(() => {
    if (!showCropModal || !cropImageSrc || !imgDimensions.width || !imgDimensions.height) return;

    const img = cropImageRef.current;
    if (!img) return;

    const prevCanvas = previewCanvasRef.current;
    if (!prevCanvas) return;
    const prevCtx = prevCanvas.getContext('2d');
    if (!prevCtx) return;

    const scaleX = imgDimensions.naturalWidth / imgDimensions.width;
    const scaleY = imgDimensions.naturalHeight / imgDimensions.height;
    const sourceX = cropBox.x * scaleX;
    const sourceY = cropBox.y * scaleY;
    const sourceSize = cropBox.size * scaleX;

    prevCtx.fillStyle = '#FFFFFF';
    prevCtx.fillRect(0, 0, prevCanvas.width, prevCanvas.height);
    try {
      prevCtx.drawImage(
        img,
        sourceX, sourceY, sourceSize, sourceSize,
        0, 0, prevCanvas.width, prevCanvas.height
      );
    } catch (e) {
      console.error('[ERROR] Failed to draw crop preview:', e);
    }
  }, [showCropModal, cropImageSrc, cropBox, imgDimensions]);

  const handleOpenCropper = (imgUrl, index) => {
    setCropTargetIndex(index);
    let finalUrl = imgUrl;
    if (imgUrl && (imgUrl.startsWith('http://') || imgUrl.startsWith('https://'))) {
      finalUrl = imgUrl + (imgUrl.includes('?') ? '&' : '?') + 't=' + Date.now();
    }
    setCropImageSrc(finalUrl);
    setImgDimensions({ width: 0, height: 0, naturalWidth: 0, naturalHeight: 0 });
    setShowCropModal(true);
  };

  const handleSaveCrop = () => {
    const img = cropImageRef.current;
    if (!img || !imgDimensions.width || !imgDimensions.height) return;

    // Calculate source coordinates in the original image's natural dimensions
    const scaleX = imgDimensions.naturalWidth / imgDimensions.width;
    const scaleY = imgDimensions.naturalHeight / imgDimensions.height;
    const sourceX = cropBox.x * scaleX;
    const sourceY = cropBox.y * scaleY;
    const sourceSize = cropBox.size * scaleX;

    // Create an offscreen canvas matching the high-resolution crop dimensions
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = Math.round(sourceSize);
    exportCanvas.height = Math.round(sourceSize);

    const exportCtx = exportCanvas.getContext('2d');
    if (!exportCtx) return;

    // Enable high-quality image smoothing
    exportCtx.imageSmoothingEnabled = true;
    exportCtx.imageSmoothingQuality = 'high';

    // Draw the high-resolution crop portion
    exportCtx.drawImage(
      img,
      sourceX, sourceY, sourceSize, sourceSize,
      0, 0, exportCanvas.width, exportCanvas.height
    );

    // Export in JPEG format at high quality (0.95)
    const croppedBase64 = exportCanvas.toDataURL('image/jpeg', 0.95);

    setEditForm(prev => {
      const updatedImages = [...prev.images];
      updatedImages[cropTargetIndex] = croppedBase64;
      return {
        ...prev,
        images: updatedImages
      };
    });

    setShowCropModal(false);
    setCropTargetIndex(null);
    setCropImageSrc('');
  };

  // Instant notification feedback state
  const [toastMessage, setToastMessage] = useState('');

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 1500);
  };

  // Bulk Actions State & Logic
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, type: '' });
  const [deleteDropdownOpen, setDeleteDropdownOpen] = useState(false);
  
  // Custom Modal States
  const [bulkDeleteTarget, setBulkDeleteTarget] = useState(null); 
  const [failedIds, setFailedIds] = useState([]); 
  const [successCountTracker, setSuccessCountTracker] = useState(0);

  const ensurePbAuth = async () => {
    if (!pb.authStore.isValid) {
      const email = import.meta.env.VITE_PB_ADMIN_EMAIL || 'admin@devitimes.com';
      const password = import.meta.env.VITE_PB_ADMIN_PASSWORD || 'admin12345';
      try {
        await pb.admins.authWithPassword(email, password);
      } catch (e) {
        console.error('PB Auth Error:', e);
      }
    }
  };

  const processInBatches = async (items, processItem, batchSize = 10) => {
    let completed = 0;
    const failedItems = [];
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const results = await Promise.allSettled(batch.map(processItem));
      
      results.forEach((res, idx) => {
        if (res.status === 'rejected') {
          failedItems.push({ item: batch[idx], error: res.reason });
          console.error('[PB] Batch item failed:', batch[idx].id || batch[idx], res.reason);
        }
      });
      
      completed += batch.length;
      setBulkProgress(prev => ({ ...prev, current: Math.min(completed, items.length) }));
    }
    return failedItems;
  };

  const executeDeletionBatch = async (itemsToDelete) => {
    setBulkProcessing(true);
    setBulkProgress({ current: 0, total: itemsToDelete.length, type: 'Deleting' });
    triggerToast('Bulk delete started... Please wait.');
    
    await ensurePbAuth();

    try {
      const failed = await processInBatches(
        itemsToDelete, 
        (p) => pb.collection('products').delete(p.pbId || p.id, { requestKey: null }), 
        10
      );
      const successCount = itemsToDelete.length - failed.length;
      
      setSuccessCountTracker(prev => prev + successCount);
      
      if (failed.length > 0) {
        setFailedIds(failed); // Trigger the retry modal
      } else {
        triggerToast(`${successCountTracker + successCount} products deleted successfully!`);
        await loadProducts();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      triggerToast('Critical error during bulk delete.');
      console.error(err);
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleBulkDelete = (countOption) => {
    setDeleteDropdownOpen(false);
    
    let targetList = products;
    if (countOption !== 'ALL') {
      targetList = products.slice(0, countOption);
    }
    
    if (targetList.length === 0) return;

    // Trigger the initial confirmation modal
    setBulkDeleteTarget({ items: targetList, countOption });
    setSuccessCountTracker(0); // reset success tracker
  };

  const confirmInitialDelete = async () => {
    const target = bulkDeleteTarget?.items;
    setBulkDeleteTarget(null);
    if (target) {
      await executeDeletionBatch(target);
    }
  };

  const confirmRetryDelete = async () => {
    const target = failedIds.map(f => f.item);
    setFailedIds([]);
    if (target.length > 0) {
      await executeDeletionBatch(target);
    }
  };

  const cancelRetryDelete = async () => {
    triggerToast(`Completed with ${failedIds.length} errors.`);
    setFailedIds([]);
    await loadProducts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Metrics summary
  const totalCount = products.length;
  const liveCount = products.filter(p => p.isLive).length;
  const hiddenCount = totalCount - liveCount;

  const categories = ['Modern Minimalist', 'Contemporary', 'Luxury Vintage', 'Classic', 'Special Edition'];

  // Handle Sort Header clicks
  const requestSort = (field) => {
    if (sortField === field) {
      setSortAscending(!sortAscending);
    } else {
      setSortField(field);
      setSortAscending(true);
    }
  };

  // Instant status toggle — update is_live in PocketBase
  const handleToggleLive = async (id, currentStatus) => {
    const product = products.find(p => p.id === id);
    if (!product) return;
    
    // Optimistic update
    setProducts(prev => prev.map(p => p.id === id ? { ...p, isLive: !currentStatus } : p));
    triggerToast(currentStatus ? 'Product set to HIDDEN' : 'Product set to LIVE');
    
    try {
      await pbUpdateProduct(product.pbId || id, { is_live: !currentStatus });
    } catch (err) {
      // Revert on error
      setProducts(prev => prev.map(p => p.id === id ? { ...p, isLive: currentStatus } : p));
      triggerToast('Error updating status');
      console.error(err);
    }
  };

  // Trigger Delete confirmation
  const triggerDeleteConfirm = (id) => {
    setDeletingProductId(id);
  };

  const handleConfirmDelete = async () => {
    if (!deletingProductId) return;
    const idToDelete = deletingProductId;
    const product = products.find(p => p.id === idToDelete);
    setDeletingProductId(null);
    
    // Optimistic update
    setProducts(prev => prev.filter(p => p.id !== idToDelete));
    triggerToast('Deleting product...');
    
    try {
      await ensurePbAuth();
      await pb.collection('products').delete(product?.pbId || idToDelete, { requestKey: null });
      triggerToast('Product deleted successfully');
    } catch (err) {
      // Revert on error at exact position if possible
      if (product) setProducts(prev => [product, ...prev]);
      triggerToast(`Error deleting product: ${err.message || 'Unknown error'}`);
      console.error(err);
    }
  };

  // Trigger Edit Form
  const triggerEdit = (product) => {
    console.log('[DEBUG] Selected product before opening edit modal:', product);
    setEditingProduct(product);
    setEditForm({ ...product, _newImageFile: null });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    console.log('[DEBUG] handleEditSubmit entered. editForm:', editForm);
    const modelNumStr = String(editForm.modelNumber || '').trim();
    const sizeStr = String(editForm.size || '').trim();

    if (!modelNumStr) {
      alert('Model number is required.');
      return;
    }
    if (!sizeStr) {
      alert('Size is required.');
      return;
    }
    if (editForm.salePrice === undefined || editForm.salePrice === '') {
      alert('Sale price is required.');
      return;
    }

    try {
      const pbId = editForm.pbId || editForm.id;
      
      const payload = {
        MODEL_NUMBER:    modelNumStr,
        SIZE_DIMENSIONS: sizeStr,
        package_no:      editForm.packageNo ? (isNaN(Number(editForm.packageNo)) ? editForm.packageNo : Number(editForm.packageNo)) : '',
        price:           Number(editForm.salePrice),
        is_live:         editForm.isLive,
        original_price:  editForm.originalPrice !== undefined && editForm.originalPrice !== null && editForm.originalPrice !== '' ? Number(editForm.originalPrice) : null,
        is_on_sale:      editForm.isOnSale,
        description:     editForm.description || '',
        category:        editForm.category || 'Modern Minimalist',
        color:           editForm.color || '',
      };

      if (editForm.images.length === 0) {
        payload.imageFile = null;
      } else if (editForm.images.length === 1) {
        const singleImg = editForm.images[0];
        if (singleImg.startsWith('data:')) {
          payload.imageFile = base64ToFile(singleImg, `product_${modelNumStr}.jpg`);
        } else {
          if (editingProduct._jsonUrl) {
            const jsonString = JSON.stringify(editForm.images);
            const jsonFile = new File([jsonString], 'gallery.json', { type: 'application/json' });
            payload.imageFile = jsonFile;
          }
        }
      } else {
        const jsonString = JSON.stringify(editForm.images);
        const jsonFile = new File([jsonString], 'gallery.json', { type: 'application/json' });
        payload.imageFile = jsonFile;
      }

      console.log('[DEBUG] updated payload before saving:', payload);

      const response = await pbUpdateProduct(pbId, payload);
      console.log('[DEBUG] PocketBase update response:', response);

      setEditingProduct(null);
      triggerToast('Product updated successfully');
      await loadProducts();
    } catch (err) {
      triggerToast('Error saving product');
      console.error('[ERROR] Error updating product:', err);
    }
  };

  // Image helpers for Edit Modal
  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    if (editForm.images.length + files.length > 10) {
      alert('You can upload a maximum of 10 images.');
      return;
    }

    try {
      const compressedUrls = await Promise.all(files.map(file => compressImage(file)));
      setEditForm(prev => ({
        ...prev,
        images: [...prev.images, ...compressedUrls]
      }));
    } catch (err) {
      console.error('Error compressing/uploading images:', err);
    }
  };

  const removeEditImage = (indexToRemove) => {
    setEditForm(prev => ({
      ...prev,
      images: prev.images.filter((_, idx) => idx !== indexToRemove)
    }));
  };

  // Filter and Sort Table rows
  const sortedFilteredProducts = useMemo(() => {
    return products
      .filter(p => {
        // Status checks – treat undefined isLive as true (LIVE)
        const isLive = p.isLive !== undefined ? p.isLive : true;
        if (statusFilter === 'LIVE' && !isLive) return false;
        if (statusFilter === 'HIDDEN' && isLive) return false;
        // Search text check
        const q = searchQuery.toLowerCase().trim();
        const safeModel = (p.modelNumber || '').toString().toLowerCase();
        const safePrice = (p.salePrice || '').toString().toLowerCase();
        const safePkg = (p.packageNo || '').toString().toLowerCase();
        const safeSize = (p.size || '').toString().toLowerCase();
        
        return safeModel.includes(q) || safePrice.includes(q) || safePkg.includes(q) || safeSize.includes(q);
      })
      .sort((a, b) => {
        let valA = a[sortField] !== undefined && a[sortField] !== null ? a[sortField] : '';
        let valB = b[sortField] !== undefined && b[sortField] !== null ? b[sortField] : '';

        // Format strings or numbers for comparison
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return sortAscending ? -1 : 1;
        if (valA > valB) return sortAscending ? 1 : -1;
        return 0;
      });
  }, [products, searchQuery, statusFilter, sortField, sortAscending]);

  // Paginated elements
  const paginatedProducts = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return sortedFilteredProducts.slice(startIdx, startIdx + itemsPerPage);
  }, [sortedFilteredProducts, currentPage]);

  const totalPages = Math.ceil(sortedFilteredProducts.length / itemsPerPage) || 1;

  // Sorting Indicators
  const renderSortIndicator = (field) => {
    if (sortField !== field) return null;
    return sortAscending ? ' ▲' : ' ▼';
  };

  return (
    <div className="admin-products-root font-body">

      {/* PocketBase loading / error */}
      {pbLoading && (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading products from PocketBase…
        </div>
      )}
      {!pbLoading && pbError && (
        <div style={{ padding: '16px', background: '#FEF2F2', color: '#B91C1C', borderRadius: '4px', marginBottom: '16px' }}>
          ⚠️ {pbError} — Make sure PocketBase is running on https://pocketbase-production-ec1e.up.railway.app
        </div>
      )}
      
      {/* Toast Alert popup */}
      {toastMessage && (
        <div className="toast-notification font-body">
          {toastMessage}
        </div>
      )}

      {/* Header section */}
      <div className="products-header-row">
        <div>
          <h1 className="dashboard-heading font-heading">Product Catalogue</h1>
          <p className="stats-indicator font-body">
            {totalCount} products total &nbsp;|&nbsp; 
            <span style={{ color: '#10B981', fontWeight: '600' }}>{liveCount} live</span> &nbsp;|&nbsp; 
            <span style={{ color: '#6B7280', fontWeight: '600' }}>{hiddenCount} hidden</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end', marginTop: '12px' }}>
          
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setDeleteDropdownOpen(!deleteDropdownOpen)} 
              disabled={bulkProcessing || products.length === 0}
              className="btn-secondary font-body" 
              style={{ height: '40px', padding: '0 16px', fontSize: '12px', background: '#FEF2F2', color: '#B91C1C', borderColor: '#FECACA' }}
            >
              {bulkProcessing && bulkProgress.type.includes('Delet') ? (
                <>
                  <span className="loading-spinner" style={{ width: '12px', height: '12px', border: '2px solid #FECACA', borderTop: '2px solid #B91C1C', borderRadius: '50%', display: 'inline-block', marginRight: '6px', animation: 'spin 1s linear infinite', verticalAlign: 'middle' }}></span>
                  {`${bulkProgress.type} ${bulkProgress.current}/${bulkProgress.total}...`}
                </>
              ) : '🗑️ DELETE PRODUCTS ▼'}
            </button>
            
            {deleteDropdownOpen && !bulkProcessing && (
              <div style={{ position: 'absolute', top: '44px', right: '0', background: 'white', border: '1px solid #E2E8F0', borderRadius: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 50, minWidth: '200px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {[200, 400, 600, 800, 1000].map(count => (
                  <button key={count} onClick={() => handleBulkDelete(count)} style={{ padding: '12px 16px', textAlign: 'left', border: 'none', borderBottom: '1px solid #F1F5F9', fontSize: '12px', cursor: 'pointer', background: 'transparent', color: 'var(--text-primary)', fontWeight: '500' }}>
                    Delete first {count} products
                  </button>
                ))}
                <button onClick={() => handleBulkDelete('ALL')} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', cursor: 'pointer', background: '#FEF2F2', color: '#B91C1C', fontWeight: 'bold', border: 'none' }}>
                  Delete ALL products
                </button>
              </div>
            )}
          </div>

          <Link to="/admin/add-product" className="btn-primary font-body" style={{ height: '40px', padding: '0 20px', fontSize: '12px' }}>
            ➕ &nbsp; ADD NEW PRODUCT
          </Link>
        </div>
      </div>

      {/* Search and Filters deck */}
      <div className="table-controls-card">
        
        {/* Real-time search bar */}
        <div className="search-control-wrapper">
          <input 
            type="text" 
            placeholder="Search catalogue by model number, package number, or dimensions..."
            className="form-input search-catalogue-input"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        {/* Tab Filters row */}
        <div className="filters-tabs-row">
          
          <div className="status-tabs-group">
            <button 
              className={`tab-btn uppercase-label ${statusFilter === 'ALL' ? 'active-tab' : ''}`}
              onClick={() => { setStatusFilter('ALL'); setCurrentPage(1); }}
            >
              All
            </button>
            <button 
              className={`tab-btn uppercase-label ${statusFilter === 'LIVE' ? 'active-tab' : ''}`}
              onClick={() => { setStatusFilter('LIVE'); setCurrentPage(1); }}
            >
              Live
            </button>
            <button 
              className={`tab-btn uppercase-label ${statusFilter === 'HIDDEN' ? 'active-tab' : ''}`}
              onClick={() => { setStatusFilter('HIDDEN'); setCurrentPage(1); }}
            >
              Hidden
            </button>
          </div>

        </div>

      </div>

      {/* Products Table container */}
      <div className="table-container-card">
        {paginatedProducts.length === 0 ? (
          <div className="empty-table-state font-body">
            No products match the search or filter query.
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Thumbnail</th>
                <th onClick={() => requestSort('modelNumber')} className="sortable-header">
                  Model No{renderSortIndicator('modelNumber')}
                </th>
                <th onClick={() => requestSort('salePrice')} className="sortable-header">
                  Price{renderSortIndicator('salePrice')}
                </th>
                <th>Dimensions</th>
                <th>Pkg No</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.map(p => (
                <tr key={p.id}>
                  
                  {/* Thumbnail */}
                  <td>
                    <div className="table-thumb-wrapper">
                      {p.images && p.images.length > 0 ? (
                        <img src={p.images[0]} alt={p.name} className="table-thumbnail-img" />
                      ) : (
                        <ClockSvg model={p.modelNumber} category={p.category} color={p.color} size={40} />
                      )}
                    </div>
                  </td>

                  {/* Details */}
                  <td><code>{p.modelNumber}</code></td>
                  <td>
                    <div className="table-price-stack">
                      <strong>₹{p.salePrice}</strong>
                      {p.originalPrice && <span className="strikethrough-cell">₹{p.originalPrice}</span>}
                    </div>
                  </td>
                  <td>{p.size}</td>
                  <td>{p.packageNo || '-'}</td>

                  {/* Status Toggle Switch */}
                  <td>
                    <button 
                      onClick={() => handleToggleLive(p.id, p.isLive)} 
                      className={`status-toggle-switch ${p.isLive ? 'live-switch' : 'hidden-switch'}`}
                      aria-label="Toggle live status"
                    >
                      <span className="toggle-slider"></span>
                      <span className="toggle-label-text">{p.isLive ? 'LIVE' : 'HIDDEN'}</span>
                    </button>
                  </td>

                  {/* Action Buttons */}
                  <td>
                    <div className="table-actions-row">
                      <button 
                        onClick={() => triggerEdit(p)} 
                        className="action-icon-btn edit-btn"
                        aria-label="Edit time product"
                      >
                        ✏️
                      </button>
                      <button 
                        onClick={() => triggerDeleteConfirm(p.id)} 
                        className="action-icon-btn delete-btn"
                        aria-label="Delete product"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Paginate Controls footer */}
        {totalPages > 1 && (
          <div className="pagination-bar">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="pagination-btn"
            >
              ◀ &nbsp; Prev
            </button>
            <span className="pagination-info">
              Page <strong>{currentPage}</strong> of {totalPages}
            </span>
            <button 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="pagination-btn"
            >
              Next &nbsp; ▶
            </button>
          </div>
        )}

      </div>

      {/* --- EDIT MODAL OVERLAY --- */}
      {editingProduct && (
        <div className="modal-overlay">
          <div className="modal-card edit-product-modal animate-fade-in">
            <h3 className="modal-title font-heading" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              Edit Product Details
            </h3>

            <form onSubmit={handleEditSubmit} className="admin-form edit-product-form">
                            <div className="form-grid-3col">
                <div className="form-group">
                  <label className="form-label">MODEL NO *</label>
                  <input 
                    type="text" 
                    className="form-input"
                    value={editForm.modelNumber}
                    onChange={(e) => setEditForm(prev => ({ ...prev, modelNumber: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">SIZE *</label>
                  <select 
                    className="form-input"
                    value={editForm.size}
                    onChange={(e) => setEditForm(prev => ({ ...prev, size: e.target.value }))}
                  >
                    <option value="">Select Size</option>
                    <option value="300 × 300 MM">300 × 300 MM</option>
                    <option value="350 × 350 MM">350 × 350 MM</option>
                    <option value="400 × 400 MM">400 × 400 MM</option>
                    <option value="450 × 450 MM">450 × 450 MM</option>
                    <option value="500 × 500 MM">500 × 500 MM</option>
                    {editForm.size && !["300 × 300 MM", "350 × 350 MM", "400 × 400 MM", "450 × 450 MM", "500 × 500 MM"].includes(editForm.size) && (
                      <option value={editForm.size}>{editForm.size}</option>
                    )}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">STOCK *</label>
                  <input 
                    type="text" 
                    className="form-input"
                    value={editForm.packageNo || ''}
                    placeholder="e.g. 52"
                    onChange={(e) => setEditForm(prev => ({ ...prev, packageNo: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">PRICE (₹) *</label>
                <input 
                  type="number" 
                  className="form-input"
                  value={editForm.salePrice}
                  onChange={(e) => setEditForm(prev => ({ ...prev, salePrice: Number(e.target.value) }))}
                />
              </div>

              {/* Checkboxes */}
              <div className="form-checkboxes-row font-body">
                <label className="checkbox-container">
                  <input 
                    type="checkbox" 
                    checked={editForm.isOnSale}
                    onChange={(e) => setEditForm(prev => ({ ...prev, isOnSale: e.target.checked }))}
                  />
                  <span>Show "SALE" Badge</span>
                </label>

                <label className="checkbox-container">
                  <input 
                    type="checkbox" 
                    checked={editForm.isLive}
                    onChange={(e) => setEditForm(prev => ({ ...prev, isLive: e.target.checked }))}
                  />
                  <span>Make Product Live</span>
                </label>
              </div>

              {/* Images uploads */}
              <div className="form-group" style={{ marginTop: '16px' }}>
                <label className="form-label">IMAGES GALLERY ({editForm.images.length})</label>
                
                <input 
                  type="file" 
                  accept="image/*" 
                  multiple 
                  id="modal-img-upload-input" 
                  style={{ display: 'none' }} 
                  onChange={handleImageUpload} 
                />
                
                <div className="modal-gallery-row">
                  {editForm.images.map((img, index) => (
                    <div key={index} className="modal-gallery-thumb">
                      <img 
                        src={img} 
                        alt="preview" 
                        onClick={() => handleOpenCropper(img, index)}
                        style={{ cursor: 'pointer' }}
                        title="Click to Crop/Resize"
                      />
                      <button 
                        type="button" 
                        className="remove-thumb-x"
                        onClick={() => removeEditImage(index)}
                      >
                        &times;
                      </button>
                      <button 
                        type="button" 
                        className="edit-thumb-pencil"
                        onClick={() => handleOpenCropper(img, index)}
                        title="Crop / Resize"
                        style={{ border: 'none' }}
                      >
                        ✏️
                      </button>
                    </div>
                  ))}
                  
                  <label htmlFor="modal-img-upload-input" className="modal-add-thumb-btn">
                    <span>+ Add</span>
                  </label>
                </div>
              </div>

              <div className="modal-actions-row" style={{ marginTop: '24px' }}>
                <button type="submit" className="btn-primary modal-btn">
                  SAVE CHANGES
                </button>
                <button 
                  type="button" 
                  className="btn-secondary modal-btn"
                  onClick={() => setEditingProduct(null)}
                >
                  CANCEL
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* --- DELETE CONFIRMATION MODAL --- */}
      {deletingProductId && (
        <div className="modal-overlay">
          <div className="modal-card animate-fade-in" style={{ maxWidth: '380px' }}>
            <button 
              className="modal-close-btn" 
              onClick={() => setDeletingProductId(null)}
              aria-label="Close"
            >
              ✕
            </button>
            <h3 className="modal-title font-heading">Delete Product</h3>
            <p className="modal-desc font-body">Are you sure you want to delete this timepiece? This action cannot be undone.</p>
            
            <div className="modal-actions-row">
              <button onClick={handleConfirmDelete} className="btn-primary modal-btn" style={{ backgroundColor: '#EF4444' }}>
                DELETE
              </button>
              <button onClick={() => setDeletingProductId(null)} className="btn-secondary modal-btn">
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- BULK DELETE CONFIRM MODAL --- */}
      {bulkDeleteTarget && (
        <div className="modal-overlay">
          <div className="modal-card animate-fade-in" style={{ maxWidth: '400px', padding: '24px' }}>
            <h3 className="font-heading" style={{ color: '#B91C1C', marginTop: 0 }}>Confirm Deletion</h3>
            <p className="font-body" style={{ margin: '16px 0', lineHeight: '1.5' }}>
              Are you sure you want to delete {bulkDeleteTarget.countOption === 'ALL' ? 'ALL' : `the first ${bulkDeleteTarget.items.length}`} products?
              <br /><br />
              <strong>This action cannot be undone.</strong>
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button 
                onClick={() => setBulkDeleteTarget(null)} 
                className="btn-secondary font-body"
                style={{ padding: '8px 16px' }}
              >
                Cancel
              </button>
              <button 
                onClick={confirmInitialDelete} 
                className="btn-primary font-body"
                style={{ padding: '8px 16px', background: '#B91C1C', borderColor: '#B91C1C' }}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- BULK DELETE RETRY MODAL --- */}
      {failedIds.length > 0 && (
        <div className="modal-overlay">
          <div className="modal-card animate-fade-in" style={{ maxWidth: '450px', padding: '24px' }}>
            <h3 className="font-heading" style={{ color: '#F59E0B', marginTop: 0 }}>Incomplete Deletion</h3>
            <p className="font-body" style={{ margin: '16px 0', lineHeight: '1.5' }}>
              <strong>{successCountTracker}</strong> products deleted successfully.<br />
              <strong style={{ color: '#B91C1C' }}>{failedIds.length}</strong> products failed to delete.
            </p>
            <p className="font-body" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              This usually happens due to network timeouts or rate limits. Do you want to retry deleting the {failedIds.length} failed products?
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button 
                onClick={cancelRetryDelete} 
                className="btn-secondary font-body"
                style={{ padding: '8px 16px' }}
              >
                Skip Retry
              </button>
              <button 
                onClick={confirmRetryDelete} 
                className="btn-primary font-body"
                style={{ padding: '8px 16px', background: '#F59E0B', borderColor: '#F59E0B', color: 'black' }}
              >
                Retry Failed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- CROP MODAL OVERLAY --- */}
      {showCropModal && (
        <div className="modal-overlay">
          <div className="modal-card animate-fade-in" style={{ maxWidth: '800px', width: '95%' }}>
            <button 
              className="modal-close-btn" 
              onClick={() => {
                setShowCropModal(false);
                setCropTargetIndex(null);
                setCropImageSrc('');
              }}
              aria-label="Close"
            >
              ✕
            </button>
            <h3 className="modal-title font-heading">Crop Product Image</h3>
            <p className="modal-desc font-body" style={{ marginBottom: '16px' }}>
              Drag the crop selection box to move it, or drag its corner handles to resize. The live preview on the right shows exactly what will be saved.
            </p>

            <div className="cropper-workspace">
              {/* Left Column: Draggable Image Crop Area */}
              <div className="cropper-panel">
                <span className="cropper-label font-body">ORIGINAL IMAGE & CROP AREA</span>
                <div 
                  className="crop-container" 
                  style={{
                    position: 'relative',
                    display: 'inline-block',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.02)',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    maxWidth: '100%'
                  }}
                >
                  <img 
                    ref={cropImageRef}
                    src={cropImageSrc} 
                    alt="To Crop" 
                    crossOrigin="anonymous"
                    onLoad={handleImageLoad}
                    style={{
                      display: 'block',
                      maxWidth: '100%',
                      maxHeight: '380px',
                      objectFit: 'contain',
                      pointerEvents: 'none',
                      userSelect: 'none',
                      WebkitUserSelect: 'none'
                    }}
                  />
                  {imgDimensions.width > 0 && (
                    <>
                      {/* Dark Overlays Outside Crop Area */}
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: cropBox.y, backgroundColor: 'rgba(0,0,0,0.5)', pointerEvents: 'none' }} />
                      <div style={{ position: 'absolute', top: cropBox.y + cropBox.size, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', pointerEvents: 'none' }} />
                      <div style={{ position: 'absolute', top: cropBox.y, left: 0, width: cropBox.x, height: cropBox.size, backgroundColor: 'rgba(0,0,0,0.5)', pointerEvents: 'none' }} />
                      <div style={{ position: 'absolute', top: cropBox.y, left: cropBox.x + cropBox.size, right: 0, height: cropBox.size, backgroundColor: 'rgba(0,0,0,0.5)', pointerEvents: 'none' }} />

                      {/* Draggable Crop Selection Box */}
                      <div 
                        className="crop-box" 
                        style={{
                          position: 'absolute',
                          left: cropBox.x,
                          top: cropBox.y,
                          width: cropBox.size,
                          height: cropBox.size,
                          border: '2px dashed #3B82F6',
                          cursor: 'move',
                          boxSizing: 'border-box'
                        }}
                        onMouseDown={(e) => handleStartAction(e, 'dragging')}
                        onTouchStart={(e) => handleStartAction(e, 'dragging')}
                      >
                        {/* Interactive Corner Resize Handles */}
                        <div className="crop-handle nw" style={{ position: 'absolute', width: '12px', height: '12px', backgroundColor: '#FFFFFF', border: '2px solid #3B82F6', borderRadius: '50%', cursor: 'nwse-resize', top: '-6px', left: '-6px', zIndex: 10, boxSizing: 'border-box' }} onMouseDown={(e) => { e.stopPropagation(); handleStartAction(e, 'resizing-nw'); }} onTouchStart={(e) => { e.stopPropagation(); handleStartAction(e, 'resizing-nw'); }} />
                        <div className="crop-handle ne" style={{ position: 'absolute', width: '12px', height: '12px', backgroundColor: '#FFFFFF', border: '2px solid #3B82F6', borderRadius: '50%', cursor: 'nesw-resize', top: '-6px', right: '-6px', zIndex: 10, boxSizing: 'border-box' }} onMouseDown={(e) => { e.stopPropagation(); handleStartAction(e, 'resizing-ne'); }} onTouchStart={(e) => { e.stopPropagation(); handleStartAction(e, 'resizing-ne'); }} />
                        <div className="crop-handle sw" style={{ position: 'absolute', width: '12px', height: '12px', backgroundColor: '#FFFFFF', border: '2px solid #3B82F6', borderRadius: '50%', cursor: 'nesw-resize', bottom: '-6px', left: '-6px', zIndex: 10, boxSizing: 'border-box' }} onMouseDown={(e) => { e.stopPropagation(); handleStartAction(e, 'resizing-sw'); }} onTouchStart={(e) => { e.stopPropagation(); handleStartAction(e, 'resizing-sw'); }} />
                        <div className="crop-handle se" style={{ position: 'absolute', width: '12px', height: '12px', backgroundColor: '#FFFFFF', border: '2px solid #3B82F6', borderRadius: '50%', cursor: 'nwse-resize', bottom: '-6px', right: '-6px', zIndex: 10, boxSizing: 'border-box' }} onMouseDown={(e) => { e.stopPropagation(); handleStartAction(e, 'resizing-se'); }} onTouchStart={(e) => { e.stopPropagation(); handleStartAction(e, 'resizing-se'); }} />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Right Column: Live Cropped Preview */}
              <div className="cropper-panel">
                <span className="cropper-label font-body">LIVE CROPPED PREVIEW</span>
                <div className="canvas-container preview-container">
                  <canvas
                    ref={previewCanvasRef}
                    width={300}
                    height={300}
                    className="preview-canvas"
                  />
                </div>
              </div>
            </div>

            <div className="modal-actions-row" style={{ marginTop: '24px' }}>
              <button onClick={handleSaveCrop} className="btn-primary modal-btn">
                Apply & Save Crop
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCropModal(false);
                  setCropTargetIndex(null);
                  setCropImageSrc('');
                }}
                className="btn-secondary modal-btn"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        /* ── Delete Modal Styles ── */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background-color: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(4px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .modal-close-btn {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 32px;
          height: 32px;
          border: none;
          background: #F1F5F9;
          color: #64748B;
          border-radius: 50%;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .modal-close-btn:hover {
          background: #E2E8F0;
          color: #0F172A;
        }
        .modal-card {
          background-color: #ffffff;
          border-radius: 12px;
          padding: 32px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          position: relative;
        }

        .admin-products-root {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .products-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .stats-indicator {
          font-size: 13px;
          color: var(--text-muted);
          margin-top: 4px;
        }

        /* Control cards style */
        .table-controls-card {
          background-color: #ffffff;
          border-radius: 4px;
          border: 1px solid var(--border-color);
          padding: 20px;
          box-shadow: var(--card-shadow);
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .search-control-wrapper {
          width: 100%;
        }

        .search-catalogue-input {
          height: 40px;
          font-size: 13px;
        }

        .filters-tabs-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }

        .status-tabs-group {
          display: flex;
          gap: 4px;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 2px;
        }

        .tab-btn {
          height: 32px;
          padding: 0 16px;
          font-size: 11px;
          color: var(--text-muted);
        }

        .tab-btn:hover {
          color: var(--text-primary);
        }

        .active-tab {
          color: var(--accent-blue) !important;
          border-bottom: 2px solid var(--accent-blue);
          font-weight: 700;
        }


        /* Table Design */
        .table-container-card {
          background-color: #ffffff;
          border-radius: 4px;
          border: 1px solid var(--border-color);
          box-shadow: var(--card-shadow);
          overflow-x: auto;
        }

        .empty-table-state {
          text-align: center;
          padding: 60px 20px;
          color: var(--text-muted);
        }

        .admin-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 13px;
        }

        .admin-table th {
          background-color: #F8FAFC;
          color: var(--text-secondary);
          padding: 16px;
          font-weight: 600;
          border-bottom: 1px solid var(--border-color);
          text-transform: uppercase;
          font-size: 10px;
          letter-spacing: 0.08em;
          user-select: none;
        }

        .sortable-header {
          cursor: pointer;
        }

        .sortable-header:hover {
          background-color: #F1F5F9;
        }

        .admin-table td {
          padding: 16px;
          border-bottom: 1px solid var(--border-color);
          color: var(--text-secondary);
          vertical-align: middle;
        }

        .admin-table tr:last-child td {
          border-bottom: none;
        }

        .table-thumb-wrapper {
          width: 44px;
          height: 44px;
          border-radius: 4px;
          overflow: hidden;
          background-color: #F0F2F5;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .table-thumbnail-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .category-tag-cell {
          font-size: 10px;
          font-weight: 600;
          color: var(--text-secondary);
          background-color: var(--page-bg);
          padding: 4px 8px;
        }

        .table-price-stack {
          display: flex;
          flex-direction: column;
        }

        .strikethrough-cell {
          font-size: 11px;
          color: var(--text-muted);
          text-decoration: line-through;
        }

        /* Status toggle custom switch button */
        .status-toggle-switch {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          background: #E2E8F0;
          border-radius: 12px;
          padding: 4px 10px;
          height: 24px;
          transition: background 0.3s;
        }

        .live-switch {
          background-color: #D1FAE5;
          color: #065F46;
        }

        .hidden-switch {
          background-color: #F1F5F9;
          color: #475569;
        }

        .toggle-slider {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: currentColor;
        }

        .toggle-label-text {
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.05em;
        }

        /* Action buttons */
        .table-actions-row {
          display: flex;
          gap: 12px;
        }

        .action-icon-btn {
          width: 28px;
          height: 28px;
          border-radius: 4px;
          border: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          background-color: #ffffff;
        }

        .action-icon-btn:hover {
          background-color: var(--page-bg);
        }

        .delete-btn:hover {
          border-color: #FCA5A5;
          background-color: #FEF2F2;
        }

        /* Pagination bar */
        .pagination-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background-color: #F8FAFC;
          border-top: 1px solid var(--border-color);
        }

        .pagination-btn {
          height: 32px;
          padding: 0 16px;
          font-size: 12px;
          border: 1px solid var(--border-color);
          background-color: #ffffff;
          border-radius: 2px;
          color: var(--text-secondary);
        }

        .pagination-btn:hover:not(:disabled) {
          background-color: var(--page-bg);
        }

        .pagination-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .pagination-info {
          font-size: 12px;
          color: var(--text-secondary);
        }

        /* Toast notification */
        .toast-notification {
          position: fixed;
          bottom: 24px;
          right: 24px;
          background-color: #1E293B;
          color: #ffffff;
          padding: 12px 24px;
          border-radius: 4px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 3000;
          font-size: 13px;
          animation: fadeIn 0.2s ease;
        }

        /* Edit Modal adjustments */
        .edit-product-modal {
          max-width: 680px !important;
          text-align: left;
        }

        .edit-product-form {
          margin-top: 20px;
        }

        .form-grid-2col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .form-grid-3col {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 16px;
        }

        @media (max-width: 600px) {
          .form-grid-2col, .form-grid-3col {
            grid-template-columns: 1fr;
            gap: 0;
          }
        }

        .form-checkboxes-row {
          display: flex;
          gap: 24px;
          margin: 12px 0;
        }

        .checkbox-container {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: var(--text-secondary);
          cursor: pointer;
        }

        .checkbox-container input {
          width: 16px;
          height: 16px;
          accent-color: var(--accent-blue);
        }

        /* Gallery Row */
        .modal-gallery-row {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 8px;
        }

        .modal-gallery-thumb {
          width: 60px;
          height: 60px;
          border-radius: 4px;
          border: 1px solid var(--border-color);
          position: relative;
          background-color: #F0F2F5;
        }

        .modal-gallery-thumb img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .remove-thumb-x {
          position: absolute;
          top: -6px;
          right: -6px;
          width: 16px;
          height: 16px;
          background-color: #EF4444;
          color: #ffffff;
          font-size: 11px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
        }

        .edit-thumb-pencil {
          position: absolute;
          bottom: -6px;
          right: -6px;
          width: 20px;
          height: 20px;
          background-color: #3B82F6;
          color: #ffffff;
          font-size: 9px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
          transition: transform 0.2s ease, background-color 0.2s ease;
        }

        .edit-thumb-pencil:hover {
          background-color: #2563EB;
          transform: scale(1.1);
        }

        .modal-add-thumb-btn {
          width: 60px;
          height: 60px;
          border: 1.5px dashed var(--border-color);
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--text-muted);
          font-size: 11px;
          background-color: #F8FAFC;
        }

        .modal-add-thumb-btn:hover {
          border-color: var(--accent-blue);
          color: var(--text-primary);
        }

        @media (max-width: 768px) {
          .products-header-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }
          .products-header-row button {
            width: 100%;
          }
          .filters-tabs-row {
            flex-direction: column;
            align-items: flex-start;
          }
          .status-tabs-group {
            width: 100%;
            overflow-x: auto;
            padding-bottom: 8px;
          }
          .search-control-wrapper {
            width: 100%;
          }
          .search-catalogue-input {
            width: 100%;
          }
          .table-container-card {
            overflow-x: auto;
          }
          .admin-table {
            white-space: nowrap;
          }
          .admin-table th, .admin-table td {
            padding: 12px 16px;
          }
          .pagination-bar {
            flex-direction: column;
            gap: 16px;
            align-items: flex-start;
          }
          .modal-card {
            width: 95vw;
            padding: 20px;
          }
        }

        /* ── Image Cropper Modal ── */
        .cropper-workspace {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-bottom: 24px;
        }

        @media (max-width: 640px) {
          .cropper-workspace {
            grid-template-columns: 1fr;
          }
        }

        .cropper-panel {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .cropper-label {
          font-size: 10px;
          font-weight: 700;
          color: var(--text-muted);
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .canvas-container {
          background-color: #F8FAFC;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          padding: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.02);
        }

        .crop-container {
          position: relative;
          display: inline-block;
          max-width: 100%;
        }

        .crop-box {
          position: absolute;
          border: 2px dashed #3B82F6;
          cursor: move;
          box-sizing: border-box;
        }

        .crop-handle {
          position: absolute;
          width: 12px;
          height: 12px;
          background-color: #FFFFFF;
          border: 2px solid #3B82F6;
          border-radius: 50%;
          z-index: 10;
          box-sizing: border-box;
          transition: transform 0.1s ease;
        }

        .crop-handle:hover {
          transform: scale(1.3);
        }

        .preview-canvas {
          max-width: 100%;
          height: auto;
          background: #FFF;
          border-radius: 4px;
          box-shadow: 0 4px 10px rgba(0,0,0,0.05);
        }
      `}</style>
    </div>
  );
};

export default AdminProducts;
