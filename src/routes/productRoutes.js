const express = require('express');
const ProductController = require('../controllers/productController');
const { requireAuth, requireAdmin, optionalAuth } = require('../middlewares');

const router = express.Router();

// ===== RUTAS PÚBLICAS =====

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Obtener todos los productos
 *     tags: [Products]
 *     security: []
 */
router.get('/', optionalAuth, ProductController.getAllProducts);

/**
 * @swagger
 * /api/products/search:
 *   get:
 *     summary: Buscar productos
 *     tags: [Products]
 *     security: []
 */
router.get('/search', ProductController.searchProducts);

/**
 * @swagger
 * /api/products/featured:
 *   get:
 *     summary: Obtener productos destacados
 *     tags: [Products]
 *     security: []
 */
router.get('/featured', ProductController.getFeaturedProducts);

/**
 * @swagger
 * /api/products/popular:
 *   get:
 *     summary: Obtener productos populares
 *     tags: [Products]
 *     security: []
 */
router.get('/popular', ProductController.getPopularProducts);

/**
 * @swagger
 * /api/products/category/{categoryId}:
 *   get:
 *     summary: Obtener productos por categoría
 *     tags: [Products]
 *     security: []
 */
router.get('/category/:categoryId', ProductController.getProductsByCategory);

/**
 * @swagger
 * /api/products/{productId}:
 *   get:
 *     summary: Obtener producto por ID
 *     tags: [Products]
 *     security: []
 */
router.get('/:productId', optionalAuth, ProductController.getProductById);

/**
 * @swagger
 * /api/products/{productId}/related:
 *   get:
 *     summary: Obtener productos relacionados
 *     tags: [Products]
 *     security: []
 */
router.get('/:productId/related', ProductController.getRelatedProducts);

/**
 * @swagger
 * /api/products/{productId}/stock/check:
 *   get:
 *     summary: Verificar disponibilidad de stock
 *     tags: [Products]
 *     security: []
 */
router.get('/:productId/stock/check', ProductController.checkStock);

// ===== RUTAS DE ADMINISTRADOR =====

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Crear nuevo producto (Admin)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', requireAuth, requireAdmin, ProductController.createProduct);

/**
 * @swagger
 * /api/products/{productId}:
 *   put:
 *     summary: Actualizar producto (Admin)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:productId', requireAuth, requireAdmin, ProductController.updateProduct);

/**
 * @swagger
 * /api/products/{productId}:
 *   delete:
 *     summary: Eliminar producto (Admin)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:productId', requireAuth, requireAdmin, ProductController.deleteProduct);

/**
 * @swagger
 * /api/products/{productId}/stock:
 *   put:
 *     summary: Actualizar stock del producto (Admin)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:productId/stock', requireAuth, requireAdmin, ProductController.updateStock);

/**
 * @swagger
 * /api/products/{productId}/stats:
 *   get:
 *     summary: Obtener estadísticas del producto (Admin)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:productId/stats', requireAuth, requireAdmin, ProductController.getProductStats);

module.exports = router; 