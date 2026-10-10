const mongoose = require('mongoose');

const capsuleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    photos: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Photo',
      },
    ],
    unlockDate: {
      type: Date,
      required: true,
    },
    isLocked: {
      type: Boolean,
      default: true,
    },
    isDemo: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual to check if capsule has unlocked based on current time
capsuleSchema.virtual('isReadyToUnlock').get(function () {
  return new Date() >= this.unlockDate;
});

module.exports = mongoose.model('Capsule', capsuleSchema);
