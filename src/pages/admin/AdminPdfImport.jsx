import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import ClockSvg from '../../components/ClockSvg';

const AdminPdfImport = () => {
  const { addProduct } = useApp();

  // Page Step State
  const [step, setStep] = useState(1); // 1: Upload, 2: Preview, 3: Success
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [loadingText, setLoadingText] = useState('');
  const [progress, setProgress] = useState(0);

  // Extracted products state
  const [extractedProducts, setExtractedProducts] = useState([]);
  const [addedProductsList, setAddedProductsList] = useState([]);

  // Confirm Modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const fileInputRef = useRef(null);

  // Trigger File picker
  const handleSelectFile = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Main PDF processing engine
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Please select a valid PDF file catalog.');
      return;
    }

    setFileName(file.name);
    setFileSize((file.size / (1024 * 1024)).toFixed(2) + ' MB');
    setStep(1); // remain in step 1 but show loading
    setLoadingText('Initializing PDF.js library...');
    setProgress(10);

    // Read file as ArrayBuffer
    const fileReader = new FileReader();
    
    fileReader.onload = async (event) => {
      const typedArray = new Uint8Array(event.target.result);
      
      try {
        setLoadingText('Loading catalog pages...');
        setProgress(30);

        // Access PDF.js from window context loaded via CDN
        if (!window.pdfjsLib) {
          throw new Error('PDF.js library is not available. Please verify CDN is loaded.');
        }

        const pdf = await window.pdfjsLib.getDocument({ data: typedArray }).promise;
        const totalPages = pdf.numPages;
        const parsedItems = [];

        setLoadingText(`Found ${totalPages} pages. Extracting content...`);
        setProgress(40);

        // Process each page
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
          setProgress(Math.round(40 + (pageNum / totalPages) * 50));
          setLoadingText(`Reading content stream: Page ${pageNum} of ${totalPages}...`);
          
          const page = await pdf.getPage(pageNum);
          
          // 1. Render page to canvas at 1.5 scale
          const viewport = page.getViewport({ scale: 1.2 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          
          const ctx = canvas.getContext('2d');
          await page.render({ canvasContext: ctx, viewport }).promise;

          // Heuristic: crop center/top 50% square of canvas where product photos are usually displayed
          const imageCropSize = Math.min(canvas.width, canvas.height * 0.55);
          const cropX = (canvas.width - imageCropSize) / 2;
          const cropY = canvas.height * 0.05; // 5% margin from top

          const cropCanvas = document.createElement('canvas');
          cropCanvas.width = 400; // standard thumbnail size
          cropCanvas.height = 400;

          const cropCtx = cropCanvas.getContext('2d');
          // Add a light background
          cropCtx.fillStyle = '#F0F2F5';
          cropCtx.fillRect(0, 0, 400, 400);

          // Draw cropped clock image centered inside standard frame
          cropCtx.drawImage(
            canvas, 
            cropX, cropY, imageCropSize, imageCropSize, // source crop coords
            20, 20, 360, 360 // dest padding coords
          );

          const imageBase64 = cropCanvas.toDataURL('image/jpeg', 0.8);

          // 2. Extract texts
          const textContent = await page.getTextContent();
          const pageTextString = textContent.items.map(item => item.str).join(' ');

          // Heuristic regex checks
          const parsedInfo = runTextParsingHeuristics(pageTextString, pageNum);

          parsedItems.push({
            tempId: `ext_${pageNum}_${Date.now()}`,
            name: parsedInfo.name,
            category: parsedInfo.category,
            modelNumber: parsedInfo.modelNumber,
            size: parsedInfo.size,
            packageNo: parsedInfo.packageNo,
            color: parsedInfo.color,
            salePrice: parsedInfo.salePrice,
            originalPrice: parsedInfo.originalPrice,
            stockCount: 20, // default stock count
            description: `Extracted from catalog page ${pageNum}. ` + parsedInfo.description,
            images: [imageBase64],
            status: parsedInfo.status, // auto-filled, needs review, manual
            include: true // default selected to save
          });
        }

        setExtractedProducts(parsedItems);
        setStep(2); // Move to Preview step
      } catch (err) {
        console.error('PDF Parsing failed', err);
        alert('Could not parse PDF catalogue: ' + err.message);
        setStep(1);
      } finally {
        setProgress(0);
        setLoadingText('');
      }
    };

    fileReader.readAsArrayBuffer(file);
  };

  // Content heuristic matching engine
  const runTextParsingHeuristics = (text, pageNum) => {
    const cleanedText = text.replace(/\s+/g, ' ');

    let modelNumber = '';
    let salePrice = 99;
    let originalPrice = null;
    let size = '';
    let packageNo = '';
    let color = 'Black';
    let category = 'Modern Minimalist';
    let name = '';
    let description = 'Premium luxury timepiece with silent sweeping hands.';

    // Status matching tags
    let matchedFieldsCount = 0;

    // 1. Model Number Heuristic (Match exact formats)
    const modelRegex = /m\s*no\.?\s*[:\-]?\s*([a-zA-Z0-9\-]+)/i;
    const modelMatch = cleanedText.match(modelRegex);
    if (modelMatch && modelMatch[1]) {
      modelNumber = modelMatch[1].toUpperCase();
      name = `Catalog Design ${modelNumber}`;
      matchedFieldsCount++;
    }

    // 2. Price Heuristic (find ₹ 89 or Rs. 89 or Price: 89)
    const priceRegexes = [
      /(?:₹|rs\.?|inr)\s*(\d{2,4})/i,
      /price\s*[:\-]?\s*(\d{2,4})/i,
      /sale\s*[:\-]?\s*(\d{2,4})/i
    ];

    for (const rx of priceRegexes) {
      const match = cleanedText.match(rx);
      if (match && match[1]) {
        salePrice = Number(match[1]);
        originalPrice = Math.round(salePrice * 1.35); // Strikethrough estimation
        matchedFieldsCount++;
        break;
      }
    }

    // 3. Size Heuristic (Match exact formats like SIZE : 300 X 300 MM)
    const sizeRegex = /size\s*[:\-]?\s*(\d{3}\s*[x×]\s*\d{3}\s*(?:mm|cm)?)/i;
    const sizeMatch = cleanedText.match(sizeRegex);
    if (sizeMatch && sizeMatch[1]) {
      size = sizeMatch[1].toUpperCase().replace('X', '×');
      if (!size.includes('MM') && !size.includes('CM')) {
        size += ' MM';
      }
      matchedFieldsCount++;
    }

    // 4. Package Number Heuristic (Match PKG : 52)
    const pkgRegex = /pkg\s*[:\-]?\s*([a-zA-Z0-9]+)/i;
    const pkgMatch = cleanedText.match(pkgRegex);
    if (pkgMatch && pkgMatch[1]) {
      packageNo = pkgMatch[1];
      matchedFieldsCount++;
    }

    // 5. Color finish checks
    const colorsList = ['Black', 'White', 'Silver', 'Gold', 'Bronze', 'Navy', 'Brown', 'Gray'];
    for (const col of colorsList) {
      if (cleanedText.toLowerCase().includes(col.toLowerCase())) {
        color = col;
        matchedFieldsCount++;
        break;
      }
    }

    // 6. Category checks
    if (cleanedText.toLowerCase().includes('vintage') || cleanedText.toLowerCase().includes('retro')) {
      category = 'Luxury Vintage';
      matchedFieldsCount++;
    } else if (cleanedText.toLowerCase().includes('contemporary') || cleanedText.toLowerCase().includes('steel')) {
      category = 'Contemporary';
      matchedFieldsCount++;
    }

    // Determine status badge
    let status = 'needs review';
    if (!modelNumber || !size || !packageNo) {
      status = 'needs review';
    } else if (matchedFieldsCount >= 4) {
      status = 'auto-filled';
    } else {
      status = 'manual';
    }

    return { modelNumber, salePrice, originalPrice, size, packageNo, color, category, name, description, status };
  };

  // Modify fields in cards dynamically
  const updateCardField = (tempId, fieldName, value) => {
    setExtractedProducts(prev => prev.map(card => {
      if (card.tempId === tempId) {
        return { ...card, [fieldName]: value };
      }
      return card;
    }));
  };

  // Toggle card checklist include/skip
  const toggleIncludeCard = (tempId) => {
    setExtractedProducts(prev => prev.map(card => {
      if (card.tempId === tempId) {
        return { ...card, include: !card.include };
      }
      return card;
    }));
  };

  // Bulk save checklist
  const handleBulkAdd = () => {
    const selected = extractedProducts.filter(p => p.include);
    if (selected.length === 0) {
      alert('Please select at least 1 product to add.');
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmBulkSave = () => {
    const selected = extractedProducts.filter(p => p.include);
    
    // Validation before saving
    for (const p of selected) {
      if (!p.modelNumber || !p.size || !p.packageNo || !p.name) {
        alert('Validation failed: Ensure all selected products have a valid Name, Model No, Size, and Package No before saving.');
        setShowConfirmModal(false);
        return;
      }
    }

    // Save items into AppContext database
    selected.forEach(p => {
      // Remove temp id, send clean payload
      const { tempId, include, ...payload } = p;
      addProduct(payload);
    });

    setAddedProductsList(selected.map(p => p.name));
    setShowConfirmModal(false);
    setStep(3); // success screen
  };

  const selectedCount = extractedProducts.filter(p => p.include).length;

  return (
    <div className="admin-pdf-import-root font-body">
      
      {/* Dynamic Action Steps */}
      
      {/* STEP 1: PDF UPLOAD & PROCESSING */}
      {step === 1 && (
        <div className="pdf-upload-view animate-fade-in">
          
          <div className="add-product-title-row" style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h1 className="dashboard-heading font-heading">Import catalog via PDF</h1>
            <p className="stats-indicator font-body">
              Upload a digital clock catalog. Our parsing engine will auto-detect clock faces, sizes, model codes, and prices.
            </p>
          </div>

          <div className="form-card-panel pdf-card-centered">
            
            {loadingText ? (
              /* Loading screen progress spinner */
              <div className="loading-spinner-state">
                <div className="spinner"></div>
                <div className="spinner-progress-bar">
                  <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                </div>
                <h3 className="loading-title font-heading">{loadingText}</h3>
                <p className="font-body" style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                  Please do not close this browser tab while processing pages.
                </p>
              </div>
            ) : (
              /* Upload File Area */
              <div className="upload-active-state">
                <input 
                  type="file" 
                  accept=".pdf" 
                  ref={fileInputRef} 
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                
                <div className="pdf-big-icon">📄</div>
                <h3 className="pdf-upload-heading font-heading">Upload Catalogue PDF</h3>
                <p className="pdf-upload-desc font-body">
                  We'll render pages, crop product images, and match detail parameters.
                </p>
                
                <button onClick={handleSelectFile} className="btn-primary select-pdf-btn">
                  SELECT PDF FILE
                </button>
                <span className="pdf-size-helper font-body">Max file size limit: 50MB</span>
              </div>
            )}

          </div>

        </div>
      )}

      {/* STEP 2: EXTRACTION CARDS PREVIEW GRID */}
      {step === 2 && (
        <div className="pdf-preview-view animate-fade-in">
          
          <div className="products-header-row" style={{ marginBottom: '20px' }}>
            <div>
              <h1 className="dashboard-heading font-heading">Verify Extracted Items</h1>
              <p className="stats-indicator font-body">
                Review data matched on each page. Edit any text input field directly.
              </p>
            </div>
            <div className="preview-top-actions">
              <button 
                onClick={() => setStep(1)} 
                className="btn-secondary"
                style={{ height: '40px', padding: '0 16px', fontSize: '11px' }}
              >
                ← Upload Different PDF
              </button>
            </div>
          </div>

          {/* Cards grid deck */}
          <div className="extracted-deck-grid">
            {extractedProducts.map((p, index) => {
              
              // Status color coding
              let badgeColor = '#EF4444'; // red
              let badgeText = 'Manual review';

              if (p.status === 'auto-filled') {
                badgeColor = '#10B981'; // green
                badgeText = 'Auto-filled';
              } else if (p.status === 'needs review') {
                badgeColor = '#F59E0B'; // amber
                badgeText = 'Needs review';
              }

              return (
                <div key={p.tempId} className={`extracted-card-wrapper ${p.include ? 'card-selected' : 'card-skipped'}`}>
                  
                  {/* Skip/Include header toggle */}
                  <div className="extracted-card-header font-body">
                    <span className="page-idx-tag">PAGE {index + 1}</span>
                    <span className="fill-status-badge" style={{ backgroundColor: badgeColor }}>
                      {badgeText}
                    </span>
                  </div>

                  {/* Thumbnail viewport */}
                  <div className="extracted-thumb-area">
                    <img src={p.images[0]} alt="Extracted" />
                    {!p.include && (
                      <div className="skip-overlay font-body">
                        <span>SKIPPED</span>
                      </div>
                    )}
                  </div>

                  {/* Inputs row */}
                  <div className="extracted-inputs font-body">
                    
                    {/* Name */}
                    <div className="group-field-short">
                      <label>NAME</label>
                      <input 
                        type="text" 
                        value={p.name} 
                        onChange={(e) => updateCardField(p.tempId, 'name', e.target.value)}
                        disabled={!p.include}
                      />
                    </div>

                    {/* Model & Category */}
                    <div className="grid-input-row-2">
                      <div className="group-field-short">
                        <label>MODEL NO</label>
                        <input 
                          type="text" 
                          value={p.modelNumber} 
                          onChange={(e) => updateCardField(p.tempId, 'modelNumber', e.target.value)}
                          disabled={!p.include}
                        />
                      </div>
                      <div className="group-field-short">
                        <label>CATEGORY</label>
                        <select 
                          value={p.category} 
                          onChange={(e) => updateCardField(p.tempId, 'category', e.target.value)}
                          disabled={!p.include}
                        >
                          <option value="Modern Minimalist">Modern Minimalist</option>
                          <option value="Contemporary">Contemporary</option>
                          <option value="Luxury Vintage">Luxury Vintage</option>
                          <option value="Classic">Classic</option>
                          <option value="Special Edition">Special Edition</option>
                        </select>
                      </div>
                    </div>

                    {/* Dimensions, Pkg & Color */}
                    <div className="grid-input-row-3">
                      <div className="group-field-short">
                        <label>SIZE</label>
                        <input 
                          type="text" 
                          value={p.size} 
                          onChange={(e) => updateCardField(p.tempId, 'size', e.target.value)}
                          disabled={!p.include}
                        />
                      </div>
                      <div className="group-field-short">
                        <label>PKG NO</label>
                        <input 
                          type="text" 
                          value={p.packageNo || ''} 
                          onChange={(e) => updateCardField(p.tempId, 'packageNo', e.target.value)}
                          disabled={!p.include}
                        />
                      </div>
                      <div className="group-field-short">
                        <label>COLOR</label>
                        <input 
                          type="text" 
                          value={p.color} 
                          onChange={(e) => updateCardField(p.tempId, 'color', e.target.value)}
                          disabled={!p.include}
                        />
                      </div>
                    </div>

                    {/* Pricing details */}
                    <div className="grid-input-row-3">
                      <div className="group-field-short">
                        <label>SALE ₹</label>
                        <input 
                          type="number" 
                          value={p.salePrice} 
                          onChange={(e) => updateCardField(p.tempId, 'salePrice', Number(e.target.value))}
                          disabled={!p.include}
                        />
                      </div>
                      <div className="group-field-short">
                        <label>ORIG ₹</label>
                        <input 
                          type="number" 
                          value={p.originalPrice || ''} 
                          placeholder="Original"
                          onChange={(e) => updateCardField(p.tempId, 'originalPrice', e.target.value ? Number(e.target.value) : null)}
                          disabled={!p.include}
                        />
                      </div>
                      <div className="group-field-short">
                        <label>STOCK</label>
                        <input 
                          type="number" 
                          value={p.stockCount} 
                          onChange={(e) => updateCardField(p.tempId, 'stockCount', Number(e.target.value))}
                          disabled={!p.include}
                        />
                      </div>
                    </div>

                  </div>

                  {/* Actions Footer */}
                  <div className="extracted-actions-footer">
                    <button 
                      type="button" 
                      onClick={() => toggleIncludeCard(p.tempId)}
                      className={`toggle-include-btn font-body ${p.include ? 'include-btn-active' : 'skip-btn-active'}`}
                    >
                      {p.include ? '✓ Include in Catalog' : '✗ Skip Product'}
                    </button>
                  </div>

                </div>
              );
            })}
          </div>

          {/* Sticky bulk action drawer */}
          <div className="bulk-save-action-drawer animate-fade-in font-body">
            <div className="bulk-drawer-info">
              Selected: <strong>{selectedCount}</strong> of <strong>{extractedProducts.length}</strong> products
            </div>
            <div className="bulk-drawer-buttons">
              <button 
                onClick={handleBulkAdd} 
                className="btn-primary bulk-save-drawer-btn"
                disabled={selectedCount === 0}
              >
                ADD SELECTED PRODUCTS TO SHOP
              </button>
            </div>
          </div>

        </div>
      )}

      {/* STEP 3: SUCCESS STATE PANEL */}
      {step === 3 && (
        <div className="success-banner-panel animate-fade-in">
          <div className="success-icon-badge">✓</div>
          <h2 className="font-heading" style={{ fontSize: '26px', color: 'var(--text-primary)', marginBottom: '8px' }}>
            Products Added Successfully!
          </h2>
          <p className="font-body" style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
            Successfully added <strong>{addedProductsList.length} products</strong> to your live catalogue catalogue!
          </p>

          {/* Added items names list summary */}
          <div className="added-names-summary-panel font-body">
            <h4 className="uppercase-label" style={{ marginBottom: '8px', color: 'var(--text-muted)' }}>Products Added:</h4>
            <div className="names-scroller">
              {addedProductsList.map((name, i) => (
                <div key={i} className="scroller-item-row">• &nbsp; {name}</div>
              ))}
            </div>
          </div>
          
          <div className="success-actions" style={{ width: '100%', maxWidth: '500px' }}>
            <Link to="/admin/products" className="btn-primary success-btn">
              View Live Products
            </Link>
            <button onClick={() => { setStep(1); setExtractedProducts([]); setAddedProductsList([]); }} className="btn-secondary success-btn">
              Upload Another PDF
            </button>
          </div>
        </div>
      )}

      {/* --- BULK SAVE CONFIRMATION MODAL --- */}
      {showConfirmModal && (
        <div className="modal-overlay">
          <div className="modal-card animate-fade-in" style={{ maxWidth: '400px' }}>
            <h3 className="modal-title font-heading">Import products</h3>
            <p className="modal-desc font-body">
              Add <strong>{selectedCount}</strong> products to the live catalogue? They will be immediately visible on the collection page.
            </p>
            
            <div className="modal-actions-row">
              <button onClick={handleConfirmBulkSave} className="btn-primary modal-btn">
                Yes, Save items
              </button>
              <button onClick={() => setShowConfirmModal(false)} className="btn-secondary modal-btn">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .admin-pdf-import-root {
          width: 100%;
        }

        .pdf-card-centered {
          max-width: 500px;
          margin: 0 auto;
          text-align: center;
          padding: 60px 40px;
        }

        .pdf-big-icon {
          font-size: 64px;
          margin-bottom: 20px;
        }

        .pdf-upload-heading {
          font-size: 22px;
          color: var(--text-primary);
          margin-bottom: 8px;
        }

        .pdf-upload-desc {
          font-size: 13px;
          color: var(--text-muted);
          margin-bottom: 28px;
          line-height: 1.5;
        }

        .select-pdf-btn {
          height: 48px;
          font-size: 13px;
          padding: 0 32px;
          margin-bottom: 12px;
        }

        .pdf-size-helper {
          font-size: 10px;
          color: var(--text-muted);
          display: block;
        }

        /* Loading Spinner */
        .loading-spinner-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .spinner {
          width: 48px;
          height: 48px;
          border: 4px solid var(--border-color);
          border-top-color: var(--accent-blue);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .spinner-progress-bar {
          width: 100%;
          height: 6px;
          background-color: var(--border-color);
          border-radius: 3px;
          overflow: hidden;
          margin: 8px 0;
        }

        .progress-fill {
          height: 100%;
          background-color: var(--accent-blue);
          transition: width 0.3s ease;
        }

        .loading-title {
          font-size: 16px;
          color: var(--text-primary);
        }

        /* Preview Cards Grid */
        .extracted-deck-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          padding-bottom: 100px; /* buffer for sticky bottom bar */
        }

        @media (max-width: 1100px) {
          .extracted-deck-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 700px) {
          .extracted-deck-grid {
            grid-template-columns: 1fr;
          }
        }

        .extracted-card-wrapper {
          background-color: #ffffff;
          border-radius: 4px;
          border: 1px solid var(--border-color);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: var(--card-shadow);
          transition: opacity 0.3s;
        }

        .card-skipped {
          opacity: 0.55;
        }

        .extracted-card-header {
          display: flex;
          justify-content: space-between;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border-color);
          background-color: #F8FAFC;
        }

        .page-idx-tag {
          font-size: 11px;
          font-weight: 700;
          color: var(--text-secondary);
        }

        .fill-status-badge {
          font-size: 8px;
          color: #ffffff;
          padding: 2px 6px;
          font-weight: 800;
          text-transform: uppercase;
          border-radius: 0px;
        }

        .extracted-thumb-area {
          aspect-ratio: 1.1/1;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #F0F2F5;
          position: relative;
        }

        .extracted-thumb-area img {
          max-width: 90%;
          max-height: 90%;
          object-fit: contain;
        }

        .skip-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(255,255,255,0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          font-weight: 800;
          color: var(--text-muted);
          letter-spacing: 0.1em;
        }

        .extracted-inputs {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          flex-grow: 1;
        }

        .group-field-short {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .group-field-short label {
          font-size: 8px;
          font-weight: 700;
          color: var(--text-muted);
          letter-spacing: 0.05em;
        }

        .group-field-short input, 
        .group-field-short select {
          height: 32px;
          padding: 0 8px;
          border: 1px solid var(--border-color);
          border-radius: 2px;
          outline: none;
          font-size: 12px;
          width: 100%;
          color: var(--text-primary);
        }

        .group-field-short input:focus,
        .group-field-short select:focus {
          border-color: var(--accent-blue);
        }

        .grid-input-row-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .grid-input-row-3 {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 10px;
        }

        .extracted-actions-footer {
          border-top: 1px solid var(--border-color);
          padding: 12px;
          background-color: #F8FAFC;
        }

        .toggle-include-btn {
          width: 100%;
          height: 36px;
          font-size: 11px;
          font-weight: 700;
          text-align: center;
          border-radius: 2px;
          border: 1px solid transparent;
        }

        .include-btn-active {
          background-color: var(--accent-blue);
          color: white;
        }

        .include-btn-active:hover {
          background-color: var(--button-primary-hover);
        }

        .skip-btn-active {
          border-color: var(--border-color);
          color: var(--text-secondary);
          background-color: #ffffff;
        }

        .skip-btn-active:hover {
          background-color: var(--page-bg);
        }

        /* Sticky bottom drawer */
        .bulk-save-action-drawer {
          position: fixed;
          bottom: 0;
          left: 240px; /* matches sidebar width */
          right: 0;
          height: 72px;
          background-color: #ffffff;
          border-top: 1px solid var(--border-color);
          box-shadow: 0 -4px 20px rgba(0,0,0,0.06);
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 32px;
          z-index: 100;
        }

        @media (max-width: 1024px) {
          .bulk-save-action-drawer {
            left: 72px;
          }
        }

        .bulk-drawer-info {
          font-size: 14px;
          color: var(--text-primary);
        }

        .bulk-drawer-buttons {
          display: flex;
        }

        .bulk-save-drawer-btn {
          height: 44px;
          font-size: 12px;
          letter-spacing: 0.1em;
          padding: 0 24px;
        }

        /* Added products list success view */
        .added-names-summary-panel {
          width: 100%;
          max-width: 500px;
          background-color: var(--page-bg);
          padding: 20px;
          border-radius: 4px;
          margin-bottom: 32px;
          text-align: left;
        }

        .names-scroller {
          max-height: 120px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-top: 8px;
        }

        .scroller-item-row {
          font-size: 13px;
          color: var(--text-secondary);
          font-weight: 500;
        }

        /* Success screen panel template matching */
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

        .success-icon-badge {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background-color: #D1FAE5;
          color: #059669;
          font-size: 24px;
          font-weight: bold;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
        }
      `}</style>
    </div>
  );
};

export default AdminPdfImport;
