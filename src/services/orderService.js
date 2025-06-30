const Order = require('../models/Order');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const { AppError } = require('../middlewares/errorHandler');
const { calculatePagination } = require('../middlewares/responseFormatter');
const { ORDER_STATUS } = require('../config/constants');

class OrderService {
  // ===== CREAR ORDEN DESDE CARRITO =====
  static async createOrderFromCart(userId, orderData) {
    const { 
      shippingAddress, 
      paymentMethod = 'pending',
      notes 
    } = orderData;

    // Obtener carrito del usuario
    const cart = await Cart.findOne({ userId })
      .populate('items.productId', 'name price stockQty isActive sku');

    if (!cart || cart.items.length === 0) {
      throw new AppError('El carrito está vacío', 400, 'CART_EMPTY');
    }

    // Validar productos y stock
    const orderItems = [];
    let totalAmount = 0;

    for (const cartItem of cart.items) {
      const product = cartItem.productId;
      
      if (!product || !product.isActive) {
        throw new AppError(`Producto ${product?.name || 'desconocido'} no está disponible`, 400, 'PRODUCT_NOT_AVAILABLE');
      }

      if (product.stockQty < cartItem.quantity) {
        throw new AppError(
          `Stock insuficiente para ${product.name}. Disponible: ${product.stockQty}, solicitado: ${cartItem.quantity}`,
          400,
          'INSUFFICIENT_STOCK'
        );
      }

      // Preparar item para la orden
      const orderItem = {
        productId: product._id,
        productName: product.name,
        productSku: product.sku,
        quantity: cartItem.quantity,
        priceAtTime: product.price, // Usar precio actual
        subtotal: cartItem.quantity * product.price
      };

      orderItems.push(orderItem);
      totalAmount += orderItem.subtotal;
    }

    // Calcular impuestos y gastos de envío (básico)
    const taxRate = 0.16; // 16% IVA México
    const taxAmount = totalAmount * taxRate;
    const shippingAmount = totalAmount >= 500 ? 0 : 99; // Envío gratis >$500
    const finalAmount = totalAmount + taxAmount + shippingAmount;

    // Crear orden
    const order = await Order.create({
      userId,
      orderNumber: this.generateOrderNumber(),
      items: orderItems,
      totalAmount,
      taxAmount,
      shippingAmount,
      finalAmount,
      status: ORDER_STATUS.PENDING,
      paymentMethod,
      paymentStatus: 'pending',
      shippingAddress,
      notes
    });

    // Reservar stock de productos
    for (const item of orderItems) {
      await Product.findByIdAndUpdate(
        item.productId,
        { $inc: { stockQty: -item.quantity } }
      );
    }

    // Limpiar carrito
    cart.items = [];
    await cart.save();

    return this.formatOrderData(order, true);
  }

  // ===== CREAR ORDEN DIRECTA =====
  static async createDirectOrder(userId, orderData) {
    const { 
      items, 
      shippingAddress, 
      paymentMethod = 'pending',
      notes 
    } = orderData;

    if (!items || items.length === 0) {
      throw new AppError('La orden debe tener al menos un producto', 400, 'NO_ITEMS');
    }

    // Validar productos y preparar items
    const orderItems = [];
    let totalAmount = 0;

    for (const item of items) {
      const product = await Product.findById(item.productId);
      
      if (!product || !product.isActive) {
        throw new AppError(`Producto no disponible`, 400, 'PRODUCT_NOT_AVAILABLE');
      }

      if (product.stockQty < item.quantity) {
        throw new AppError(
          `Stock insuficiente para ${product.name}. Disponible: ${product.stockQty}`,
          400,
          'INSUFFICIENT_STOCK'
        );
      }

      const orderItem = {
        productId: product._id,
        productName: product.name,
        productSku: product.sku,
        quantity: item.quantity,
        priceAtTime: product.price,
        subtotal: item.quantity * product.price
      };

      orderItems.push(orderItem);
      totalAmount += orderItem.subtotal;
    }

    // Calcular totales
    const taxRate = 0.16;
    const taxAmount = totalAmount * taxRate;
    const shippingAmount = totalAmount >= 500 ? 0 : 99;
    const finalAmount = totalAmount + taxAmount + shippingAmount;

    // Crear orden
    const order = await Order.create({
      userId,
      orderNumber: this.generateOrderNumber(),
      items: orderItems,
      totalAmount,
      taxAmount,
      shippingAmount,
      finalAmount,
      status: ORDER_STATUS.PENDING,
      paymentMethod,
      paymentStatus: 'pending',
      shippingAddress,
      notes
    });

    // Reservar stock
    for (const item of orderItems) {
      await Product.findByIdAndUpdate(
        item.productId,
        { $inc: { stockQty: -item.quantity } }
      );
    }

    return this.formatOrderData(order, true);
  }

