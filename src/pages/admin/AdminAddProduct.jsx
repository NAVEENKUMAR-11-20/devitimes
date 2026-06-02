import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

// Canvas-based image compression helper as specified in the prompt
function compressImage(file, maxWidth = 800, quality = 0.75) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate aspect ratio resizing
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxWidth) {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Export to JPEG base64 string
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
}

const AdminAddProduct = () => {
  const { addProduct } = useApp();

  // Success state indicators
  const [isSuccess, setIsSuccess] = useState(false);
  const [successProductName, setSuccessProductName] = useState('');
  
  // Validation errors
  const [errors, setErrors] = useState({});

  // Image loading indicators
  const [compressing, setCompressing] = useState(false);

  // Form Fields State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Modern Minimalist');
  const [modelNumber, setModelNumber] = useState('');
  const [sizeType, setSizeType] = useState('300 × 300 MM');
  const [customSize, setCustomSize] = useState('');
  const [color, setColor] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [stockCount, setStockCount] = useState('');
  const [description, setDescription] = useState('');
  const [isOnSale, setIsOnSale] = useState(false);
  const [isLive, setIsLive] = useState(true); // default live
  const [images, setImages] = useState([]); // array of base64 strings

  // Swatch colors helper list
  const swatchOptions = [
    { label: 'Black', hex: '#000000' },
    { label: 'White', hex: '#FFFFFF' },
    { label: 'Navy Blue', hex: '#1E3A8A' },
    { label: 'Brushed Silver', hex: '#E2E8F0' },
    { label: 'Champagne Gold', hex: '#F59E0B' },
    { label: 'Bronze', hex: '#78350F' }
  ];

  // Common sizes helper list
  const sizeOptions = [
    '200 × 200 MM',
    '250 × 250 MM',
    '300 × 300 MM',
    '350 × 350 MM',
    '400 × 400 MM',
    'Custom'
  ];

  // Upload trigger
  const handleImageFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    if (images.length + files.length > 10) {
      alert('You can upload a maximum of 10 images.');
      return;
    }

    setCompressing(true);
    const compressedPromises = files.map(file => compressImage(file));
    
    try {
      const results = await Promise.all(compressedPromises);
      setImages(prev => [...prev, ...results]);
    } catch (err) {
      console.error('Error compressing images', err);
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
    setName('');
    setCategory('Modern Minimalist');
    setModelNumber('');
    setSizeType('300 × 300 MM');
    setCustomSize('');
    setColor('');
    setSalePrice('');
    setOriginalPrice('');
    setStockCount('');
    setDescription('');
    setIsOnSale(false);
    setIsLive(true);
    setImages([]);
    setErrors({});
    setIsSuccess(false);
  };

  // Submit product
  const handleSubmit = (e, forceDraft = false) => {
    e.preventDefault();
    setErrors({});

    const newErrors = {};

    // Validate inputs
    if (!name.trim()) newErrors.name = 'Product name is required.';
    if (!modelNumber.trim()) newErrors.modelNumber = 'Model number is required.';
    
    const finalSize = sizeType === 'Custom' ? customSize.trim() : sizeType;
    if (!finalSize) newErrors.size = 'Product size is required.';

    if (!color.trim()) newErrors.color = 'Product color finish is required.';
    if (!salePrice) newErrors.salePrice = 'Sale price is required.';
    if (!stockCount) newErrors.stockCount = 'Available pieces count is required.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Scroll to top of form
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const payload = {
      name: name.trim(),
      category,
      modelNumber: modelNumber.trim(),
      size: finalSize,
      color: color.trim(),
      salePrice: Number(salePrice),
      originalPrice: originalPrice ? Number(originalPrice) : null,
      isOnSale,
      stockCount: Number(stockCount),
      description: description.trim(),
      isLive: forceDraft ? false : isLive,
      images,
      source: "manual"
    };

    addProduct(payload);
    setSuccessProductName(name.trim());
    setIsSuccess(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="admin-add-root font-body">
      
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

          <form className="admin-form product-create-form" onSubmit={(e) => handleSubmit(e, false)}>
            
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
                          <img src={img} alt={`Preview ${idx + 1}`} />
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
              
              {/* Product Name */}
              <div className="form-group">
                <label className="form-label">PRODUCT NAME *</label>
                <input 
                  type="text" 
                  className={`form-input ${errors.name ? 'input-error-state' : ''}`}
                  placeholder="e.g. Obsidian Classic"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                {errors.name && <span className="inline-error-msg font-body">{errors.name}</span>}
              </div>

              {/* Category */}
              <div className="form-group">
                <label className="form-label">CATEGORY *</label>
                <select 
                  className="form-input"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="Modern Minimalist">Modern Minimalist</option>
                  <option value="Contemporary">Contemporary</option>
                  <option value="Luxury Vintage">Luxury Vintage</option>
                  <option value="Classic">Classic</option>
                  <option value="Special Edition">Special Edition</option>
                </select>
              </div>

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

              {/* Color swatches and input */}
              <div className="form-group">
                <label className="form-label">COLOR FINISH *</label>
                <input 
                  type="text" 
                  className={`form-input ${errors.color ? 'input-error-state' : ''}`}
                  placeholder="e.g. Matte Black"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                />
                {errors.color && <span className="inline-error-msg font-body">{errors.color}</span>}
                
                {/* Palette selection helpers */}
                <div className="swatches-helper-list font-body">
                  {swatchOptions.map(sw => (
                    <button 
                      key={sw.label} 
                      type="button" 
                      className="swatch-btn"
                      onClick={() => setColor(sw.label)}
                    >
                      <span className="swatch-circle" style={{ backgroundColor: sw.hex }}></span>
                      <span>{sw.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Fields */}
              <div className="form-grid-3col">
                
                <div className="form-group">
                  <label className="form-label">SALE PRICE (₹) *</label>
                  <input 
                    type="number" 
                    className={`form-input ${errors.salePrice ? 'input-error-state' : ''}`}
                    placeholder="e.g. 89"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                  />
                  {errors.salePrice && <span className="inline-error-msg font-body">{errors.salePrice}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">ORIGINAL PRICE (₹)</label>
                  <input 
                    type="number" 
                    className="form-input"
                    placeholder="e.g. 120"
                    value={originalPrice}
                    onChange={(e) => setOriginalPrice(e.target.value)}
                  />
                  <span className="help-subtext font-body">Original price shows as strikethrough if filled</span>
                </div>

                <div className="form-group">
                  <label className="form-label">PIECES AVAILABLE *</label>
                  <input 
                    type="number" 
                    className={`form-input ${errors.stockCount ? 'input-error-state' : ''}`}
                    placeholder="e.g. 50"
                    value={stockCount}
                    onChange={(e) => setStockCount(e.target.value)}
                  />
                  {errors.stockCount && <span className="inline-error-msg font-body">{errors.stockCount}</span>}
                </div>

              </div>

              {/* Description */}
              <div className="form-group">
                <label className="form-label">DESCRIPTION</label>
                <textarea 
                  className="form-textarea" 
                  rows="4" 
                  placeholder="Product description, materials, features..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* Badges toggles */}
              <div className="form-group">
                <label className="checkbox-container">
                  <input 
                    type="checkbox" 
                    checked={isOnSale}
                    onChange={(e) => setIsOnSale(e.target.checked)}
                  />
                  <strong>IS ON SALE?</strong>
                </label>
              </div>

              {/* Radio status */}
              <div className="form-group">
                <label className="form-label">CATALOGUE STATUS</label>
                <div className="radio-group font-body">
                  <label className="radio-label">
                    <input 
                      type="radio" 
                      name="catalogStatus" 
                      checked={isLive === true} 
                      onChange={() => setIsLive(true)}
                    />
                    <span>Live (Visible to users)</span>
                  </label>
                  <label className="radio-label">
                    <input 
                      type="radio" 
                      name="catalogStatus" 
                      checked={isLive === false} 
                      onChange={() => setIsLive(false)}
                    />
                    <span>Hidden (Draft mode)</span>
                  </label>
                </div>
              </div>

            </div>

            {/* Form Footer Action button block */}
            <div className="form-submit-row" style={{ marginTop: '32px' }}>
              <button type="submit" className="btn-primary form-action-submit-btn">
                SAVE PRODUCT
              </button>
              <button 
                type="button" 
                className="btn-secondary form-action-draft-btn"
                onClick={(e) => handleSubmit(e, true)}
              >
                SAVE AS DRAFT
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
      `}</style>
    </div>
  );
};

export default AdminAddProduct;
