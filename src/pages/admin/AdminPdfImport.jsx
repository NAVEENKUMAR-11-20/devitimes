import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

const AdminPdfImport = () => {
  const { addProduct } = useApp();

  // Step: 1=Upload, 2=Preview, 3=Success
  const [step, setStep] = useState(1);
  const [loadingText, setLoadingText] = useState('');
  const [progress, setProgress] = useState(0);

  // Extracted product cards state
  const [extractedProducts, setExtractedProducts] = useState([]);
  const [savedCount, setSavedCount] = useState(0);

  // Confirm modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const fileInputRef = useRef(null);

  // ─── Trigger file picker ───────────────────────────────────────────────────
  const handleSelectFile = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  // ─── Accurate text parser — extracts ONLY what is explicitly in the PDF ───
  const extractFromPageText = (rawText) => {
    // Collapse all whitespace to single space for reliable regex matching
    const text = rawText.replace(/\s+/g, ' ').trim();

    let modelNumber = '';
    let size = '';
    let packageNo = '';

    // 1. Model Number — patterns: "M NO. 1271", "M NO: 1271", "M NO 1271"
    //    Must start with "M" then "NO" (with optional space), then optional separator, then the number
    const modelMatch = text.match(/\bm\s*n\s*o\.?\s*[:\-]?\s*(\d{3,6})\b/i);
    if (modelMatch) {
      modelNumber = modelMatch[1];
    }

    // 2. Size — pattern: "SIZE : 300 X 300 MM" or "SIZE: 300X300MM"
    const sizeMatch = text.match(/\bsize\s*[:\-]?\s*(\d{2,4})\s*[xX×]\s*(\d{2,4})\s*(mm|cm)?/i);
    if (sizeMatch) {
      const unit = sizeMatch[3] ? sizeMatch[3].toUpperCase() : 'MM';
      size = `${sizeMatch[1]} × ${sizeMatch[2]} ${unit}`;
    }

    // 3. Package Number — pattern: "PKG : 52" or "PKG: 52" or "PKG 52"
    const pkgMatch = text.match(/\bpkg\s*[:\-]?\s*(\d+)\b/i);
    if (pkgMatch) {
      packageNo = pkgMatch[1];
    }

    // Status: auto-filled only when all 3 fields are found; otherwise needs review
    const allFound = modelNumber && size && packageNo;
    const status = allFound ? 'auto-filled' : 'needs review';

    return { modelNumber, size, packageNo, status };
  };

  // ─── Smart auto-crop: isolate the clock product from the PDF page ─────────
  const smartCropProductImage = (sourceCanvas) => {
    const w = sourceCanvas.width;
    const h = sourceCanvas.height;
    const ctx = sourceCanvas.getContext('2d');

    // Step 1: Sample corner pixels to detect the page background color
    const corners = [
      ctx.getImageData(5, 5, 1, 1).data,
      ctx.getImageData(w - 5, 5, 1, 1).data,
      ctx.getImageData(5, h - 5, 1, 1).data,
      ctx.getImageData(w - 5, h - 5, 1, 1).data,
    ];
    const bgR = Math.round(corners.reduce((s, c) => s + c[0], 0) / 4);
    const bgG = Math.round(corners.reduce((s, c) => s + c[1], 0) / 4);
    const bgB = Math.round(corners.reduce((s, c) => s + c[2], 0) / 4);

    // Step 2: Define the scan zone — skip top 15% (logo area), bottom 25% (text area)
    const scanTop = Math.round(h * 0.15);
    const scanBottom = Math.round(h * 0.75);
    const scanLeft = Math.round(w * 0.05);
    const scanRight = Math.round(w * 0.95);

    // Step 3: Get pixel data for the scan zone
    const scanW = scanRight - scanLeft;
    const scanH = scanBottom - scanTop;
    const imgData = ctx.getImageData(scanLeft, scanTop, scanW, scanH);
    const pixels = imgData.data;

    // Step 4: Find the bounding box of non-background pixels
    // A pixel is "content" if it differs significantly from the detected background
    const colorThreshold = 35; // how different a pixel must be from bg to count as content
    let minX = scanW, maxX = 0, minY = scanH, maxY = 0;
    let contentFound = false;

    // Sample every 2nd pixel for speed on large canvases
    const step = 2;
    for (let y = 0; y < scanH; y += step) {
      for (let x = 0; x < scanW; x += step) {
        const idx = (y * scanW + x) * 4;
        const dr = Math.abs(pixels[idx] - bgR);
        const dg = Math.abs(pixels[idx + 1] - bgG);
        const db = Math.abs(pixels[idx + 2] - bgB);

        if (dr > colorThreshold || dg > colorThreshold || db > colorThreshold) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          contentFound = true;
        }
      }
    }

    // Step 5: If no content found, fall back to center crop
    if (!contentFound || maxX - minX < 20 || maxY - minY < 20) {
      const fallbackSize = Math.min(w, h) * 0.6;
      minX = (w - fallbackSize) / 2 - scanLeft;
      minY = (h * 0.15);
      maxX = minX + fallbackSize;
      maxY = minY + fallbackSize;
    }

    // Convert scan-zone-relative coords back to full canvas coords
    const absLeft = scanLeft + minX;
    const absTop = scanTop + minY;
    const absRight = scanLeft + maxX;
    const absBottom = scanTop + maxY;

    // Step 6: Add balanced padding (8% of the detected region size)
    const contentW = absRight - absLeft;
    const contentH = absBottom - absTop;
    const pad = Math.round(Math.max(contentW, contentH) * 0.08);

    let cropX = Math.max(0, absLeft - pad);
    let cropY = Math.max(0, absTop - pad);
    let cropW = Math.min(w - cropX, contentW + pad * 2);
    let cropH = Math.min(h - cropY, contentH + pad * 2);

    // Step 7: Make the crop region square (centered)
    if (cropW > cropH) {
      const diff = cropW - cropH;
      cropY = Math.max(0, cropY - Math.floor(diff / 2));
      cropH = cropW;
      if (cropY + cropH > h) cropY = Math.max(0, h - cropH);
    } else if (cropH > cropW) {
      const diff = cropH - cropW;
      cropX = Math.max(0, cropX - Math.floor(diff / 2));
      cropW = cropH;
      if (cropX + cropW > w) cropX = Math.max(0, w - cropW);
    }

    // Step 8: Render the cropped product to a clean 480×480 output canvas
    const outputSize = 480;
    const outCanvas = document.createElement('canvas');
    outCanvas.width = outputSize;
    outCanvas.height = outputSize;
    const outCtx = outCanvas.getContext('2d');

    // Fill with clean white background
    outCtx.fillStyle = '#FFFFFF';
    outCtx.fillRect(0, 0, outputSize, outputSize);

    // Draw the cropped clock centered with a small inner margin
    const margin = 16;
    const drawSize = outputSize - margin * 2;
    outCtx.drawImage(
      sourceCanvas,
      cropX, cropY, cropW, cropH,
      margin, margin, drawSize, drawSize
    );

    return outCanvas.toDataURL('image/png', 1.0);
  };

  // ─── Main PDF processing engine ───────────────────────────────────────────
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Please select a valid PDF file catalog.');
      return;
    }

    setStep(1);
    setLoadingText('Initializing PDF.js library...');
    setProgress(10);

    const fileReader = new FileReader();

    fileReader.onload = async (event) => {
      const typedArray = new Uint8Array(event.target.result);

      try {
        setLoadingText('Loading catalog pages...');
        setProgress(25);

        if (!window.pdfjsLib) {
          throw new Error('PDF.js library is not available. Please ensure CDN script is loaded in index.html.');
        }

        const pdf = await window.pdfjsLib.getDocument({ data: typedArray }).promise;
        const totalPages = pdf.numPages;
        const parsedItems = [];

        setLoadingText(`Found ${totalPages} pages. Extracting content...`);
        setProgress(40);

        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
          setProgress(Math.round(40 + (pageNum / totalPages) * 55));
          setLoadingText(`Processing page ${pageNum} of ${totalPages}...`);

          const page = await pdf.getPage(pageNum);

          // ── Render full page to canvas at high quality ──────────────────
          const viewport = page.getViewport({ scale: 2.0 });
          const fullCanvas = document.createElement('canvas');
          fullCanvas.width = viewport.width;
          fullCanvas.height = viewport.height;
          const fullCtx = fullCanvas.getContext('2d');
          await page.render({ canvasContext: fullCtx, viewport }).promise;

          // ── Smart auto-crop: detect the clock product region ──────────
          const imageBase64 = smartCropProductImage(fullCanvas);

          // ── Extract all text from same page ─────────────────────────────
          const textContent = await page.getTextContent();
          const rawText = textContent.items.map(item => item.str).join(' ');

          // ── Parse exactly: Model No, Size, PKG No ───────────────────────
          const parsed = extractFromPageText(rawText);

          parsedItems.push({
            tempId: `pg_${pageNum}_${Date.now()}`,
            pageNum,
            modelNumber: parsed.modelNumber,
            size: parsed.size,
            packageNo: parsed.packageNo,
            status: parsed.status,
            images: [imageBase64],
            // Stored fields with safe defaults (required by addProduct schema)
            name: parsed.modelNumber ? `Clock Model ${parsed.modelNumber}` : `Page ${pageNum} Product`,
            category: 'Modern Minimalist',
            color: '',
            salePrice: 0,
            originalPrice: null,
            stockCount: 20,
            description: `Extracted from catalog page ${pageNum}.`,
            include: true,
          });
        }

        setExtractedProducts(parsedItems);
        setStep(2);
      } catch (err) {
        console.error('PDF Parsing failed:', err);
        alert('Could not parse PDF catalogue: ' + err.message);
        setStep(1);
      } finally {
        setProgress(0);
        setLoadingText('');
      }
    };

    fileReader.readAsArrayBuffer(file);
  };

  // ─── Edit a card field inline ──────────────────────────────────────────────
  const updateCardField = (tempId, field, value) => {
    setExtractedProducts(prev =>
      prev.map(card => card.tempId === tempId ? { ...card, [field]: value } : card)
    );
  };

  // ─── Toggle include / skip ─────────────────────────────────────────────────
  const toggleInclude = (tempId) => {
    setExtractedProducts(prev =>
      prev.map(card => card.tempId === tempId ? { ...card, include: !card.include } : card)
    );
  };

  // ─── Initiate save flow ────────────────────────────────────────────────────
  const handleBulkAdd = () => {
    const selected = extractedProducts.filter(p => p.include);
    if (selected.length === 0) {
      alert('Please select at least one product to add.');
      return;
    }
    setShowConfirmModal(true);
  };

  // ─── Confirm & save ────────────────────────────────────────────────────────
  const handleConfirmSave = () => {
    const selected = extractedProducts.filter(p => p.include);

    // Validation: model, size, and packageNo must not all be empty
    for (const p of selected) {
      if (!p.modelNumber && !p.size && !p.packageNo) {
        alert(`Page ${p.pageNum}: All fields are empty. Please fill in at least one detail before saving.`);
        setShowConfirmModal(false);
        return;
      }
    }

    selected.forEach(p => {
      const { tempId, include, pageNum, status, ...payload } = p;
      addProduct({
        ...payload,
        // Update name now that model is confirmed
        name: p.modelNumber ? `Clock Model ${p.modelNumber}` : `Catalog Product (Page ${p.pageNum})`,
      });
    });

    setSavedCount(selected.length);
    setShowConfirmModal(false);
    setStep(3);
  };

  const selectedCount = extractedProducts.filter(p => p.include).length;

  return (
    <div className="admin-pdf-import-root font-body">

      {/* ── STEP 1: Upload ─────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="pdf-upload-view animate-fade-in">
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h1 className="dashboard-heading font-heading">Import Catalog via PDF</h1>
            <p className="stats-indicator font-body">
              Upload your clock catalog PDF. The system will automatically extract
              <strong> Model No</strong>, <strong>Size</strong>, and <strong>PKG No</strong> from each page.
            </p>
          </div>

          <div className="form-card-panel pdf-card-centered">
            {loadingText ? (
              <div className="loading-spinner-state">
                <div className="pdf-spinner"></div>
                <div className="spinner-progress-bar" style={{ width: '100%' }}>
                  <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                </div>
                <h3 className="loading-title font-heading">{loadingText}</h3>
                <p className="font-body" style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                  Do not close this tab while processing.
                </p>
              </div>
            ) : (
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
                  Each page will be scanned for Model No, Size, and PKG No. 
                  The clock image will be captured from the same page.
                </p>
                <button onClick={handleSelectFile} className="btn-primary select-pdf-btn">
                  SELECT PDF FILE
                </button>
                <span className="pdf-size-helper font-body">Max file size: 50MB</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── STEP 2: Preview & Review ────────────────────────────────────── */}
      {step === 2 && (
        <div className="pdf-preview-view animate-fade-in">

          <div className="products-header-row" style={{ marginBottom: '20px' }}>
            <div>
              <h1 className="dashboard-heading font-heading">Review Extracted Products</h1>
              <p className="stats-indicator font-body">
                {extractedProducts.length} pages scanned. Edit any field. Select which products to save.
              </p>
            </div>
            <button
              onClick={() => { setStep(1); setExtractedProducts([]); }}
              className="btn-secondary"
              style={{ height: '40px', padding: '0 16px', fontSize: '11px' }}
            >
              ← Upload Different PDF
            </button>
          </div>

          {/* Preview table header */}
          <div className="preview-table-header font-body">
            <span>THUMBNAIL</span>
            <span>MODEL NO</span>
            <span>SIZE</span>
            <span>PKG NO</span>
            <span>STATUS</span>
            <span>ACTION</span>
          </div>

          {/* Preview rows */}
          <div className="preview-rows-list">
            {extractedProducts.map((p, index) => {
              const isReview = p.status === 'needs review';
              return (
                <div
                  key={p.tempId}
                  className={`preview-row-item ${p.include ? '' : 'row-skipped'}`}
                >
                  {/* Thumbnail */}
                  <div className="prev-thumb-cell">
                    <div className="prev-thumb-wrapper">
                      <img src={p.images[0]} alt={`Page ${index + 1}`} />
                      {!p.include && <div className="prev-skip-overlay font-body">SKIP</div>}
                    </div>
                    <span className="prev-page-label font-body">Page {index + 1}</span>
                  </div>

                  {/* Model No */}
                  <div className="prev-field-cell">
                    <input
                      type="text"
                      className={`prev-input font-body ${!p.modelNumber ? 'input-missing' : ''}`}
                      value={p.modelNumber}
                      placeholder="Needs Review"
                      onChange={(e) => updateCardField(p.tempId, 'modelNumber', e.target.value)}
                      disabled={!p.include}
                    />
                  </div>

                  {/* Size */}
                  <div className="prev-field-cell">
                    <input
                      type="text"
                      className={`prev-input font-body ${!p.size ? 'input-missing' : ''}`}
                      value={p.size}
                      placeholder="Needs Review"
                      onChange={(e) => updateCardField(p.tempId, 'size', e.target.value)}
                      disabled={!p.include}
                    />
                  </div>

                  {/* PKG No */}
                  <div className="prev-field-cell">
                    <input
                      type="text"
                      className={`prev-input font-body ${!p.packageNo ? 'input-missing' : ''}`}
                      value={p.packageNo}
                      placeholder="Needs Review"
                      onChange={(e) => updateCardField(p.tempId, 'packageNo', e.target.value)}
                      disabled={!p.include}
                    />
                  </div>

                  {/* Status badge */}
                  <div className="prev-status-cell">
                    <span className={`prev-badge font-body ${isReview ? 'badge-review' : 'badge-ok'}`}>
                      {isReview ? '⚠ Needs Review' : '✓ Auto-filled'}
                    </span>
                  </div>

                  {/* Include / Skip toggle */}
                  <div className="prev-action-cell">
                    <button
                      type="button"
                      onClick={() => toggleInclude(p.tempId)}
                      className={`prev-toggle-btn font-body ${p.include ? 'toggle-include' : 'toggle-skip'}`}
                    >
                      {p.include ? '✓ Include' : '✗ Skip'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sticky bottom save bar */}
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
                SAVE SELECTED TO CATALOGUE
              </button>
            </div>
          </div>

        </div>
      )}

      {/* ── STEP 3: Success ─────────────────────────────────────────────── */}
      {step === 3 && (
        <div className="success-banner-panel animate-fade-in">
          <div className="success-icon-badge">✓</div>
          <h2 className="font-heading" style={{ fontSize: '26px', color: 'var(--text-primary)', marginBottom: '8px' }}>
            Products Saved Successfully!
          </h2>
          <p className="font-body" style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
            <strong>{savedCount} product{savedCount !== 1 ? 's' : ''}</strong> have been added to your live catalogue.
          </p>
          <div className="success-actions" style={{ width: '100%', maxWidth: '500px' }}>
            <Link to="/admin/products" className="btn-primary success-btn">
              View Products
            </Link>
            <button
              onClick={() => { setStep(1); setExtractedProducts([]); setSavedCount(0); }}
              className="btn-secondary success-btn"
            >
              Upload Another PDF
            </button>
          </div>
        </div>
      )}

      {/* ── Confirm Modal ──────────────────────────────────────────────── */}
      {showConfirmModal && (
        <div className="modal-overlay">
          <div className="modal-card animate-fade-in" style={{ maxWidth: '400px' }}>
            <h3 className="modal-title font-heading">Confirm Import</h3>
            <p className="modal-desc font-body">
              Save <strong>{selectedCount}</strong> product{selectedCount !== 1 ? 's' : ''} to the live catalogue?
              They will be immediately visible on the collection page.
            </p>
            <div className="modal-actions-row">
              <button onClick={handleConfirmSave} className="btn-primary modal-btn">
                Yes, Save
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

        /* ── Upload screen ── */
        .pdf-card-centered {
          max-width: 520px;
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
          line-height: 1.6;
        }

        .select-pdf-btn {
          height: 48px;
          font-size: 13px;
          padding: 0 36px;
          margin-bottom: 12px;
        }

        .pdf-size-helper {
          font-size: 10px;
          color: var(--text-muted);
          display: block;
        }

        /* ── Spinner ── */
        .loading-spinner-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .pdf-spinner {
          width: 48px;
          height: 48px;
          border: 4px solid var(--border-color);
          border-top-color: var(--accent-blue);
          border-radius: 50%;
          animation: pdfSpin 0.9s linear infinite;
        }

        @keyframes pdfSpin {
          to { transform: rotate(360deg); }
        }

        .spinner-progress-bar {
          width: 100%;
          height: 6px;
          background-color: var(--border-color);
          border-radius: 3px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background-color: var(--accent-blue);
          transition: width 0.4s ease;
        }

        .loading-title {
          font-size: 15px;
          color: var(--text-primary);
        }

        /* ── Preview table layout ── */
        .preview-table-header {
          display: grid;
          grid-template-columns: 100px 1fr 1fr 100px 140px 100px;
          gap: 12px;
          padding: 10px 16px;
          background-color: #F8FAFC;
          border: 1px solid var(--border-color);
          border-radius: 4px 4px 0 0;
          font-size: 9px;
          font-weight: 700;
          color: var(--text-muted);
          letter-spacing: 0.07em;
          text-transform: uppercase;
        }

        .preview-rows-list {
          display: flex;
          flex-direction: column;
          border: 1px solid var(--border-color);
          border-top: none;
          border-radius: 0 0 4px 4px;
          margin-bottom: 90px;
          background: #fff;
        }

        .preview-row-item {
          display: grid;
          grid-template-columns: 100px 1fr 1fr 100px 140px 100px;
          gap: 12px;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border-color);
          align-items: center;
          transition: background 0.2s;
        }

        .preview-row-item:last-child {
          border-bottom: none;
        }

        .preview-row-item:hover {
          background-color: #FAFBFC;
        }

        .row-skipped {
          opacity: 0.45;
        }

        /* Thumbnail cell */
        .prev-thumb-cell {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .prev-thumb-wrapper {
          width: 72px;
          height: 72px;
          border-radius: 4px;
          overflow: hidden;
          background-color: #F0F2F5;
          position: relative;
          border: 1px solid var(--border-color);
        }

        .prev-thumb-wrapper img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .prev-skip-overlay {
          position: absolute;
          inset: 0;
          background: rgba(255,255,255,0.75);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
          font-weight: 800;
          color: var(--text-muted);
          letter-spacing: 0.08em;
        }

        .prev-page-label {
          font-size: 9px;
          color: var(--text-muted);
          font-weight: 600;
        }

        /* Input cells */
        .prev-field-cell {
          display: flex;
          align-items: center;
        }

        .prev-input {
          width: 100%;
          height: 34px;
          padding: 0 10px;
          border: 1px solid var(--border-color);
          border-radius: 3px;
          font-size: 13px;
          color: var(--text-primary);
          background: #fff;
          outline: none;
          transition: border-color 0.2s;
        }

        .prev-input:focus {
          border-color: var(--accent-blue);
        }

        .prev-input::placeholder {
          color: #F59E0B;
          font-style: italic;
          font-size: 11px;
        }

        .input-missing {
          border-color: #FDE68A;
          background-color: #FFFBEB;
        }

        .prev-input:disabled {
          background-color: #F8FAFC;
          color: var(--text-muted);
          cursor: not-allowed;
        }

        /* Status badge cell */
        .prev-status-cell {
          display: flex;
          align-items: center;
        }

        .prev-badge {
          font-size: 9px;
          font-weight: 700;
          padding: 4px 8px;
          border-radius: 2px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .badge-ok {
          background-color: #D1FAE5;
          color: #065F46;
        }

        .badge-review {
          background-color: #FEF3C7;
          color: #92400E;
        }

        /* Toggle button cell */
        .prev-action-cell {
          display: flex;
          align-items: center;
        }

        .prev-toggle-btn {
          height: 30px;
          padding: 0 10px;
          font-size: 10px;
          font-weight: 700;
          border-radius: 3px;
          letter-spacing: 0.03em;
          cursor: pointer;
          transition: background 0.2s;
          white-space: nowrap;
        }

        .toggle-include {
          background-color: #EFF6FF;
          color: #1D4ED8;
          border: 1px solid #BFDBFE;
        }

        .toggle-include:hover {
          background-color: #DBEAFE;
        }

        .toggle-skip {
          background-color: #FEF2F2;
          color: #991B1B;
          border: 1px solid #FECACA;
        }

        .toggle-skip:hover {
          background-color: #FEE2E2;
        }

        /* ── Sticky save bar ── */
        .bulk-save-action-drawer {
          position: fixed;
          bottom: 0;
          left: 260px;
          right: 0;
          background-color: #fff;
          border-top: 1px solid var(--border-color);
          padding: 14px 32px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          z-index: 100;
          box-shadow: 0 -4px 16px rgba(0,0,0,0.07);
        }

        .bulk-drawer-info {
          font-size: 13px;
          color: var(--text-secondary);
        }

        .bulk-save-drawer-btn {
          height: 42px;
          padding: 0 32px;
          font-size: 12px;
        }

        /* ── Success screen ── */
        .success-banner-panel {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 80px 24px;
          gap: 16px;
        }

        .success-icon-badge {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background-color: #D1FAE5;
          color: #065F46;
          font-size: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .success-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          justify-content: center;
          margin-top: 8px;
        }

        .success-btn {
          height: 44px;
          padding: 0 28px;
          font-size: 13px;
        }

        /* ── Responsive ── */
        @media (max-width: 900px) {
          .preview-table-header,
          .preview-row-item {
            grid-template-columns: 72px 1fr 1fr 80px;
          }
          .prev-status-cell,
          .preview-table-header span:nth-child(5) {
            display: none;
          }
          .prev-action-cell,
          .preview-table-header span:nth-child(6) {
            grid-column: span 1;
          }
        }

        @media (max-width: 600px) {
          .preview-table-header,
          .preview-row-item {
            grid-template-columns: 64px 1fr 1fr;
          }
          .preview-table-header span:nth-child(4),
          .prev-action-cell {
            display: none;
          }
          .bulk-save-action-drawer {
            left: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminPdfImport;
