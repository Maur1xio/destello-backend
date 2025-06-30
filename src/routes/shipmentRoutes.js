const express = require('express');
const router = express.Router();
const shipmentController = require('../controllers/shipmentController');
const { requireAuth, requireAdmin, optionalAuth } = require('../middlewares/auth');

/**
 * @swagger
 * /api/shipments:
 *   post:
 *     summary: Crear nuevo envío (Admin)
 *     tags: [Shipments]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', requireAuth, requireAdmin, shipmentController.createShipment);

/**
 * @swagger
 * /api/shipments:
 *   get:
 *     summary: Obtener todos los envíos (Admin)
 *     tags: [Shipments]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', requireAuth, requireAdmin, shipmentController.getShipments);

/**
 * @swagger
 * /api/shipments/my:
 *   get:
 *     summary: Obtener envíos del usuario
 *     tags: [Shipments]
 *     security:
 *       - bearerAuth: []
 */
router.get('/my', requireAuth, shipmentController.getUserShipments);

/**
 * @swagger
 * /api/shipments/stats:
 *   get:
 *     summary: Obtener estadísticas de envíos (Admin)
 *     tags: [Shipments]
 *     security:
 *       - bearerAuth: []
 */
router.get('/stats', requireAuth, requireAdmin, shipmentController.getShipmentStats);

/**
 * @swagger
 * /api/shipments/track/{trackingNumber}:
 *   get:
 *     summary: Rastrear envío por número de seguimiento
 *     tags: [Shipments]
 */
router.get('/track/:trackingNumber', optionalAuth, shipmentController.getShipmentByTracking);

/**
 * @swagger
 * /api/shipments/{id}:
 *   get:
 *     summary: Obtener envío por ID
 *     tags: [Shipments]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', requireAuth, shipmentController.getShipment);

/**
 * @swagger
 * /api/shipments/{id}:
 *   put:
 *     summary: Actualizar envío (Admin)
 *     tags: [Shipments]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', requireAuth, requireAdmin, shipmentController.updateShipment);

/**
 * @swagger
 * /api/shipments/{id}/tracking:
 *   post:
 *     summary: Agregar evento de tracking (Admin)
 *     tags: [Shipments]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/tracking', requireAuth, requireAdmin, shipmentController.addTrackingEvent);

module.exports = router; 