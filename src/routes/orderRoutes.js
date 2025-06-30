const express = require('express');
const OrderController = require('../controllers/orderController');
const { requireAuth, requireAdmin } = require('../middlewares');

const router = express.Router();

// ===== RUTAS ESPECÍFICAS PRIMERO (ANTES DE LAS RUTAS CON PARÁMETROS) =====

/**
 * @swagger
 * /api/orders/from-cart:
 *   post:
 *     summary: Crear orden desde el carrito
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 */
router.post('/from-cart', requireAuth, OrderController.createOrderFromCart);

/**
 * @swagger
 * /api/orders/all:
 *   get:
 *     summary: Obtener todas las órdenes (Admin)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 */
router.get('/all', requireAuth, requireAdmin, OrderController.getAllOrders);

/**
 * @swagger
 * /api/orders/stats:
 *   get:
 *     summary: Obtener estadísticas de órdenes (Admin)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 */
router.get('/stats', requireAuth, requireAdmin, OrderController.getOrderStats);

// ===== RUTAS GENERALES =====

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Obtener órdenes del usuario autenticado
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', requireAuth, OrderController.getUserOrders);

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Crear nueva orden
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', requireAuth, OrderController.createOrder);

// ===== RUTAS CON PARÁMETROS AL FINAL =====

/**
 * @swagger
 * /api/orders/{orderId}:
 *   get:
 *     summary: Obtener orden por ID
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:orderId', requireAuth, OrderController.getOrderById);

/**
 * @swagger
 * /api/orders/{orderId}/cancel:
 *   put:
 *     summary: Cancelar orden
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:orderId/cancel', requireAuth, OrderController.cancelOrder);

/**
 * @swagger
 * /api/orders/{orderId}/status:
 *   put:
 *     summary: Actualizar estado de la orden (Admin)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:orderId/status', requireAuth, requireAdmin, OrderController.updateOrderStatus);

/**
 * @swagger
 * /api/orders/{orderId}/payment:
 *   put:
 *     summary: Actualizar estado de pago (Admin)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:orderId/payment', requireAuth, requireAdmin, OrderController.updatePaymentStatus);

module.exports = router; 