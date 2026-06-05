import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createProduct } from '../../lib/productsService';

const sizeOptions = [
  '200 × 200 MM',
  '250 × 250 MM',
  '300 × 300 MM',
  '350 × 350 MM',
  '400 × 400 MM',
];

const AdminPdfImport = () => {
  const navigate = useNavigate();

  // Helper: convert a base64 data-URL to a File object for FormData upload
  const base64ToFile = (base64, filename = 'product.png') => {
    const [header, data] = base64.split(',');
    const mime = header.match(/:(.*?);/)?.[1] || 'image/png';
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new File([bytes], filename, { type: mime });
  };

  // Step: 1=Upload, 2=Preview, 3=Success
  const [step, setStep] = useState(1);
  const [loadingText, setLoadingText] = useState('');
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Extracted product cards state
  const [extractedProducts, setExtractedProducts] = useState([]);
  const [savedCount, setSavedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);

  // Confirm modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [saveProcessing, setSaveProcessing] = useState(false);

  // Cropper modal state
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropTargetId, setCropTargetId] = useState(null);
  const [cropImageSrc, setCropImageSrc] = useState('');
  const [cropZoom, setCropZoom] = useState(70);
  const [cropX, setCropX] = useState(0);
  const [cropY, setCropY] = useState(0);

  const originalCanvasRef = useRef(null);
  const previewCanvasRef = useRef(null);

  const fileInputRef = useRef(null);

  // ─── Trigger file picker ───────────────────────────────────────────────────
  const handleSelectFile = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  // ─── Accurate text parser — uses multiple strategies to find fields ────────
  const extractFromPageText = (textItems) => {
    // Strategy 1: Join all items with single space
    const spaceJoined = textItems.map(item => item.str).join(' ').replace(/\s+/g, ' ').trim();

    // Strategy 2: Join with no separator
    const noSpaceJoined = textItems.map(item => item.str).join('').replace(/\s+/g, ' ').trim();

    // Strategy 3: Join with newlines
    const lineJoined = textItems.map(item => item.str).join('\n').replace(/[^\S\n]+/g, ' ').trim();

    const searchTexts = [spaceJoined, noSpaceJoined, lineJoined];

    let modelNumber = '';
    let size = '';
    let packageNo = '';

    const modelRegex = /M\s*NO\.?\s*:?\s*(\d+)/i;
    const sizeRegex = /SIZE\s*:?\s*([0-9]+\s*[Xx×]\s*[0-9]+\s*MM)/i;
    const pkgRegex = /PKG\s*:?\s*(\d+)/i;

    // Search using the requested regex patterns across all search texts
    for (const text of searchTexts) {
      if (!modelNumber) {
        const mMatch = text.match(modelRegex);
        if (mMatch && mMatch[1]) modelNumber = mMatch[1];
      }
      if (!size) {
        const sMatch = text.match(sizeRegex);
        if (sMatch && sMatch[1]) {
          let rawSize = sMatch[1].toUpperCase();
          if (rawSize.endsWith('MM') && !rawSize.endsWith(' MM')) {
            rawSize = rawSize.slice(0, -2) + ' MM';
          }
          size = rawSize.replace(/\s*[Xx×]\s*/g, ' × ').trim();
        }
      }
      if (!packageNo) {
        const pMatch = text.match(pkgRegex);
        if (pMatch && pMatch[1]) packageNo = pMatch[1];
      }
    }

    // Fallback: scan individual text items for split elements
    if (!modelNumber || !size || !packageNo) {
      for (let i = 0; i < textItems.length; i++) {
        const curr = textItems[i].str.trim();
        const next = textItems[i + 1]?.str?.trim() || '';
        const next2 = textItems[i + 2]?.str?.trim() || '';
        const combined = `${curr} ${next} ${next2}`;

        if (!modelNumber) {
          const mMatch = combined.match(modelRegex);
          if (mMatch && mMatch[1]) modelNumber = mMatch[1];
        }

        if (!size) {
          const sMatch = combined.match(sizeRegex);
          if (sMatch && sMatch[1]) {
            let rawSize = sMatch[1].toUpperCase();
            if (rawSize.endsWith('MM') && !rawSize.endsWith(' MM')) {
              rawSize = rawSize.slice(0, -2) + ' MM';
            }
            size = rawSize.replace(/\s*[Xx×]\s*/g, ' × ').trim();
          }
        }

        if (!packageNo) {
          const pMatch = combined.match(pkgRegex);
          if (pMatch && pMatch[1]) packageNo = pMatch[1];
        }

        if (modelNumber && size && packageNo) break;
      }
    }

    // Status: Ready or Needs Review based ONLY on whether all required text fields are successfully extracted
    const allFound = modelNumber && size && packageNo;
    const status = allFound ? 'Ready' : 'Needs Review';

    return { modelNumber, size, packageNo, status, rawText: spaceJoined };
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

    setSelectedFile(file);
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

          // ── Extract all text items from same page ──────────────────────
          const textContent = await page.getTextContent();

          // ── Parse: pass raw items so parser can try multiple join strategies
          const parsed = extractFromPageText(textContent.items);

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
        setSelectedFile(null);
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
      prev.map(card => {
        if (card.tempId === tempId) {
          const updatedCard = { ...card, [field]: value };
          // Dynamically compute status: 'Ready' if modelNumber, size, and packageNo are all filled
          const allFilled = String(updatedCard.modelNumber || '').trim() !== '' &&
                            String(updatedCard.size || '').trim() !== '' &&
                            String(updatedCard.packageNo || '').trim() !== '';
          updatedCard.status = allFilled ? 'Ready' : 'Needs Review';
          return updatedCard;
        }
        return card;
      })
    );
  };

  // ─── Toggle include / skip ─────────────────────────────────────────────────
  const toggleInclude = (tempId) => {
    setExtractedProducts(prev =>
      prev.map(card => card.tempId === tempId ? { ...card, include: !card.include } : card)
    );
  };

  // ─── Handle size select dropdown change ─────────────────────────────────────
  const handleSizeSelectChange = (tempId, selectVal) => {
    if (selectVal === 'Custom') {
      updateCardField(tempId, 'size', '');
    } else {
      updateCardField(tempId, 'size', selectVal);
    }
  };

  // ─── Save single card to catalogue (PocketBase) ────────────────────────────
  const handleSaveSingle = async (p) => {
    if (!p.modelNumber && !p.size && !p.packageNo) {
      alert('All fields are empty. Please fill in at least one detail before saving.');
      return;
    }

    try {
      // Build the image File from the base64 data URL captured from the PDF page
      let imageFile = null;
      if (p.images && p.images[0]) {
        imageFile = base64ToFile(p.images[0], `product_${p.modelNumber || p.pageNum}.png`);
      }

      await createProduct({
        MODEL_NUMBER:    p.modelNumber || '',
        SIZE_DIMENSIONS: p.size || '',
        package_no:      p.packageNo || '',
        price:           Number(p.salePrice) || 0,
        stock:           Number(p.stockCount) || 0,
        status:          'LIVE',
        is_live:         true,
        category:        p.category || 'Clock',
        imageFile,
      });

      // Remove the saved product from the list
      setExtractedProducts(prev => prev.filter(card => card.tempId !== p.tempId));

      alert(`Product ${p.modelNumber ? 'Model ' + p.modelNumber : 'Page ' + p.pageNum} saved to PocketBase!`);

      // If it was the last card, transition to the success step
      if (extractedProducts.length <= 1) {
        setSavedCount(1);
        setStep(3);
      }
    } catch (err) {
      console.error('[PB] handleSaveSingle error:', err);
      alert('Failed to save product to PocketBase. Make sure PocketBase is running on https://pocketbase-production-ec1e.up.railway.app');
    }
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

  // ─── Confirm & save (PocketBase bulk) ───────────────────────────────────────
  const handleConfirmSave = async () => {
    const selected = extractedProducts.filter(p => p.include);

    // Validation: model, size, and packageNo must not all be empty
    for (const p of selected) {
      if (!p.modelNumber && !p.size && !p.packageNo) {
        alert(`Page ${p.pageNum}: All fields are empty. Please fill in at least one detail before saving.`);
        return;
      }
    }

    setShowConfirmModal(false);
    setSaveProcessing(true);

    let success = 0;
    let failed = 0;

    for (const p of selected) {
      try {
        let imageFile = null;
        if (p.images && p.images[0]) {
          imageFile = base64ToFile(p.images[0], `product_${p.modelNumber || p.pageNum}.png`);
        }

        await createProduct({
          MODEL_NUMBER:    p.modelNumber || '',
          SIZE_DIMENSIONS: p.size || '',
          package_no:      p.packageNo || '',
          price:           Number(p.salePrice) || 0,
          stock:           Number(p.stockCount) || 0,
          status:          'LIVE',
          is_live:         true,
          category:        p.category || 'Clock',
          imageFile,
        });
        success++;
      } catch (err) {
        console.error('[PB] Failed to save product:', p.modelNumber, err);
        failed++;
      }
    }

    setSavedCount(success);
    setFailedCount(failed);
    setSaveProcessing(false);
    setStep(3);
  };

  // ─── Image Cropping Handlers & Canvas Render Engine ────────────────────────
  const handleOpenCropper = (product) => {
    setCropTargetId(product.tempId);
    setCropImageSrc(product.images[0]);
    setCropZoom(70);
    setCropX(0);
    setCropY(0);
    setShowCropModal(true);
  };

  const handleSaveCrop = () => {
    const prevCanvas = previewCanvasRef.current;
    if (!prevCanvas) return;

    // Convert canvas content to base64 image/png
    const croppedBase64 = prevCanvas.toDataURL('image/png', 1.0);

    // Update the image preview of the target product card
    setExtractedProducts(prev =>
      prev.map(p => p.tempId === cropTargetId ? { ...p, images: [croppedBase64] } : p)
    );

    // Close modal and reset state
    setShowCropModal(false);
    setCropTargetId(null);
    setCropImageSrc('');
  };

  // Disable body scroll when modal is open
  React.useEffect(() => {
    if (showCropModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [showCropModal]);

  React.useEffect(() => {
    if (!showCropModal || !cropImageSrc) return;

    const img = new Image();
    img.src = cropImageSrc;
    img.onload = () => {
      const origCanvas = originalCanvasRef.current;
      const prevCanvas = previewCanvasRef.current;
      if (!origCanvas || !prevCanvas) return;

      const origCtx = origCanvas.getContext('2d');
      const prevCtx = prevCanvas.getContext('2d');
      if (!origCtx || !prevCtx) return;

      const cw = origCanvas.width;
      const ch = origCanvas.height;

      // 1. Clear original canvas
      origCtx.clearRect(0, 0, cw, ch);

      // 2. Draw image scaled and centered to fit cw, ch keeping aspect ratio
      const imgRatio = img.width / img.height;
      let drawW = cw;
      let drawH = ch;
      let startX = 0;
      let startY = 0;

      if (imgRatio > 1) {
        drawH = cw / imgRatio;
        startY = (ch - drawH) / 2;
      } else {
        drawW = ch * imgRatio;
        startX = (cw - drawW) / 2;
      }

      // Draw original image on original canvas
      origCtx.drawImage(img, startX, startY, drawW, drawH);

      // Calculate crop box size based on zoom slider (20 to 100)
      const minDrawSize = Math.min(drawW, drawH);
      const boxSize = minDrawSize * (cropZoom / 100);

      // Calculate center of crop box with panning offsets (-100 to 100)
      const maxOffsetX = (drawW - boxSize) / 2;
      const maxOffsetY = (drawH - boxSize) / 2;
      const offsetX = (cropX / 100) * maxOffsetX;
      const offsetY = (cropY / 100) * maxOffsetY;

      const centerX = startX + drawW / 2 + offsetX;
      const centerY = startY + drawH / 2 + offsetY;

      // Calculate crop box left & top
      const cropLeft = centerX - boxSize / 2;
      const cropTop = centerY - boxSize / 2;

      // 3. Draw semi-transparent dark mask overlay
      origCtx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      origCtx.fillRect(0, 0, cw, ch);

      // 4. Cut out the transparent square region (composite operation)
      origCtx.globalCompositeOperation = 'destination-out';
      origCtx.fillStyle = '#FFFFFF';
      origCtx.fillRect(cropLeft, cropTop, boxSize, boxSize);
      origCtx.globalCompositeOperation = 'source-over';

      // 5. Draw clean white frame with target indicator
      origCtx.strokeStyle = '#3B82F6'; // premium blue outline
      origCtx.lineWidth = 2;
      origCtx.strokeRect(cropLeft, cropTop, boxSize, boxSize);

      // Draw corner crop marks
      origCtx.fillStyle = '#3B82F6';
      const markSize = 8;
      // top-left
      origCtx.fillRect(cropLeft - 2, cropTop - 2, markSize, 2);
      origCtx.fillRect(cropLeft - 2, cropTop - 2, 2, markSize);
      // top-right
      origCtx.fillRect(cropLeft + boxSize - markSize + 2, cropTop - 2, markSize, 2);
      origCtx.fillRect(cropLeft + boxSize, cropTop - 2, 2, markSize);
      // bottom-left
      origCtx.fillRect(cropLeft - 2, cropTop + boxSize, markSize, 2);
      origCtx.fillRect(cropLeft - 2, cropTop + boxSize - markSize + 2, 2, markSize);
      // bottom-right
      origCtx.fillRect(cropLeft + boxSize - markSize + 2, cropTop + boxSize, markSize, 2);
      origCtx.fillRect(cropLeft + boxSize, cropTop + boxSize - markSize + 2, 2, markSize);

      // 6. Generate cropped preview
      // Scale coordinates back to original image pixels
      const scaleX = img.width / drawW;
      const scaleY = img.height / drawH;

      // crop coordinates relative to the drawn image bounds startX/startY
      const relativeCropLeft = cropLeft - startX;
      const relativeCropTop = cropTop - startY;

      const imgCropX = relativeCropLeft * scaleX;
      const imgCropY = relativeCropTop * scaleY;
      const imgCropW = boxSize * scaleX;
      const imgCropH = boxSize * scaleY;

      // Clear and draw on preview canvas at 480x480 resolution
      prevCtx.fillStyle = '#FFFFFF';
      prevCtx.fillRect(0, 0, prevCanvas.width, prevCanvas.height);
      prevCtx.drawImage(
        img,
        imgCropX, imgCropY, imgCropW, imgCropH,
        0, 0, prevCanvas.width, prevCanvas.height
      );
    };
  }, [showCropModal, cropImageSrc, cropZoom, cropX, cropY]);

  const selectedCount = extractedProducts.filter(p => p.include).length;

  return (
    <div className="admin-pdf-import-root font-body">

      {/* ── STEP 1: Upload ─────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="pdf-upload-view animate-fade-in">
          
          {/* Hero Section */}
          <div className="pdf-hero-section">
            <h1 className="pdf-hero-title font-heading">Import Catalog via PDF</h1>
            <p className="pdf-hero-desc font-body">
              Upload a catalog PDF and automatically extract product information from every page.
            </p>
            <div className="pdf-feature-badges">
              <span className="badge-item">✓ Model Number Extraction</span>
              <span className="badge-item">✓ Size Detection</span>
              <span className="badge-item">✓ PKG Number Detection</span>
              <span className="badge-item">✓ Product Image Capture</span>
            </div>
          </div>

          <div className="pdf-container-split">
            
            {/* Left: Info Card */}
            <div className="pdf-info-card">
              <div className="pdf-info-header">
                <span className="pdf-card-icon">📄</span>
                <h3 className="pdf-info-title font-heading">Upload Catalogue PDF</h3>
              </div>
              <p className="pdf-info-desc font-body">
                Upload your catalog PDF file. The system will scan each page and automatically extract product information.
              </p>
              <div className="pdf-features-list">
                <h4 className="font-heading">Features List:</h4>
                <ul>
                  <li>• Model Number</li>
                  <li>• Size</li>
                  <li>• PKG Number</li>
                  <li>• Product Image</li>
                </ul>
              </div>
              <div className="pdf-max-size-footer">
                <span className="label">Max File Size:</span>
                <span className="val">50 MB</span>
              </div>
            </div>

            {/* Right: Upload Area & Progress Card */}
            <div className="pdf-upload-card">
              <input
                type="file"
                accept=".pdf"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />

              {!selectedFile ? (
                /* Drag and Drop Zone */
                <div 
                  className={`pdf-drag-drop-zone ${isDragging ? 'drag-active' : ''}`}
                  onClick={handleSelectFile}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files[0];
                    if (file) {
                      const event = { target: { files: [file] } };
                      handleFileChange(event);
                    }
                  }}
                >
                  <div className="pdf-upload-icon-wrapper">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="17 8 12 3 7 8"></polyline>
                      <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                  </div>
                  <h3 className="drag-title font-heading">Drag & Drop PDF Here</h3>
                  <p className="drag-subtitle font-body">or click to browse files</p>
                  
                  <div className="supported-badges">
                    <span className="badge pdf-badge">PDF</span>
                    <span className="badge size-badge">50MB MAX</span>
                  </div>
                </div>
              ) : (
                /* Selected File Preview & Processing Status */
                <div className="pdf-progress-preview-card">
                  {/* File Info Block */}
                  <div className="preview-file-info">
                    <div className="file-icon">📄</div>
                    <div className="file-details">
                      <h4 className="file-name font-heading">{selectedFile.name}</h4>
                      <p className="file-size font-body">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB &nbsp;|&nbsp; 
                        <span className="status-highlight">
                          {progress === 100 ? "Complete" : `Processing (${progress}%)`}
                        </span>
                      </p>
                    </div>
                    {/* Remove File Option */}
                    <button 
                      type="button" 
                      className="remove-file-btn" 
                      onClick={() => {
                        setSelectedFile(null);
                        setStep(1);
                        setLoadingText('');
                        setProgress(0);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      title="Remove File"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Processing Section */}
                  {loadingText && (
                    <div className="processing-status-wrapper">
                      <div className="animated-progress-bar">
                        <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                      </div>
                      
                      <div className="status-milestones font-body">
                        <div className="milestone-item">
                          <span className="bullet active">•</span>
                          <span className={progress >= 10 ? "active" : ""}>Scanning PDF...</span>
                        </div>
                        <div className="milestone-item">
                          <span className={`bullet ${progress >= 25 ? 'active' : ''}`}>•</span>
                          <span className={progress >= 25 ? "active" : ""}>Extracting Model Numbers...</span>
                        </div>
                        <div className="milestone-item">
                          <span className={`bullet ${progress >= 40 ? 'active' : ''}`}>•</span>
                          <span className={progress >= 40 ? "active" : ""}>Extracting Product Images...</span>
                        </div>
                        <div className="milestone-item">
                          <span className={`bullet ${progress >= 90 ? 'active' : ''}`}>•</span>
                          <span className={progress >= 90 ? "active" : ""}>Preparing Products...</span>
                        </div>
                      </div>

                      <div className="current-extraction-status">
                        <div className="extraction-spinner"></div>
                        <span className="status-text font-body">{loadingText}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

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
              onClick={() => { setStep(1); setExtractedProducts([]); setSelectedFile(null); }}
              className="btn-secondary"
              style={{ height: '40px', padding: '0 16px', fontSize: '11px' }}
            >
              ← Upload Different PDF
            </button>
          </div>

          {/* Cards Grid */}
          <div className="pdf-cards-grid">
            {extractedProducts.map((p, index) => {
              const isReview = p.status === 'Needs Review';
              const isStandardSize = sizeOptions.includes(p.size);

              return (
                <div
                  key={p.tempId}
                  className={`pdf-product-card ${p.include ? '' : 'card-excluded'} animate-fade-in`}
                >
                  <div className="card-split-container">
                    
                    {/* Left Column: Details form */}
                    <div className="card-left-form">
                      <div className="card-header-split">
                        <span className="card-page-label font-body">PAGE {p.pageNum}</span>
                        <div className="card-header-actions">
                          <span className={`card-status-badge font-body ${isReview ? 'status-review' : 'status-ready'}`}>
                            {isReview ? '⚠ Needs Review' : '✓ Ready'}
                          </span>
                          <label className="card-checkbox-label font-body">
                            <input
                              type="checkbox"
                              checked={p.include}
                              onChange={() => toggleInclude(p.tempId)}
                            />
                            <span>Include</span>
                          </label>
                        </div>
                      </div>

                      <div className="card-form-fields-split">
                        {/* Model Number */}
                        <div className="form-group">
                          <label className="form-label">MODEL NO *</label>
                          <input
                            type="text"
                            className={`form-input ${!p.modelNumber ? 'input-error-state' : ''}`}
                            placeholder="Needs Review"
                            value={p.modelNumber}
                            onChange={(e) => updateCardField(p.tempId, 'modelNumber', e.target.value)}
                            disabled={!p.include}
                          />
                        </div>

                        {/* Size Selector */}
                        <div className="form-group">
                          <label className="form-label">SIZE DIMENSIONS *</label>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <select
                              className="form-input"
                              value={isStandardSize ? p.size : (p.size === '' ? 'Custom' : 'Custom')}
                              onChange={(e) => handleSizeSelectChange(p.tempId, e.target.value)}
                              disabled={!p.include}
                            >
                              <option value="">Select Size</option>
                              {sizeOptions.map(sz => <option key={sz} value={sz}>{sz}</option>)}
                              <option value="Custom">Custom</option>
                            </select>

                            {(!isStandardSize || p.size === '') && (
                              <input
                                type="text"
                                className={`form-input ${!p.size ? 'input-error-state' : ''}`}
                                placeholder="e.g. 300 × 300 MM"
                                value={p.size}
                                onChange={(e) => updateCardField(p.tempId, 'size', e.target.value)}
                                disabled={!p.include}
                              />
                            )}
                          </div>
                        </div>

                        {/* PKG No */}
                        <div className="form-group">
                          <label className="form-label">PKG NO *</label>
                          <input
                            type="text"
                            className={`form-input ${!p.packageNo ? 'input-error-state' : ''}`}
                            placeholder="Needs Review"
                            value={p.packageNo}
                            onChange={(e) => updateCardField(p.tempId, 'packageNo', e.target.value)}
                            disabled={!p.include}
                          />
                        </div>

                        {/* Stock / Available Products */}
                        <div className="form-group">
                          <label className="form-label">STOCK / AVAILABLE PRODUCTS *</label>
                          <input
                            type="number"
                            className={`form-input ${!p.stockCount ? 'input-error-state' : ''}`}
                            placeholder="e.g. 20"
                            value={p.stockCount}
                            onChange={(e) => updateCardField(p.tempId, 'stockCount', Number(e.target.value))}
                            disabled={!p.include}
                          />
                        </div>
                      </div>

                      {/* Card Level Save Button */}
                      <div className="card-actions-split">
                        <button
                          type="button"
                          className="btn-primary card-save-btn"
                          disabled={!p.include || (!p.modelNumber && !p.size && !p.packageNo)}
                          onClick={() => handleSaveSingle(p)}
                        >
                          SAVE TO CATALOGUE
                        </button>
                      </div>
                    </div>

                    {/* Right Column: Image Preview & Cropping */}
                    <div className="card-right-preview">
                      <div className="card-image-preview-split">
                        <img src={p.images[0]} alt={`Page ${p.pageNum}`} />
                        {!p.include && <div className="card-skip-overlay font-body">SKIPPED</div>}
                      </div>
                      
                      <button
                        type="button"
                        className="btn-secondary card-edit-image-btn font-body"
                        onClick={() => handleOpenCropper(p)}
                        disabled={!p.include}
                        style={{ marginTop: '12px', width: '100%', height: '36px', fontSize: '11px', fontWeight: '700' }}
                      >
                        ✂ EDIT IMAGE
                      </button>
                    </div>

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
          <div className="success-icon-badge" style={{ backgroundColor: failedCount === 0 ? '#D1FAE5' : '#FEF3C7', color: failedCount === 0 ? '#065F46' : '#92400E' }}>
            {failedCount === 0 ? '✓' : '⚠'}
          </div>
          <h2 className="font-heading" style={{ fontSize: '26px', color: 'var(--text-primary)', marginBottom: '8px' }}>
            Import Complete
          </h2>
          <p className="font-body" style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '16px' }}>
            {failedCount === 0 
              ? `${savedCount} of ${savedCount} products added to catalogue successfully.`
              : `${savedCount} of ${savedCount + failedCount} added successfully, ${failedCount} failed.`
            }
          </p>
          <div className="success-actions" style={{ width: '100%', maxWidth: '500px' }}>
            <Link to="/admin/products" className="btn-primary success-btn">
              View Products
            </Link>
            <button
              onClick={() => { setStep(1); setExtractedProducts([]); setSavedCount(0); setFailedCount(0); setSelectedFile(null); }}
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

      {/* ── Save Processing Overlay ──────────────────────────────────────────────── */}
      {saveProcessing && (
        <div className="modal-overlay">
          <div className="modal-card animate-fade-in" style={{ maxWidth: '400px', textAlign: 'center', padding: '32px' }}>
             <span className="loading-spinner" style={{ width: '32px', height: '32px', border: '3px solid #E2E8F0', borderTop: '3px solid var(--accent-blue)', borderRadius: '50%', display: 'inline-block', marginBottom: '16px', animation: 'spin 1s linear infinite' }}></span>
             <h3 className="font-heading" style={{ fontSize: '18px', color: 'var(--text-primary)' }}>Saving Products...</h3>
             <p className="font-body" style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>Saving products to catalogue, please wait...</p>
          </div>
        </div>
      )}

      {/* ── Crop Modal ────────────────────────────────────────────────── */}
      {showCropModal && (
        <div className="modal-overlay">
          <div className="modal-card animate-fade-in" style={{ maxWidth: '800px', width: '90%' }}>
            <button 
              className="modal-close-btn" 
              onClick={() => {
                setShowCropModal(false);
                setCropTargetId(null);
                setCropImageSrc('');
              }}
              aria-label="Close"
            >
              ✕
            </button>
            <h3 className="modal-title font-heading">Crop Product Image</h3>
            <p className="modal-desc font-body" style={{ marginBottom: '16px' }}>
              Adjust the crop area using the zoom and pan sliders below to frame the clock perfectly.
            </p>

            <div className="cropper-workspace">
              {/* Left Column: Original Canvas */}
              <div className="cropper-panel">
                <span className="cropper-label font-body">ORIGINAL IMAGE & CROP AREA</span>
                <div className="canvas-container">
                  <canvas
                    ref={originalCanvasRef}
                    width={360}
                    height={360}
                    className="cropper-canvas"
                  />
                </div>
              </div>

              {/* Right Column: Cropped Live Preview */}
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

            {/* Range Sliders */}
            <div className="cropper-controls font-body">
              <div className="control-row">
                <label>🔍 CROP SIZE (ZOOM)</label>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={cropZoom}
                  onChange={(e) => setCropZoom(Number(e.target.value))}
                  className="cropper-slider"
                />
              </div>

              <div className="control-row">
                <label>↔ HORIZONTAL POSITION (X)</label>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={cropX}
                  onChange={(e) => setCropX(Number(e.target.value))}
                  className="cropper-slider"
                />
              </div>

              <div className="control-row">
                <label>↕ VERTICAL POSITION (Y)</label>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={cropY}
                  onChange={(e) => setCropY(Number(e.target.value))}
                  className="cropper-slider"
                />
              </div>
            </div>

            <div className="modal-actions-row" style={{ marginTop: '24px' }}>
              <button onClick={handleSaveCrop} className="btn-primary modal-btn">
                Apply & Save Crop
              </button>
              <button
                onClick={() => {
                  setShowCropModal(false);
                  setCropTargetId(null);
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
        /* ── Crop Modal Popup Styles ── */
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

        .modal-card {
          background-color: #ffffff;
          border-radius: 12px;
          padding: 32px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          position: relative;
          max-height: 90vh;
          overflow-y: auto;
        }
        
        .modal-close-btn {
          position: absolute;
          top: 20px;
          right: 20px;
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

        .modal-title {
          font-size: 20px;
          color: var(--text-primary);
          margin-top: 0;
          margin-bottom: 8px;
        }

        .modal-desc {
          color: var(--text-secondary);
          font-size: 14px;
        }

        .modal-actions-row {
          display: flex;
          justify-content: flex-end;
          gap: 16px;
          margin-top: 24px;
        }

        /* ── Cards Grid Layout ── */
        .pdf-cards-grid {
          display: flex;
          flex-direction: column;
          gap: 32px;
          margin-top: 24px;
          margin-bottom: 24px;
        }

        .pdf-product-card {
          background-color: #ffffff;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          padding: 32px;
          box-shadow: var(--card-shadow);
          position: relative;
          transition: transform var(--transition-speed), box-shadow var(--transition-speed), opacity var(--transition-speed);
        }

        .pdf-product-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.02);
        }

        .card-excluded {
          opacity: 0.5;
        }

        /* Split layout container */
        .card-split-container {
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 36px;
          width: 100%;
        }

        .card-left-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .card-header-split {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 12px;
        }

        .card-page-label {
          font-size: 11px;
          font-weight: 700;
          color: var(--text-muted);
          letter-spacing: 0.05em;
        }

        .card-header-actions {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .card-status-badge {
          font-size: 10px;
          font-weight: 700;
          padding: 4px 8px;
          border-radius: 3px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .status-ready {
          background-color: #D1FAE5;
          color: #065F46;
        }

        .status-review {
          background-color: #FEF3C7;
          color: #92400E;
        }

        .card-checkbox-label {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
          cursor: pointer;
        }

        .card-checkbox-label input {
          width: 16px;
          height: 16px;
          accent-color: var(--accent-blue);
          cursor: pointer;
        }

        /* Card Form Fields */
        .card-form-fields-split {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px 24px;
        }

        @media (max-width: 600px) {
          .card-form-fields-split {
            grid-template-columns: 1fr;
          }
        }

        /* Input error states */
        .input-error-state {
          border-color: #EF4444 !important;
          background-color: #FFF5F5;
        }

        /* Card actions */
        .card-actions-split {
          margin-top: 12px;
          border-top: 1px solid var(--border-color);
          padding-top: 20px;
        }

        .card-save-btn {
          width: 100%;
          height: 44px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.02em;
        }

        /* Right Column: Image Preview & Cropping */
        .card-right-preview {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          width: 100%;
        }

        .card-image-preview-split {
          width: 100%;
          aspect-ratio: 1/1;
          border-radius: 6px;
          background-color: #F8FAFC;
          border: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          position: relative;
        }

        .card-image-preview-split img {
          max-width: 92%;
          max-height: 92%;
          object-fit: contain;
          transition: transform 0.3s ease;
        }

        .pdf-product-card:hover .card-image-preview-split img {
          transform: scale(1.03);
        }

        .card-skip-overlay {
          position: absolute;
          inset: 0;
          background: rgba(255, 255, 255, 0.75);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 800;
          color: var(--text-muted);
          letter-spacing: 0.1em;
        }

        .card-edit-image-btn {
          border-color: var(--border-color);
          color: var(--text-secondary);
          transition: background-color var(--transition-speed), border-color var(--transition-speed);
        }

        .card-edit-image-btn:hover:not(:disabled) {
          background-color: #F1F5F9;
          border-color: var(--text-secondary);
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

        .cropper-canvas {
          max-width: 100%;
          height: auto;
          background: #FFF;
          border-radius: 4px;
        }

        .preview-canvas {
          max-width: 100%;
          height: auto;
          background: #FFF;
          border-radius: 4px;
          box-shadow: 0 4px 10px rgba(0,0,0,0.05);
        }

        .cropper-controls {
          display: flex;
          flex-direction: column;
          gap: 12px;
          background-color: #F8FAFC;
          padding: 16px;
          border-radius: 6px;
          border: 1px solid var(--border-color);
        }

        .control-row {
          display: grid;
          grid-template-columns: 180px 1fr;
          align-items: center;
          gap: 12px;
        }

        @media (max-width: 600px) {
          .control-row {
            grid-template-columns: 1fr;
            gap: 4px;
          }
        }

        .control-row label {
          font-size: 11px;
          font-weight: 700;
          color: var(--text-secondary);
        }

        .cropper-slider {
          width: 100%;
          height: 6px;
          background-color: #E2E8F0;
          border-radius: 3px;
          outline: none;
          accent-color: var(--accent-blue);
          cursor: pointer;
        }

        /* ── Static save bar ── */
        .bulk-save-action-drawer {
          background-color: #F8FAFC;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 24px 32px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 16px;
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
        @media (max-width: 768px) {
          .bulk-save-action-drawer {
            flex-direction: column;
            gap: 16px;
            text-align: center;
            padding: 20px;
          }
          .bulk-save-drawer-btn {
            width: 100%;
          }
          .card-split-container {
            grid-template-columns: 1fr;
            gap: 24px;
          }
          .card-right-preview {
            order: -1;
          }
          .crop-modal-content {
            flex-direction: column;
            overflow-y: auto;
          }
          .crop-preview-side {
            width: 100%;
          }
          .form-grid-2col {
            grid-template-columns: 1fr;
          }
        }

        /* ── Redesigned PDF Import Upload Screen ── */
        .pdf-upload-view {
          display: flex;
          flex-direction: column;
          gap: 32px;
          max-width: 1000px;
          margin: 0 auto;
          padding: 20px 0;
        }

        /* Hero Section */
        .pdf-hero-section {
          text-align: center;
          background: linear-gradient(135deg, #1e293b, #0f172a);
          padding: 40px 24px;
          border-radius: 12px;
          color: #ffffff;
          box-shadow: var(--card-shadow);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .pdf-hero-title {
          font-size: 28px;
          font-weight: 700;
          letter-spacing: -0.02em;
          margin: 0;
        }

        .pdf-hero-desc {
          font-size: 15px;
          color: #94a3b8;
          max-width: 600px;
          margin: 0;
          line-height: 1.6;
        }

        .pdf-feature-badges {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          justify-content: center;
          margin-top: 8px;
        }

        .pdf-feature-badges .badge-item {
          background-color: rgba(59, 130, 246, 0.15);
          color: #60a5fa;
          border: 1px solid rgba(59, 130, 246, 0.3);
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.02em;
        }

        /* Container Split */
        .pdf-container-split {
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          gap: 32px;
        }

        @media (max-width: 768px) {
          .pdf-container-split {
            grid-template-columns: 1fr;
          }
        }

        /* Info Card */
        .pdf-info-card {
          background-color: #ffffff;
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 32px;
          box-shadow: var(--card-shadow);
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .pdf-info-header {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .pdf-card-icon {
          font-size: 24px;
        }

        .pdf-info-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
        }

        .pdf-info-desc {
          font-size: 13.5px;
          color: var(--text-secondary);
          line-height: 1.6;
          margin: 0;
        }

        .pdf-features-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .pdf-features-list h4 {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
          margin: 0;
        }

        .pdf-features-list ul {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .pdf-features-list li {
          font-size: 13.5px;
          color: var(--text-primary);
          font-weight: 600;
        }

        .pdf-max-size-footer {
          border-top: 1px solid var(--border-color);
          padding-top: 16px;
          margin-top: auto;
          display: flex;
          justify-content: space-between;
          font-size: 13px;
        }

        .pdf-max-size-footer .label {
          color: var(--text-muted);
        }

        .pdf-max-size-footer .val {
          font-weight: 700;
          color: var(--text-primary);
        }

        /* Upload Card & Area */
        .pdf-upload-card {
          background-color: #ffffff;
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 32px;
          box-shadow: var(--card-shadow);
          display: flex;
          flex-direction: column;
          justify-content: center;
          min-height: 320px;
        }

        .pdf-drag-drop-zone {
          border: 2px dashed #cbd5e1;
          border-radius: 8px;
          padding: 40px 24px;
          text-align: center;
          cursor: pointer;
          transition: all var(--transition-speed);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          background-color: #f8fafc;
        }

        .pdf-drag-drop-zone:hover, .pdf-drag-drop-zone.drag-active {
          border-color: var(--accent-blue);
          background-color: rgba(59, 130, 246, 0.02);
        }

        .pdf-upload-icon-wrapper {
          color: #94a3b8;
          transition: color 0.2s ease;
        }

        .pdf-drag-drop-zone:hover .pdf-upload-icon-wrapper {
          color: var(--accent-blue);
        }

        .drag-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
        }

        .drag-subtitle {
          font-size: 13px;
          color: var(--text-muted);
          margin: 0;
        }

        .supported-badges {
          display: flex;
          gap: 8px;
          margin-top: 8px;
        }

        .supported-badges .badge {
          font-size: 9px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 4px;
        }

        .pdf-badge {
          background-color: #fee2e2;
          color: #ef4444;
        }

        .size-badge {
          background-color: #f1f5f9;
          color: #475569;
        }

        /* File Preview & Progress Card */
        .pdf-progress-preview-card {
          display: flex;
          flex-direction: column;
          gap: 24px;
          width: 100%;
        }

        .preview-file-info {
          display: flex;
          align-items: center;
          gap: 16px;
          background-color: #f8fafc;
          border: 1px solid var(--border-color);
          padding: 16px;
          border-radius: 8px;
          position: relative;
        }

        .preview-file-info .file-icon {
          font-size: 28px;
        }

        .preview-file-info .file-details {
          display: flex;
          flex-direction: column;
          gap: 4px;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .preview-file-info .file-name {
          font-size: 14px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .preview-file-info .file-size {
          font-size: 12px;
          color: var(--text-muted);
          margin: 0;
        }

        .preview-file-info .status-highlight {
          color: var(--accent-blue);
          font-weight: 600;
        }

        .remove-file-btn {
          position: absolute;
          top: 16px;
          right: 16px;
          background: transparent;
          border: none;
          color: var(--text-muted);
          font-size: 16px;
          cursor: pointer;
          transition: color 0.2s ease;
        }

        .remove-file-btn:hover {
          color: #ef4444;
        }

        /* Processing progress styles */
        .processing-status-wrapper {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .animated-progress-bar {
          height: 6px;
          width: 100%;
          background-color: #e2e8f0;
          border-radius: 3px;
          overflow: hidden;
        }

        .animated-progress-bar .progress-fill {
          height: 100%;
          background-color: var(--accent-blue);
          border-radius: 3px;
          transition: width 0.3s ease;
        }

        .status-milestones {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .milestone-item {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 13px;
          color: var(--text-muted);
        }

        .milestone-item .bullet {
          font-size: 18px;
          line-height: 1;
          color: #cbd5e1;
          transition: color 0.3s ease;
        }

        .milestone-item .bullet.active {
          color: var(--accent-blue);
        }

        .milestone-item span.active {
          color: var(--text-primary);
          font-weight: 600;
        }

        .current-extraction-status {
          display: flex;
          align-items: center;
          gap: 10px;
          background-color: #f0f7ff;
          border: 1px solid rgba(59, 130, 246, 0.15);
          padding: 12px 16px;
          border-radius: 6px;
          margin-top: 4px;
        }

        .extraction-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(59, 130, 246, 0.2);
          border-top: 2px solid var(--accent-blue);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .status-text {
          font-size: 12.5px;
          font-weight: 600;
          color: #1e40af;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }      `}</style>
    </div>
  );
};

export default AdminPdfImport;
