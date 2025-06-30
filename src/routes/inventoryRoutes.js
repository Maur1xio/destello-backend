const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { requireAuth, requireAdmin } = require('../middlewares/auth');

// Aplicar autenticación y permisos de admin a todas las rutas
router.use(requireAuth, requireAdmin);

/**
 * @swagger
 * /api/inventory/transactions:
 *   post:
 *     summary: Crear transacción de inventario
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 */
router.post('/transactions', inventoryController.createTransaction);

/**
 * @swagger
 * /api/inventory/transactions:
 *   get:
 *     summary: Obtener todas las transacciones
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 */
router.get('/transactions', inventoryController.getTransactions);

/**
 * @swagger
 * /api/inventory/transactions/bulk:
 *   post:
 *     summary: Crear múltiples transacciones
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 */
router.post('/transactions/bulk', inventoryController.bulkCreateTransactions);

/**
 * @swagger
 * /api/inventory/transactions/{id}:
 *   get:
 *     summary: Obtener transacción por ID
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 */
router.get('/transactions/:id', inventoryController.getTransaction);

/**
 * @swagger
 * /api/inventory/transactions/{id}:
 *   put:
 *     summary: Actualizar transacción
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 */
router.put('/transactions/:id', inventoryController.updateTransaction);

/**
 * @swagger
 * /api/inventory/transactions/{id}:
 *   delete:
 *     summary: Eliminar transacción
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/transactions/:id', inventoryController.deleteTransaction);

/**
 * @swagger
 * /api/inventory/products/{productId}/history:
 *   get:
 *     summary: Obtener historial de inventario de un producto
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 */
router.get('/products/:productId/history', inventoryController.getProductHistory);

/**
 * @swagger
 * /api/inventory/report:
 *   get:
 *     summary: Obtener reporte de inventario
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 */
router.get('/report', inventoryController.getInventoryReport);

/**
 * @swagger
 * /api/inventory/analytics:
 *   get:
 *     summary: Obtener análisis de inventario
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 */
router.get('/analytics', inventoryController.getInventoryAnalytics);

module.exports = router; 