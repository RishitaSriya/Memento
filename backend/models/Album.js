const mongoose = require('mongoose');

const albumSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    coverPhoto: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Photo',
      default: null,
    },
    photos: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Photo',
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Album', albumSchema);
