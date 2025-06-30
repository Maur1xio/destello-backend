const InventoryTransaction = require('../models/InventoryTransaction');
const Product = require('../models/Product');
const { AppError } = require('../middlewares/errorHandler');
const { calculatePagination } = require('../middlewares/responseFormatter');
const { INVENTORY_TX_TYPES } = require('../config/constants');

class InventoryService {
  // ===== CREAR TRANSACCIÓN DE INVENTARIO =====
  static async createTransaction(transactionData) {
    const { 
      productId, 
      type, 
      quantity, 
      reason, 
      referenceId, 
      notes,
      performedBy 
    } = transactionData;

    // Validar tipo de transacción
    if (!Object.values(INVENTORY_TX_TYPES).includes(type)) {
      throw new AppError('Tipo de transacción inválido', 400, 'INVALID_TRANSACTION_TYPE');
    }

    // Verificar que el producto exista
    const product = await Product.findById(productId);
    if (!product) {
      throw new AppError('Producto no encontrado', 404, 'PRODUCT_NOT_FOUND');
    }

    // Calcular nueva cantidad
    const currentStock = product.stockQty;
    let newStock;

    switch (type) {
      case INVENTORY_TX_TYPES.STOCK_IN:
      case INVENTORY_TX_TYPES.RETURN:
      case INVENTORY_TX_TYPES.ADJUSTMENT_IN:
        newStock = currentStock + parseInt(quantity);
        break;
      case INVENTORY_TX_TYPES.SALE:
      case INVENTORY_TX_TYPES.STOCK_OUT:
      case INVENTORY_TX_TYPES.ADJUSTMENT_OUT:
      case INVENTORY_TX_TYPES.DAMAGE:
        newStock = Math.max(0, currentStock - parseInt(quantity));
        break;
      default:
        throw new AppError('Tipo de transacción no manejado', 400, 'UNHANDLED_TRANSACTION_TYPE');
    }

    // Crear transacción
    const transaction = await InventoryTransaction.create({
      productId,
      type,
      quantity: parseInt(quantity),
      previousStock: currentStock,
      newStock,
      reason,
      referenceId,
      notes,
      performedBy
    });

    // Actualizar stock del producto
    await Product.findByIdAndUpdate(productId, { stockQty: newStock });

    // Poblar para respuesta
    await transaction.populate([
      { path: 'productId', select: 'name sku' },
      { path: 'performedBy', select: 'firstName lastName' }
    ]);

    return this.formatTransactionData(transaction, true);
  }

  // ===== OBTENER HISTORIAL DE TRANSACCIONES =====
  static async getTransactionHistory(filters, paginationData) {
    const { 
      page, 
      limit, 
      sort = '-createdAt',
      productId,
      type,
      dateFrom,
      dateTo,
      performedBy
    } = { ...filters, ...paginationData };

    // Construir filtros
    const searchFilters = {};

    if (productId) {
      searchFilters.productId = productId;
    }

    if (type) {
      searchFilters.type = type;
    }

    if (performedBy) {
      searchFilters.performedBy = performedBy;
    }

    if (dateFrom || dateTo) {
      searchFilters.createdAt = {};
      if (dateFrom) searchFilters.createdAt.$gte = new Date(dateFrom);
      if (dateTo) searchFilters.createdAt.$lte = new Date(dateTo);
    }

    // Calcular paginación
    const pagination = calculatePagination(page, limit, await InventoryTransaction.countDocuments(searchFilters));

    // Obtener transacciones
    const transactions = await InventoryTransaction.find(searchFilters)
      .populate('productId', 'name sku')
      .populate('performedBy', 'firstName lastName')
      .sort(sort)
      .skip(pagination.offset)
      .limit(pagination.limit);

    return {
      transactions: transactions.map(tx => this.formatTransactionData(tx)),
      pagination
    };
  }

  // ===== OBTENER HISTORIAL DE PRODUCTO =====
  static async getProductHistory(productId, paginationData) {
    const { page, limit, sort = '-createdAt' } = paginationData;

    // Verificar que el producto exista
    const product = await Product.findById(productId);
    if (!product) {
      throw new AppError('Producto no encontrado', 404, 'PRODUCT_NOT_FOUND');
    }

    const filters = { productId };

    // Calcular paginación
    const pagination = calculatePagination(page, limit, await InventoryTransaction.countDocuments(filters));

    // Obtener transacciones
    const transactions = await InventoryTransaction.find(filters)
      .populate('performedBy', 'firstName lastName')
      .sort(sort)
      .skip(pagination.offset)
      .limit(pagination.limit);

    return {
      product: {
        id: product._id,
        name: product.name,
        sku: product.sku,
        currentStock: product.stockQty
      },
      transactions: transactions.map(tx => this.formatTransactionData(tx)),
      pagination
    };
  }

