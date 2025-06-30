const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { requireAuth, optionalAuth } = require('../middlewares/auth');

/**
 * @swagger
 * /api/reviews:
 *   post:
 *     summary: Crear nueva reseña
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', requireAuth, reviewController.createReview);

/**
 * @swagger
 * /api/reviews/my:
 *   get:
 *     summary: Obtener reseñas del usuario
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 */
router.get('/my', requireAuth, reviewController.getUserReviews);

/**
 * @swagger
 * /api/reviews/product/{productId}:
 *   get:
 *     summary: Obtener reseñas de un producto
 *     tags: [Reviews]
 */
router.get('/product/:productId', optionalAuth, reviewController.getProductReviews);

/**
 * @swagger
 * /api/reviews/product/{productId}/stats:
 *   get:
 *     summary: Obtener estadísticas de reseñas de un producto
 *     tags: [Reviews]
 */
router.get('/product/:productId/stats', reviewController.getReviewStats);

/**
 * @swagger
 * /api/reviews/{id}:
 *   get:
 *     summary: Obtener reseña por ID
 *     tags: [Reviews]
 */
router.get('/:id', reviewController.getReview);

/**
 * @swagger
 * /api/reviews/{id}:
 *   put:
 *     summary: Actualizar reseña
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', requireAuth, reviewController.updateReview);

/**
 * @swagger
 * /api/reviews/{id}:
 *   delete:
 *     summary: Eliminar reseña
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', requireAuth, reviewController.deleteReview);

/**
 * @swagger
 * /api/reviews/{id}/helpful:
 *   post:
 *     summary: Marcar reseña como útil
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/helpful', requireAuth, reviewController.markHelpful);

module.exports = router; 