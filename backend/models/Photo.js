const mongoose = require('mongoose');

const photoSchema = new mongoose.Schema(
  {
    originalName: {
      type: String,
      required: true,
      trim: true,
    },
    storageName: {
      type: String,
      required: true,
      unique: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    width: {
      type: Number,
      default: null,
    },
    height: {
      type: Number,
      default: null,
    },
    checksum: {
      type: String,
      required: true,
      index: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    captureDate: {
      type: Date,
      default: null,
    },
    isFavorite: {
      type: Boolean,
      default: false,
    },
    albums: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Album',
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Text search index
photoSchema.index({ originalName: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Photo', photoSchema);
