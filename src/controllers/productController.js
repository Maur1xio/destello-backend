const ProductService = require('../services/productService');
const { asyncHandler, AppError } = require('../middlewares/errorHandler');  
const Joi = require('joi');

/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: ID único del producto
 *         name:
 *           type: string
 *           description: Nombre del producto
 *         sku:
 *           type: string
 *           description: SKU único del producto
 *         description:
 *           type: string
 *           description: Descripción del producto
 *         price:
 *           type: number
 *           minimum: 0
 *           description: Precio del producto
 *         stockQty:
 *           type: integer
 *           minimum: 0
 *           description: Cantidad en stock
 *         inStock:
 *           type: boolean
 *           description: Si está en stock
 *         isFeatured:
 *           type: boolean
 *           description: Si es producto destacado
 *         isActive:
 *           type: boolean
 *           description: Si está activo
 *         weight:
 *           type: number
 *           description: Peso del producto
 *         dimensions:
 *           type: object
 *           properties:
 *             length:
 *               type: number
 *             width:
 *               type: number
 *             height:
 *               type: number
 *         categories:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *               name:
 *                 type: string
 *               slug:
 *                 type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     
 *     CreateProductRequest:
 *       type: object
 *       required:
 *         - name
 *         - sku
 *         - description
 *         - price
 *         - stockQty
 *         - categories
 *       properties:
 *         name:
 *           type: string
 *           minLength: 2
 *           maxLength: 200
 *         sku:
 *           type: string
 *           minLength: 2
 *           maxLength: 50
 *         description:
 *           type: string
 *           minLength: 10
 *         price:
 *           type: number
 *           minimum: 0
 *         stockQty:
 *           type: integer
 *           minimum: 0
 *         weight:
 *           type: number
 *           minimum: 0
 *         dimensions:
 *           type: object
 *           properties:
 *             length:
 *               type: number
 *               minimum: 0
 *             width:
 *               type: number
 *               minimum: 0
 *             height:
 *               type: number
 *               minimum: 0
 *         categories:
 *           type: array
 *           items:
 *             type: string
 *           minItems: 1
 *         isFeatured:
 *           type: boolean
 *           default: false
 *         isActive:
 *           type: boolean
 *           default: true
 *
 * tags:
 *   - name: Products
 *     description: Gestión de productos
 */

class ProductController {

  /**
   * @swagger
   * /api/products:
   *   get:
   *     summary: Obtener todos los productos
   *     tags: [Products]
   *     security: []
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
   *         name: category
   *         schema:
   *           type: string
   *         description: Filtrar por categoría
   *       - in: query
   *         name: minPrice
   *         schema:
   *           type: number
   *           minimum: 0
   *         description: Precio mínimo
   *       - in: query
   *         name: maxPrice
   *         schema:
   *           type: number
   *           minimum: 0
   *         description: Precio máximo
   *       - in: query
   *         name: inStock
   *         schema:
   *           type: boolean
   *         description: Solo productos en stock
   *       - in: query
   *         name: featured
   *         schema:
   *           type: boolean
   *         description: Solo productos destacados
   *       - in: query
   *         name: sort
   *         schema:
   *           type: string
   *           enum: [createdAt, -createdAt, price, -price, name, -name]
   *           default: -createdAt
   *         description: Ordenar por campo
   *     responses:
   *       200:
   *         description: Lista de productos obtenida exitosamente
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
   *                         $ref: '#/components/schemas/Product'
   */
  static getAllProducts = asyncHandler(async (req, res) => {
    const filtersSchema = Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(20),
      category: Joi.string().optional(),
      minPrice: Joi.number().min(0).optional(),
      maxPrice: Joi.number().min(0).optional(),
      inStock: Joi.boolean().optional(),
      featured: Joi.boolean().optional(),
      sort: Joi.string().valid('createdAt', '-createdAt', 'price', '-price', 'name', '-name').default('-createdAt')
    });

    const { error, value } = filtersSchema.validate(req.query);
    if (error) {
      return res.error(error.details[0].message, 400, 'VALIDATION_ERROR');
    }

    const result = await ProductService.getAllProducts(value);
    
