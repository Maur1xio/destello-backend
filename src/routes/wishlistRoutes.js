const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');
const { requireAuth } = require('../middlewares/auth');

// Aplicar autenticación a todas las rutas
router.use(requireAuth);

/**
 * @swagger
 * /api/wishlist:
 *   get:
 *     summary: Obtener wishlist del usuario
 *     tags: [Wishlist]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', wishlistController.getWishlist);

/**
 * @swagger
 * /api/wishlist/items:
 *   post:
 *     summary: Agregar producto a wishlist
 *     tags: [Wishlist]
 *     security:
 *       - bearerAuth: []
 */
router.post('/items', wishlistController.addItem);

/**
 * @swagger
 * /api/wishlist/items/{productId}:
 *   delete:
 *     summary: Remover producto de wishlist
 *     tags: [Wishlist]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/items/:productId', wishlistController.removeItem);

/**
 * @swagger
 * /api/wishlist/clear:
 *   delete:
 *     summary: Limpiar toda la wishlist
 *     tags: [Wishlist]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/clear', wishlistController.clearWishlist);

/**
 * @swagger
 * /api/wishlist/move-to-cart:
 *   post:
 *     summary: Mover producto de wishlist a carrito
 *     tags: [Wishlist]
 *     security:
 *       - bearerAuth: []
 */
router.post('/move-to-cart', wishlistController.moveToCart);

/**
 * @swagger
 * /api/wishlist/move-multiple-to-cart:
 *   post:
 *     summary: Mover múltiples productos a carrito
 *     tags: [Wishlist]
 *     security:
 *       - bearerAuth: []
 */
router.post('/move-multiple-to-cart', wishlistController.moveMultipleToCart);

/**
 * @swagger
 * /api/wishlist/check-availability:
 *   post:
 *     summary: Verificar disponibilidad de productos
 *     tags: [Wishlist]
 *     security:
 *       - bearerAuth: []
 */
router.post('/check-availability', wishlistController.checkAvailability);

/**
 * @swagger
 * /api/wishlist/stats:
 *   get:
 *     summary: Obtener estadísticas de wishlist
 *     tags: [Wishlist]
 *     security:
 *       - bearerAuth: []
 */
router.get('/stats', wishlistController.getStats);

module.exports = router; 