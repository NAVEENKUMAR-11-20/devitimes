import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import expressApp from './server/app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(expressApp);

// Serve static files from dist
app.use(express.static(path.join(__dirname, 'dist')));
// Fallback for React Router
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found: ' + req.path });
  }
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`DEVI TIMES secure production server running on port ${PORT}`);
});
