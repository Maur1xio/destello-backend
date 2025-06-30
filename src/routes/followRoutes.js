const express = require('express');
const router = express.Router();
const followController = require('../controllers/followController');
const { requireAuth } = require('../middlewares/auth');

// Aplicar autenticación a todas las rutas
router.use(requireAuth);

/**
 * @swagger
 * /api/follows:
 *   post:
 *     summary: Seguir usuario
 *     tags: [Follows]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', followController.followUser);

/**
 * @swagger
 * /api/follows/suggestions:
 *   get:
 *     summary: Obtener usuarios sugeridos para seguir
 *     tags: [Follows]
 *     security:
 *       - bearerAuth: []
 */
router.get('/suggestions', followController.getSuggestedUsers);

/**
 * @swagger
 * /api/follows/followers:
 *   get:
 *     summary: Obtener seguidores del usuario autenticado
 *     tags: [Follows]
 *     security:
 *       - bearerAuth: []
 */
router.get('/followers', followController.getFollowers);

/**
 * @swagger
 * /api/follows/following:
 *   get:
 *     summary: Obtener usuarios seguidos por el usuario autenticado
 *     tags: [Follows]
 *     security:
 *       - bearerAuth: []
 */
router.get('/following', followController.getFollowing);

/**
 * @swagger
 * /api/follows/stats:
 *   get:
 *     summary: Obtener estadísticas de seguimiento del usuario autenticado
 *     tags: [Follows]
 *     security:
 *       - bearerAuth: []
 */
router.get('/stats', followController.getFollowStats);

/**
 * @swagger
 * /api/follows/users/{userId}/followers:
 *   get:
 *     summary: Obtener seguidores de un usuario específico
 *     tags: [Follows]
 *     security:
 *       - bearerAuth: []
 */
router.get('/users/:userId/followers', followController.getFollowers);

/**
 * @swagger
 * /api/follows/users/{userId}/following:
 *   get:
 *     summary: Obtener usuarios seguidos por un usuario específico
 *     tags: [Follows]
 *     security:
 *       - bearerAuth: []
 */
router.get('/users/:userId/following', followController.getFollowing);

/**
 * @swagger
 * /api/follows/users/{userId}/stats:
 *   get:
 *     summary: Obtener estadísticas de seguimiento de un usuario específico
 *     tags: [Follows]
 *     security:
 *       - bearerAuth: []
 */
router.get('/users/:userId/stats', followController.getFollowStats);

/**
 * @swagger
 * /api/follows/{userId}:
 *   delete:
 *     summary: Dejar de seguir usuario
 *     tags: [Follows]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:userId', followController.unfollowUser);

module.exports = router; 