const Shipment = require('../models/Shipment');
const Order = require('../models/Order');
const { AppError } = require('../middlewares/errorHandler');
const { calculatePagination } = require('../middlewares/responseFormatter');
const { SHIPMENT_STATUS, ORDER_STATUS } = require('../config/constants');

class ShipmentService {
  // ===== CREAR ENVÍO DESDE ORDEN =====
  static async createShipmentFromOrder(orderId, shipmentData) {
    const { carrierId, carrierName, trackingNumber, estimatedDelivery, notes } = shipmentData;

    // Verificar que la orden exista y esté en estado válido
    const order = await Order.findById(orderId);
    
    if (!order) {
      throw new AppError('Orden no encontrada', 404, 'ORDER_NOT_FOUND');
    }

    if (order.status !== ORDER_STATUS.PROCESSING) {
      throw new AppError('La orden debe estar en estado "procesando" para crear un envío', 400, 'INVALID_ORDER_STATUS');
    }

    // Verificar que no exista ya un envío activo para esta orden
    const existingShipment = await Shipment.findOne({ 
      orderId, 
      status: { $nin: [SHIPMENT_STATUS.CANCELLED] } 
    });
    
    if (existingShipment) {
      throw new AppError('Ya existe un envío activo para esta orden', 400, 'SHIPMENT_ALREADY_EXISTS');
    }

    // Crear envío
    const shipment = await Shipment.create({
      orderId,
      userId: order.userId,
      trackingNumber: trackingNumber || this.generateTrackingNumber(),
      carrierId,
      carrierName,
      status: SHIPMENT_STATUS.PENDING,
      shippingAddress: order.shippingAddress,
      estimatedDelivery: estimatedDelivery || this.calculateEstimatedDelivery(),
      notes
    });

    // Actualizar estado de la orden
    order.status = ORDER_STATUS.SHIPPED;
    order.statusHistory.push({
      status: ORDER_STATUS.SHIPPED,
      timestamp: new Date(),
      notes: `Envío creado - Tracking: ${shipment.trackingNumber}`
    });
    await order.save();

    return this.formatShipmentData(shipment, true);
  }

  // ===== OBTENER ENVÍO POR ID =====
  static async getShipmentById(shipmentId, userId = null, userRole = null) {
    const shipment = await Shipment.findById(shipmentId)
      .populate('orderId', 'orderNumber finalAmount')
      .populate('userId', 'firstName lastName email');

    if (!shipment) {
      throw new AppError('Envío no encontrado', 404, 'SHIPMENT_NOT_FOUND');
    }

    // Verificar permisos
    if (userRole !== 'admin' && userId && shipment.userId._id.toString() !== userId.toString()) {
      throw new AppError('No tienes permisos para ver este envío', 403, 'ACCESS_DENIED');
    }

    return this.formatShipmentData(shipment, true);
  }

  // ===== OBTENER ENVÍOS POR USUARIO =====
  static async getUserShipments(userId, paginationData) {
    const { page, limit, sort = '-createdAt' } = paginationData;

    const filters = { userId };

    // Calcular paginación
    const pagination = calculatePagination(page, limit, await Shipment.countDocuments(filters));

    // Obtener envíos
    const shipments = await Shipment.find(filters)
      .populate('orderId', 'orderNumber finalAmount')
      .sort(sort)
      .skip(pagination.offset)
      .limit(pagination.limit);

    return {
      shipments: shipments.map(shipment => this.formatShipmentData(shipment)),
      pagination
    };
  }