  // ===== AJUSTAR STOCK =====
  static async adjustStock(productId, adjustmentData, performedBy) {
    const { newStock, reason, notes } = adjustmentData;

    // Verificar que el producto exista
    const product = await Product.findById(productId);
    if (!product) {
      throw new AppError('Producto no encontrado', 404, 'PRODUCT_NOT_FOUND');
    }

    const currentStock = product.stockQty;
    const difference = parseInt(newStock) - currentStock;

    if (difference === 0) {
      throw new AppError('El stock ya tiene el valor especificado', 400, 'NO_STOCK_CHANGE');
    }

    // Determinar tipo de ajuste
    const type = difference > 0 ? INVENTORY_TX_TYPES.ADJUSTMENT_IN : INVENTORY_TX_TYPES.ADJUSTMENT_OUT;
    const quantity = Math.abs(difference);

    // Crear transacción de ajuste
    const transaction = await this.createTransaction({
      productId,
      type,
      quantity,
      reason: reason || 'Ajuste manual de inventario',
      notes,
      performedBy
    });

    return {
      transaction,
      adjustment: {
        previousStock: currentStock,
        newStock: parseInt(newStock),
        difference,
        type: difference > 0 ? 'increase' : 'decrease'
      }
    };
  }

  // ===== ENTRADA DE STOCK =====
  static async stockIn(productId, stockData, performedBy) {
    const { quantity, reason, referenceId, notes } = stockData;

    if (quantity <= 0) {
      throw new AppError('La cantidad debe ser mayor a cero', 400, 'INVALID_QUANTITY');
    }

    return await this.createTransaction({
      productId,
      type: INVENTORY_TX_TYPES.STOCK_IN,
      quantity,
      reason: reason || 'Entrada de stock',
      referenceId,
      notes,
      performedBy
    });
  }

  // ===== SALIDA DE STOCK =====
  static async stockOut(productId, stockData, performedBy) {
    const { quantity, reason, referenceId, notes } = stockData;

    if (quantity <= 0) {
      throw new AppError('La cantidad debe ser mayor a cero', 400, 'INVALID_QUANTITY');
    }

    // Verificar stock disponible
    const product = await Product.findById(productId);
    if (!product) {
      throw new AppError('Producto no encontrado', 404, 'PRODUCT_NOT_FOUND');
    }

    if (product.stockQty < quantity) {
      throw new AppError(
        `Stock insuficiente. Disponible: ${product.stockQty}, solicitado: ${quantity}`,
        400,
        'INSUFFICIENT_STOCK'
      );
    }

    return await this.createTransaction({
      productId,
      type: INVENTORY_TX_TYPES.STOCK_OUT,
      quantity,
      reason: reason || 'Salida de stock',
      referenceId,
      notes,
      performedBy
    });
  }

  // ===== REGISTRAR VENTA =====
  static async recordSale(productId, saleData, performedBy) {
    const { quantity, orderId, notes } = saleData;

    return await this.createTransaction({
      productId,
      type: INVENTORY_TX_TYPES.SALE,
      quantity,
      reason: 'Venta de producto',
      referenceId: orderId,
      notes,
      performedBy
    });
  }

  // ===== REGISTRAR DEVOLUCIÓN =====
  static async recordReturn(productId, returnData, performedBy) {
    const { quantity, orderId, notes } = returnData;

    return await this.createTransaction({
      productId,
      type: INVENTORY_TX_TYPES.RETURN,
      quantity,
      reason: 'Devolución de producto',
      referenceId: orderId,
      notes,
      performedBy
    });
  }

  // ===== REGISTRAR DAÑO =====
  static async recordDamage(productId, damageData, performedBy) {
    const { quantity, reason, notes } = damageData;

    return await this.createTransaction({
      productId,
      type: INVENTORY_TX_TYPES.DAMAGE,
      quantity,
      reason: reason || 'Producto dañado',
      notes,
      performedBy
    });
  }

