const mongoose = require('mongoose');
const { SHIPMENT_STATUS, SHIPMENT_CARRIERS } = require('../config/constants');

// ===== SUBDOCUMENT SCHEMAS =====
const ShipmentItemSchema = new mongoose.Schema({
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
  }
});

// ===== MAIN SHIPMENT SCHEMA =====
const ShipmentSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: [true, 'El ID de la orden es requerido']
  },
  trackingNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  carrier: {
    type: String,
    required: [true, 'La empresa de envío es requerida'],
    enum: Object.values(SHIPMENT_CARRIERS)
  },
  status: {
    type: String,
    enum: Object.values(SHIPMENT_STATUS),
    default: SHIPMENT_STATUS.PENDING
  },
  items: {
    type: [ShipmentItemSchema],
    required: true,
    validate: [items => items.length > 0, 'El envío debe tener al menos un item']
  },
  shippedAt: {
    type: Date
  },
  estimatedDeliveryAt: {
    type: Date
  },
  deliveredAt: {
    type: Date
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
ShipmentSchema.virtual('totalItems').get(function() {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

ShipmentSchema.virtual('isDelivered').get(function() {
  return this.status === SHIPMENT_STATUS.DELIVERED;
});

ShipmentSchema.virtual('isInTransit').get(function() {
  return [
    SHIPMENT_STATUS.PICKED_UP,
    SHIPMENT_STATUS.IN_TRANSIT,
    SHIPMENT_STATUS.OUT_FOR_DELIVERY
  ].includes(this.status);
});

// ===== MIDDLEWARES =====
ShipmentSchema.pre('save', function(next) {
  // Generar tracking number si no existe
  if (this.isNew && !this.trackingNumber) {
    this.trackingNumber = `${this.carrier.toUpperCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  }

  // Actualizar fechas según el estado
  if (this.isModified('status')) {
    switch (this.status) {
      case SHIPMENT_STATUS.PICKED_UP:
        if (!this.shippedAt) this.shippedAt = new Date();
        break;
      case SHIPMENT_STATUS.DELIVERED:
        if (!this.deliveredAt) this.deliveredAt = new Date();
        break;
    }
  }

  next();
});

// ===== METHODS =====
ShipmentSchema.methods.updateStatus = function(newStatus) {
  const validTransitions = {
    [SHIPMENT_STATUS.PENDING]: [SHIPMENT_STATUS.PICKED_UP, SHIPMENT_STATUS.FAILED],
    [SHIPMENT_STATUS.PICKED_UP]: [SHIPMENT_STATUS.IN_TRANSIT, SHIPMENT_STATUS.FAILED],
    [SHIPMENT_STATUS.IN_TRANSIT]: [SHIPMENT_STATUS.OUT_FOR_DELIVERY, SHIPMENT_STATUS.FAILED],
    [SHIPMENT_STATUS.OUT_FOR_DELIVERY]: [SHIPMENT_STATUS.DELIVERED, SHIPMENT_STATUS.FAILED],
    [SHIPMENT_STATUS.DELIVERED]: [],
    [SHIPMENT_STATUS.FAILED]: [SHIPMENT_STATUS.PENDING]
  };

  if (!validTransitions[this.status].includes(newStatus)) {
    throw new Error(`No se puede cambiar el estado de ${this.status} a ${newStatus}`);
  }

  this.status = newStatus;
  return this.save();
};

// ===== INDEXES =====
ShipmentSchema.index({ orderId: 1 });
ShipmentSchema.index({ trackingNumber: 1 });
ShipmentSchema.index({ status: 1 });
ShipmentSchema.index({ carrier: 1 });
ShipmentSchema.index({ createdAt: -1 });
ShipmentSchema.index({ shippedAt: -1 });

module.exports = mongoose.model('Shipment', ShipmentSchema); 