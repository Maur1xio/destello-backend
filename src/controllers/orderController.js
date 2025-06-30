const OrderService = require('../services/orderService');
const { AsyncHandler } = require('../middlewares/errorHandler');
const Joi = require('joi');

/**
 * @swagger
 * components:
 *   schemas:
 *     OrderItem:
 *       type: object
 *       properties:
 *         productId:
 *           type: string
 *           description: ID del producto
 *         quantity:
 *           type: integer
 *           minimum: 1
 *           description: Cantidad ordenada
 *         price:
 *           type: number
 *           description: Precio unitario al momento de la orden
 *         subtotal:
 *           type: number
 *           description: Subtotal del item
 *         product:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             name:
 *               type: string
 *             sku:
 *               type: string
 *     
 *     Order:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: ID único de la orden
 *         userId:
 *           type: string
 *           description: ID del usuario
 *         orderNumber:
 *           type: string
 *           description: Número de orden único
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/OrderItem'
 *         totalItems:
 *           type: integer
 *           description: Total de items
 *         totalAmount:
 *           type: number
 *           description: Total de la orden
 *         status:
 *           type: string
 *           enum: [pending, confirmed, processing, shipped, delivered, completed, cancelled]
 *           description: Estado de la orden
 *         paymentStatus:
 *           type: string
 *           enum: [pending, paid, failed, refunded]
 *           description: Estado del pago
 *         paymentMethod:
 *           type: string
 *           description: Método de pago
 *         shippingAddress:
 *           type: object
 *           properties:
 *             street:
 *               type: string
 *             city:
 *               type: string
 *             state:
 *               type: string
 *             zipCode:
 *               type: string
 *             country:
 *               type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     
 *     CreateOrderRequest:
 *       type: object
 *       required:
 *         - items
 *         - shippingAddress
 *         - paymentMethod
 *       properties:
 *         items:
 *           type: array
 *           items:
 *             type: object
 *             required:
 *               - productId
 *               - quantity
 *             properties:
 *               productId:
 *                 type: string
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *         shippingAddress:
 *           type: object
 *           required:
 *             - street
 *             - city
 *             - state
 *             - zipCode
 *             - country
 *           properties:
 *             street:
 *               type: string
 *             city:
 *               type: string
 *             state:
 *               type: string
 *             zipCode:
 *               type: string
 *             country:
 *               type: string
 *         paymentMethod:
 *           type: string
 *           description: Método de pago
 *
 * tags:
 *   - name: Orders
 *     description: Gestión de órdenes
 */

class OrderController {

