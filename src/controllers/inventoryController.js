const Joi = require('joi');
const inventoryService = require('../services/inventoryService');
const { asyncHandler, AppError } = require('../middlewares/errorHandler');
const { INVENTORY_TX_TYPES } = require('../config/constants');

// Schemas de validación
const schemas = {
  createTransaction: Joi.object({
    product: Joi.string().required(),
    type: Joi.string().valid(...Object.values(INVENTORY_TX_TYPES)).required(),
    quantity: Joi.number().integer().required(),
    reason: Joi.string().max(500).required(),
    notes: Joi.string().max(1000).optional(),
    cost: Joi.number().min(0).optional(),
    supplier: Joi.string().optional(),
    batchNumber: Joi.string().optional(),
    expirationDate: Joi.date().optional()
  }),
  bulkTransaction: Joi.object({
    transactions: Joi.array().items(Joi.object({
      product: Joi.string().required(),
      quantity: Joi.number().integer().required(),
      cost: Joi.number().min(0).optional()
    })).min(1).required(),
    type: Joi.string().valid(...Object.values(INVENTORY_TX_TYPES)).required(),
    reason: Joi.string().max(500).required(),
    notes: Joi.string().max(1000).optional(),
    supplier: Joi.string().optional()
  }),
  updateTransaction: Joi.object({
    reason: Joi.string().max(500).optional(),
    notes: Joi.string().max(1000).optional(),
    cost: Joi.number().min(0).optional(),
    supplier: Joi.string().optional(),
    batchNumber: Joi.string().optional()
  })
};

/**
 * @swagger
 * tags:
 *   name: Inventory
 *   description: Gestión de inventario y transacciones
 */

const createTransaction = asyncHandler(async (req, res) => {
  const { error, value } = schemas.createTransaction.validate(req.body);
  if (error) throw new AppError(error.details[0].message, 400);

  const transaction = await inventoryService.createTransaction({
    ...value,
    createdBy: req.user._id
  });
  
  res.status(201).json({
    success: true,
    message: 'Transacción de inventario creada exitosamente',
    data: transaction
  });
});

const getTransaction = asyncHandler(async (req, res) => {
  const transaction = await inventoryService.getTransactionById(req.params.id);
  
  res.json({
    success: true,
    data: transaction
  });
});

const getTransactions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, product, type, startDate, endDate, sort = '-createdAt' } = req.query;
  
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort,
    product,
    type,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined
  };
  
  const transactions = await inventoryService.getTransactions(options);
  
  res.json({
    success: true,
    data: transactions
  });
});

const getProductHistory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, type, startDate, endDate, sort = '-createdAt' } = req.query;
  
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort,
    type,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined
  };
  
  const history = await inventoryService.getProductInventoryHistory(req.params.productId, options);
  
  res.json({
    success: true,
    data: history
  });
});

const updateTransaction = asyncHandler(async (req, res) => {
  const { error, value } = schemas.updateTransaction.validate(req.body);
  if (error) throw new AppError(error.details[0].message, 400);

  const transaction = await inventoryService.updateTransaction(req.params.id, req.user._id, value);
  
  res.json({
    success: true,
    message: 'Transacción actualizada exitosamente',
    data: transaction
  });
});

const deleteTransaction = asyncHandler(async (req, res) => {
  await inventoryService.deleteTransaction(req.params.id, req.user._id);
  
  res.json({
    success: true,
    message: 'Transacción eliminada exitosamente'
  });
});

const bulkCreateTransactions = asyncHandler(async (req, res) => {
  const { error, value } = schemas.bulkTransaction.validate(req.body);
  if (error) throw new AppError(error.details[0].message, 400);

  const result = await inventoryService.bulkCreateTransactions({
    ...value,
    createdBy: req.user._id
  });
  
  res.status(201).json({
    success: true,
    message: 'Transacciones masivas creadas exitosamente',
    data: result
  });
});

const getInventoryReport = asyncHandler(async (req, res) => {
  const { startDate, endDate, category, lowStock } = req.query;
  
  const options = {
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
    category,
    lowStock: lowStock === 'true'
  };
  
  const report = await inventoryService.getInventoryReport(options);
  
  res.json({
    success: true,
    data: report
  });
});

const getInventoryAnalytics = asyncHandler(async (req, res) => {
  const { period = 'month', startDate, endDate } = req.query;
  
  const options = {
    period,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined
  };
  
  const analytics = await inventoryService.getInventoryAnalytics(options);
  
  res.json({
    success: true,
    data: analytics
  });
});

module.exports = {
  createTransaction,
  getTransaction,
  getTransactions,
  getProductHistory,
  updateTransaction,
  deleteTransaction,
  bulkCreateTransactions,
  getInventoryReport,
  getInventoryAnalytics
}; 