require('dotenv').config();

// ===== SERVER CONFIGURATION =====
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const API_VERSION = '1.0.0';

// ===== USER CONSTANTS =====
const USER_ROLES = {
  CUSTOMER: 'customer',
  ADMIN: 'admin',
  MODERATOR: 'moderator'
};

// ===== ORDER CONSTANTS =====
const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded'
};

// ===== SHIPMENT CONSTANTS =====
const SHIPMENT_STATUS = {
  PENDING: 'pending',
  PICKED_UP: 'picked_up',
  IN_TRANSIT: 'in_transit',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  FAILED_ATTEMPT: 'failed_attempt',
  RETURNED: 'returned'
};

const SHIPMENT_CARRIERS = {
  DHL: 'dhl',
  FEDEX: 'fedex',
  UPS: 'ups',
  CORREOS_MEXICO: 'correos_mexico',
  PAQUETEXPRESS: 'paquetexpress'
};

const PAYMENT_METHODS = {
  CREDIT_CARD: 'credit_card',
  DEBIT_CARD: 'debit_card',
  PAYPAL: 'paypal',
  BANK_TRANSFER: 'bank_transfer'
};

const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded'
};

// ===== INVENTORY CONSTANTS =====
const INVENTORY_TX_TYPES = {
  PURCHASE: 'purchase',
  SALE: 'sale',
  ADJUSTMENT: 'adjustment',
  TRANSFER: 'transfer',
  RETURN: 'return',
  DAMAGE: 'damage',
  EXPIRED: 'expired'
};

// ===== REACTION CONSTANTS =====
const REACTION_TYPES = {
  LIKE: 'like',
  LOVE: 'love',
  LAUGH: 'laugh',
  WOW: 'wow',
  SAD: 'sad',
  ANGRY: 'angry'
};

// ===== TARGET TYPES =====
const TARGET_TYPES = {
  PRODUCT: 'Product',
  REVIEW: 'Review',
  POST: 'Post',
  COMMENT: 'Comment'
};

module.exports = {
  PORT,
  NODE_ENV,
  API_VERSION,
  USER_ROLES,
  ORDER_STATUS,
  SHIPMENT_STATUS,
  SHIPMENT_CARRIERS,
  INVENTORY_TX_TYPES,
  REACTION_TYPES,
  TARGET_TYPES,
  PAYMENT_METHODS,
  PAYMENT_STATUS
}; 