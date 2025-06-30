const Joi = require('joi');
const shipmentService = require('../services/shipmentService');
const { asyncHandler, AppError } = require('../middlewares/errorHandler');
const { SHIPMENT_STATUS, SHIPMENT_CARRIERS } = require('../config/constants');

// Schemas de validación
const schemas = {
  createShipment: Joi.object({
    order: Joi.string().required(),
    carrier: Joi.string().valid(...Object.values(SHIPMENT_CARRIERS)).required(),
    trackingNumber: Joi.string().required(),
    shippingAddress: Joi.object({
      street: Joi.string().required(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      zipCode: Joi.string().required(),
      country: Joi.string().required()
    }).required(),
    estimatedDelivery: Joi.date().required(),
    shippingCost: Joi.number().min(0).required()
  }),
  updateShipment: Joi.object({
    status: Joi.string().valid(...Object.values(SHIPMENT_STATUS)).optional(),
    trackingNumber: Joi.string().optional(),
    estimatedDelivery: Joi.date().optional(),
    actualDelivery: Joi.date().optional(),
    notes: Joi.string().max(500).optional()
  }),
  addEvent: Joi.object({
    status: Joi.string().valid(...Object.values(SHIPMENT_STATUS)).required(),
    location: Joi.string().required(),
    description: Joi.string().max(500).required(),
    eventDate: Joi.date().default(Date.now)
  })
};

/**
 * @swagger
 * tags:
 *   name: Shipments
 *   description: Gestión de envíos y tracking
 */

const createShipment = asyncHandler(async (req, res) => {
  const { error, value } = schemas.createShipment.validate(req.body);
  if (error) throw new AppError(error.details[0].message, 400);

  const shipment = await shipmentService.createShipment(value);
  
  res.status(201).json({
    success: true,
    message: 'Envío creado exitosamente',
    data: shipment
  });
});

const getShipment = asyncHandler(async (req, res) => {
  const shipment = await shipmentService.getShipmentById(req.params.id);
  
  res.json({
    success: true,
    data: shipment
  });
});

const getShipmentByTracking = asyncHandler(async (req, res) => {
  const shipment = await shipmentService.getShipmentByTracking(req.params.trackingNumber);
  
  res.json({
    success: true,
    data: shipment
  });
});

const getShipments = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, carrier, sort = '-createdAt' } = req.query;
  
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort,
    status,
    carrier
  };
  
  const shipments = await shipmentService.getShipments(options);
  
  res.json({
    success: true,
    data: shipments
  });
});

const getUserShipments = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, sort = '-createdAt' } = req.query;
  
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort,
    status
  };
  
  const shipments = await shipmentService.getUserShipments(req.user._id, options);
  
  res.json({
    success: true,
    data: shipments
  });
});

const updateShipment = asyncHandler(async (req, res) => {
  const { error, value } = schemas.updateShipment.validate(req.body);
  if (error) throw new AppError(error.details[0].message, 400);

  const shipment = await shipmentService.updateShipment(req.params.id, value);
  
  res.json({
    success: true,
    message: 'Envío actualizado exitosamente',
    data: shipment
  });
});

const addTrackingEvent = asyncHandler(async (req, res) => {
  const { error, value } = schemas.addEvent.validate(req.body);
  if (error) throw new AppError(error.details[0].message, 400);

  const shipment = await shipmentService.addTrackingEvent(req.params.id, value);
  
  res.json({
    success: true,
    message: 'Evento de tracking agregado exitosamente',
    data: shipment
  });
});

const getShipmentStats = asyncHandler(async (req, res) => {
  const { startDate, endDate, carrier } = req.query;
  
  const options = {
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
    carrier
  };
  
  const stats = await shipmentService.getShipmentStats(options);
  
  res.json({
    success: true,
    data: stats
  });
});

module.exports = {
  createShipment,
  getShipment,
  getShipmentByTracking,
  getShipments,
  getUserShipments,
  updateShipment,
  addTrackingEvent,
  getShipmentStats
}; 