const express = require('express');

// ===== IMPORT ALL ROUTES =====
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const productRoutes = require('./productRoutes');
const categoryRoutes = require('./categoryRoutes');
const cartRoutes = require('./cartRoutes');
const orderRoutes = require('./orderRoutes');
const wishlistRoutes = require('./wishlistRoutes');
const reviewRoutes = require('./reviewRoutes');
const shipmentRoutes = require('./shipmentRoutes');
const inventoryRoutes = require('./inventoryRoutes');
const postRoutes = require('./postRoutes');
const commentRoutes = require('./commentRoutes');
const reactionRoutes = require('./reactionRoutes');
const followRoutes = require('./followRoutes');

const router = express.Router();

/**
 * @swagger
 * /api:
 *   get:
 *     summary: API Status endpoint
 *     tags: [General]
 *     security: []
 *     responses:
 *       200:
 *         description: API funcionando correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Destello Shop API funcionando correctamente
 *                 version:
 *                   type: string
 *                   example: v1.0.0
 *                 endpoints:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["/api/auth", "/api/users", "/api/products", "/api/categories", "/api/cart", "/api/orders"]
 */
router.get('/', (req, res) => {
  res.success({
    message: 'Destello Shop API funcionando correctamente',
    version: 'v1.0.0',
    documentation: '/api-docs',
    endpoints: [
      '/api/auth - Autenticación y gestión de perfiles',
      '/api/users - Gestión de usuarios (Admin)',
      '/api/products - Catálogo de productos',
      '/api/categories - Categorías de productos',
      '/api/cart - Carrito de compras',
      '/api/orders - Gestión de órdenes',
      '/api/wishlist - Lista de deseos',
      '/api/reviews - Reseñas de productos',
      '/api/shipments - Tracking de envíos',
      '/api/inventory - Gestión de inventario (Admin)',
      '/api/posts - Red social - Posts',
      '/api/comments - Sistema de comentarios',
      '/api/reactions - Sistema de reacciones',
      '/api/follows - Red social - Seguimientos'
    ]
  }, 'API funcionando correctamente');
});

// ===== MOUNT ROUTES =====

/**
 * @swagger
 * tags:
 *   - name: General
 *     description: Endpoints generales de la API
 *   - name: Auth
 *     description: Autenticación y autorización
 *   - name: Users
 *     description: Gestión de usuarios (Admin)
 *   - name: Products
 *     description: Gestión de productos
 *   - name: Categories
 *     description: Gestión de categorías
 *   - name: Cart
 *     description: Gestión del carrito de compras
 *   - name: Orders
 *     description: Gestión de órdenes
 */

// Mount all route modules
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/wishlist', wishlistRoutes);
router.use('/reviews', reviewRoutes);
router.use('/shipments', shipmentRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/posts', postRoutes);
router.use('/comments', commentRoutes);
router.use('/reactions', reactionRoutes);
router.use('/follows', followRoutes);

// ===== 404 HANDLER FOR API ROUTES =====
router.use((req, res) => {
  res.error(
    `Ruta ${req.originalUrl} no encontrada`,
    404,
    'ROUTE_NOT_FOUND'
  );
});

module.exports = router; 