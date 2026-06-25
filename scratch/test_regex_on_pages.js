const sizeOptions = [
  '200 × 200 MM',
  '250 × 250 MM',
  '300 × 300 MM',
  '350 × 350 MM',
  '400 × 400 MM',
];

const extractFromPageText = (textItems) => {
  const spaceJoined = textItems.map(item => item.str).join(' ').replace(/\s+/g, ' ').trim();
  const noSpaceJoined = textItems.map(item => item.str).join('').replace(/\s+/g, ' ').trim();
  const lineJoined = textItems.map(item => item.str).join('\n').replace(/[^\S\n]+/g, ' ').trim();

  const searchTexts = [spaceJoined, noSpaceJoined, lineJoined];

  let modelNumber = '';
  let size = '';
  let packageNo = '';

  const sizePatterns = [
    /(?:SIZE\s*[:.-]?\s*)?(\d{2,4}\s*(?:[Xx×\*]|to)\s*\d{2,4}(?:\s*(?:[Xx×\*]|to)\s*\d{2,4})?\s*(?:MM|CM|INCH|INCHES)?)/i,
    /\b(\d{2,4}\s*(?:[Xx×\*]|to)\s*\d{2,4}(?:\s*(?:[Xx×\*]|to)\s*\d{2,4})?\s*(?:MM|CM|INCH|INCHES)?)/i
  ];

  const pkgPatterns = [
    /(?:PKG|PACKAGE|PACKING)\s*(?:N[O0]\.?|QTY)?\s*[:.-]?\s*([a-z0-9-]+)/i,
    /\b(?:PKG|PCS)\s*[:.-]?\s*(\d+)/i,
  ];

  const modelPatterns = [
    /\b(?:MODEL|MOD|ART|ITEM|DESIGN|STYLE)\b\s*(?:N[O0]\.?|NUMBER)?\s*[:.-]?\s*([a-z0-9-]+)/i,
    /\bM\.?\s*N[O0]\.?\s*[:.-]?\s*([a-z0-9-]+)/i,
    /\bM\/N\s*[:.-]?\s*([a-z0-9-]+)/i,
    /\bN[O0]\.?\s*[:.-]?\s*([a-z0-9-]+)/i,
    /\b(\d{3,5})\b/,
    /\b([a-z0-9]{3,6})\b/i
  ];

  // 1. Extract Size first
  let rawSizeMatch = '';
  for (const text of searchTexts) {
    if (!size) {
      for (const pattern of sizePatterns) {
        const sMatch = text.match(pattern);
        if (sMatch && sMatch[1]) {
          rawSizeMatch = sMatch[1];
          let rawSize = sMatch[1].toUpperCase().trim();
          const hasUnit = rawSize.endsWith('MM') || rawSize.endsWith('CM') || rawSize.endsWith('INCH') || rawSize.endsWith('INCHES');
          if (rawSize.endsWith('MM') && !rawSize.endsWith(' MM')) {
            rawSize = rawSize.slice(0, -2) + ' MM';
          } else if (rawSize.endsWith('CM') && !rawSize.endsWith(' CM')) {
            rawSize = rawSize.slice(0, -2) + ' CM';
          } else if (rawSize.endsWith('INCH') && !rawSize.endsWith(' INCH')) {
            rawSize = rawSize.slice(0, -4) + ' INCH';
          } else if (rawSize.endsWith('INCHES') && !rawSize.endsWith(' INCHES')) {
            rawSize = rawSize.slice(0, -6) + ' INCHES';
          } else if (!hasUnit) {
            rawSize = rawSize + ' MM';
          }
          size = rawSize.replace(/\s*(?:[Xx×\*]|TO)\s*/g, ' × ').trim();
          break;
        }
      }
    }
  }

  // 2. Extract Package Number next
  let rawPkgMatch = '';
  for (const text of searchTexts) {
    if (!packageNo) {
      for (const pattern of pkgPatterns) {
        const pMatch = text.match(pattern);
        if (pMatch && pMatch[1]) {
          rawPkgMatch = pMatch[0];
          packageNo = pMatch[1].trim();
          break;
        }
      }
    }
  }

  // 3. Extract Model Number
  for (const text of searchTexts) {
    if (!modelNumber) {
      let cleanText = text;
      if (rawSizeMatch) {
        cleanText = cleanText.replace(rawSizeMatch, '');
      }
      if (size) {
        const dimensions = size.split('×');
        for (let d of dimensions) {
          d = d.replace(/(?:MM|CM|INCH|INCHES)/i, '').trim();
          if (d) {
            const dRegex = new RegExp(`\\b${d}\\b`, 'g');
            cleanText = cleanText.replace(dRegex, '');
          }
        }
      }
      if (rawPkgMatch) {
        cleanText = cleanText.replace(rawPkgMatch, '');
      }
      if (packageNo) {
        cleanText = cleanText.replace(new RegExp(`\\b${packageNo}\\b`, 'g'), '');
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

  const allFound = modelNumber && size;
  const status = allFound ? 'Ready' : 'Needs Review';

  return { modelNumber, size, packageNo, status };
};

const texts = [
  "Page 68: ,(i.'lo'  QUARTZ  .   .  .. ..   liQ   Sapna   ,.. ..r   QU   ARTZ  ~g   3~  •   •   &   •   •  •  M   N0.1241 SIZE :   300   X   300   MM   , PKG :   52 Be   Inspired   By   Sapna",
  "Page 69: ,(i.'lo'  QUARTZ  .   .   '   .   . .   . Sapna  QUARTZ  M   N0.1231  SIZE:   310   X   310   MM,   PKG:   52  Be   Inspired   By   Sapna"
];

texts.forEach(t => {
  const words = t.split(' ').map(w => ({ str: w }));
  const res = extractFromPageText(words);
  console.log(`Input: "${t.substring(0, 40)}..." -> Extracted:`, res);
});
