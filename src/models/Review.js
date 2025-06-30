const mongoose = require('mongoose');

// ===== MAIN REVIEW SCHEMA =====
const ReviewSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'El ID del producto es requerido']
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El ID del usuario es requerido']
  },
  rating: {
    type: Number,
    required: [true, 'La calificación es requerida'],
    min: [1, 'La calificación mínima es 1'],
    max: [5, 'La calificación máxima es 5']
  },
  title: {
    type: String,
    required: [true, 'El título es requerido'],
    trim: true,
    maxlength: [100, 'El título no puede exceder 100 caracteres']
  },
  body: {
    type: String,
    required: [true, 'El cuerpo de la reseña es requerido'],
    trim: true,
    maxlength: [2000, 'La reseña no puede exceder 2000 caracteres']
  },
  helpfulCount: {
    type: Number,
    default: 0,
    min: [0, 'El contador de utilidad no puede ser negativo']
  },
  isVerifiedPurchase: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ===== VIRTUALS =====
ReviewSchema.virtual('comments', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'parentId',
  match: { parentType: 'review' }
});

ReviewSchema.virtual('reactions', {
  ref: 'Reaction',
  localField: '_id',
  foreignField: 'targetId',
  match: { targetType: 'review' }
});

// ===== METHODS =====
ReviewSchema.methods.incrementHelpful = function() {
  this.helpfulCount += 1;
  return this.save();
};

ReviewSchema.methods.decrementHelpful = function() {
  this.helpfulCount = Math.max(0, this.helpfulCount - 1);
  return this.save();
};

// ===== INDEXES =====
ReviewSchema.index({ productId: 1, createdAt: -1 });
ReviewSchema.index({ userId: 1, createdAt: -1 });
ReviewSchema.index({ rating: 1 });
ReviewSchema.index({ helpfulCount: -1 });
ReviewSchema.index({ isVerifiedPurchase: 1 });
ReviewSchema.index({ productId: 1, userId: 1 }, { unique: true }); // Un usuario, una reseña por producto

module.exports = mongoose.model('Review', ReviewSchema); 