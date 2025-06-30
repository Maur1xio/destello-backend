const CartService = require('../services/cartService');
const { AsyncHandler } = require('../middlewares/errorHandler');
const Joi = require('joi');

/**
 * @swagger
 * components:
 *   schemas:
 *     CartItem:
 *       type: object
 *       properties:
 *         productId:
 *           type: string
 *           description: ID del producto
 *         quantity:
 *           type: integer
 *           minimum: 1
 *           description: Cantidad del producto
 *         price:
 *           type: number
 *           description: Precio unitario del producto
 *         subtotal:
 *           type: number
 *           description: Subtotal del item (precio × cantidad)
 *         product:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             name:
 *               type: string
 *             sku:
 *               type: string
 *             price:
 *               type: number
 *             stockQty:
 *               type: integer
 *             inStock:
 *               type: boolean
 *     
 *     Cart:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: ID único del carrito
 *         userId:
 *           type: string
 *           description: ID del usuario propietario
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CartItem'
 *           description: Items en el carrito
 *         totalItems:
 *           type: integer
 *           description: Total de items en el carrito
 *         totalAmount:
 *           type: number
 *           description: Total del carrito
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     
 *     AddToCartRequest:
 *       type: object
 *       required:
 *         - productId
 *         - quantity
 *       properties:
 *         productId:
 *           type: string
 *           description: ID del producto
 *         quantity:
 *           type: integer
 *           minimum: 1
 *           description: Cantidad a agregar
 *     
 *     UpdateCartItemRequest:
 *       type: object
 *       required:
 *         - quantity
 *       properties:
 *         quantity:
 *           type: integer
 *           minimum: 1
 *           description: Nueva cantidad
 *
 * tags:
 *   - name: Cart
 *     description: Gestión del carrito de compras
 */

class CartController {

  /**
   * @swagger
   * /api/cart:
   *   get:
   *     summary: Obtener carrito del usuario autenticado
   *     tags: [Cart]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Carrito obtenido exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/Cart'
   *                 message:
   *                   type: string
   *                   example: Carrito obtenido exitosamente
   *       401:
   *         description: No autorizado
   */
  static getCart = AsyncHandler(async (req, res) => {
    const cart = await CartService.getCart(req.user.id);
    
    res.success(cart, 'Carrito obtenido exitosamente');
  });

  /**
   * @swagger
   * /api/cart/items:
   *   post:
   *     summary: Agregar producto al carrito
   *     tags: [Cart]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/AddToCartRequest'
   *     responses:
   *       200:
   *         description: Producto agregado al carrito exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/Cart'
   *                 message:
   *                   type: string
   *                   example: Producto agregado al carrito exitosamente
   *       400:
   *         description: Datos de entrada inválidos o stock insuficiente
   *       404:
   *         description: Producto no encontrado
   *       401:
   *         description: No autorizado
   */
  static addToCart = AsyncHandler(async (req, res) => {
    const addToCartSchema = Joi.object({
      productId: Joi.string().required(),
      quantity: Joi.number().integer().min(1).required()
    });

    const { error, value } = addToCartSchema.validate(req.body);
    if (error) {
      return res.error(error.details[0].message, 400, 'VALIDATION_ERROR');
    }

    const cart = await CartService.addToCart(req.user.id, value.productId, value.quantity);
    
    res.success(cart, 'Producto agregado al carrito exitosamente');
  });

  /**
   * @swagger
   * /api/cart/items/{productId}:
   *   put:
   *     summary: Actualizar cantidad de producto en el carrito
   *     tags: [Cart]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: productId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID del producto
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UpdateCartItemRequest'
   *     responses:
   *       200:
   *         description: Cantidad actualizada exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/Cart'
   *                 message:
   *                   type: string
   *                   example: Cantidad actualizada exitosamente
   *       400:
   *         description: Datos de entrada inválidos o stock insuficiente
   *       404:
   *         description: Producto no encontrado en el carrito
   *       401:
   *         description: No autorizado
   */
  static updateCartItem = AsyncHandler(async (req, res) => {
    const updateItemSchema = Joi.object({
      quantity: Joi.number().integer().min(1).required()
    });

    const { error, value } = updateItemSchema.validate(req.body);
    if (error) {
      return res.error(error.details[0].message, 400, 'VALIDATION_ERROR');
    }

    const cart = await CartService.updateCartItem(req.user.id, req.params.productId, value.quantity);
    
    res.success(cart, 'Cantidad actualizada exitosamente');
  });

  /**
   * @swagger
   * /api/cart/items/{productId}:
   *   delete:
   *     summary: Eliminar producto del carrito
   *     tags: [Cart]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: productId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID del producto
   *     responses:
   *       200:
   *         description: Producto eliminado del carrito exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/Cart'
   *                 message:
   *                   type: string
   *                   example: Producto eliminado del carrito exitosamente
   *       404:
   *         description: Producto no encontrado en el carrito
   *       401:
   *         description: No autorizado
   */
  static removeFromCart = AsyncHandler(async (req, res) => {
    const cart = await CartService.removeFromCart(req.user.id, req.params.productId);
    
    res.success(cart, 'Producto eliminado del carrito exitosamente');
  });

  /**
   * @swagger
   * /api/cart/clear:
   *   delete:
   *     summary: Vaciar carrito completamente
   *     tags: [Cart]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Carrito vaciado exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/Cart'
   *                 message:
   *                   type: string
   *                   example: Carrito vaciado exitosamente
   *       401:
   *         description: No autorizado
   */
  static clearCart = AsyncHandler(async (req, res) => {
    const cart = await CartService.clearCart(req.user.id);
    
    res.success(cart, 'Carrito vaciado exitosamente');
  });

