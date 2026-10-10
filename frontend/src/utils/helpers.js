/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Format a date to a readable string
 */
export function formatDate(dateStr, options = {}) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
  });
}

/**
 * Get month name from month number (1-12)
 */
export function getMonthName(month) {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return months[month - 1] || '';
}

/**
 * Format relative time (e.g., "2 days ago")
 */
export function formatRelative(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 30) return formatDate(dateStr, { year: 'numeric', month: 'short', day: 'numeric' });
  if (days > 0) return `${days} day${days === 1 ? '' : 's'} ago`;
  if (hours > 0) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  if (minutes > 0) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  return 'Just now';
}

/**
 * Truncate string to n characters
 */
export function truncate(str, n = 40) {
  if (!str) return '';
  return str.length > n ? str.substring(0, n) + '…' : str;
}

/**
 * Validate image file
 */
export function validateImageFile(file) {
  const ALLOWED = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/tiff', 'image/bmp', 'image/heic', 'image/heif'];
  const MAX_SIZE = 50 * 1024 * 1024;
  if (!ALLOWED.includes(file.type)) {
    return { valid: false, error: `${file.name}: File type not supported.` };
  }
  if (file.size > MAX_SIZE) {
    return { valid: false, error: `${file.name}: File exceeds 50 MB limit.` };
  }
  return { valid: true };
}

/**
 * Group photos by year-month
 */
export function groupPhotosByMonth(photos) {
  const groups = {};
  for (const photo of photos) {
    const date = new Date(photo.captureDate || photo.createdAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!groups[key]) groups[key] = { year: date.getFullYear(), month: date.getMonth() + 1, photos: [] };
    groups[key].photos.push(photo);
  }
  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([, val]) => val);
}
