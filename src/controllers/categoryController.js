const CategoryService = require('../services/categoryService');
const { AsyncHandler } = require('../middlewares/errorHandler');
const Joi = require('joi');

/**
 * @swagger
 * components:
 *   schemas:
 *     Category:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: ID único de la categoría
 *         name:
 *           type: string
 *           description: Nombre de la categoría
 *         slug:
 *           type: string
 *           description: Slug único de la categoría
 *         description:
 *           type: string
 *           description: Descripción de la categoría
 *         parentId:
 *           type: string
 *           nullable: true
 *           description: ID de la categoría padre
 *         level:
 *           type: integer
 *           description: Nivel en la jerarquía
 *         path:
 *           type: string
 *           description: Ruta jerárquica
 *         isActive:
 *           type: boolean
 *           description: Si está activa
 *         productCount:
 *           type: integer
 *           description: Número de productos en la categoría
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         children:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Category'
 *           description: Subcategorías (solo en estructura jerárquica)
 *         parent:
 *           $ref: '#/components/schemas/Category'
 *           description: Categoría padre (cuando está poblada)
 *     
 *     CreateCategoryRequest:
 *       type: object
 *       required:
 *         - name
 *         - description
 *       properties:
 *         name:
 *           type: string
 *           minLength: 2
 *           maxLength: 100
 *           description: Nombre de la categoría
 *         description:
 *           type: string
 *           minLength: 10
 *           description: Descripción de la categoría
 *         parentId:
 *           type: string
 *           description: ID de la categoría padre (opcional)
 *         isActive:
 *           type: boolean
 *           default: true
 *           description: Si está activa
 *
 * tags:
 *   - name: Categories
 *     description: Gestión de categorías
 */

class CategoryController {

  /**
   * @swagger
   * /api/categories:
   *   get:
   *     summary: Obtener todas las categorías
   *     tags: [Categories]
   *     security: []
   *     parameters:
   *       - in: query
   *         name: hierarchy
   *         schema:
   *           type: boolean
   *           default: false
   *         description: Obtener en estructura jerárquica
   *       - in: query
   *         name: includeInactive
   *         schema:
   *           type: boolean
   *           default: false
   *         description: Incluir categorías inactivas (solo admin)
   *       - in: query
   *         name: parentId
   *         schema:
   *           type: string
   *         description: Filtrar por categoría padre
   *       - in: query
   *         name: level
   *         schema:
   *           type: integer
   *           minimum: 0
   *         description: Filtrar por nivel jerárquico
   *     responses:
   *       200:
   *         description: Lista de categorías obtenida exitosamente
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
   *                     $ref: '#/components/schemas/Category'
   *                 message:
   *                   type: string
   *                   example: Lista de categorías obtenida exitosamente
   */
  static getAllCategories = AsyncHandler(async (req, res) => {
    const filtersSchema = Joi.object({
      hierarchy: Joi.boolean().default(false),
      includeInactive: Joi.boolean().default(false),
      parentId: Joi.string().optional(),
      level: Joi.number().integer().min(0).optional()
    });

    const { error, value } = filtersSchema.validate(req.query);
    if (error) {
      return res.error(error.details[0].message, 400, 'VALIDATION_ERROR');
    }

    const userRole = req.user ? req.user.role : null;
    const categories = await CategoryService.getAllCategories(value, userRole);
    
    res.success(categories, 'Lista de categorías obtenida exitosamente');
  });

  /**
   * @swagger
   * /api/categories/{categoryId}:
   *   get:
   *     summary: Obtener categoría por ID
   *     tags: [Categories]
   *     security: []
   *     parameters:
   *       - in: path
   *         name: categoryId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID de la categoría
   *       - in: query
   *         name: includeChildren
   *         schema:
   *           type: boolean
   *           default: false
   *         description: Incluir subcategorías
   *       - in: query
   *         name: includeProducts
   *         schema:
   *           type: boolean
   *           default: false
   *         description: Incluir productos de la categoría
   *     responses:
   *       200:
   *         description: Categoría obtenida exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/Category'
   *                 message:
   *                   type: string
   *                   example: Categoría obtenida exitosamente
   *       404:
   *         description: Categoría no encontrada
   */
  static getCategoryById = AsyncHandler(async (req, res) => {
    const optionsSchema = Joi.object({
      includeChildren: Joi.boolean().default(false),
      includeProducts: Joi.boolean().default(false)
    });

    const { error, value } = optionsSchema.validate(req.query);
    if (error) {
      return res.error(error.details[0].message, 400, 'VALIDATION_ERROR');
    }

    const userRole = req.user ? req.user.role : null;
    const category = await CategoryService.getCategoryById(req.params.categoryId, value, userRole);
    
    res.success(category, 'Categoría obtenida exitosamente');
  });

