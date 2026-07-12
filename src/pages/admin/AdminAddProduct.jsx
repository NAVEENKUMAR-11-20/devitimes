import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createProduct } from '../../lib/productsService';
import { useApp } from '../../context/AppContext';
import Cropper from 'cropperjs';
import 'cropperjs/dist/cropper.css';

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

const AdminAddProduct = () => {
  const navigate = useNavigate();
  const { refreshProducts, settings, updateSettings, saveSettingsToPB } = useApp();
  // PocketBase: no context needed — save directly
  const [isSaving, setIsSaving] = useState(false);

  // Success state indicators
  const [isSuccess, setIsSuccess] = useState(false);
  const [successProductName, setSuccessProductName] = useState('');
  
  // Validation errors
  const [errors, setErrors] = useState({});

  // Confirmation modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  // Pending draft flag (set when Save as Draft triggers confirm)
  const [pendingForceDraft, setPendingForceDraft] = useState(false);

  // Toast notification
  const [toastMsg, setToastMsg] = useState({ text: '', type: '' }); // type: 'success' | 'error'
  const showToast = (text, type = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg({ text: '', type: '' }), 3000);
  };

  // Image loading indicators
  const [compressing, setCompressing] = useState(false);

  // Form Fields State
  const [modelNumber, setModelNumber] = useState('');
  const [sizeType, setSizeType] = useState('300 × 300 MM');
  const [customSize, setCustomSize] = useState('');
  const [wholesalePrice, setWholesalePrice] = useState('');
  const [retailPrice, setRetailPrice] = useState('');
  const [packageNo, setPackageNo] = useState('');
  const [isLive, setIsLive] = useState(true);
  const [stockCount, setStockCount] = useState(20);
  const [images, setImages] = useState([]); // array of { url: string, file: File, originalFile: File, cropData: Object | null }

  // Crop modal state
  const [showCropModal, setShowCropModal] = useState(false);
  const [activeCropIdx, setActiveCropIdx] = useState(null);
  const [cropAspect, setCropAspect] = useState('free'); // 'free' | 'original' | number
  const [cropImageUrl, setCropImageUrl] = useState('');
  const cropperInstanceRef = useRef(null);
  const cropperImgRef = useRef(null);

  // Common sizes helper list
  const sizeOptions = [
    '200 × 200 MM',
    '250 × 250 MM',
    '300 × 300 MM',
    '350 × 350 MM',
    '400 × 400 MM',
    'Custom'
  ];

  // Upload trigger — store preview URL, current file, original File, and cropData
  const handleImageFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    if (images.length + files.length > 10) {
      alert('You can upload a maximum of 10 images.');
      return;
    }

    setCompressing(true);
    try {
      const newEntries = files.map(file => ({
        url: URL.createObjectURL(file),
        file,
        originalFile: file,
        cropData: null
      }));
      setImages(prev => [...prev, ...newEntries]);
    } catch (err) {
      console.error('Error adding images', err);
    } finally {
      setCompressing(false);
    }
  };

  const removeImage = (indexToRemove) => {
    const imgToRemove = images[indexToRemove];
    if (imgToRemove && imgToRemove.url) {
      URL.revokeObjectURL(imgToRemove.url);
    }
    setImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Move images position (reordering)
  const moveImage = (index, direction) => {
    const newIdx = index + direction;
    if (newIdx < 0 || newIdx >= images.length) return;

    setImages(prev => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[newIdx];
      updated[newIdx] = temp;
      return updated;
    });
  };

  // Reset form to add another product
  const handleResetForm = () => {
    images.forEach(img => {
      if (img.url) URL.revokeObjectURL(img.url);
    });
    setModelNumber('');
    setSizeType('300 × 300 MM');
    setCustomSize('');
    setWholesalePrice('');
    setRetailPrice('');
    setPackageNo('');
    setIsLive(true);
    setStockCount(20);
    setImages([]);
    setErrors({});
    setIsSuccess(false);
  };

  // Crop event handlers and hooks
  const handleEditClick = (idx) => {
    const img = images[idx];
    if (!img) return;
    const url = URL.createObjectURL(img.originalFile);
    setCropImageUrl(url);
    setActiveCropIdx(idx);
    setCropAspect('free');
    setShowCropModal(true);
  };

  const handleCloseCropModal = () => {
    setShowCropModal(false);
    setActiveCropIdx(null);
    if (cropImageUrl) {
      URL.revokeObjectURL(cropImageUrl);
      setCropImageUrl('');
    }
  };

  const setCropperAspect = (aspectType) => {
    setCropAspect(aspectType);
    if (!cropperInstanceRef.current) return;
    const cropper = cropperInstanceRef.current;
    if (aspectType === 'free') {
      cropper.setAspectRatio(NaN);
    } else if (aspectType === 'original') {
      const imageData = cropper.getImageData();
      cropper.setAspectRatio(imageData.naturalWidth / imageData.naturalHeight);
    } else {
      cropper.setAspectRatio(aspectType);
    }
  };

  const handleResetCrop = () => {
    if (!cropperInstanceRef.current) return;
    cropperInstanceRef.current.reset();
    setCropAspect('free');
  };

  const handleSaveCrop = () => {
    if (!cropperInstanceRef.current || activeCropIdx === null) return;
    const cropper = cropperInstanceRef.current;
    const activeImg = images[activeCropIdx];

    const croppedCanvas = cropper.getCroppedCanvas({
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high'
    });

    if (!croppedCanvas) {
      alert('Could not crop image.');
      return;
    }

    const mimeType = activeImg.originalFile.type || 'image/jpeg';
    
    croppedCanvas.toBlob((blob) => {
      if (!blob) {
        alert('Could not export cropped image.');
        return;
      }
      
      const croppedFile = new File([blob], activeImg.originalFile.name, { type: mimeType });
      const croppedUrl = URL.createObjectURL(croppedFile);

      // Clean up previous URL to avoid memory leak
      if (activeImg.url) {
        URL.revokeObjectURL(activeImg.url);
      }

      setImages(prev => prev.map((img, idx) => {
        if (idx === activeCropIdx) {
          return {
            ...img,
            url: croppedUrl,
            file: croppedFile,
            cropData: cropper.getData()
          };
        }
        return img;
      }));

      handleCloseCropModal();
    }, mimeType, 1.0); // 1.0 maximum quality
  };

  useEffect(() => {
    if (showCropModal && activeCropIdx !== null && cropperImgRef.current && cropImageUrl) {
      const activeImg = images[activeCropIdx];
      if (!activeImg) return;

      const imageElement = cropperImgRef.current;
      const cropper = new Cropper(imageElement, {
        viewMode: 1,
        dragMode: 'move',
        autoCropArea: 1,
        restore: false,
        modal: true,
        guides: true,
        highlight: true,
        cropBoxMovable: true,
        cropBoxResizable: true,
        toggleDragModeOnDblclick: false,
        ready() {
          if (activeImg.cropData) {
            cropper.setData(activeImg.cropData);
          }
        }
      });

      cropperInstanceRef.current = cropper;

      return () => {
        if (cropperInstanceRef.current) {
          cropperInstanceRef.current.destroy();
          cropperInstanceRef.current = null;
        }
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCropModal, activeCropIdx, cropImageUrl]);

  // Validate form fields — returns true if valid, sets errors otherwise
  const validateForm = () => {
    setErrors({});
    const newErrors = {};
    if (!modelNumber.trim()) newErrors.modelNumber = 'Model number is required.';
    const finalSize = sizeType === 'Custom' ? customSize.trim() : sizeType;
    if (!finalSize) newErrors.size = 'Product size is required.';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return false;
    }
    return true;
  };

  // Called when SAVE PRODUCT is clicked — validate then show confirm modal
  const handleSaveClick = (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setPendingForceDraft(false);
    setShowConfirmModal(true);
  };

  // Called when SAVE AS DRAFT is clicked — validate then save directly (no confirm)
  const handleDraftClick = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    await doSave(true);
  };

  // Actual save to PocketBase
  const doSave = async (forceDraft = false) => {
    const finalSize = sizeType === 'Custom' ? customSize.trim() : sizeType;
    const finalIsLive = forceDraft ? false : isLive;
    setIsSaving(true);
    try {
      let imageFilePayload = null;
      let imageFilesPayload = null;
      if (images.length === 1) {
        imageFilePayload = images[0].file;
      } else if (images.length > 1) {
        imageFilesPayload = images.map(img => img.file);
      }

      await createProduct({
        MODEL_NO:        String(modelNumber || '').trim(),
        SIZE_DM:         String(finalSize || '').trim(),
        PACKAGE_NO:      packageNo.trim(),
        WHOLESALE_PRICE: Number(wholesalePrice),
        RETAIL_PRICE:    Number(retailPrice),
        PRODUCT_TYPE:    'wholesale',
        STATUS:          finalIsLive ? 'live' : 'hidden',
        is_live:         finalIsLive,
        imageFile:       imageFilePayload,
        imageFiles:      imageFilesPayload,
        STOCK:           Number(stockCount),
      });

      // Refresh global products state immediately
      await refreshProducts(true);

      setSuccessProductName(modelNumber.trim());
      setShowConfirmModal(false);
      showToast('✅ Product added successfully.');
      setTimeout(() => {
        setIsSuccess(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 800);
    } catch (err) {
      console.error('[PB] createProduct error:', err);
      setShowConfirmModal(false);
      const errMsg = err?.response?.message || err?.message || 'Failed to add product.';
      if (err?.status === 403 || errMsg.toLowerCase().includes('permission') || errMsg.toLowerCase().includes('superuser') || errMsg.toLowerCase().includes('admin')) {
        showToast('❌ Permission Error: Superuser/Admin authentication required.', 'error');
        alert('Permission Error: You are not authenticated as a PocketBase superuser/admin to add products.');
      } else {
        showToast(`❌ Add failed: ${errMsg}`, 'error');
        alert(`Add failed: ${errMsg}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="admin-add-root font-body">

      {/* Toast Notification */}
      {toastMsg.text && (
        <div className={`ap-toast ap-toast--${toastMsg.type}`}>
          {toastMsg.text}
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="confirm-modal-overlay" onClick={() => !isSaving && setShowConfirmModal(false)}>
          <div className="confirm-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-modal-icon">📦</div>
            <h2 className="confirm-modal-title font-heading">Confirm Product Upload</h2>
            <p className="confirm-modal-msg font-body">Are you sure you want to add this product?</p>
            <div className="confirm-modal-actions">
              <button
                className="btn-primary confirm-modal-yes"
                onClick={() => doSave(false)}
                disabled={isSaving}
              >
                {isSaving ? (
                  <><span className="confirm-spinner"></span> Saving...</>
                ) : 'Yes, Add Product'}
              </button>
              <button
                className="btn-secondary confirm-modal-cancel"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSaving}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Crop & Edit Modal */}
      {showCropModal && cropImageUrl && (
        <div className="crop-modal-overlay">
          <div className="crop-modal-box">
            
            <div className="crop-modal-header">
              <h2 className="crop-modal-title font-heading">Edit Product Image</h2>
              <button type="button" className="crop-modal-close-x" onClick={handleCloseCropModal}>&times;</button>
            </div>

            <div className="crop-modal-content">
              <div className="crop-cropper-container">
                <img 
                  ref={cropperImgRef} 
                  src={cropImageUrl} 
                  alt="Source image to crop" 
                />
              </div>
            </div>

            <div className="crop-controls-panel">
              {/* Aspect Ratio Toolbar */}
              <div className="crop-aspect-row">
                <button 
                  type="button" 
                  className={`crop-aspect-btn ${cropAspect === 'free' ? 'active' : ''}`} 
                  onClick={() => setCropperAspect('free')}
                >
                  Free Crop
                </button>
                <button 
                  type="button" 
                  className={`crop-aspect-btn ${cropAspect === 'original' ? 'active' : ''}`} 
                  onClick={() => setCropperAspect('original')}
                >
                  Original
                </button>
                <button 
                  type="button" 
                  className={`crop-aspect-btn ${cropAspect === 1 ? 'active' : ''}`} 
                  onClick={() => setCropperAspect(1)}
                >
                  1:1
                </button>
                <button 
                  type="button" 
                  className={`crop-aspect-btn ${cropAspect === 4/3 ? 'active' : ''}`} 
                  onClick={() => setCropperAspect(4/3)}
                >
                  4:3
                </button>
                <button 
                  type="button" 
                  className={`crop-aspect-btn ${cropAspect === 3/4 ? 'active' : ''}`} 
                  onClick={() => setCropperAspect(3/4)}
                >
                  3:4
                </button>
                <button 
                  type="button" 
                  className={`crop-aspect-btn ${cropAspect === 16/9 ? 'active' : ''}`} 
                  onClick={() => setCropperAspect(16/9)}
                >
                  16:9
                </button>
              </div>

              {/* Manipulation / Action Buttons */}
              <div className="crop-actions-row">
                <div className="crop-tools-group">
                  <button 
                    type="button" 
                    className="crop-tool-btn" 
                    onClick={() => cropperInstanceRef.current?.zoom(0.1)} 
                    title="Zoom In"
                  >
                    ➕
                  </button>
                  <button 
                    type="button" 
                    className="crop-tool-btn" 
                    onClick={() => cropperInstanceRef.current?.zoom(-0.1)} 
                    title="Zoom Out"
                  >
                    ➖
                  </button>
                  <button 
                    type="button" 
                    className="crop-tool-btn" 
                    onClick={() => cropperInstanceRef.current?.rotate(-90)} 
                    title="Rotate Left"
                  >
                    ↺
                  </button>
                  <button 
                    type="button" 
                    className="crop-tool-btn" 
                    onClick={() => cropperInstanceRef.current?.rotate(90)} 
                    title="Rotate Right"
                  >
                    ↻
                  </button>
                  <button 
                    type="button" 
                    className="crop-aspect-btn" 
                    onClick={handleResetCrop}
                    style={{ marginLeft: '8px' }}
                  >
                    Reset
                  </button>
                </div>

                <div className="crop-submit-group">
                  <button 
                    type="button" 
                    className="crop-cancel-btn" 
                    onClick={handleCloseCropModal}
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    className="crop-save-btn" 
                    onClick={handleSaveCrop}
                  >
                    Save Crop
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}
      
      {/* 1. Success Screen View */}
      {isSuccess ? (
        <div className="success-banner-panel animate-fade-in">
          <div className="success-icon-badge">✓</div>
          <h2 className="font-heading" style={{ fontSize: '26px', color: 'var(--text-primary)', marginBottom: '8px' }}>
            Product Added Successfully!
          </h2>
          <p className="font-body" style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
            <strong>{successProductName}</strong> is now registered in your shop catalogue.
          </p>
          
          <div className="success-actions">
            <button onClick={handleResetForm} className="btn-primary success-btn">
              Add Another Product
            </button>
            <Link to="/admin/products" className="btn-secondary success-btn">
              View Product List
            </Link>
          </div>
        </div>
      ) : (
        /* 2. Main Form View */
        <div className="add-product-container">
          
          <div className="add-product-title-row">
            <h1 className="dashboard-heading font-heading">Add New Product</h1>
            <p className="stats-indicator font-body">Add a luxury timepiece manually. Fields marked with * are required.</p>
          </div>

          <form className="admin-form product-create-form" onSubmit={handleSaveClick}>
            
             {/* Left Block: Image Drag-n-Drop area */}
            <div className="form-card-panel">
              <h3 className="panel-heading font-heading">Product Images</h3>
              <p className="panel-subtext font-body">Upload high-resolution images. Crop and rotate images using the edit button on each thumbnail.</p>

              {/* Dash drop zone */}
              <input 
                type="file" 
                accept="image/*" 
                multiple 
                id="main-drag-file-picker" 
                style={{ display: 'none' }}
                onChange={handleImageFileChange}
              />
              
              <label htmlFor="main-drag-file-picker" className="drag-upload-zone">
                <span className="drag-icon">📤</span>
                <span className="drag-text font-body">
                  {compressing ? 'Loading images...' : 'Click to upload images or drag & drop'}
                </span>
                <span className="drag-helper font-body">Supports JPG, PNG, WEBP. Max 10 images.</span>
              </label>

              {/* Thumbnails row */}
              {images.length > 0 && (
                <div className="upload-previews-grid">
                  {images.map((img, idx) => {
                    const isCover = idx === 0;
                    
                    return (
                      <div key={idx} className="preview-thumb-card">
                        
                        <div className="preview-image-wrapper">
                          <img src={img.url} alt={`Preview ${idx + 1}`} />
                          {isCover && <span className="cover-label uppercase-label">Cover</span>}

                          {/* Red circular X button at top-right */}
                          <button
                            type="button"
                            className="thumb-badge-btn thumb-remove-btn"
                            onClick={() => removeImage(idx)}
                            title="Remove Image"
                          >
                            &times;
                          </button>

                          {/* Blue circular pencil/edit button at bottom-right */}
                          <button
                            type="button"
                            className="thumb-badge-btn thumb-edit-btn"
                            onClick={() => handleEditClick(idx)}
                            title="Edit / Crop Image"
                          >
                            ✏️
                          </button>
                        </div>

                        {/* Reordering toolbar */}
                        <div className="preview-toolbar">
                          <button 
                            type="button" 
                            className="toolbar-btn" 
                            disabled={idx === 0} 
                            onClick={() => moveImage(idx, -1)}
                            title="Move Left"
                          >
                            ◀
                          </button>
                          <button 
                            type="button" 
                            className="toolbar-btn" 
                            disabled={idx === images.length - 1} 
                            onClick={() => moveImage(idx, 1)}
                            title="Move Right"
                          >
                            ▶
                          </button>
                        </div>

                      </div>
                    );
                  })}

                  {/* Dashed "+ Add" box inside grid */}
                  {images.length < 10 && (
                    <label htmlFor="main-drag-file-picker" className="add-thumb-card">
                      <span className="add-thumb-icon">+</span>
                      <span className="add-thumb-text">Add</span>
                    </label>
                  )}
                </div>
              )}
            </div>

            {/* Right Block: Product Details fields */}
            <div className="form-card-panel" style={{ marginTop: '24px' }}>
              <h3 className="panel-heading font-heading">Product Details</h3>

              {/* Model Number */}
              <div className="form-group">
                <label className="form-label">MODEL NUMBER *</label>
                <input 
                  type="text" 
                  className={`form-input ${errors.modelNumber ? 'input-error-state' : ''}`}
                  placeholder="e.g. 1221"
                  value={modelNumber}
                  onChange={(e) => setModelNumber(e.target.value)}
                />
                {errors.modelNumber && <span className="inline-error-msg font-body">{errors.modelNumber}</span>}
              </div>

              {/* Size Selectors */}
              <div className="form-group">
                <label className="form-label">SIZE DIMENSIONS *</label>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <select 
                    className="form-input"
                    value={sizeType}
                    onChange={(e) => setSizeType(e.target.value)}
                    style={{ flex: 1 }}
                  >
                    {sizeOptions.map(sz => <option key={sz} value={sz}>{sz}</option>)}
                  </select>

                  {sizeType === 'Custom' && (
                    <input 
                      type="text" 
                      className={`form-input ${errors.size ? 'input-error-state' : ''}`}
                      placeholder="e.g. 300 × 300 MM"
                      value={customSize}
                      onChange={(e) => setCustomSize(e.target.value)}
                      style={{ flex: 1 }}
                    />
                  )}
                </div>
                {errors.size && <span className="inline-error-msg font-body">{errors.size}</span>}
              </div>

              {/* Wholesale Price */}
              <div className="form-group">
                <label className="form-label">WHOLESALE PRICE</label>
                <input 
                  type="number" 
                  className={`form-input ${errors.wholesalePrice ? 'input-error-state' : ''}`}
                  placeholder="e.g. ₹1500"
                  value={wholesalePrice}
                  onChange={(e) => setWholesalePrice(e.target.value)}
                />
                {errors.wholesalePrice && <span className="inline-error-msg font-body">{errors.wholesalePrice}</span>}
              </div>

              {/* Retail Price */}
              <div className="form-group">
                <label className="form-label">RETAIL PRICE</label>
                <input 
                  type="number" 
                  className={`form-input ${errors.retailPrice ? 'input-error-state' : ''}`}
                  placeholder="e.g. ₹2000"
                  value={retailPrice}
                  onChange={(e) => setRetailPrice(e.target.value)}
                />
                {errors.retailPrice && <span className="inline-error-msg font-body">{errors.retailPrice}</span>}
              </div>

              {/* Package No */}
              <div className="form-group">
                <label className="form-label">PACKAGE NO</label>
                <input 
                  type="text" 
                  className="form-input"
                  placeholder="e.g. PKG-01"
                  value={packageNo}
                  onChange={(e) => setPackageNo(e.target.value)}
                />
              </div>

              {/* Stock Quantity */}
              <div className="form-group">
                <label className="form-label">STOCK QUANTITY</label>
                <input 
                  type="number" 
                  className="form-input"
                  placeholder="e.g. 20"
                  value={stockCount}
                  onChange={(e) => setStockCount(e.target.value)}
                />
              </div>

              {/* Live Status Checkbox */}
              <div className="form-checkboxes-row font-body" style={{ marginTop: '16px' }}>
                <label className="checkbox-container">
                  <input 
                    type="checkbox" 
                    checked={isLive}
                    onChange={(e) => setIsLive(e.target.checked)}
                  />
                  <span>Make Product Live</span>
                </label>
              </div>

            </div>

            {/* Form Footer Action button block */}
            <div className="form-submit-row" style={{ marginTop: '32px' }}>
              <button type="submit" className="btn-primary form-action-submit-btn" disabled={isSaving}>
                SAVE PRODUCT
              </button>
              <button 
                type="button" 
                className="btn-secondary form-action-draft-btn"
                onClick={handleDraftClick}
                disabled={isSaving}
              >
                {isSaving ? 'SAVING...' : 'SAVE AS DRAFT'}
              </button>
              <Link to="/admin/products" className="form-cancel-link font-body">
                Cancel
              </Link>
            </div>

          </form>

        </div>
      )}

      <style>{`
        .admin-add-root {
          max-width: 800px;
          margin: 0 auto;
        }

        .add-product-title-row {
          margin-bottom: 24px;
        }

        .form-card-panel {
          background-color: #ffffff;
          border-radius: 4px;
          border: 1px solid var(--border-color);
          padding: 32px;
          box-shadow: var(--card-shadow);
        }

        .panel-heading {
          font-size: 18px;
          color: var(--text-primary);
          margin-bottom: 4px;
          font-weight: 700;
        }

        .panel-subtext {
          font-size: 12px;
          color: var(--text-muted);
          margin-bottom: 20px;
        }

        /* Drag upload box */
        .drag-upload-zone {
          border: 2px dashed var(--border-color);
          border-radius: 4px;
          padding: 36px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          background-color: #F8FAFC;
          transition: border-color var(--transition-speed);
        }

        .drag-upload-zone:hover {
          border-color: var(--accent-blue);
        }

        .drag-icon {
          font-size: 32px;
          margin-bottom: 12px;
        }

        .drag-text {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 4px;
          text-align: center;
        }

        .drag-helper {
          font-size: 11px;
          color: var(--text-muted);
        }

        /* Image gallery preview rows */
        .upload-previews-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
          gap: 16px;
          margin-top: 24px;
        }

        .preview-thumb-card {
          border: 1px solid var(--border-color);
          border-radius: 4px;
          overflow: hidden;
          background-color: #F0F2F5;
          display: flex;
          flex-direction: column;
        }

        .preview-image-wrapper {
          aspect-ratio: 1/1;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .preview-image-wrapper img {
          max-width: 90%;
          max-height: 90%;
          object-fit: contain;
        }

        .cover-label {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          background-color: var(--accent-blue);
          color: #ffffff;
          font-size: 8px;
          text-align: center;
          padding: 2px 0;
        }

        /* Thumb badges (Red circular remove & Blue circular edit) */
        .thumb-badge-btn {
          position: absolute;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          border: 1px solid #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.25);
          font-size: 11px;
          transition: transform 0.15s ease, background-color 0.15s ease;
          z-index: 10;
          padding: 0;
        }

        .thumb-badge-btn:hover {
          transform: scale(1.1);
        }

        .thumb-remove-btn {
          top: 4px;
          right: 4px;
          background-color: #ef4444;
          color: #ffffff;
          font-size: 14px;
          line-height: 1;
        }

        .thumb-remove-btn:hover {
          background-color: #dc2626;
        }

        .thumb-edit-btn {
          bottom: 4px;
          right: 4px;
          background-color: #3b82f6;
          color: #ffffff;
        }

        .thumb-edit-btn:hover {
          background-color: #2563eb;
        }

        /* Dashed + Add Card */
        .add-thumb-card {
          aspect-ratio: 1/1;
          border: 2px dashed var(--border-color);
          border-radius: 4px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          background-color: #F8FAFC;
          transition: border-color var(--transition-speed), background-color var(--transition-speed);
        }

        .add-thumb-card:hover {
          border-color: var(--accent-blue);
          background-color: #F1F5F9;
        }

        .add-thumb-icon {
          font-size: 20px;
          font-weight: bold;
          color: var(--text-secondary);
        }

        .add-thumb-text {
          font-size: 10px;
          color: var(--text-muted);
          margin-top: 2px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        /* ── Crop Modal ─────────────────────────────── */
        .crop-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.75);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9500;
          padding: 20px;
          animation: overlayFadeIn 0.18s ease;
        }

        .crop-modal-box {
          background: #ffffff;
          border-radius: 8px;
          width: 100%;
          max-width: 900px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          animation: modalScaleIn 0.2s cubic-bezier(0.34,1.56,0.64,1);
          overflow: hidden;
        }

        .crop-modal-header {
          padding: 16px 24px;
          border-bottom: 1px solid var(--border-color);
          display: flex;
          justify-content: space-between;
          align-items: center;
          background-color: #ffffff;
        }

        .crop-modal-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
        }

        .crop-modal-close-x {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: var(--text-muted);
        }

        .crop-modal-close-x:hover {
          color: var(--text-primary);
        }

        .crop-modal-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background-color: #000000;
          min-height: 300px;
        }

        .crop-cropper-container {
          flex: 1;
          max-height: 55vh;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .crop-cropper-container img {
          max-width: 100%;
          max-height: 100%;
          display: block;
        }

        .crop-controls-panel {
          background: #ffffff;
          border-top: 1px solid var(--border-color);
          padding: 16px 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .crop-aspect-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: center;
        }

        .crop-aspect-btn {
          border: 1px solid var(--border-color);
          background: #ffffff;
          padding: 6px 12px;
          font-size: 12px;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.15s ease;
          color: var(--text-secondary);
        }

        .crop-aspect-btn:hover {
          background-color: #f1f5f9;
          border-color: var(--text-muted);
        }

        .crop-aspect-btn.active {
          background-color: var(--accent-blue);
          color: #ffffff;
          border-color: var(--accent-blue);
        }

        .crop-actions-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }

        .crop-tools-group {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .crop-tool-btn {
          width: 36px;
          height: 36px;
          border: 1px solid var(--border-color);
          background: #ffffff;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s ease;
          font-size: 14px;
        }

        .crop-tool-btn:hover {
          background-color: #f1f5f9;
        }

        .crop-submit-group {
          display: flex;
          gap: 12px;
        }

        .crop-save-btn {
          background-color: var(--accent-blue);
          color: #ffffff;
          border: none;
          padding: 8px 20px;
          font-size: 13px;
          font-weight: 600;
          border-radius: 4px;
          cursor: pointer;
        }

        .crop-save-btn:hover {
          background-color: #2563eb;
        }

        .crop-cancel-btn {
          background-color: #ffffff;
          color: var(--text-secondary);
          border: 1px solid var(--border-color);
          padding: 8px 20px;
          font-size: 13px;
          font-weight: 600;
          border-radius: 4px;
          cursor: pointer;
        }

        .crop-cancel-btn:hover {
          background-color: #f1f5f9;
        }

        .preview-toolbar {
          display: flex;
          justify-content: space-between;
          background-color: #ffffff;
          border-top: 1px solid var(--border-color);
          padding: 4px;
        }

        .toolbar-btn {
          font-size: 10px;
          color: var(--text-muted);
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .toolbar-btn:hover:not(:disabled) {
          color: var(--text-primary);
          background-color: var(--page-bg);
        }

        .toolbar-btn:disabled {
          opacity: 0.2;
        }

        .remove-image-x-btn {
          color: #ef4444 !important;
          font-size: 12px;
        }

        /* Swatches helper layout */
        .swatches-helper-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 8px;
        }

        .swatch-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: 1px solid var(--border-color);
          border-radius: 2px;
          padding: 4px 8px;
          font-size: 11px;
          background-color: #ffffff;
          color: var(--text-secondary);
        }

        .swatch-btn:hover {
          background-color: var(--page-bg);
        }

        .swatch-circle {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          display: inline-block;
          border: 1px solid rgba(0,0,0,0.1);
        }

        /* Price fields row details */
        .form-grid-3col {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }

        @media (max-width: 768px) {
          .form-grid-3col {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          .radio-group {
            flex-direction: column;
            gap: 12px;
          }
          .admin-form {
            padding: 20px;
          }
          .crop-modal-content {
            flex-direction: column;
            overflow-y: auto;
          }
          .crop-preview-side {
            width: 100%;
          }
        }

        .help-subtext {
          font-size: 10px;
          color: var(--text-muted);
          margin-top: 4px;
          line-height: 1.3;
        }

        /* Checkbox styling */
        .checkbox-container {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          color: var(--text-primary);
          cursor: pointer;
        }

        .checkbox-container input {
          width: 18px;
          height: 18px;
          accent-color: var(--accent-blue);
        }

        /* Radio Buttons */
        .radio-group {
          display: flex;
          gap: 24px;
          margin-top: 4px;
        }

        .radio-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: var(--text-secondary);
          cursor: pointer;
        }

        .radio-label input {
          accent-color: var(--accent-blue);
        }

        /* Submission Action rows */
        .form-submit-row {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .form-action-submit-btn {
          height: 48px;
          flex-grow: 1;
        }

        .form-action-draft-btn {
          height: 48px;
          flex-grow: 1;
          border-color: var(--text-primary);
          color: var(--text-primary);
        }

        .form-action-draft-btn:hover {
          background-color: var(--text-primary);
          color: #ffffff;
        }

        .form-cancel-link {
          font-size: 13px;
          color: var(--text-muted);
          text-decoration: underline;
          padding: 0 16px;
        }

        .form-cancel-link:hover {
          color: var(--text-primary);
        }

        /* Input error states */
        .input-error-state {
          border-color: #EF4444 !important;
          background-color: #FFF5F5;
        }

        .inline-error-msg {
          font-size: 11px;
          color: #EF4444;
          margin-top: 4px;
        }

        /* Success page panels styling */
        .success-banner-panel {
          background-color: #ffffff;
          padding: 60px 40px;
          border-radius: 4px;
          border: 1px solid var(--border-color);
          box-shadow: var(--card-shadow);
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .success-actions {
          display: flex;
          gap: 16px;
          width: 100%;
          max-width: 440px;
        }

        .success-btn {
          flex: 1;
          height: 46px;
          font-size: 11px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        /* ── Confirm Modal ─────────────────────────────── */
        .confirm-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9000;
          padding: 20px;
          animation: overlayFadeIn 0.18s ease;
        }
        @keyframes overlayFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        .confirm-modal-box {
          background: #ffffff;
          border-radius: 8px;
          padding: 36px 32px 28px;
          width: 100%;
          max-width: 420px;
          text-align: center;
          box-shadow: 0 20px 60px rgba(0,0,0,0.18);
          animation: modalScaleIn 0.2s cubic-bezier(0.34,1.56,0.64,1);
        }
        @keyframes modalScaleIn {
          from { opacity: 0; transform: scale(0.88); }
          to   { opacity: 1; transform: scale(1); }
        }

        .confirm-modal-icon {
          font-size: 36px;
          margin-bottom: 14px;
        }

        .confirm-modal-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 8px;
        }

        .confirm-modal-msg {
          font-size: 14px;
          color: var(--text-secondary);
          margin-bottom: 28px;
          line-height: 1.5;
        }

        .confirm-modal-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
        }

        .confirm-modal-yes {
          flex: 1;
          height: 44px;
          font-size: 12px;
          max-width: 200px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .confirm-modal-cancel {
          flex: 1;
          height: 44px;
          font-size: 12px;
          max-width: 120px;
        }

        /* Spinner inside modal button */
        .confirm-spinner {
          display: inline-block;
          width: 13px;
          height: 13px;
          border: 2px solid rgba(255,255,255,0.4);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: confirmSpin 0.6s linear infinite;
          flex-shrink: 0;
        }
        @keyframes confirmSpin {
          to { transform: rotate(360deg); }
        }

        /* ── Toast Notification ────────────────────────── */
        .ap-toast {
          position: fixed;
          bottom: 28px;
          left: 50%;
          transform: translateX(-50%);
          padding: 12px 24px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          z-index: 9999;
          white-space: nowrap;
          box-shadow: 0 8px 24px rgba(0,0,0,0.14);
          animation: toastSlideUp 0.25s ease;
        }
        @keyframes toastSlideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(10px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .ap-toast--success {
          background: #1E293B;
          color: #ffffff;
        }
        .ap-toast--error {
          background: #DC2626;
          color: #ffffff;
        }

        @media (max-width: 480px) {
          .confirm-modal-box {
            padding: 28px 20px 22px;
          }
          .confirm-modal-actions {
            flex-direction: column;
          }
          .confirm-modal-yes,
          .confirm-modal-cancel {
            max-width: 100%;
          }
          .ap-toast {
            width: calc(100% - 32px);
            white-space: normal;
            text-align: center;
            bottom: 16px;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminAddProduct;
