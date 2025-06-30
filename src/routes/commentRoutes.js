const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const { requireAuth } = require('../middlewares/auth');

// Aplicar autenticación a todas las rutas
router.use(requireAuth);

/**
 * @swagger
 * /api/comments:
 *   post:
 *     summary: Crear nuevo comentario
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', commentController.createComment);

/**
 * @swagger
 * /api/comments:
 *   get:
 *     summary: Obtener comentarios por parentType y parentId
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', commentController.getComments);

/**
 * @swagger
 * /api/comments/{id}:
 *   get:
 *     summary: Obtener comentario por ID
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', commentController.getComment);

/**
 * @swagger
 * /api/comments/{id}:
 *   put:
 *     summary: Actualizar comentario
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', commentController.updateComment);

/**
 * @swagger
 * /api/comments/{id}:
 *   delete:
 *     summary: Eliminar comentario
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', commentController.deleteComment);

module.exports = router; 