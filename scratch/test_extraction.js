const getPercentile = (arr, pct) => {
  if (arr.length === 0) return 0;
  const idx = Math.floor((arr.length - 1) * pct);
  return arr[idx];
};

const extractFromPageText = (textItems) => {
  const spaceJoined = textItems.map(item => item.str).join(' ').replace(/\s+/g, ' ').trim();
  const noSpaceJoined = textItems.map(item => item.str).join('').replace(/\s+/g, ' ').trim();
  const lineJoined = textItems.map(item => item.str).join('\n').replace(/[^\S\n]+/g, ' ').trim();

  const searchTexts = [spaceJoined, noSpaceJoined, lineJoined];

  let modelNumber = '';
  let size = '';
  let packageNo = '';

  const modelPatterns = [
    /(?:MODEL|MOD|ART|ITEM|DESIGN|STYLE)\s*(?:NO\.?|NUMBER)?\s*[:.-]?\s*([a-z0-9-]+)/i,
    /\bM\.?\s*NO\.?\s*[:.-]?\s*([a-z0-9-]+)/i,
    /\b(\d{3,5})\b/
  ];

  const sizePatterns = [
    /(?:SIZE\s*[:.-]?\s*)?(\d{2,4}\s*(?:[Xx×\*]|to)\s*\d{2,4}\s*(?:MM|CM|INCH|INCHES)?)/i,
  ];

  const pkgPatterns = [
    /(?:PKG|PACKAGE|PACKING)\s*(?:NO\.?|QTY)?\s*[:.-]?\s*([a-z0-9-]+)/i,
    /\b(?:PKG|PCS)\s*[:.-]?\s*(\d+)/i,
  ];

  // 1. Extract Size first
  for (const text of searchTexts) {
    if (!size) {
      for (const pattern of sizePatterns) {
        const sMatch = text.match(pattern);
        if (sMatch && sMatch[1]) {
          let rawSize = sMatch[1].toUpperCase();
          const hasUnit = rawSize.endsWith('MM') || rawSize.endsWith('CM') || rawSize.endsWith('INCH') || rawSize.endsWith('INCHES');
          if (rawSize.endsWith('MM') && !rawSize.endsWith(' MM')) {
            rawSize = rawSize.slice(0, -2) + ' MM';
          } else if (!hasUnit) {
            rawSize = rawSize + ' MM';
          }
          size = rawSize.replace(/\s*[Xx×\*]\s*/g, ' × ').trim();
          break;
        }
      }
    }
  }

  // 2. Extract Model Number, removing size string if found to avoid digit confusion
  for (const text of searchTexts) {
    if (!modelNumber) {
      let cleanText = text;
      if (size) {
        const sizeCleanRegex = new RegExp(size.replace(/×/g, '[xX×*]'), 'gi');
        cleanText = cleanText.replace(sizeCleanRegex, '');
        const dimensions = size.split('×');
        if (dimensions.length === 2) {
          const d1 = dimensions[0].trim();
          const d2 = dimensions[1].replace('MM', '').trim();
          cleanText = cleanText.replace(new RegExp(`\\b${d1}\\b`, 'g'), '').replace(new RegExp(`\\b${d2}\\b`, 'g'), '');
        }
      }

      for (const pattern of modelPatterns) {
        const mMatch = cleanText.match(pattern);
        if (mMatch && mMatch[1]) {
          modelNumber = mMatch[1].trim();
          break;
        }
      }
    }
  }

  // 3. Extract Package Number
  for (const text of searchTexts) {
    if (!packageNo) {
      for (const pattern of pkgPatterns) {
        const pMatch = text.match(pattern);
        if (pMatch && pMatch[1]) {
          packageNo = pMatch[1].trim();
          break;
        }
      }
    }
  }

  const allFound = modelNumber && size; // packageNo is optional
  const status = allFound ? 'Ready' : 'Needs Review';

  return { modelNumber, size, packageNo, status };
};

const samples = [
  { str: "DEVI TIMES MODEL NO: 1221 SIZE: 480 × 380 MM PKG: 10" },
  { str: "M. NO. : 1221 SIZE : 440 x 320 MM PKG. 8" },
  { str: "M.NO. 505A 300x300mm PKG: 12" },
  { str: "1221 480 * 380 MM PKG: 15" },
  { str: "DESIGN NO. LUMI-99 400 × 400" },
];

samples.forEach(s => {
  const textItems = s.str.split(' ').map(w => ({ str: w }));
  const res = extractFromPageText(textItems);
  console.log(`Input: "${s.str}" -> Extracted:`, res);
});
