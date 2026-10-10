const crypto = require('crypto');
const fs = require('fs');

/**
 * Calculate SHA-256 checksum of a file
 * @param {string} filePath - Absolute path to the file
 * @returns {Promise<string>} - Hex-encoded SHA-256 hash
 */
function calculateChecksum(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);

    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', (err) => reject(err));
  });
}

/**
 * Safely delete a file (does not throw if file doesn't exist)
 * @param {string} filePath - Absolute path to the file
 */
async function safeDeleteFile(filePath) {
  try {
    await fs.promises.unlink(filePath);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      throw err;
    }
  }
}

/**
 * Sanitize a filename for safe filesystem storage
 * @param {string} filename
 * @returns {string}
 */
function sanitizeFilename(filename) {
  return filename
    .replace(/[^a-zA-Z0-9.\-_]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 200);
}

/**
 * Format bytes to human-readable string
 * @param {number} bytes
 * @returns {string}
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = { calculateChecksum, safeDeleteFile, sanitizeFilename, formatBytes };
