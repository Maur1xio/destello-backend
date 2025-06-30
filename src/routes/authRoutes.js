const express = require('express');
const AuthController = require('../controllers/authController');
const { requireAuth, authLimiter } = require('../middlewares');

const router = express.Router();

// ===== RUTAS PÚBLICAS =====

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registrar nuevo usuario
 *     tags: [Auth]
 *     security: []
 */
router.post('/register', authLimiter, AuthController.register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Iniciar sesión
 *     tags: [Auth]
 *     security: []
 */
router.post('/login', authLimiter, AuthController.login);

// ===== RUTAS PROTEGIDAS =====

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Obtener perfil del usuario autenticado
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 */
router.get('/profile', requireAuth, AuthController.getProfile);

/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     summary: Actualizar perfil del usuario autenticado
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 */
router.put('/profile', requireAuth, AuthController.updateProfile);

/**
 * @swagger
 * /api/auth/change-password:
 *   put:
 *     summary: Cambiar contraseña del usuario autenticado
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 */
router.put('/change-password', requireAuth, AuthController.changePassword);

// ===== GESTIÓN DE DIRECCIONES =====

/**
 * @swagger
 * /api/auth/addresses:
 *   get:
 *     summary: Obtener direcciones del usuario autenticado
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 */
router.get('/addresses', requireAuth, AuthController.getAddresses);

/**
 * @swagger
 * /api/auth/addresses:
 *   post:
 *     summary: Agregar nueva dirección al usuario autenticado
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 */
router.post('/addresses', requireAuth, AuthController.addAddress);

/**
 * @swagger
 * /api/auth/addresses/{addressId}:
 *   put:
 *     summary: Actualizar dirección del usuario autenticado
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 */
router.put('/addresses/:addressId', requireAuth, AuthController.updateAddress);

/**
 * @swagger
 * /api/auth/addresses/{addressId}:
 *   delete:
 *     summary: Eliminar dirección del usuario autenticado
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/addresses/:addressId', requireAuth, AuthController.removeAddress);

module.exports = router; 