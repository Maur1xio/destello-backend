const express = require('express');
const router = express.Router();
const reactionController = require('../controllers/reactionController');
const { requireAuth } = require('../middlewares/auth');

// Aplicar autenticación a todas las rutas
router.use(requireAuth);

/**
 * @swagger
 * /api/reactions:
 *   post:
 *     summary: Crear nueva reacción
 *     tags: [Reactions]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', reactionController.createReaction);

/**
 * @swagger
 * /api/reactions:
 *   get:
 *     summary: Obtener reacciones por targetType y targetId
 *     tags: [Reactions]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', reactionController.getReactions);

/**
 * @swagger
 * /api/reactions/toggle:
 *   post:
 *     summary: Alternar reacción (agregar/quitar)
 *     tags: [Reactions]
 *     security:
 *       - bearerAuth: []
 */
router.post('/toggle', reactionController.toggleReaction);

/**
 * @swagger
 * /api/reactions/stats:
 *   get:
 *     summary: Obtener estadísticas de reacciones
 *     tags: [Reactions]
 *     security:
 *       - bearerAuth: []
 */
router.get('/stats', reactionController.getReactionStats);

module.exports = router; 