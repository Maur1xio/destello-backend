const mongoose = require('mongoose');
const { INVENTORY_TX_TYPES } = require('../config/constants');

const InventoryTransactionSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'El ID del producto es requerido']
  },
  qtyChange: {
    type: Number,
    required: [true, 'El cambio de cantidad es requerido']
  },
  type: {
    type: String,
    enum: Object.values(INVENTORY_TX_TYPES),
    required: [true, 'El tipo de transacción es requerido']
  },
  note: {
    type: String,
    trim: true,
    maxlength: [500, 'La nota no puede exceder 500 caracteres']
  },
  previousQty: {
    type: Number,
    required: true
  },
  newQty: {
    type: Number,
    required: true
  },
  occurredAt: {
    type: Date,
    default: Date.now,
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// ===== INDEXES =====
InventoryTransactionSchema.index({ productId: 1 });
InventoryTransactionSchema.index({ type: 1 });
InventoryTransactionSchema.index({ occurredAt: -1 });
InventoryTransactionSchema.index({ productId: 1, occurredAt: -1 });

module.exports = mongoose.model('InventoryTransaction', InventoryTransactionSchema); 