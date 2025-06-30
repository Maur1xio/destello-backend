const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { requireAuth, optionalAuth } = require('../middlewares/auth');

/**
 * @swagger
 * /api/posts:
 *   post:
 *     summary: Crear nuevo post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', requireAuth, postController.createPost);

/**
 * @swagger
 * /api/posts:
 *   get:
 *     summary: Obtener todos los posts públicos
 *     tags: [Posts]
 */
router.get('/', optionalAuth, postController.getPosts);

/**
 * @swagger
 * /api/posts/my:
 *   get:
 *     summary: Obtener posts del usuario
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 */
router.get('/my', requireAuth, postController.getUserPosts);

/**
 * @swagger
 * /api/posts/following:
 *   get:
 *     summary: Obtener posts de usuarios seguidos
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 */
router.get('/following', requireAuth, postController.getFollowingPosts);

/**
 * @swagger
 * /api/posts/trending:
 *   get:
 *     summary: Obtener posts trending
 *     tags: [Posts]
 */
router.get('/trending', optionalAuth, postController.getTrendingPosts);

/**
 * @swagger
 * /api/posts/search:
 *   get:
 *     summary: Buscar posts
 *     tags: [Posts]
 */
router.get('/search', optionalAuth, postController.searchPosts);

/**
 * @swagger
 * /api/posts/tag/{tag}:
 *   get:
 *     summary: Obtener posts por tag
 *     tags: [Posts]
 */
router.get('/tag/:tag', optionalAuth, postController.getPostsByTag);

/**
 * @swagger
 * /api/posts/{id}:
 *   get:
 *     summary: Obtener post por ID
 *     tags: [Posts]
 */
router.get('/:id', optionalAuth, postController.getPost);

/**
 * @swagger
 * /api/posts/{id}:
 *   put:
 *     summary: Actualizar post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', requireAuth, postController.updatePost);

/**
 * @swagger
 * /api/posts/{id}:
 *   delete:
 *     summary: Eliminar post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', requireAuth, postController.deletePost);

module.exports = router; 