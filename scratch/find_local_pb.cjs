const fs = require('fs');
const path = require('path');

const searchDirs = [
  'c:\\Users\\admin\\Desktop',
  'c:\\Users\\admin\\Downloads'
];

function search(dir) {
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      let stats;
      try {
        stats = fs.statSync(fullPath);
      } catch (e) {
        continue;
      }
      if (stats.isDirectory()) {
        if (file.toLowerCase() === 'pb_data') {
          console.log(`FOUND pb_data at: ${fullPath}`);
        }
        // Don't recurse into node_modules or .git or brain
        if (file !== 'node_modules' && file !== '.git' && file !== 'brain' && file !== 'AppData') {
          search(fullPath);
        }
      } else {
        if (file.toLowerCase() === 'pocketbase.exe') {
          console.log(`FOUND pocketbase.exe at: ${fullPath}`);
        }
      }
    }
  } catch (err) {
    // ignore
  }
}

console.log("Starting search for pocketbase.exe and pb_data...");
for (const dir of searchDirs) {
  search(dir);
}
console.log("Search finished.");
