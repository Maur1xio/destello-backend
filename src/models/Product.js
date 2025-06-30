const mongoose = require('mongoose');

// ===== SUBDOCUMENT SCHEMAS =====
const DimensionsSchema = new mongoose.Schema({
  length: { type: Number, required: true },
  width: { type: Number, required: true },
  height: { type: Number, required: true },
  unit: { type: String, enum: ['cm', 'inches'], default: 'cm' }
});

// ===== MAIN PRODUCT SCHEMA =====
const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nombre del producto es requerido'],
    trim: true,
    maxlength: [200, 'El nombre no puede exceder 200 caracteres']
  },
  sku: {
    type: String,
    required: [true, 'El SKU es requerido'],
    unique: true,
    uppercase: true,
    trim: true
  },
  description: {
    type: String,
    required: [true, 'La descripción es requerida'],
    trim: true,
    maxlength: [2000, 'La descripción no puede exceder 2000 caracteres']
  },
  price: {
    type: Number,
    required: [true, 'El precio es requerido'],
    min: [0, 'El precio no puede ser negativo']
  },
  weight: {
    type: Number,
    required: [true, 'El peso es requerido'],
    min: [0, 'El peso no puede ser negativo']
  },
  dimensions: DimensionsSchema,
  stockQty: {
    type: Number,
    required: [true, 'La cantidad en stock es requerida'],
    min: [0, 'El stock no puede ser negativo'],
    default: 0
  },
  categories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  }],
  isActive: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ===== VIRTUALS =====
ProductSchema.virtual('inStock').get(function() {
  return this.stockQty > 0;
});

ProductSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'productId'
});

// ===== METHODS =====
ProductSchema.methods.updateStock = function(quantity, operation = 'subtract') {
  if (operation === 'subtract') {
    this.stockQty = Math.max(0, this.stockQty - quantity);
  } else {
    this.stockQty += quantity;
  }
  return this.save();
};

// ===== INDEXES =====
ProductSchema.index({ name: 'text', description: 'text' });
ProductSchema.index({ sku: 1 });
ProductSchema.index({ categories: 1 });
ProductSchema.index({ price: 1 });
ProductSchema.index({ stockQty: 1 });
ProductSchema.index({ createdAt: -1 });
ProductSchema.index({ isFeatured: -1, createdAt: -1 });

module.exports = mongoose.model('Product', ProductSchema); 