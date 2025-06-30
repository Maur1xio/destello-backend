const mongoose = require('mongoose');
const { ORDER_STATUS } = require('../config/constants');

// ===== SUBDOCUMENT SCHEMAS =====
const OrderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  name: { type: String, required: true },
  sku: { type: String, required: true },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'La cantidad debe ser al menos 1']
  },
  price: {
    type: Number,
    required: true,
    min: [0, 'El precio no puede ser negativo']
  },
  totalPrice: {
    type: Number,
    required: true,
    min: [0, 'El precio total no puede ser negativo']
  }
});

const AddressSchema = new mongoose.Schema({
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zipCode: { type: String, required: true },
  country: { type: String, required: true, default: 'Mexico' }
});

// ===== MAIN ORDER SCHEMA =====
const OrderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El ID del usuario es requerido']
  },
  orderNumber: {
    type: String,
    unique: true,
    required: true
  },
  items: {
    type: [OrderItemSchema],
    required: true,
    validate: [items => items.length > 0, 'La orden debe tener al menos un item']
  },
  address: {
    type: AddressSchema,
    required: [true, 'La dirección es requerida']
  },
  totalAmount: {
    type: Number,
    required: [true, 'El monto total es requerido'],
    min: [0, 'El monto total no puede ser negativo']
  },
  status: {
    type: String,
    enum: Object.values(ORDER_STATUS),
    default: ORDER_STATUS.PENDING
  },
  shipments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shipment'
  }],
  paymentMethod: {
    type: String,
    enum: ['credit_card', 'debit_card', 'paypal', 'bank_transfer'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Las notas no pueden exceder 500 caracteres']
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
OrderSchema.virtual('totalItems').get(function() {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

OrderSchema.virtual('canBeCancelled').get(function() {
  return [ORDER_STATUS.PENDING, ORDER_STATUS.CONFIRMED].includes(this.status);
});

// ===== MIDDLEWARES =====
OrderSchema.pre('save', function(next) {
  if (this.isNew && !this.orderNumber) {
    this.orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
  }
  next();
});

// ===== METHODS =====
OrderSchema.methods.updateStatus = function(newStatus) {
  const validTransitions = {
    [ORDER_STATUS.PENDING]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.PROCESSING, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.PROCESSING]: [ORDER_STATUS.SHIPPED],
    [ORDER_STATUS.SHIPPED]: [ORDER_STATUS.DELIVERED],
    [ORDER_STATUS.DELIVERED]: [],
    [ORDER_STATUS.CANCELLED]: []
  };

  if (!validTransitions[this.status].includes(newStatus)) {
    throw new Error(`No se puede cambiar el estado de ${this.status} a ${newStatus}`);
  }

  this.status = newStatus;
  return this.save();
};

OrderSchema.methods.calculateTotal = function() {
  return this.items.reduce((total, item) => total + item.totalPrice, 0);
};

// ===== INDEXES =====
OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ orderNumber: 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ paymentStatus: 1 });

module.exports = mongoose.model('Order', OrderSchema); 