  /**
   * @swagger
   * /api/categories/slug/{slug}:
   *   get:
   *     summary: Obtener categoría por slug
   *     tags: [Categories]
   *     security: []
   *     parameters:
   *       - in: path
   *         name: slug
   *         required: true
   *         schema:
   *           type: string
   *         description: Slug de la categoría
   *       - in: query
   *         name: includeChildren
   *         schema:
   *           type: boolean
   *           default: false
   *         description: Incluir subcategorías
   *       - in: query
   *         name: includeProducts
   *         schema:
   *           type: boolean
   *           default: false
   *         description: Incluir productos de la categoría
   *     responses:
   *       200:
   *         description: Categoría obtenida exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/Category'
   *                 message:
   *                   type: string
   *                   example: Categoría obtenida exitosamente
   *       404:
   *         description: Categoría no encontrada
   */
  static getCategoryBySlug = AsyncHandler(async (req, res) => {
    const optionsSchema = Joi.object({
      includeChildren: Joi.boolean().default(false),
      includeProducts: Joi.boolean().default(false)
    });

    const { error, value } = optionsSchema.validate(req.query);
    if (error) {
      return res.error(error.details[0].message, 400, 'VALIDATION_ERROR');
    }

    const userRole = req.user ? req.user.role : null;
    const category = await CategoryService.getCategoryBySlug(req.params.slug, value, userRole);
    
    res.success(category, 'Categoría obtenida exitosamente');
  });

  /**
   * @swagger
   * /api/categories:
   *   post:
   *     summary: Crear nueva categoría (Admin)
   *     tags: [Categories]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateCategoryRequest'
   *     responses:
   *       201:
   *         description: Categoría creada exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/Category'
   *                 message:
   *                   type: string
   *                   example: Categoría creada exitosamente
   *       400:
   *         description: Datos de entrada inválidos
   *       409:
   *         description: Nombre ya existe
   *       403:
   *         description: Acceso denegado - Solo administradores
   */
  static createCategory = AsyncHandler(async (req, res) => {
    const createCategorySchema = Joi.object({
      name: Joi.string().min(2).max(100).required(),
      description: Joi.string().min(10).required(),
      parentId: Joi.string().optional(),
      isActive: Joi.boolean().default(true)
    });

    const { error, value } = createCategorySchema.validate(req.body);
    if (error) {
      return res.error(error.details[0].message, 400, 'VALIDATION_ERROR');
    }

    const category = await CategoryService.createCategory(value);
    
    res.status(201).success(category, 'Categoría creada exitosamente');
  });

  /**
   * @swagger
   * /api/categories/{categoryId}:
   *   put:
   *     summary: Actualizar categoría (Admin)
   *     tags: [Categories]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: categoryId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID de la categoría
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
   *                 maxLength: 100
   *               description:
   *                 type: string
   *                 minLength: 10
   *               parentId:
   *                 type: string
   *                 nullable: true
   *               isActive:
   *                 type: boolean
   *     responses:
   *       200:
   *         description: Categoría actualizada exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/Category'
   *                 message:
   *                   type: string
   *                   example: Categoría actualizada exitosamente
   *       404:
   *         description: Categoría no encontrada
   *       400:
   *         description: No se puede hacer padre de sí misma
   *       403:
   *         description: Acceso denegado - Solo administradores
   */
  static updateCategory = AsyncHandler(async (req, res) => {
    const updateCategorySchema = Joi.object({
      name: Joi.string().min(2).max(100).optional(),
      description: Joi.string().min(10).optional(),
      parentId: Joi.string().allow(null).optional(),
      isActive: Joi.boolean().optional()
    });

    const { error, value } = updateCategorySchema.validate(req.body);
    if (error) {
      return res.error(error.details[0].message, 400, 'VALIDATION_ERROR');
    }

    const category = await CategoryService.updateCategory(req.params.categoryId, value);
    
    res.success(category, 'Categoría actualizada exitosamente');
  });

  /**
   * @swagger
   * /api/categories/{categoryId}:
   *   delete:
   *     summary: Eliminar categoría (Admin)
   *     tags: [Categories]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: categoryId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID de la categoría
   *     responses:
   *       200:
   *         description: Categoría eliminada exitosamente
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
   *                   example: Categoría eliminada exitosamente
   *       404:
   *         description: Categoría no encontrada
   *       400:
   *         description: Categoría tiene productos o subcategorías
   *       403:
   *         description: Acceso denegado - Solo administradores
   */
  static deleteCategory = AsyncHandler(async (req, res) => {
    const result = await CategoryService.deleteCategory(req.params.categoryId);
    
    res.success(result, 'Categoría eliminada exitosamente');
  });

  /**
   * @swagger
   * /api/categories/hierarchy:
   *   get:
   *     summary: Obtener estructura jerárquica completa de categorías
   *     tags: [Categories]
   *     security: []
   *     parameters:
   *       - in: query
   *         name: includeInactive
   *         schema:
   *           type: boolean
   *           default: false
   *         description: Incluir categorías inactivas (solo admin)
   *       - in: query
   *         name: includeProductCount
   *         schema:
   *           type: boolean
   *           default: true
   *         description: Incluir conteo de productos
   *     responses:
   *       200:
   *         description: Estructura jerárquica obtenida exitosamente
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
   *                     $ref: '#/components/schemas/Category'
   *                 message:
   *                   type: string
   *                   example: Estructura jerárquica obtenida exitosamente
   */
  static getCategoryHierarchy = AsyncHandler(async (req, res) => {
    const optionsSchema = Joi.object({
      includeInactive: Joi.boolean().default(false),
      includeProductCount: Joi.boolean().default(true)
    });

    const { error, value } = optionsSchema.validate(req.query);
    if (error) {
      return res.error(error.details[0].message, 400, 'VALIDATION_ERROR');
    }

    const userRole = req.user ? req.user.role : null;
    const hierarchy = await CategoryService.getCategoryHierarchy(value, userRole);
    
    res.success(hierarchy, 'Estructura jerárquica obtenida exitosamente');
  });

