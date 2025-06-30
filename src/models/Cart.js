const mongoose = require('mongoose');

// ===== SUBDOCUMENT SCHEMAS =====
const CartItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: [true, 'La cantidad es requerida'],
    min: [1, 'La cantidad debe ser al menos 1']
  },
  price: {
    type: Number,
    required: [true, 'El precio es requerido'],
    min: [0, 'El precio no puede ser negativo']
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
});

// ===== MAIN CART SCHEMA =====
const CartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El ID del usuario es requerido'],
    unique: true
  },
  items: [CartItemSchema],
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ===== VIRTUALS =====
CartSchema.virtual('totalItems').get(function() {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

CartSchema.virtual('totalAmount').get(function() {
  return this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
});

// ===== METHODS =====
CartSchema.methods.addItem = function(productId, quantity, price) {
  const existingItem = this.items.find(item => 
    item.productId.toString() === productId.toString()
  );

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    this.items.push({ productId, quantity, price });
  }

  this.updatedAt = new Date();
  return this.save();
};

CartSchema.methods.removeItem = function(productId) {
  this.items = this.items.filter(item => 
    item.productId.toString() !== productId.toString()
  );
  this.updatedAt = new Date();
  return this.save();
};

CartSchema.methods.updateItemQuantity = function(productId, quantity) {
  const item = this.items.find(item => 
    item.productId.toString() === productId.toString()
  );

  if (item) {
    if (quantity <= 0) {
      return this.removeItem(productId);
    }
    item.quantity = quantity;
    this.updatedAt = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

CartSchema.methods.clearCart = function() {
  this.items = [];
  this.updatedAt = new Date();
  return this.save();
};

// ===== INDEXES =====
CartSchema.index({ userId: 1 });
CartSchema.index({ updatedAt: -1 });

module.exports = mongoose.model('Cart', CartSchema); 