  // ===== OBTENER REPORTE DE INVENTARIO =====
  static async getInventoryReport(filters = {}) {
    const { 
      categoryId,
      lowStockThreshold = 10,
      includeInactive = false
    } = filters;

    // Construir filtros para productos
    const productFilters = {};
    
    if (!includeInactive) {
      productFilters.isActive = true;
    }

    if (categoryId) {
      productFilters.categories = categoryId;
    }

    // Obtener productos con estadísticas
    const products = await Product.find(productFilters)
      .populate('categories', 'name')
      .sort({ name: 1 });

    // Enriquecer con estadísticas de transacciones
    const enrichedProducts = await Promise.all(
      products.map(async (product) => {
        const stats = await this.getProductStats(product._id);
        
        return {
          id: product._id,
          name: product.name,
          sku: product.sku,
          currentStock: product.stockQty,
          price: product.price,
          categories: product.categories,
          stockStatus: this.getStockStatus(product.stockQty, lowStockThreshold),
          isActive: product.isActive,
          stats
        };
      })
    );

    // Resumen del reporte
    const summary = {
      totalProducts: enrichedProducts.length,
      totalValue: enrichedProducts.reduce((sum, p) => sum + (p.currentStock * p.price), 0),
      lowStockCount: enrichedProducts.filter(p => p.stockStatus === 'low').length,
      outOfStockCount: enrichedProducts.filter(p => p.stockStatus === 'out').length,
      averageStock: enrichedProducts.reduce((sum, p) => sum + p.currentStock, 0) / enrichedProducts.length || 0
    };

    return {
      summary,
      products: enrichedProducts,
      generatedAt: new Date()
    };
  }

  // ===== OBTENER PRODUCTOS CON STOCK BAJO =====
  static async getLowStockProducts(threshold = 10) {
    const products = await Product.find({
      stockQty: { $lte: threshold, $gt: 0 },
      isActive: true
    })
      .populate('categories', 'name')
      .sort({ stockQty: 1 });

    return products.map(product => ({
      id: product._id,
      name: product.name,
      sku: product.sku,
      currentStock: product.stockQty,
      threshold,
      categories: product.categories,
      restockRecommendation: Math.max(threshold * 2, 20) // Sugerencia de reposición
    }));
  }

  // ===== OBTENER PRODUCTOS SIN STOCK =====
  static async getOutOfStockProducts() {
    const products = await Product.find({
      stockQty: 0,
      isActive: true
    })
      .populate('categories', 'name')
      .sort({ updatedAt: -1 });

    return products.map(product => ({
      id: product._id,
      name: product.name,
      sku: product.sku,
      categories: product.categories,
      lastStockUpdate: product.updatedAt,
      urgency: this.calculateRestockUrgency(product)
    }));
  }

  // ===== OBTENER ESTADÍSTICAS DE PRODUCTO =====
  static async getProductStats(productId, days = 30) {
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);