  /**
   * @swagger
   * /api/categories/{categoryId}/children:
   *   get:
   *     summary: Obtener subcategorías de una categoría
   *     tags: [Categories]
   *     security: []
   *     parameters:
   *       - in: path
   *         name: categoryId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID de la categoría padre
   *       - in: query
   *         name: includeInactive
   *         schema:
   *           type: boolean
   *           default: false
   *         description: Incluir subcategorías inactivas (solo admin)
   *     responses:
   *       200:
   *         description: Subcategorías obtenidas exitosamente
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
   *                     $ref: '#/components/schemas/Category'
   *                 message:
   *                   type: string
   *                   example: Subcategorías obtenidas exitosamente
   *       404:
   *         description: Categoría padre no encontrada
   */
  static getCategoryChildren = AsyncHandler(async (req, res) => {
    const optionsSchema = Joi.object({
      includeInactive: Joi.boolean().default(false)
    });

    const { error, value } = optionsSchema.validate(req.query);
    if (error) {
      return res.error(error.details[0].message, 400, 'VALIDATION_ERROR');
    }

    const userRole = req.user ? req.user.role : null;
    const children = await CategoryService.getCategoryChildren(req.params.categoryId, value, userRole);
    
    res.success(children, 'Subcategorías obtenidas exitosamente');
  });

  /**
   * @swagger
   * /api/categories/{categoryId}/ancestors:
   *   get:
   *     summary: Obtener ruta de ancestros de una categoría (breadcrumb)
   *     tags: [Categories]
   *     security: []
   *     parameters:
   *       - in: path
   *         name: categoryId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID de la categoría
   *     responses:
   *       200:
   *         description: Ruta de ancestros obtenida exitosamente
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
   *                     type: object
   *                     properties:
   *                       id:
   *                         type: string
   *                       name:
   *                         type: string
   *                       slug:
   *                         type: string
   *                       level:
   *                         type: integer
   *                 message:
   *                   type: string
   *                   example: Ruta de ancestros obtenida exitosamente
   *       404:
   *         description: Categoría no encontrada
   */
  static getCategoryAncestors = AsyncHandler(async (req, res) => {
    const ancestors = await CategoryService.getCategoryAncestors(req.params.categoryId);
    
    res.success(ancestors, 'Ruta de ancestros obtenida exitosamente');
  });

  /**
   * @swagger
   * /api/categories/search:
   *   get:
   *     summary: Buscar categorías
   *     tags: [Categories]
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
   *         name: includeInactive
   *         schema:
   *           type: boolean
   *           default: false
   *         description: Incluir categorías inactivas (solo admin)
   *     responses:
   *       200:
   *         description: Resultados de búsqueda obtenidos exitosamente
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
   *                     $ref: '#/components/schemas/Category'
   *                 searchTerm:
   *                   type: string
   *                 message:
   *                   type: string
   *                   example: Resultados de búsqueda obtenidos exitosamente
   *       400:
   *         description: Término de búsqueda inválido
   */
  static searchCategories = AsyncHandler(async (req, res) => {
    const searchSchema = Joi.object({
      q: Joi.string().min(2).required(),
      includeInactive: Joi.boolean().default(false)
    });

    const { error, value } = searchSchema.validate(req.query);
    if (error) {
      return res.error(error.details[0].message, 400, 'VALIDATION_ERROR');
    }

    const userRole = req.user ? req.user.role : null;
    const result = await CategoryService.searchCategories(value.q, value, userRole);
    
    res.success(result.categories, 'Resultados de búsqueda obtenidos exitosamente');
  });

  /**
   * @swagger
   * /api/categories/stats:
   *   get:
   *     summary: Obtener estadísticas de categorías (Admin)
   *     tags: [Categories]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Estadísticas de categorías obtenidas exitosamente
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
   *                         totalCategories:
   *                           type: integer
   *                         activeCategories:
   *                           type: integer
   *                         rootCategories:
   *                           type: integer
   *                         maxDepth:
   *                           type: integer
   *                         avgProductsPerCategory:
   *                           type: number
   *                     topCategories:
   *                       type: array
   *                       items:
   *                         type: object
   *                 message:
   *                   type: string
   *                   example: Estadísticas de categorías obtenidas exitosamente
   *       403:
   *         description: Acceso denegado - Solo administradores
   */
  static getCategoryStats = AsyncHandler(async (req, res) => {
    const stats = await CategoryService.getCategoryStats();
    
    res.success(stats, 'Estadísticas de categorías obtenidas exitosamente');
  });
}

module.exports = CategoryController; 