const express = require('express');
const CartController = require('../controllers/cartController');
const { requireAuth } = require('../middlewares');

const router = express.Router();

// ===== TODAS LAS RUTAS REQUIEREN AUTENTICACIÓN =====

/**
 * @swagger
 * /api/cart:
 *   get:
 *     summary: Obtener carrito del usuario autenticado
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', requireAuth, CartController.getCart);

/**
 * @swagger
 * /api/cart/summary:
 *   get:
 *     summary: Obtener resumen del carrito
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 */
router.get('/summary', requireAuth, CartController.getCartSummary);

/**
 * @swagger
 * /api/cart/items/count:
 *   get:
 *     summary: Obtener conteo de items en el carrito
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 */
router.get('/items/count', requireAuth, CartController.getCartItemCount);

/**
 * @swagger
 * /api/cart/items:
 *   post:
 *     summary: Agregar producto al carrito
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 */
router.post('/items', requireAuth, CartController.addToCart);

/**
 * @swagger
 * /api/cart/validate:
 *   post:
 *     summary: Validar carrito (verificar stock y precios)
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 */
router.post('/validate', requireAuth, CartController.validateCart);

/**
 * @swagger
 * /api/cart/merge:
 *   post:
 *     summary: Fusionar carrito con datos locales
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 */
router.post('/merge', requireAuth, CartController.mergeCart);

/**
 * @swagger
 * /api/cart/items/{productId}:
 *   put:
 *     summary: Actualizar cantidad de producto en el carrito
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 */
router.put('/items/:productId', requireAuth, CartController.updateCartItem);

/**
 * @swagger
 * /api/cart/items/{productId}:
 *   delete:
 *     summary: Eliminar producto del carrito
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/items/:productId', requireAuth, CartController.removeFromCart);

/**
 * @swagger
 * /api/cart/clear:
 *   delete:
 *     summary: Vaciar carrito completamente
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/clear', requireAuth, CartController.clearCart);

/**
 * @swagger
 * /api/cart/items/{productId}/check:
 *   get:
 *     summary: Verificar si un producto está en el carrito
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 */
router.get('/items/:productId/check', requireAuth, CartController.checkProductInCart);

/**
 * @swagger
 * /api/cart/items/{productId}/move-to-wishlist:
 *   post:
 *     summary: Mover producto del carrito a la lista de deseos
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 */
router.post('/items/:productId/move-to-wishlist', requireAuth, CartController.moveToWishlist);

module.exports = router; 