  // ===== OBTENER TODOS LOS ENVÍOS (ADMIN) =====
  static async getAllShipments(filters, paginationData) {
    const { 
      page, 
      limit, 
      sort = '-createdAt',
      status,
      carrierId,
      dateFrom,
      dateTo,
      search
    } = { ...filters, ...paginationData };

    // Construir filtros
    const searchFilters = {};

    if (status) {
      searchFilters.status = status;
    }

    if (carrierId) {
      searchFilters.carrierId = carrierId;
    }

    if (dateFrom || dateTo) {
      searchFilters.createdAt = {};
      if (dateFrom) searchFilters.createdAt.$gte = new Date(dateFrom);
      if (dateTo) searchFilters.createdAt.$lte = new Date(dateTo);
    }

    if (search) {
      searchFilters.$or = [
        { trackingNumber: { $regex: search, $options: 'i' } },
        { carrierName: { $regex: search, $options: 'i' } }
      ];
    }

    // Calcular paginación
    const pagination = calculatePagination(page, limit, await Shipment.countDocuments(searchFilters));

    // Obtener envíos
    const shipments = await Shipment.find(searchFilters)
      .populate('orderId', 'orderNumber finalAmount')
      .populate('userId', 'firstName lastName email')
      .sort(sort)
      .skip(pagination.offset)
      .limit(pagination.limit);

    return {
      shipments: shipments.map(shipment => this.formatShipmentData(shipment)),
      pagination
    };
  }

  // ===== ACTUALIZAR ESTADO DE ENVÍO (ADMIN) =====
  static async updateShipmentStatus(shipmentId, statusData) {
    const { status, location, notes } = statusData;

    const shipment = await Shipment.findById(shipmentId);

    if (!shipment) {
      throw new AppError('Envío no encontrado', 404, 'SHIPMENT_NOT_FOUND');
    }

    // Validar transición de estado
    const validTransitions = this.getValidStatusTransitions(shipment.status);
    if (!validTransitions.includes(status)) {
      throw new AppError(
        `No se puede cambiar de ${shipment.status} a ${status}`,
        400,
        'INVALID_STATUS_TRANSITION'
      );
    }

    // Actualizar estado
    const oldStatus = shipment.status;
    shipment.status = status;

    if (location) {
      shipment.currentLocation = location;
    }

    // Agregar entrada al tracking
    shipment.trackingHistory.push({
      status,
      location: location || shipment.currentLocation,
      timestamp: new Date(),
      description: this.getStatusDescription(status),
      notes
    });

    // Si se entrega, actualizar fecha de entrega
    if (status === SHIPMENT_STATUS.DELIVERED) {
      shipment.deliveredAt = new Date();
      
      // Actualizar estado de la orden
      const order = await Order.findById(shipment.orderId);
      if (order) {
        order.status = ORDER_STATUS.DELIVERED;
        order.statusHistory.push({
          status: ORDER_STATUS.DELIVERED,
          timestamp: new Date(),
          notes: 'Entregado'
        });
        await order.save();
      }
    }

    await shipment.save();

    return {
      shipment: this.formatShipmentData(shipment, true),
      statusChange: {
        from: oldStatus,
        to: status,
        timestamp: new Date()
      }
    };
  }

  // ===== RASTREAR ENVÍO =====
  static async trackShipment(trackingNumber) {
    const shipment = await Shipment.findOne({ trackingNumber })
      .populate('orderId', 'orderNumber')
      .populate('userId', 'firstName lastName');

    if (!shipment) {
      throw new AppError('Número de rastreo no encontrado', 404, 'TRACKING_NOT_FOUND');
    }

    return {
      trackingNumber: shipment.trackingNumber,
      status: shipment.status,
      statusDescription: this.getStatusDescription(shipment.status),
      currentLocation: shipment.currentLocation,
      estimatedDelivery: shipment.estimatedDelivery,
      deliveredAt: shipment.deliveredAt,
      trackingHistory: shipment.trackingHistory.map(entry => ({
        status: entry.status,
        description: entry.description,
        location: entry.location,
        timestamp: entry.timestamp,
        notes: entry.notes
      })),
      order: {
        orderNumber: shipment.orderId.orderNumber
      }
    };
  }

