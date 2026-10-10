import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

function samplePhotosPlugin() {
  const sampleDir = path.resolve(__dirname, '../sample-photos');
  const publicSampleDir = path.resolve(__dirname, 'public/sample-photos');

  const sync = () => {
    try {
      if (!fs.existsSync(sampleDir)) fs.mkdirSync(sampleDir, { recursive: true });
      if (!fs.existsSync(publicSampleDir)) fs.mkdirSync(publicSampleDir, { recursive: true });

      const files = fs.readdirSync(sampleDir);
      for (const file of files) {
        const src = path.join(sampleDir, file);
        const dest = path.join(publicSampleDir, file);
        if (fs.statSync(src).isFile() && !fs.existsSync(dest)) {
          fs.copyFileSync(src, dest);
        }
      }
    } catch (e) {
      console.warn('[samplePhotosPlugin sync]', e.message);
    }
  };

  return {
    name: 'sample-photos-sync',
    configureServer(server) {
      sync();

      try {
        server.watcher.add(sampleDir);
        server.watcher.on('add', (filePath) => {
          if (filePath.startsWith(sampleDir)) {
            sync();
          }
        });
      } catch (e) {}

      // Internal endpoint to list all files in sample-photos
      server.middlewares.use('/api/sample-photos-list', (req, res) => {
        sync();
        try {
          const files = fs.readdirSync(publicSampleDir).filter((f) =>
            /\.(jpe?g|png|webp|gif|svg|avif|bmp|tiff)$/i.test(f)
          );
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true, files }));
        } catch (e) {
          res.statusCode = 500;
          res.end(JSON.stringify({ success: false, error: e.message, files: [] }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), samplePhotosPlugin()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        // Bypass proxy for sample photos list handled by Vite plugin
        bypass: (req) => {
          if (req.url.startsWith('/api/sample-photos-list')) {
            return req.url;
          }
        },
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
