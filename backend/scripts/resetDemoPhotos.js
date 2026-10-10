require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const { resetDemoPhotos } = require('../services/demoImportService');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/memento';

async function run() {
  console.log('====================================================');
  console.log('       MEMENTO — Safe Demo Photo Reset             ');
  console.log('====================================================');
  console.log('NOTE: This will ONLY remove photos and albums tagged with isDemo: true.');
  console.log('User-uploaded photos and custom albums will remain safe and untouched.');
  console.log('');

  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    console.log('✅ Connected to MongoDB.');

    const summary = await resetDemoPhotos();

    console.log('');
    console.log('---------------- Reset Summary ----------------');
    console.log(`Demo photos removed from DB   : ${summary.deletedPhotos}`);
    console.log(`Demo files deleted from disk  : ${summary.deletedFiles}`);
    console.log(`Demo albums removed           : ${summary.deletedAlbums}`);
    console.log('====================================================');
  } catch (err) {
    console.error('❌ Error during demo reset:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
