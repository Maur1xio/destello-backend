const mongoose = require('mongoose');

// ===== SUBDOCUMENT SCHEMAS =====
const WishlistItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  addedAt: {
    type: Date,
    default: Date.now
  },
  note: {
    type: String,
    trim: true,
    maxlength: [200, 'La nota no puede exceder 200 caracteres']
  }
});

// ===== MAIN WISHLIST SCHEMA =====
const WishlistSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El ID del usuario es requerido'],
    unique: true
  },
  items: [WishlistItemSchema],
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
WishlistSchema.virtual('totalItems').get(function() {
  return this.items.length;
});

// ===== METHODS =====
WishlistSchema.methods.addItem = function(productId, note = '') {
  const existingItem = this.items.find(item => 
    item.productId.toString() === productId.toString()
  );

  if (!existingItem) {
    this.items.push({ productId, note });
    return this.save();
  }
  
  return Promise.resolve(this);
};

WishlistSchema.methods.removeItem = function(productId) {
  this.items = this.items.filter(item => 
    item.productId.toString() !== productId.toString()
  );
  return this.save();
};

WishlistSchema.methods.hasItem = function(productId) {
  return this.items.some(item => 
    item.productId.toString() === productId.toString()
  );
};

WishlistSchema.methods.clearWishlist = function() {
  this.items = [];
  return this.save();
};

// ===== INDEXES =====
WishlistSchema.index({ userId: 1 });
WishlistSchema.index({ 'items.productId': 1 });
WishlistSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Wishlist', WishlistSchema); 