    const stats = await InventoryTransaction.aggregate([
      { 
        $match: { 
          productId,
          createdAt: { $gte: dateFrom }
        }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' }
        }
      }
    ]);

    // Formatear estadísticas
    const formattedStats = {
      totalTransactions: 0,
      stockIn: { count: 0, quantity: 0 },
      stockOut: { count: 0, quantity: 0 },
      sales: { count: 0, quantity: 0 },
      returns: { count: 0, quantity: 0 },
      adjustments: { count: 0, quantity: 0 },
      damages: { count: 0, quantity: 0 }
    };

    stats.forEach(stat => {
      formattedStats.totalTransactions += stat.count;
      
      switch (stat._id) {
        case INVENTORY_TX_TYPES.STOCK_IN:
          formattedStats.stockIn = { count: stat.count, quantity: stat.totalQuantity };
          break;
        case INVENTORY_TX_TYPES.STOCK_OUT:
          formattedStats.stockOut = { count: stat.count, quantity: stat.totalQuantity };
          break;
        case INVENTORY_TX_TYPES.SALE:
          formattedStats.sales = { count: stat.count, quantity: stat.totalQuantity };
          break;
        case INVENTORY_TX_TYPES.RETURN:
          formattedStats.returns = { count: stat.count, quantity: stat.totalQuantity };
          break;
        case INVENTORY_TX_TYPES.ADJUSTMENT_IN:
        case INVENTORY_TX_TYPES.ADJUSTMENT_OUT:
          formattedStats.adjustments.count += stat.count;
          formattedStats.adjustments.quantity += stat.totalQuantity;
          break;
        case INVENTORY_TX_TYPES.DAMAGE:
          formattedStats.damages = { count: stat.count, quantity: stat.totalQuantity };
          break;
      }
    });

    return formattedStats;
  }

  // ===== OBTENER ESTADÍSTICAS GENERALES =====
  static async getGeneralStats(filters = {}) {
    const { dateFrom, dateTo } = filters;
    
    const matchFilters = {};
    if (dateFrom || dateTo) {
      matchFilters.createdAt = {};
      if (dateFrom) matchFilters.createdAt.$gte = new Date(dateFrom);
      if (dateTo) matchFilters.createdAt.$lte = new Date(dateTo);
    }

    // Estadísticas de transacciones
    const transactionStats = await InventoryTransaction.aggregate([
      { $match: matchFilters },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' }
        }
      }
    ]);

    // Estadísticas de productos
    const productStats = await Product.aggregate([
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          activeProducts: { $sum: { $cond: ['$isActive', 1, 0] } },
          totalStockValue: { $sum: { $multiply: ['$stockQty', '$price'] } },
          averageStock: { $avg: '$stockQty' },
          lowStockProducts: { 
            $sum: { $cond: [{ $lte: ['$stockQty', 10] }, 1, 0] } 
          },
          outOfStockProducts: { 
            $sum: { $cond: [{ $eq: ['$stockQty', 0] }, 1, 0] } 
          }
        }
      }
    ]);

    return {
      transactions: transactionStats.reduce((acc, stat) => {
        acc[stat._id] = {
          count: stat.count,
          totalQuantity: stat.totalQuantity
        };
        return acc;
      }, {}),
      products: productStats[0] || {
        totalProducts: 0,
        activeProducts: 0,
        totalStockValue: 0,
        averageStock: 0,
        lowStockProducts: 0,
        outOfStockProducts: 0
      }
    };
  }

  // ===== OBTENER ANÁLISIS DE TENDENCIAS =====
  static async getTrendAnalysis(productId, days = 30) {
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);

    const pipeline = [
      { 
        $match: { 
          productId,
          createdAt: { $gte: dateFrom }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            type: '$type'
          },
          quantity: { $sum: '$quantity' },
          transactions: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1 } }
    ];

    const results = await InventoryTransaction.aggregate(pipeline);
    
    // Organizar datos por fecha
    const trends = {};
    results.forEach(result => {
      const date = result._id.date;
      if (!trends[date]) {
        trends[date] = {};
      }
      trends[date][result._id.type] = {
        quantity: result.quantity,
        transactions: result.transactions
      };
    });

    return {
      productId,
      period: `${days} days`,
      trends
    };
  }

  // ===== UTILITY METHODS =====

  // Formatear datos de transacción para respuesta
  static formatTransactionData(transaction, includeDetails = false) {
    const formatted = {
      id: transaction._id,
      productId: transaction.productId._id || transaction.productId,
      type: transaction.type,
      quantity: transaction.quantity,
      previousStock: transaction.previousStock,
      newStock: transaction.newStock,
      reason: transaction.reason,
      createdAt: transaction.createdAt
    };

    // Agregar información del producto si está poblada
    if (transaction.productId && transaction.productId.name) {
      formatted.product = {
        name: transaction.productId.name,
        sku: transaction.productId.sku
      };
    }

    // Agregar información del usuario si está poblada
    if (transaction.performedBy && transaction.performedBy.firstName) {
      formatted.performedBy = {
        firstName: transaction.performedBy.firstName,
        lastName: transaction.performedBy.lastName
      };
    }

    if (includeDetails) {
      formatted.referenceId = transaction.referenceId;
      formatted.notes = transaction.notes;
    }

    return formatted;
  }

  // Determinar estado del stock
  static getStockStatus(currentStock, lowThreshold = 10) {
    if (currentStock === 0) return 'out';
    if (currentStock <= lowThreshold) return 'low';
    return 'normal';
  }

  // Calcular urgencia de reposición
  static calculateRestockUrgency(product) {
    const daysSinceUpdate = Math.floor(
      (new Date() - new Date(product.updatedAt)) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceUpdate > 30) return 'high';
    if (daysSinceUpdate > 14) return 'medium';
    return 'low';
  }

  // Obtener valor total del inventario
  static async getTotalInventoryValue(filters = {}) {
    const { categoryId, includeInactive = false } = filters;
    
    const productFilters = {};
    if (!includeInactive) {
      productFilters.isActive = true;
    }
    if (categoryId) {
      productFilters.categories = categoryId;
    }

    const result = await Product.aggregate([
      { $match: productFilters },
      {
        $group: {
          _id: null,
          totalValue: { $sum: { $multiply: ['$stockQty', '$price'] } },
          totalItems: { $sum: '$stockQty' },
          productCount: { $sum: 1 }
        }
      }
    ]);

    return result[0] || {
      totalValue: 0,
      totalItems: 0,
      productCount: 0
    };
  }

  // Predicción simple de reposición
  static async getPredictedRestockDate(productId, days = 30) {
    const stats = await this.getProductStats(productId, days);
    const product = await Product.findById(productId);
    
    if (!product || stats.sales.quantity === 0) {
      return null;
    }

    const dailyAverage = stats.sales.quantity / days;
    const daysUntilEmpty = Math.floor(product.stockQty / dailyAverage);
    
    const restockDate = new Date();
    restockDate.setDate(restockDate.getDate() + daysUntilEmpty);
    
    return {
      currentStock: product.stockQty,
      dailyAverageSales: Math.round(dailyAverage * 100) / 100,
      estimatedDaysLeft: daysUntilEmpty,
      predictedRestockDate: restockDate,
      confidence: stats.sales.count > 10 ? 'high' : stats.sales.count > 5 ? 'medium' : 'low'
    };
  }
}

module.exports = InventoryService; 