require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const { importDemoPhotos, getDemoDirectory } = require('../services/demoImportService');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/memento';

async function run() {
  console.log('====================================================');
  console.log('       MEMENTO — Demo Photo Library Importer        ');
  console.log('====================================================');
  console.log(`Demo folder source : ${getDemoDirectory()}`);
  console.log(`MongoDB target URI : ${MONGO_URI}`);
  console.log('');

  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    console.log('✅ Connected to MongoDB.');

    const summary = await importDemoPhotos();

    console.log('');
    console.log('---------------- Import Summary ----------------');
    console.log(`Total images scanned : ${summary.totalScanned}`);
    console.log(`Successfully imported: ${summary.imported.length}`);
    console.log(`Skipped (duplicates) : ${summary.skippedDuplicates.length}`);
    console.log(`Failed               : ${summary.failed.length}`);
    if (summary.albumsCreated.length > 0) {
      console.log(`Albums created       : ${summary.albumsCreated.join(', ')}`);
    }

    if (summary.imported.length > 0) {
      console.log('');
      console.log('Imported Photos:');
      summary.imported.forEach((p, idx) => {
        console.log(`  ${idx + 1}. ${p.title} (${p.filename}) - ${p.dimensions}`);
      });
    }

    if (summary.skippedDuplicates.length > 0) {
      console.log('');
      console.log('Skipped Duplicates (SHA-256 match):');
      summary.skippedDuplicates.forEach((d, idx) => {
        console.log(`  ${idx + 1}. ${d.file} -> already in library`);
      });
    }

    if (summary.failed.length > 0) {
      console.log('');
      console.log('Failures:');
      summary.failed.forEach((f, idx) => {
        console.log(`  ${idx + 1}. ${f.file}: ${f.reason}`);
      });
    }

    console.log('====================================================');
  } catch (err) {
    console.error('❌ Error during demo import:', err.message);
    if (err.name === 'MongooseServerSelectionError') {
      console.error('   Please ensure MongoDB is running or configure MONGO_URI in backend/.env');
    }
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