    res.success(result, 'Lista de productos obtenida exitosamente');
  });

  /**
   * @swagger
   * /api/products/{productId}:
   *   get:
   *     summary: Obtener producto por ID
   *     tags: [Products]
   *     security: []
   *     parameters:
   *       - in: path
   *         name: productId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID del producto
   *     responses:
   *       200:
   *         description: Producto obtenido exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/Product'
   *                 message:
   *                   type: string
   *                   example: Producto obtenido exitosamente
   *       404:
   *         description: Producto no encontrado
   */
  static getProductById = asyncHandler(async (req, res) => {
    const userRole = req.user ? req.user.role : null;
    const product = await ProductService.getProductById(req.params.productId, userRole);
    
    res.success(product, 'Producto obtenido exitosamente');
  });

  /**
   * @swagger
   * /api/products:
   *   post:
   *     summary: Crear nuevo producto (Admin)
   *     tags: [Products]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateProductRequest'
   *     responses:
   *       201:
   *         description: Producto creado exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/Product'
   *                 message:
   *                   type: string
   *                   example: Producto creado exitosamente
   *       400:
   *         description: Datos de entrada inválidos
   *       409:
   *         description: SKU ya existe
   *       403:
   *         description: Acceso denegado - Solo administradores
   */
  static createProduct = asyncHandler(async (req, res) => {
    const createProductSchema = Joi.object({
      name: Joi.string().min(2).max(200).required(),
      sku: Joi.string().min(2).max(50).required(),
      description: Joi.string().min(10).required(),
      price: Joi.number().min(0).required(),
      stockQty: Joi.number().integer().min(0).required(),
      weight: Joi.number().min(0).optional(),
      dimensions: Joi.object({
        length: Joi.number().min(0).required(),
        width: Joi.number().min(0).required(),
        height: Joi.number().min(0).required()
      }).optional(),
      categories: Joi.array().items(Joi.string()).min(1).required(),
      isFeatured: Joi.boolean().default(false),
      isActive: Joi.boolean().default(true)
    });

    const { error, value } = createProductSchema.validate(req.body);
    if (error) {
      return res.error(error.details[0].message, 400, 'VALIDATION_ERROR');
    }

    const product = await ProductService.createProduct(value);
    
    res.status(201).success(product, 'Producto creado exitosamente');
  });

  /**
   * @swagger
   * /api/products/{productId}:
   *   put:
   *     summary: Actualizar producto (Admin)
   *     tags: [Products]
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
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *                 minLength: 2
   *                 maxLength: 200
   *               description:
   *                 type: string
   *                 minLength: 10
   *               price:
   *                 type: number
   *                 minimum: 0
   *               stockQty:
   *                 type: integer
   *                 minimum: 0
   *               weight:
   *                 type: number
   *                 minimum: 0
   *               dimensions:
   *                 type: object
   *                 properties:
   *                   length:
   *                     type: number
   *                     minimum: 0
   *                   width:
   *                     type: number
   *                     minimum: 0
   *                   height:
   *                     type: number
   *                     minimum: 0
   *               categories:
   *                 type: array
   *                 items:
   *                   type: string
   *                 minItems: 1
   *               isFeatured:
   *                 type: boolean
   *               isActive:
   *                 type: boolean
   *     responses:
   *       200:
   *         description: Producto actualizado exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/Product'
   *                 message:
   *                   type: string
   *                   example: Producto actualizado exitosamente
   *       404:
   *         description: Producto no encontrado
   *       403:
   *         description: Acceso denegado - Solo administradores
   */
  static updateProduct = asyncHandler(async (req, res) => {
    const updateProductSchema = Joi.object({
      name: Joi.string().min(2).max(200).optional(),
      description: Joi.string().min(10).optional(),
      price: Joi.number().min(0).optional(),
      stockQty: Joi.number().integer().min(0).optional(),
      weight: Joi.number().min(0).optional(),
      dimensions: Joi.object({
        length: Joi.number().min(0).required(),
        width: Joi.number().min(0).required(),
        height: Joi.number().min(0).required()
      }).optional(),
      categories: Joi.array().items(Joi.string()).min(1).optional(),
      isFeatured: Joi.boolean().optional(),
      isActive: Joi.boolean().optional()
    });

    const { error, value } = updateProductSchema.validate(req.body);
    if (error) {
      return res.error(error.details[0].message, 400, 'VALIDATION_ERROR');
    }

    const product = await ProductService.updateProduct(req.params.productId, value);
    
    res.success(product, 'Producto actualizado exitosamente');
  });

  /**
   * @swagger
   * /api/products/{productId}:
   *   delete:
   *     summary: Eliminar producto (Admin)
   *     tags: [Products]
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
   *         description: Producto eliminado exitosamente
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
   *                   example: Producto eliminado exitosamente
   *       404:
   *         description: Producto no encontrado
   *       400:
   *         description: Producto tiene órdenes pendientes
   *       403:
   *         description: Acceso denegado - Solo administradores
   */
  static deleteProduct = asyncHandler(async (req, res) => {
    const result = await ProductService.deleteProduct(req.params.productId);
    
    res.success(result, 'Producto eliminado exitosamente');
  });

  /**
   * @swagger
   * /api/products/search:
   *   get:
   *     summary: Buscar productos
   *     tags: [Products]
   *     security: []
   *     parameters:
   *       - in: query
   *         name: q
   *         required: true
   *         schema:
   *           type: string
   *           minLength: 2
   *         description: Término de búsqueda
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
   *           default: 20
   *         description: Elementos por página
   *       - in: query
   *         name: sort
   *         schema:
   *           type: string
   *           enum: [relevance, price, -price, name, -name, -createdAt]
   *           default: relevance
   *         description: Ordenar por
   *     responses:
   *       200:
   *         description: Resultados de búsqueda obtenidos exitosamente
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
   *                         $ref: '#/components/schemas/Product'
   *                     searchTerm:
   *                       type: string
   *       400:
   *         description: Término de búsqueda inválido
   */
  static searchProducts = asyncHandler(async (req, res) => {
    const searchSchema = Joi.object({
      q: Joi.string().min(2).required(),
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(50).default(20),
      sort: Joi.string().valid('relevance', 'price', '-price', 'name', '-name', '-createdAt').default('relevance')
    });

    const { error, value } = searchSchema.validate(req.query);
    if (error) {
      return res.error(error.details[0].message, 400, 'VALIDATION_ERROR');
    }

    const result = await ProductService.searchProducts(
      { q: value.q, sort: value.sort },
      { page: value.page, limit: value.limit }
    );
    
    res.success(result.products, 'Resultados de búsqueda obtenidos exitosamente', result.pagination);
  });

  /**
   * @swagger
   * /api/products/category/{categoryId}:
   *   get:
   *     summary: Obtener productos por categoría
   *     tags: [Products]
   *     security: []
   *     parameters:
   *       - in: path
   *         name: categoryId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID de la categoría
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
   *         name: sort
   *         schema:
   *           type: string
   *           enum: [createdAt, -createdAt, price, -price, name, -name]
   *           default: -createdAt
   *         description: Ordenar por
   *     responses:
   *       200:
   *         description: Productos de la categoría obtenidos exitosamente
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
   *                         $ref: '#/components/schemas/Product'
   *                     category:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                         name:
   *                           type: string
   *                         slug:
   *                           type: string
   *       404:
   *         description: Categoría no encontrada
   */
  static getProductsByCategory = asyncHandler(async (req, res) => {
    const paginationSchema = Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(20),
      sort: Joi.string().valid('createdAt', '-createdAt', 'price', '-price', 'name', '-name').default('-createdAt')
    });

    const { error, value } = paginationSchema.validate(req.query);
    if (error) {
      return res.error(error.details[0].message, 400, 'VALIDATION_ERROR');
    }

    const result = await ProductService.getProductsByCategory(req.params.categoryId, value);
    
    res.success(result.products, 'Productos de la categoría obtenidos exitosamente', result.pagination);
  });

  /**
   * @swagger
   * /api/products/featured:
   *   get:
   *     summary: Obtener productos destacados
   *     tags: [Products]
   *     security: []
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 50
   *           default: 10
   *         description: Número de productos a obtener
   *     responses:
   *       200:
   *         description: Productos destacados obtenidos exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Product'
   *                 message:
   *                   type: string
   *                   example: Productos destacados obtenidos exitosamente
   */
  static getFeaturedProducts = asyncHandler(async (req, res) => {
    const limitSchema = Joi.object({
      limit: Joi.number().integer().min(1).max(50).default(10)
    });

    const { error, value } = limitSchema.validate(req.query);
    if (error) {
      return res.error(error.details[0].message, 400, 'VALIDATION_ERROR');
    }

    const products = await ProductService.getFeaturedProducts(value.limit);
    
    res.success(products, 'Productos destacados obtenidos exitosamente');
  });

  /**
   * @swagger
   * /api/products/popular:
   *   get:
   *     summary: Obtener productos populares
   *     tags: [Products]
   *     security: []
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 50
   *           default: 10
   *         description: Número de productos a obtener
   *     responses:
   *       200:
   *         description: Productos populares obtenidos exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Product'
   *                 message:
   *                   type: string
   *                   example: Productos populares obtenidos exitosamente
   */
  static getPopularProducts = asyncHandler(async (req, res) => {
    const limitSchema = Joi.object({
      limit: Joi.number().integer().min(1).max(50).default(10)
    });

    const { error, value } = limitSchema.validate(req.query);
    if (error) {
      return res.error(error.details[0].message, 400, 'VALIDATION_ERROR');
    }

    const products = await ProductService.getPopularProducts(value.limit);
    
    res.success(products, 'Productos populares obtenidos exitosamente');
  });

  /**
   * @swagger
   * /api/products/{productId}/related:
   *   get:
   *     summary: Obtener productos relacionados
   *     tags: [Products]
   *     security: []
   *     parameters:
   *       - in: path
   *         name: productId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID del producto
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 20
   *           default: 5
   *         description: Número de productos relacionados
   *     responses:
   *       200:
   *         description: Productos relacionados obtenidos exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Product'
   *                 message:
   *                   type: string
   *                   example: Productos relacionados obtenidos exitosamente
   *       404:
   *         description: Producto no encontrado
   */
  static getRelatedProducts = asyncHandler(async (req, res) => {
    const limitSchema = Joi.object({
      limit: Joi.number().integer().min(1).max(20).default(5)
    });

    const { error, value } = limitSchema.validate(req.query);
    if (error) {
      return res.error(error.details[0].message, 400, 'VALIDATION_ERROR');
    }

    const products = await ProductService.getRelatedProducts(req.params.productId, value.limit);
    
    res.success(products, 'Productos relacionados obtenidos exitosamente');
  });

  /**
   * @swagger
   * /api/products/{productId}/stock:
   *   put:
   *     summary: Actualizar stock del producto (Admin)
   *     tags: [Products]
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
   *             type: object
   *             required:
   *               - stockQty
   *             properties:
   *               stockQty:
   *                 type: integer
   *                 minimum: 0
   *                 description: Nueva cantidad en stock
   *               operation:
   *                 type: string
   *                 enum: [set, add, subtract]
   *                 default: set
   *                 description: Tipo de operación
   *     responses:
   *       200:
   *         description: Stock actualizado exitosamente
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
   *                     product:
   *                       $ref: '#/components/schemas/Product'
   *                     previousStock:
   *                       type: integer
   *                     newStock:
   *                       type: integer
   *                     operation:
   *                       type: string
   *                 message:
   *                   type: string
   *                   example: Stock actualizado exitosamente
   *       404:
   *         description: Producto no encontrado
   *       403:
   *         description: Acceso denegado - Solo administradores
   */
  static updateStock = asyncHandler(async (req, res) => {
    const stockSchema = Joi.object({
      stockQty: Joi.number().integer().min(0).required(),
      operation: Joi.string().valid('set', 'add', 'subtract').default('set')
    });

    const { error, value } = stockSchema.validate(req.body);
    if (error) {
      return res.error(error.details[0].message, 400, 'VALIDATION_ERROR');
    }

    const result = await ProductService.updateStock(req.params.productId, value);
    
    res.success(result, 'Stock actualizado exitosamente');
  });

  /**
   * @swagger
   * /api/products/{productId}/stock/check:
   *   get:
   *     summary: Verificar disponibilidad de stock
   *     tags: [Products]
   *     security: []
   *     parameters:
   *       - in: path
   *         name: productId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID del producto
   *       - in: query
   *         name: quantity
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *         description: Cantidad requerida
   *     responses:
   *       200:
   *         description: Disponibilidad verificada exitosamente
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
   *                     productId:
   *                       type: string
   *                     currentStock:
   *                       type: integer
   *                     requiredQuantity:
   *                       type: integer
   *                     available:
   *                       type: boolean
   *                     inStock:
   *                       type: boolean
   *                 message:
   *                   type: string
   *                   example: Disponibilidad verificada exitosamente
   *       404:
   *         description: Producto no encontrado
   */
  static checkStock = asyncHandler(async (req, res) => {
    const quantitySchema = Joi.object({
      quantity: Joi.number().integer().min(1).default(1)
    });

    const { error, value } = quantitySchema.validate(req.query);
    if (error) {
      return res.error(error.details[0].message, 400, 'VALIDATION_ERROR');
    }

    const result = await ProductService.checkStock(req.params.productId, value.quantity);
    
    res.success(result, 'Disponibilidad verificada exitosamente');
  });

  /**
   * @swagger
   * /api/products/{productId}/stats:
   *   get:
   *     summary: Obtener estadísticas del producto (Admin)
   *     tags: [Products]
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
   *         description: Estadísticas del producto obtenidas exitosamente
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
   *                     productId:
   *                       type: string
   *                     name:
   *                       type: string
   *                     sku:
   *                       type: string
   *                     stock:
   *                       type: object
   *                     pricing:
   *                       type: object
   *                     sales:
   *                       type: object
   *                     reviews:
   *                       type: object
   *                     engagement:
   *                       type: object
   *                 message:
   *                   type: string
   *                   example: Estadísticas del producto obtenidas exitosamente
   *       404:
   *         description: Producto no encontrado
   *       403:
   *         description: Acceso denegado - Solo administradores
   */
  static getProductStats = asyncHandler(async (req, res) => {
    const stats = await ProductService.getProductStats(req.params.productId);
    
    res.success(stats, 'Estadísticas del producto obtenidas exitosamente');
  });
}

module.exports = ProductController; 