const express = require('express');
const CategoryController = require('../controllers/categoryController');
const { requireAuth, requireAdmin, optionalAuth } = require('../middlewares');

const router = express.Router();

// ===== RUTAS PÚBLICAS =====

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Obtener todas las categorías
 *     tags: [Categories]
 *     security: []
 */
router.get('/', optionalAuth, CategoryController.getAllCategories);

/**
 * @swagger
 * /api/categories/hierarchy:
 *   get:
 *     summary: Obtener estructura jerárquica completa de categorías
 *     tags: [Categories]
 *     security: []
 */
router.get('/hierarchy', optionalAuth, CategoryController.getCategoryHierarchy);

/**
 * @swagger
 * /api/categories/search:
 *   get:
 *     summary: Buscar categorías
 *     tags: [Categories]
 *     security: []
 */
router.get('/search', optionalAuth, CategoryController.searchCategories);

/**
 * @swagger
 * /api/categories/slug/{slug}:
 *   get:
 *     summary: Obtener categoría por slug
 *     tags: [Categories]
 *     security: []
 */
router.get('/slug/:slug', optionalAuth, CategoryController.getCategoryBySlug);

/**
 * @swagger
 * /api/categories/{categoryId}:
 *   get:
 *     summary: Obtener categoría por ID
 *     tags: [Categories]
 *     security: []
 */
router.get('/:categoryId', optionalAuth, CategoryController.getCategoryById);

/**
 * @swagger
 * /api/categories/{categoryId}/children:
 *   get:
 *     summary: Obtener subcategorías de una categoría
 *     tags: [Categories]
 *     security: []
 */
router.get('/:categoryId/children', optionalAuth, CategoryController.getCategoryChildren);

/**
 * @swagger
 * /api/categories/{categoryId}/ancestors:
 *   get:
 *     summary: Obtener ruta de ancestros de una categoría (breadcrumb)
 *     tags: [Categories]
 *     security: []
 */
router.get('/:categoryId/ancestors', CategoryController.getCategoryAncestors);

// ===== RUTAS DE ADMINISTRADOR =====

/**
 * @swagger
 * /api/categories:
 *   post:
 *     summary: Crear nueva categoría (Admin)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', requireAuth, requireAdmin, CategoryController.createCategory);

/**
 * @swagger
 * /api/categories/{categoryId}:
 *   put:
 *     summary: Actualizar categoría (Admin)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:categoryId', requireAuth, requireAdmin, CategoryController.updateCategory);

/**
 * @swagger
 * /api/categories/{categoryId}:
 *   delete:
 *     summary: Eliminar categoría (Admin)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:categoryId', requireAuth, requireAdmin, CategoryController.deleteCategory);

/**
 * @swagger
 * /api/categories/stats:
 *   get:
 *     summary: Obtener estadísticas de categorías (Admin)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 */
router.get('/stats', requireAuth, requireAdmin, CategoryController.getCategoryStats);

module.exports = router; 