  // ===== OBTENER ENVÍOS POR ESTADO =====
  static async getShipmentsByStatus(status, paginationData) {
    const { page, limit } = paginationData;

    // Calcular paginación
    const pagination = calculatePagination(page, limit, await Shipment.countDocuments({ status }));

    // Obtener envíos
    const shipments = await Shipment.find({ status })
      .populate('orderId', 'orderNumber finalAmount')
      .populate('userId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(pagination.offset)
      .limit(pagination.limit);

    return {
      status,
      shipments: shipments.map(shipment => this.formatShipmentData(shipment)),
      pagination
    };
  }

  // ===== OBTENER ENVÍOS PENDIENTES =====
  static async getPendingShipments() {
    const shipments = await Shipment.find({ 
      status: { $in: [SHIPMENT_STATUS.PENDING, SHIPMENT_STATUS.IN_TRANSIT] }
    })
      .populate('orderId', 'orderNumber finalAmount createdAt')
      .populate('userId', 'firstName lastName email')
      .sort({ createdAt: 1 });

    return shipments.map(shipment => this.formatShipmentData(shipment));
  }

  // ===== OBTENER ENVÍOS RETRASADOS =====
  static async getDelayedShipments() {
    const now = new Date();
    
    const shipments = await Shipment.find({
      status: { $in: [SHIPMENT_STATUS.PENDING, SHIPMENT_STATUS.IN_TRANSIT] },
      estimatedDelivery: { $lt: now }
    })
      .populate('orderId', 'orderNumber finalAmount')
      .populate('userId', 'firstName lastName email')
      .sort({ estimatedDelivery: 1 });

    return shipments.map(shipment => ({
      ...this.formatShipmentData(shipment),
      delayDays: Math.ceil((now - new Date(shipment.estimatedDelivery)) / (1000 * 60 * 60 * 24))
    }));
  }

  // ===== CANCELAR ENVÍO (ADMIN) =====
  static async cancelShipment(shipmentId, reason) {
    const shipment = await Shipment.findById(shipmentId);

    if (!shipment) {
      throw new AppError('Envío no encontrado', 404, 'SHIPMENT_NOT_FOUND');
    }

    if (shipment.status === SHIPMENT_STATUS.DELIVERED) {
      throw new AppError('No se puede cancelar un envío ya entregado', 400, 'CANNOT_CANCEL_DELIVERED');
    }

    // Actualizar estado
    shipment.status = SHIPMENT_STATUS.CANCELLED;
    shipment.cancelledAt = new Date();
    shipment.cancellationReason = reason;

    // Agregar entrada al tracking
    shipment.trackingHistory.push({
      status: SHIPMENT_STATUS.CANCELLED,
      location: shipment.currentLocation,
      timestamp: new Date(),
      description: 'Envío cancelado',
      notes: reason
    });

    await shipment.save();

    // Actualizar orden si es necesario
    const order = await Order.findById(shipment.orderId);
    if (order && order.status === ORDER_STATUS.SHIPPED) {
      order.status = ORDER_STATUS.PROCESSING;
      order.statusHistory.push({
        status: ORDER_STATUS.PROCESSING,
        timestamp: new Date(),
        notes: `Envío cancelado: ${reason}`
      });
      await order.save();
    }

    return this.formatShipmentData(shipment, true);
  }

  // ===== OBTENER ESTADÍSTICAS DE ENVÍOS (ADMIN) =====
  static async getShipmentStats(filters = {}) {
    const { dateFrom, dateTo } = filters;
    
    const matchFilters = {};
    if (dateFrom || dateTo) {
      matchFilters.createdAt = {};
      if (dateFrom) matchFilters.createdAt.$gte = new Date(dateFrom);
      if (dateTo) matchFilters.createdAt.$lte = new Date(dateTo);
    }

    // Estadísticas por estado
    const statusStats = await Shipment.aggregate([
      { $match: matchFilters },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Estadísticas por carrier
    const carrierStats = await Shipment.aggregate([
      { $match: matchFilters },
      {
        $group: {
          _id: '$carrierName',
          count: { $sum: 1 },
          delivered: {
            $sum: {
              $cond: [{ $eq: ['$status', SHIPMENT_STATUS.DELIVERED] }, 1, 0]
            }
          }
        }
      }
    ]);

    // Tiempo promedio de entrega
    const deliveryTimeStats = await Shipment.aggregate([
      { 
        $match: { 
          ...matchFilters,
          status: SHIPMENT_STATUS.DELIVERED,
          deliveredAt: { $exists: true }
        }
      },
      {
        $project: {
          deliveryTime: {
            $divide: [
              { $subtract: ['$deliveredAt', '$createdAt'] },
              1000 * 60 * 60 * 24 // Convertir a días
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          averageDeliveryTime: { $avg: '$deliveryTime' },
          minDeliveryTime: { $min: '$deliveryTime' },
          maxDeliveryTime: { $max: '$deliveryTime' }
        }
      }
    ]);

    return {
      byStatus: statusStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {}),
      byCarrier: carrierStats.map(stat => ({
        carrier: stat._id,
        totalShipments: stat.count,
        deliveredShipments: stat.delivered,
        deliveryRate: stat.count > 0 ? (stat.delivered / stat.count * 100).toFixed(2) : 0
      })),
      deliveryTimes: deliveryTimeStats[0] || {
        averageDeliveryTime: 0,
        minDeliveryTime: 0,
        maxDeliveryTime: 0
      }
    };
  }

  // ===== UTILITY METHODS =====

  // Generar número de tracking único
  static generateTrackingNumber() {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `TRK${timestamp.slice(-8)}${random}`;
  }

  // Calcular fecha estimada de entrega
  static calculateEstimatedDelivery(businessDays = 3) {
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + businessDays);
    return deliveryDate;
  }

  // Obtener transiciones válidas de estado
  static getValidStatusTransitions(currentStatus) {
    const transitions = {
      [SHIPMENT_STATUS.PENDING]: [SHIPMENT_STATUS.IN_TRANSIT, SHIPMENT_STATUS.CANCELLED],
      [SHIPMENT_STATUS.IN_TRANSIT]: [SHIPMENT_STATUS.OUT_FOR_DELIVERY, SHIPMENT_STATUS.RETURNED, SHIPMENT_STATUS.CANCELLED],
      [SHIPMENT_STATUS.OUT_FOR_DELIVERY]: [SHIPMENT_STATUS.DELIVERED, SHIPMENT_STATUS.RETURNED],
      [SHIPMENT_STATUS.DELIVERED]: [], // Estado final
      [SHIPMENT_STATUS.RETURNED]: [SHIPMENT_STATUS.IN_TRANSIT], // Puede reintentar
      [SHIPMENT_STATUS.CANCELLED]: [] // Estado final
    };

    return transitions[currentStatus] || [];
  }

  // Obtener descripción del estado
  static getStatusDescription(status) {
    const descriptions = {
      [SHIPMENT_STATUS.PENDING]: 'Envío creado - Preparando para despacho',
      [SHIPMENT_STATUS.IN_TRANSIT]: 'En tránsito hacia el destino',
      [SHIPMENT_STATUS.OUT_FOR_DELIVERY]: 'En reparto - Será entregado hoy',
      [SHIPMENT_STATUS.DELIVERED]: 'Entregado exitosamente',
      [SHIPMENT_STATUS.RETURNED]: 'Devuelto al remitente',
      [SHIPMENT_STATUS.CANCELLED]: 'Envío cancelado'
    };

    return descriptions[status] || 'Estado desconocido';
  }

  // Formatear datos de envío para respuesta
  static formatShipmentData(shipment, includeDetails = false) {
    const formatted = {
      id: shipment._id,
      orderId: shipment.orderId,
      userId: shipment.userId,
      trackingNumber: shipment.trackingNumber,
      carrierId: shipment.carrierId,
      carrierName: shipment.carrierName,
      status: shipment.status,
      statusDescription: this.getStatusDescription(shipment.status),
      currentLocation: shipment.currentLocation,
      estimatedDelivery: shipment.estimatedDelivery,
      deliveredAt: shipment.deliveredAt,
      createdAt: shipment.createdAt,
      updatedAt: shipment.updatedAt
    };

    if (includeDetails) {
      formatted.shippingAddress = shipment.shippingAddress;
      formatted.trackingHistory = shipment.trackingHistory;
      formatted.notes = shipment.notes;
      formatted.cancelledAt = shipment.cancelledAt;
      formatted.cancellationReason = shipment.cancellationReason;
    }

    return formatted;
  }

  // Verificar si un envío pertenece a un usuario
  static async verifyShipmentOwnership(shipmentId, userId) {
    const shipment = await Shipment.findById(shipmentId).select('userId');
    return shipment && shipment.userId.toString() === userId.toString();
  }
}

module.exports = ShipmentService; 