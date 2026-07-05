import path from 'path';
import { fileURLToPath } from 'url';
import expressApp from './server/app.js';
import express from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from dist
expressApp.use(express.static(path.join(__dirname, 'dist')));

// Fallback for React Router
expressApp.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found: ' + req.path });
  }
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Generic Error Handler to ensure JSON errors
expressApp.use((err, req, res, next) => {
  console.error('[Express Error]', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 3000;
expressApp.listen(PORT, () => {
  console.log(`DEVI TIMES secure production server running on port ${PORT}`);
});