  /**
   * @swagger
   * /api/orders:
   *   get:
   *     summary: Obtener órdenes del usuario autenticado
   *     tags: [Orders]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *         description: Número de página
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 50
   *           default: 10
   *         description: Elementos por página
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [pending, confirmed, processing, shipped, delivered, completed, cancelled]
   *         description: Filtrar por estado
   *       - in: query
   *         name: dateFrom
   *         schema:
   *           type: string
   *           format: date
   *         description: Fecha desde
   *       - in: query
   *         name: dateTo
   *         schema:
   *           type: string
   *           format: date
   *         description: Fecha hasta
   *     responses:
   *       200:
   *         description: Lista de órdenes obtenida exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               allOf:
   *                 - $ref: '#/components/schemas/PaginatedResponse'
   *                 - type: object
   *                   properties:
   *                     data:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/Order'
   *       401:
   *         description: No autorizado
   */
  static getUserOrders = AsyncHandler(async (req, res) => {
    const filtersSchema = Joi.object({
      status: Joi.string().valid('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'completed', 'cancelled').optional(),
      dateFrom: Joi.date().optional(),
      dateTo: Joi.date().optional()
    });

    const paginationSchema = Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(50).default(10)
    });

    const { error: filtersError, value: filters } = filtersSchema.validate(req.query);
    const { error: paginationError, value: pagination } = paginationSchema.validate(req.query);

    if (filtersError || paginationError) {
      const error = filtersError || paginationError;
      return res.error(error.details[0].message, 400, 'VALIDATION_ERROR');
    }

    const result = await OrderService.getUserOrders(req.user.id, filters, pagination);
    
    res.success(result.orders, 'Lista de órdenes obtenida exitosamente', result.pagination);
  });

  /**
   * @swagger
   * /api/orders/all:
   *   get:
   *     summary: Obtener todas las órdenes (Admin)
   *     tags: [Orders]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *         description: Número de página
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 20
   *         description: Elementos por página
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [pending, confirmed, processing, shipped, delivered, completed, cancelled]
   *         description: Filtrar por estado
   *       - in: query
   *         name: userId
   *         schema:
   *           type: string
   *         description: Filtrar por usuario
   *       - in: query
   *         name: dateFrom
   *         schema:
   *           type: string
   *           format: date
   *         description: Fecha desde
   *       - in: query
   *         name: dateTo
   *         schema:
   *           type: string
   *           format: date
   *         description: Fecha hasta
   *     responses:
   *       200:
   *         description: Lista de todas las órdenes obtenida exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               allOf:
   *                 - $ref: '#/components/schemas/PaginatedResponse'
   *                 - type: object
   *                   properties:
   *                     data:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/Order'
   *       403:
   *         description: Acceso denegado - Solo administradores
   */
  static getAllOrders = AsyncHandler(async (req, res) => {
    const filtersSchema = Joi.object({
      status: Joi.string().valid('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'completed', 'cancelled').optional(),
      userId: Joi.string().optional(),
      dateFrom: Joi.date().optional(),
      dateTo: Joi.date().optional()
    });

    const paginationSchema = Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(20)
    });

    const { error: filtersError, value: filters } = filtersSchema.validate(req.query);
    const { error: paginationError, value: pagination } = paginationSchema.validate(req.query);

    if (filtersError || paginationError) {
      const error = filtersError || paginationError;
      return res.error(error.details[0].message, 400, 'VALIDATION_ERROR');
    }

    const result = await OrderService.getAllOrders(filters, pagination);
    
    res.success(result.orders, 'Lista de todas las órdenes obtenida exitosamente', result.pagination);
  });

  /**
   * @swagger
   * /api/orders/{orderId}:
   *   get:
   *     summary: Obtener orden por ID
   *     tags: [Orders]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: orderId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID de la orden
   *     responses:
   *       200:
   *         description: Orden obtenida exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/Order'
   *                 message:
   *                   type: string
   *                   example: Orden obtenida exitosamente
   *       404:
   *         description: Orden no encontrada
   *       403:
   *         description: No tienes permiso para ver esta orden
   *       401:
   *         description: No autorizado
   */
  static getOrderById = AsyncHandler(async (req, res) => {
    const order = await OrderService.getOrderById(req.params.orderId, req.user);
    
    res.success(order, 'Orden obtenida exitosamente');
  });

  /**
   * @swagger
   * /api/orders:
   *   post:
   *     summary: Crear nueva orden
   *     tags: [Orders]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateOrderRequest'
   *     responses:
   *       201:
   *         description: Orden creada exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/Order'
   *                 message:
   *                   type: string
   *                   example: Orden creada exitosamente
   *       400:
   *         description: Datos de entrada inválidos o stock insuficiente
   *       404:
   *         description: Producto no encontrado
   *       401:
   *         description: No autorizado
   */
  static createOrder = AsyncHandler(async (req, res) => {
    const createOrderSchema = Joi.object({
      items: Joi.array().items(
        Joi.object({
          productId: Joi.string().required(),
          quantity: Joi.number().integer().min(1).required()
        })
      ).min(1).required(),
      shippingAddress: Joi.object({
        street: Joi.string().required(),
        city: Joi.string().required(),
        state: Joi.string().required(),
        zipCode: Joi.string().required(),
        country: Joi.string().required()
      }).required(),
      paymentMethod: Joi.string().required()
    });

    const { error, value } = createOrderSchema.validate(req.body);
    if (error) {
      return res.error(error.details[0].message, 400, 'VALIDATION_ERROR');
    }

    const order = await OrderService.createOrder(req.user.id, value);
    
    res.status(201).success(order, 'Orden creada exitosamente');
  });

  /**
   * @swagger
   * /api/orders/from-cart:
   *   post:
   *     summary: Crear orden desde el carrito
   *     tags: [Orders]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - shippingAddress
   *               - paymentMethod
   *             properties:
   *               shippingAddress:
   *                 type: object
   *                 required:
   *                   - street
   *                   - city
   *                   - state
   *                   - zipCode
   *                   - country
   *                 properties:
   *                   street:
   *                     type: string
   *                   city:
   *                     type: string
   *                   state:
   *                     type: string
   *                   zipCode:
   *                     type: string
   *                   country:
   *                     type: string
   *               paymentMethod:
   *                 type: string
   *               clearCart:
   *                 type: boolean
   *                 default: true
   *                 description: Vaciar carrito después de crear orden
   *     responses:
   *       201:
   *         description: Orden creada desde carrito exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/Order'
   *                 message:
   *                   type: string
   *                   example: Orden creada desde carrito exitosamente
   *       400:
   *         description: Carrito vacío o datos inválidos
   *       401:
   *         description: No autorizado
   */
  static createOrderFromCart = AsyncHandler(async (req, res) => {
    const createOrderFromCartSchema = Joi.object({
      shippingAddress: Joi.object({
        street: Joi.string().required(),
        city: Joi.string().required(),
        state: Joi.string().required(),
        zipCode: Joi.string().required(),
        country: Joi.string().required()
      }).required(),
      paymentMethod: Joi.string().required(),
      clearCart: Joi.boolean().default(true)
    });

    const { error, value } = createOrderFromCartSchema.validate(req.body);
    if (error) {
      return res.error(error.details[0].message, 400, 'VALIDATION_ERROR');
    }

    const order = await OrderService.createOrderFromCart(req.user.id, value);
    
    res.status(201).success(order, 'Orden creada desde carrito exitosamente');
  });

  /**
   * @swagger
   * /api/orders/{orderId}/status:
   *   put:
   *     summary: Actualizar estado de la orden (Admin)
   *     tags: [Orders]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: orderId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID de la orden
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - status
   *             properties:
   *               status:
   *                 type: string
   *                 enum: [pending, confirmed, processing, shipped, delivered, completed, cancelled]
   *               notes:
   *                 type: string
   *                 description: Notas sobre el cambio de estado
   *     responses:
   *       200:
   *         description: Estado de orden actualizado exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/Order'
   *                 message:
   *                   type: string
   *                   example: Estado de orden actualizado exitosamente
   *       404:
   *         description: Orden no encontrada
   *       400:
   *         description: Estado inválido
   *       403:
   *         description: Acceso denegado - Solo administradores
   */
  static updateOrderStatus = AsyncHandler(async (req, res) => {
    const updateStatusSchema = Joi.object({
      status: Joi.string().valid('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'completed', 'cancelled').required(),
      notes: Joi.string().optional()
    });

    const { error, value } = updateStatusSchema.validate(req.body);
    if (error) {
      return res.error(error.details[0].message, 400, 'VALIDATION_ERROR');
    }

    const order = await OrderService.updateOrderStatus(req.params.orderId, value.status, value.notes);
    
    res.success(order, 'Estado de orden actualizado exitosamente');
  });

  /**
   * @swagger
   * /api/orders/{orderId}/cancel:
   *   put:
   *     summary: Cancelar orden
   *     tags: [Orders]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: orderId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID de la orden
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               reason:
   *                 type: string
   *                 description: Razón de la cancelación
   *     responses:
   *       200:
   *         description: Orden cancelada exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/Order'
   *                 message:
   *                   type: string
   *                   example: Orden cancelada exitosamente
   *       404:
   *         description: Orden no encontrada
   *       400:
   *         description: No se puede cancelar la orden en su estado actual
   *       403:
   *         description: No tienes permiso para cancelar esta orden
   *       401:
   *         description: No autorizado
   */
  static cancelOrder = AsyncHandler(async (req, res) => {
    const cancelSchema = Joi.object({
      reason: Joi.string().optional()
    });

    const { error, value } = cancelSchema.validate(req.body);
    if (error) {
      return res.error(error.details[0].message, 400, 'VALIDATION_ERROR');
    }

    const order = await OrderService.cancelOrder(req.params.orderId, req.user, value.reason);
    
    res.success(order, 'Orden cancelada exitosamente');
  });

  /**
   * @swagger
   * /api/orders/{orderId}/payment:
   *   put:
   *     summary: Actualizar estado de pago (Admin)
   *     tags: [Orders]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: orderId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID de la orden
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - paymentStatus
   *             properties:
   *               paymentStatus:
   *                 type: string
   *                 enum: [pending, paid, failed, refunded]
   *               transactionId:
   *                 type: string
   *                 description: ID de la transacción
   *               notes:
   *                 type: string
   *                 description: Notas sobre el pago
   *     responses:
   *       200:
   *         description: Estado de pago actualizado exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/Order'
   *                 message:
   *                   type: string
   *                   example: Estado de pago actualizado exitosamente
   *       404:
   *         description: Orden no encontrada
   *       403:
   *         description: Acceso denegado - Solo administradores
   */
  static updatePaymentStatus = AsyncHandler(async (req, res) => {
    const updatePaymentSchema = Joi.object({
      paymentStatus: Joi.string().valid('pending', 'paid', 'failed', 'refunded').required(),
      transactionId: Joi.string().optional(),
      notes: Joi.string().optional()
    });

    const { error, value } = updatePaymentSchema.validate(req.body);
    if (error) {
      return res.error(error.details[0].message, 400, 'VALIDATION_ERROR');
    }

    const order = await OrderService.updatePaymentStatus(req.params.orderId, value);
    
    res.success(order, 'Estado de pago actualizado exitosamente');
  });

  /**
   * @swagger
   * /api/orders/stats:
   *   get:
   *     summary: Obtener estadísticas de órdenes (Admin)
   *     tags: [Orders]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: dateFrom
   *         schema:
   *           type: string
   *           format: date
   *         description: Fecha desde
   *       - in: query
   *         name: dateTo
   *         schema:
   *           type: string
   *           format: date
   *         description: Fecha hasta
   *       - in: query
   *         name: userId
   *         schema:
   *           type: string
   *         description: Estadísticas de usuario específico
   *     responses:
   *       200:
   *         description: Estadísticas de órdenes obtenidas exitosamente
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
   *                     summary:
   *                       type: object
   *                       properties:
   *                         totalOrders:
   *                           type: integer
   *                         totalRevenue:
   *                           type: number
   *                         averageOrderValue:
   *                           type: number
   *                     byStatus:
   *                       type: object
   *                     byDate:
   *                       type: object
   *                     topProducts:
   *                       type: array
   *                 message:
   *                   type: string
   *                   example: Estadísticas de órdenes obtenidas exitosamente
   *       403:
   *         description: Acceso denegado - Solo administradores
   */
  static getOrderStats = AsyncHandler(async (req, res) => {
    const statsSchema = Joi.object({
      dateFrom: Joi.date().optional(),
      dateTo: Joi.date().optional(),
      userId: Joi.string().optional()
    });

    const { error, value } = statsSchema.validate(req.query);
    if (error) {
      return res.error(error.details[0].message, 400, 'VALIDATION_ERROR');
    }

    const stats = await OrderService.getOrderStats(value);
    
    res.success(stats, 'Estadísticas de órdenes obtenidas exitosamente');
  });
}

module.exports = OrderController; 