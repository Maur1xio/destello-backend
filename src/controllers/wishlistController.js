const Joi = require('joi');
const wishlistService = require('../services/wishlistService');
const { asyncHandler, AppError } = require('../middlewares/errorHandler');

/**
 * @swagger
 * components:
 *   schemas:
 *     WishlistItem:
 *       type: object
 *       required:
 *         - product
 *         - addedAt
 *       properties:
 *         product:
 *           type: string
 *           description: ID del producto
 *         addedAt:
 *           type: string
 *           format: date-time
 *           description: Fecha de agregado
 *         isAvailable:
 *           type: boolean
 *           description: Disponibilidad del producto
 *         
 *     Wishlist:
 *       type: object
 *       required:
 *         - user
 *         - items
 *       properties:
 *         _id:
 *           type: string
 *           description: ID de la wishlist
 *         user:
 *           type: string
 *           description: ID del usuario
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/WishlistItem'
 *         totalItems:
 *           type: integer
 *           description: Total de items en la wishlist
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

// Schemas de validación
const schemas = {
  addItem: Joi.object({
    productId: Joi.string().required()
  }),
  moveToCart: Joi.object({
    productId: Joi.string().required(),
    quantity: Joi.number().integer().min(1).default(1)
  }),
  moveMultiple: Joi.object({
    items: Joi.array().items(Joi.object({
      productId: Joi.string().required(),
      quantity: Joi.number().integer().min(1).default(1)
    })).min(1).required()
  })
};

/**
 * @swagger
 * tags:
 *   name: Wishlist
 *   description: Gestión de lista de deseos
 */

/**
 * @swagger
 * /api/wishlist:
 *   get:
 *     summary: Obtener wishlist del usuario
 *     tags: [Wishlist]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: includeUnavailable
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Incluir productos no disponibles
 *     responses:
 *       200:
 *         description: Wishlist obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Wishlist'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
const getWishlist = asyncHandler(async (req, res) => {
  const includeUnavailable = req.query.includeUnavailable !== 'false';
  const wishlist = await wishlistService.getWishlist(req.user._id, { includeUnavailable });
  
  res.json({
    success: true,
    data: wishlist
  });
});

/**
 * @swagger
 * /api/wishlist/items:
 *   post:
 *     summary: Agregar producto a wishlist
 *     tags: [Wishlist]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *             properties:
 *               productId:
 *                 type: string
 *                 description: ID del producto a agregar
 *     responses:
 *       200:
 *         description: Producto agregado a wishlist exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Wishlist'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
const addItem = asyncHandler(async (req, res) => {
  const { error, value } = schemas.addItem.validate(req.body);
  if (error) throw new AppError(error.details[0].message, 400);

  const wishlist = await wishlistService.addItem(req.user._id, value.productId);
  
  res.json({
    success: true,
    message: 'Producto agregado a la wishlist exitosamente',
    data: wishlist
  });
});

/**
 * @swagger
 * /api/wishlist/items/{productId}:
 *   delete:
 *     summary: Remover producto de wishlist
 *     tags: [Wishlist]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del producto a remover
 *     responses:
 *       200:
 *         description: Producto removido de wishlist exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Wishlist'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
const removeItem = asyncHandler(async (req, res) => {
  const wishlist = await wishlistService.removeItem(req.user._id, req.params.productId);
  
  res.json({
    success: true,
    message: 'Producto removido de la wishlist exitosamente',
    data: wishlist
  });
});

/**
 * @swagger
 * /api/wishlist/clear:
 *   delete:
 *     summary: Limpiar toda la wishlist
 *     tags: [Wishlist]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wishlist limpiada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Wishlist'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
const clearWishlist = asyncHandler(async (req, res) => {
  const wishlist = await wishlistService.clearWishlist(req.user._id);
  
  res.json({
    success: true,
    message: 'Wishlist limpiada exitosamente',
    data: wishlist
  });
});

/**
 * @swagger
 * /api/wishlist/move-to-cart:
 *   post:
 *     summary: Mover producto de wishlist a carrito
 *     tags: [Wishlist]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *             properties:
 *               productId:
 *                 type: string
 *                 description: ID del producto a mover
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 default: 1
 *                 description: Cantidad a agregar al carrito
 *     responses:
 *       200:
 *         description: Producto movido al carrito exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     wishlist:
 *                       $ref: '#/components/schemas/Wishlist'
 *                     cart:
 *                       $ref: '#/components/schemas/Cart'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
const moveToCart = asyncHandler(async (req, res) => {
  const { error, value } = schemas.moveToCart.validate(req.body);
  if (error) throw new AppError(error.details[0].message, 400);

  const result = await wishlistService.moveToCart(req.user._id, value.productId, value.quantity);
  
  res.json({
    success: true,
    message: 'Producto movido al carrito exitosamente',
    data: result
  });
});

/**
 * @swagger
 * /api/wishlist/move-multiple-to-cart:
 *   post:
 *     summary: Mover múltiples productos de wishlist a carrito
 *     tags: [Wishlist]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - productId
 *                   properties:
 *                     productId:
 *                       type: string
 *                       description: ID del producto
 *                     quantity:
 *                       type: integer
 *                       minimum: 1
 *                       default: 1
 *                       description: Cantidad
 *     responses:
 *       200:
 *         description: Productos movidos al carrito exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     wishlist:
 *                       $ref: '#/components/schemas/Wishlist'
 *                     cart:
 *                       $ref: '#/components/schemas/Cart'
 *                     results:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           productId:
 *                             type: string
 *                           success:
 *                             type: boolean
 *                           error:
 *                             type: string
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
const moveMultipleToCart = asyncHandler(async (req, res) => {
  const { error, value } = schemas.moveMultiple.validate(req.body);
  if (error) throw new AppError(error.details[0].message, 400);

  const result = await wishlistService.moveMultipleToCart(req.user._id, value.items);
  
  res.json({
    success: true,
    message: 'Productos procesados para mover al carrito',
    data: result
  });
});

/**
 * @swagger
 * /api/wishlist/check-availability:
 *   post:
 *     summary: Verificar disponibilidad de productos en wishlist
 *     tags: [Wishlist]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Disponibilidad actualizada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     availableItems:
 *                       type: integer
 *                     unavailableItems:
 *                       type: integer
 *                     totalItems:
 *                       type: integer
 *                     wishlist:
 *                       $ref: '#/components/schemas/Wishlist'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
const checkAvailability = asyncHandler(async (req, res) => {
  const result = await wishlistService.checkAvailability(req.user._id);
  
  res.json({
    success: true,
    message: 'Disponibilidad de productos verificada',
    data: result
  });
});

/**
 * @swagger
 * /api/wishlist/stats:
 *   get:
 *     summary: Obtener estadísticas de wishlist
 *     tags: [Wishlist]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalItems:
 *                       type: integer
 *                     availableItems:
 *                       type: integer
 *                     unavailableItems:
 *                       type: integer
 *                     categories:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           category:
 *                             type: string
 *                           count:
 *                             type: integer
 *                     totalValue:
 *                       type: number
 *                     averagePrice:
 *                       type: number
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
const getStats = asyncHandler(async (req, res) => {
  const stats = await wishlistService.getWishlistStats(req.user._id);
  
  res.json({
    success: true,
    data: stats
  });
});

module.exports = {
  getWishlist,
  addItem,
  removeItem,
  clearWishlist,
  moveToCart,
  moveMultipleToCart,
  checkAvailability,
  getStats
}; 