  // ===== OBTENER ÓRDENES DEL USUARIO =====
  static async getUserOrders(userId, paginationData) {
    const { page, limit, sort = '-createdAt' } = paginationData;

    const filters = { userId };

    // Calcular paginación
    const pagination = calculatePagination(page, limit, await Order.countDocuments(filters));

    // Obtener órdenes
    const orders = await Order.find(filters)
      .sort(sort)
      .skip(pagination.offset)
      .limit(pagination.limit);

    return {
      orders: orders.map(order => this.formatOrderData(order)),
      pagination
    };
  }

  // ===== OBTENER ORDEN POR ID =====
  static async getOrderById(orderId, userId = null, userRole = null) {
    const order = await Order.findById(orderId);

    if (!order) {
      throw new AppError('Orden no encontrada', 404, 'ORDER_NOT_FOUND');
    }

    // Verificar permisos
    if (userRole !== 'admin' && userId && order.userId.toString() !== userId.toString()) {
      throw new AppError('No tienes permisos para ver esta orden', 403, 'ACCESS_DENIED');
    }

    return this.formatOrderData(order, true);
  }

  // ===== OBTENER TODAS LAS ÓRDENES (ADMIN) =====
  static async getAllOrders(filters, paginationData) {
    const { 
      page, 
      limit, 
      sort = '-createdAt',
      status,
      paymentStatus,
      dateFrom,
      dateTo,
      minAmount,
      maxAmount,
      search
    } = { ...filters, ...paginationData };

    // Construir filtros
    const searchFilters = {};

    if (status) {
      searchFilters.status = status;
    }

    if (paymentStatus) {
      searchFilters.paymentStatus = paymentStatus;
    }

    if (dateFrom || dateTo) {
      searchFilters.createdAt = {};
      if (dateFrom) searchFilters.createdAt.$gte = new Date(dateFrom);
      if (dateTo) searchFilters.createdAt.$lte = new Date(dateTo);
    }

    if (minAmount || maxAmount) {
      searchFilters.finalAmount = {};
      if (minAmount) searchFilters.finalAmount.$gte = parseFloat(minAmount);
      if (maxAmount) searchFilters.finalAmount.$lte = parseFloat(maxAmount);
    }

    if (search) {
      searchFilters.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'items.productName': { $regex: search, $options: 'i' } }
      ];
    }

    // Calcular paginación
    const pagination = calculatePagination(page, limit, await Order.countDocuments(searchFilters));

    // Obtener órdenes
    const orders = await Order.find(searchFilters)
      .populate('userId', 'firstName lastName email')
      .sort(sort)
      .skip(pagination.offset)
      .limit(pagination.limit);

    return {
      orders: orders.map(order => this.formatOrderData(order)),
      pagination
    };
  }

  // ===== ACTUALIZAR ESTADO DE ORDEN (ADMIN) =====
  static async updateOrderStatus(orderId, newStatus, adminNotes = null) {
    const order = await Order.findById(orderId);

    if (!order) {
      throw new AppError('Orden no encontrada', 404, 'ORDER_NOT_FOUND');
    }

    // Validar transición de estado
    const validTransitions = this.getValidStatusTransitions(order.status);
    if (!validTransitions.includes(newStatus)) {
      throw new AppError(
        `No se puede cambiar de ${order.status} a ${newStatus}`,
        400,
        'INVALID_STATUS_TRANSITION'
      );
    }

    // Actualizar status
    const oldStatus = order.status;
    order.status = newStatus;
    
    if (adminNotes) {
      order.adminNotes = adminNotes;
    }

    // Agregar historial de estado
    order.statusHistory.push({
      status: newStatus,
      timestamp: new Date(),
      notes: adminNotes
    });

    // Si se cancela la orden, liberar stock
    if (newStatus === ORDER_STATUS.CANCELLED) {
      await this.releaseOrderStock(order);
    }

    await order.save();

    return {
      order: this.formatOrderData(order, true),
      statusChange: {
        from: oldStatus,
        to: newStatus,
        timestamp: new Date()
      }
    };
  }

  // ===== ACTUALIZAR ESTADO DE PAGO (ADMIN) =====
  static async updatePaymentStatus(orderId, paymentData) {
    const { paymentStatus, paymentMethod, transactionId, paymentNotes } = paymentData;

    const order = await Order.findById(orderId);

    if (!order) {
      throw new AppError('Orden no encontrada', 404, 'ORDER_NOT_FOUND');
    }

    // Actualizar información de pago
    order.paymentStatus = paymentStatus;
    if (paymentMethod) order.paymentMethod = paymentMethod;
    if (transactionId) order.transactionId = transactionId;
    if (paymentNotes) order.paymentNotes = paymentNotes;

    // Si el pago se confirma, cambiar status de orden si aplica
    if (paymentStatus === 'completed' && order.status === ORDER_STATUS.PENDING) {
      order.status = ORDER_STATUS.CONFIRMED;
      order.statusHistory.push({
        status: ORDER_STATUS.CONFIRMED,
        timestamp: new Date(),
        notes: 'Pago confirmado - Orden confirmada automáticamente'
      });
    }

    await order.save();

    return this.formatOrderData(order, true);
  }

  // ===== CANCELAR ORDEN =====
  static async cancelOrder(orderId, userId = null, userRole = null, reason = null) {
    const order = await Order.findById(orderId);

    if (!order) {
      throw new AppError('Orden no encontrada', 404, 'ORDER_NOT_FOUND');
    }

    // Verificar permisos
    if (userRole !== 'admin' && userId && order.userId.toString() !== userId.toString()) {
      throw new AppError('No tienes permisos para cancelar esta orden', 403, 'ACCESS_DENIED');
    }

    // Verificar si se puede cancelar
    if (![ORDER_STATUS.PENDING, ORDER_STATUS.CONFIRMED].includes(order.status)) {
      throw new AppError('Esta orden no se puede cancelar en su estado actual', 400, 'CANNOT_CANCEL');
    }

    // Liberar stock
    await this.releaseOrderStock(order);

    // Actualizar orden
    order.status = ORDER_STATUS.CANCELLED;
    order.cancelledAt = new Date();
    if (reason) order.cancellationReason = reason;

    order.statusHistory.push({
      status: ORDER_STATUS.CANCELLED,
      timestamp: new Date(),
      notes: reason || 'Orden cancelada'
    });

    await order.save();

    return this.formatOrderData(order, true);
  }

  // ===== OBTENER ESTADÍSTICAS DE ÓRDENES (ADMIN) =====
  static async getOrderStats(filters = {}) {
    const { dateFrom, dateTo } = filters;
    
    const matchFilters = {};
    if (dateFrom || dateTo) {
      matchFilters.createdAt = {};
      if (dateFrom) matchFilters.createdAt.$gte = new Date(dateFrom);
      if (dateTo) matchFilters.createdAt.$lte = new Date(dateTo);
    }

    const stats = await Order.aggregate([
      { $match: matchFilters },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$finalAmount' },
          averageOrderValue: { $avg: '$finalAmount' },
          ordersByStatus: {
            $push: {
              status: '$status',
              amount: '$finalAmount'
            }
          }
        }
      }
    ]);

    // Estadísticas por estado
    const statusStats = await Order.aggregate([
      { $match: matchFilters },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$finalAmount' }
        }
      }
    ]);

    const result = stats[0] || {
      totalOrders: 0,
      totalRevenue: 0,
      averageOrderValue: 0
    };

    return {
      summary: {
        totalOrders: result.totalOrders,
        totalRevenue: result.totalRevenue,
        averageOrderValue: result.averageOrderValue
      },
      byStatus: statusStats.reduce((acc, stat) => {
        acc[stat._id] = {
          count: stat.count,
          totalAmount: stat.totalAmount
        };
        return acc;
      }, {})
    };
  }

  // ===== UTILITY METHODS =====

  // Generar número de orden único
  static generateOrderNumber() {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ORD-${timestamp.slice(-8)}-${random}`;
  }

  // Obtener transiciones válidas de estado
  static getValidStatusTransitions(currentStatus) {
    const transitions = {
      [ORDER_STATUS.PENDING]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
      [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.PROCESSING, ORDER_STATUS.CANCELLED],
      [ORDER_STATUS.PROCESSING]: [ORDER_STATUS.SHIPPED, ORDER_STATUS.CANCELLED],
      [ORDER_STATUS.SHIPPED]: [ORDER_STATUS.DELIVERED],
      [ORDER_STATUS.DELIVERED]: [], // Estado final
      [ORDER_STATUS.CANCELLED]: [] // Estado final
    };

    return transitions[currentStatus] || [];
  }

  // Liberar stock de una orden
  static async releaseOrderStock(order) {
    for (const item of order.items) {
      await Product.findByIdAndUpdate(
        item.productId,
        { $inc: { stockQty: item.quantity } }
      );
    }
  }

  // Formatear datos de orden para respuesta
  static formatOrderData(order, includeDetails = false) {
    const formatted = {
      id: order._id,
      orderNumber: order.orderNumber,
      userId: order.userId,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      totalAmount: order.totalAmount,
      taxAmount: order.taxAmount,
      shippingAmount: order.shippingAmount,
      finalAmount: order.finalAmount,
      itemsCount: order.items.length,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    };

    if (includeDetails) {
      formatted.items = order.items;
      formatted.shippingAddress = order.shippingAddress;
      formatted.statusHistory = order.statusHistory;
      formatted.notes = order.notes;
      formatted.adminNotes = order.adminNotes;
      formatted.transactionId = order.transactionId;
      formatted.cancelledAt = order.cancelledAt;
      formatted.cancellationReason = order.cancellationReason;
    }

    return formatted;
  }

  // Verificar si una orden pertenece a un usuario
  static async verifyOrderOwnership(orderId, userId) {
    const order = await Order.findById(orderId).select('userId');
    return order && order.userId.toString() === userId.toString();
  }

  // Obtener resumen de orden
  static async getOrderSummary(orderId) {
    const order = await Order.findById(orderId);
    
    if (!order) {
      throw new AppError('Orden no encontrada', 404, 'ORDER_NOT_FOUND');
    }

    return {
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      itemsCount: order.items.length,
      totalAmount: order.finalAmount,
      createdAt: order.createdAt,
      estimatedDelivery: this.calculateEstimatedDelivery(order)
    };
  }

  // Calcular fecha estimada de entrega
  static calculateEstimatedDelivery(order) {
    const businessDays = 3; // 3 días hábiles por defecto
    const createdDate = new Date(order.createdAt);
    const deliveryDate = new Date(createdDate);
    deliveryDate.setDate(deliveryDate.getDate() + businessDays);
    
    return deliveryDate;
  }
}

module.exports = OrderService; 