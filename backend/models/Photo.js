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
    aiTags: {
      type: [String],
      default: [],
    },
    aiDescription: {
      type: String,
      default: '',
      trim: true,
    },
    dominantColors: {
      type: [String],
      default: [],
    },
    blurScore: {
      type: Number,
      default: 0,
    },
    captureDate: {
      type: Date,
      default: null,
    },
    isFavorite: {
      type: Boolean,
      default: false,
    },
    isDemo: {
      type: Boolean,
      default: false,
      index: true,
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

// Compound text search index including AI tags and AI descriptions
photoSchema.index({
  originalName: 'text',
  description: 'text',
  tags: 'text',
  aiTags: 'text',
  aiDescription: 'text',
});

module.exports = mongoose.model('Photo', photoSchema);
