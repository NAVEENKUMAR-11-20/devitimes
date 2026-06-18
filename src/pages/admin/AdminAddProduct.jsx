import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createProduct, createRetailProduct } from '../../lib/productsService';
import { useApp } from '../../context/AppContext';

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
  const { refreshProducts } = useApp();
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
  const [productPrice, setProductPrice] = useState('');
  const [productType, setProductType] = useState('wholesale');
  const [packageNo, setPackageNo] = useState('');
  const [stockNumber, setStockNumber] = useState('');
  const [isLive, setIsLive] = useState(true);
  const [images, setImages] = useState([]); // array of { url: string, file: File }

  // Common sizes helper list
  const sizeOptions = [
    '200 × 200 MM',
    '250 × 250 MM',
    '300 × 300 MM',
    '350 × 350 MM',
    '400 × 400 MM',
    'Custom'
  ];

  // Upload trigger — store both preview URL and original File
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
      }));
      setImages(prev => [...prev, ...newEntries]);
    } catch (err) {
      console.error('Error adding images', err);
    } finally {
      setCompressing(false);
    }
  };

  const removeImage = (indexToRemove) => {
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
    setModelNumber('');
    setSizeType('300 × 300 MM');
    setCustomSize('');
    setProductPrice('');
    setProductType('wholesale');
    setPackageNo('');
    setStockNumber('');
    setIsLive(true);
    setImages([]);
    setErrors({});
    setIsSuccess(false);
  };

  // Validate form fields — returns true if valid, sets errors otherwise
  const validateForm = () => {
    setErrors({});
    const newErrors = {};
    if (!modelNumber.trim()) newErrors.modelNumber = 'Model number is required.';
    const finalSize = sizeType === 'Custom' ? customSize.trim() : sizeType;
    if (!finalSize) newErrors.size = 'Product size is required.';
    if (!productPrice) newErrors.productPrice = 'Product price is required.';
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
      if (images.length === 1) {
        imageFilePayload = images[0].file;
      } else if (images.length > 1) {
        const base64List = await Promise.all(images.map(img => compressImage(img.file)));
        const jsonString = JSON.stringify(base64List);
        imageFilePayload = new File([jsonString], 'gallery.json', { type: 'application/json' });
      }

      if (productType === 'retail') {
        await createRetailProduct({
          model_no:         modelNumber.trim(),
          size:             finalSize,
          package_no:       packageNo.trim(),
          price_for_retail: Number(productPrice),
          images:           imageFilePayload,
        });
      } else {
        await createProduct({
          MODEL_NUMBER:    modelNumber.trim(),
          SIZE_DIMENSIONS: finalSize,
          package_no:      packageNo.trim(),
          price:           Number(productPrice),
          stock_Number:    stockNumber.trim(),
          product_type:    productType,
          is_live:         finalIsLive,
          imageFile:       imageFilePayload,
        });
      }

      // Refresh global products state immediately
      await refreshProducts();

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
      showToast('❌ Failed to add product. Please try again.', 'error');
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
              <p className="panel-subtext font-body">Large images are compressed automatically up to 800×800px to conserve browser memory.</p>

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
                  {compressing ? 'Compressing images...' : 'Click to upload images or drag & drop'}
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
                        </div>

                        {/* Reordering and removal toolbar */}
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
                            className="toolbar-btn remove-image-x-btn" 
                            onClick={() => removeImage(idx)}
                            title="Delete Image"
                          >
                            &times;
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

              {/* Product Price */}
              <div className="form-group">
                <label className="form-label">PRODUCT PRICE *</label>
                <input 
                  type="number" 
                  className={`form-input ${errors.productPrice ? 'input-error-state' : ''}`}
                  placeholder="e.g. ₹1500"
                  value={productPrice}
                  onChange={(e) => setProductPrice(e.target.value)}
                />
                {errors.productPrice && <span className="inline-error-msg font-body">{errors.productPrice}</span>}
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

              {/* Stock Number */}
              <div className="form-group">
                <label className="form-label">STOCK NUMBER</label>
                <input 
                  type="text" 
                  className="form-input"
                  placeholder="e.g. 50"
                  value={stockNumber}
                  onChange={(e) => setStockNumber(e.target.value)}
                />
              </div>

              {/* Product Type */}
              <div className="form-group">
                <label className="form-label">PRODUCT TYPE</label>
                <select 
                  className="form-input"
                  value={productType}
                  onChange={(e) => setProductType(e.target.value)}
                >
                  <option value="wholesale">Wholesale</option>
                  <option value="retail">Retail</option>
                </select>
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