  /**
   * @swagger
   * /api/cart/validate:
   *   post:
   *     summary: Validar carrito (verificar stock y precios)
   *     tags: [Cart]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Carrito validado exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   properties:
   *                     isValid:
   *                       type: boolean
   *                       description: Si el carrito es válido
   *                     issues:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           productId:
   *                             type: string
   *                           productName:
   *                             type: string
   *                           issue:
   *                             type: string
   *                           currentStock:
   *                             type: integer
   *                           requestedQuantity:
   *                             type: integer
   *                       description: Problemas encontrados
   *                     cart:
   *                       $ref: '#/components/schemas/Cart'
   *                 message:
   *                   type: string
   *                   example: Carrito validado exitosamente
   *       401:
   *         description: No autorizado
   */
  static validateCart = AsyncHandler(async (req, res) => {
    const validation = await CartService.validateCart(req.user.id);
    
    res.success(validation, 'Carrito validado exitosamente');
  });

  /**
   * @swagger
   * /api/cart/merge:
   *   post:
   *     summary: Fusionar carrito con datos locales
   *     tags: [Cart]
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
   *                     - quantity
   *                   properties:
   *                     productId:
   *                       type: string
   *                     quantity:
   *                       type: integer
   *                       minimum: 1
   *     responses:
   *       200:
   *         description: Carrito fusionado exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/Cart'
   *                 message:
   *                   type: string
   *                   example: Carrito fusionado exitosamente
   *       400:
   *         description: Datos de entrada inválidos
   *       401:
   *         description: No autorizado
   */
  static mergeCart = AsyncHandler(async (req, res) => {
    const mergeSchema = Joi.object({
      items: Joi.array().items(
        Joi.object({
          productId: Joi.string().required(),
          quantity: Joi.number().integer().min(1).required()
        })
      ).required()
    });

    const { error, value } = mergeSchema.validate(req.body);
    if (error) {
      return res.error(error.details[0].message, 400, 'VALIDATION_ERROR');
    }

    const cart = await CartService.mergeCart(req.user.id, value.items);
    
    res.success(cart, 'Carrito fusionado exitosamente');
  });

  /**
   * @swagger
   * /api/cart/items/{productId}/move-to-wishlist:
   *   post:
   *     summary: Mover producto del carrito a la lista de deseos
   *     tags: [Cart]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: productId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID del producto
   *     responses:
   *       200:
   *         description: Producto movido a lista de deseos exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   properties:
   *                     cart:
   *                       $ref: '#/components/schemas/Cart'
   *                     message:
   *                       type: string
   *                 message:
   *                   type: string
   *                   example: Producto movido a lista de deseos exitosamente
   *       404:
   *         description: Producto no encontrado en el carrito
   *       401:
   *         description: No autorizado
   */
  static moveToWishlist = AsyncHandler(async (req, res) => {
    const result = await CartService.moveToWishlist(req.user.id, req.params.productId);
    
    res.success(result, 'Producto movido a lista de deseos exitosamente');
  });

  /**
   * @swagger
   * /api/cart/summary:
   *   get:
   *     summary: Obtener resumen del carrito
   *     tags: [Cart]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Resumen del carrito obtenido exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   properties:
   *                     totalItems:
   *                       type: integer
   *                       description: Total de items en el carrito
   *                     totalAmount:
   *                       type: number
   *                       description: Total del carrito
   *                     itemCount:
   *                       type: integer
   *                       description: Número de productos únicos
   *                     isEmpty:
   *                       type: boolean
   *                       description: Si el carrito está vacío
   *                     lastUpdated:
   *                       type: string
   *                       format: date-time
   *                       description: Última actualización
   *                 message:
   *                   type: string
   *                   example: Resumen del carrito obtenido exitosamente
   *       401:
   *         description: No autorizado
   */
  static getCartSummary = AsyncHandler(async (req, res) => {
    const summary = await CartService.getCartSummary(req.user.id);
    
    res.success(summary, 'Resumen del carrito obtenido exitosamente');
  });

  /**
   * @swagger
   * /api/cart/items/count:
   *   get:
   *     summary: Obtener conteo de items en el carrito
   *     tags: [Cart]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Conteo obtenido exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   properties:
   *                     totalItems:
   *                       type: integer
   *                       description: Total de items en el carrito
   *                     itemCount:
   *                       type: integer
   *                       description: Número de productos únicos
   *                 message:
   *                   type: string
   *                   example: Conteo obtenido exitosamente
   *       401:
   *         description: No autorizado
   */
  static getCartItemCount = AsyncHandler(async (req, res) => {
    const count = await CartService.getCartItemCount(req.user.id);
    
    res.success(count, 'Conteo obtenido exitosamente');
  });

  /**
   * @swagger
   * /api/cart/items/{productId}/check:
   *   get:
   *     summary: Verificar si un producto está en el carrito
   *     tags: [Cart]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: productId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID del producto
   *     responses:
   *       200:
   *         description: Verificación completada exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   properties:
   *                     inCart:
   *                       type: boolean
   *                       description: Si el producto está en el carrito
   *                     quantity:
   *                       type: integer
   *                       description: Cantidad en el carrito (si está presente)
   *                     productId:
   *                       type: string
   *                       description: ID del producto
   *                 message:
   *                   type: string
   *                   example: Verificación completada exitosamente
   *       401:
   *         description: No autorizado
   */
  static checkProductInCart = AsyncHandler(async (req, res) => {
    const result = await CartService.checkProductInCart(req.user.id, req.params.productId);
    
    res.success(result, 'Verificación completada exitosamente');
  });
}

module.exports = CartController; 