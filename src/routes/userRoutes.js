const express = require('express');
const UserController = require('../controllers/userController');
const { requireAuth, requireAdmin } = require('../middlewares');

const router = express.Router();

// ===== TODAS LAS RUTAS REQUIEREN AUTENTICACIÓN DE ADMIN =====

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Obtener todos los usuarios (Admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', requireAuth, requireAdmin, UserController.getAllUsers);

/**
 * @swagger
 * /api/users/search:
 *   get:
 *     summary: Buscar usuarios (Admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.get('/search', requireAuth, requireAdmin, UserController.searchUsers);

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Crear nuevo usuario (Admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', requireAuth, requireAdmin, UserController.createUser);

/**
 * @swagger
 * /api/users/{userId}:
 *   get:
 *     summary: Obtener usuario por ID (Admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:userId', requireAuth, requireAdmin, UserController.getUserById);

/**
 * @swagger
 * /api/users/{userId}:
 *   put:
 *     summary: Actualizar usuario (Admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:userId', requireAuth, requireAdmin, UserController.updateUser);

/**
 * @swagger
 * /api/users/{userId}:
 *   delete:
 *     summary: Eliminar usuario (Admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:userId', requireAuth, requireAdmin, UserController.deleteUser);

/**
 * @swagger
 * /api/users/{userId}/activate:
 *   put:
 *     summary: Activar usuario (Admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:userId/activate', requireAuth, requireAdmin, UserController.activateUser);

/**
 * @swagger
 * /api/users/{userId}/deactivate:
 *   put:
 *     summary: Desactivar usuario (Admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:userId/deactivate', requireAuth, requireAdmin, UserController.deactivateUser);

/**
 * @swagger
 * /api/users/{userId}/stats:
 *   get:
 *     summary: Obtener estadísticas del usuario (Admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:userId/stats', requireAuth, requireAdmin, UserController.getUserStats);

/**
 * @swagger
 * /api/users/{userId}/activity:
 *   get:
 *     summary: Obtener actividad del usuario (Admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:userId/activity', requireAuth, requireAdmin, UserController.getUserActivity);

module.exports = router; 