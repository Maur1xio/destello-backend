const AuthService = require('../services/authService');
const { AsyncHandler } = require('../middlewares/errorHandler');
const { validate } = require('../middlewares/validation');
const Joi = require('joi');

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: ID único del usuario
 *         firstName:
 *           type: string
 *           description: Nombre del usuario
 *         lastName:
 *           type: string
 *           description: Apellido del usuario
 *         fullName:
 *           type: string
 *           description: Nombre completo del usuario
 *         email:
 *           type: string
 *           format: email
 *           description: Email del usuario
 *         role:
 *           type: string
 *           enum: [user, admin]
 *           description: Rol del usuario
 *         isActive:
 *           type: boolean
 *           description: Estado del usuario
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Fecha de creación
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Fecha de actualización
 *     
 *     AuthResponse:
 *       type: object
 *       properties:
 *         token:
 *           type: string
 *           description: JWT token de autenticación
 *         expiresIn:
 *           type: string
 *           description: Duración del token
 *         tokenExpiry:
 *           type: string
 *           format: date-time
 *           description: Fecha de expiración del token
 *         user:
 *           $ref: '#/components/schemas/User'
 *     
 *     RegisterRequest:
 *       type: object
 *       required:
 *         - firstName
 *         - lastName
 *         - email
 *         - password
 *       properties:
 *         firstName:
 *           type: string
 *           minLength: 2
 *           maxLength: 50
 *           description: Nombre del usuario
 *         lastName:
 *           type: string
 *           minLength: 2
 *           maxLength: 50
 *           description: Apellido del usuario
 *         email:
 *           type: string
 *           format: email
 *           description: Email del usuario
 *         password:
 *           type: string
 *           minLength: 6
 *           description: Contraseña del usuario
 *         phone:
 *           type: string
 *           description: Teléfono del usuario (opcional)
 *     
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: Email del usuario
 *         password:
 *           type: string
 *           description: Contraseña del usuario
 *     
 *     Address:
 *       type: object
 *       properties:
 *         street:
 *           type: string
 *           description: Calle
 *         city:
 *           type: string
 *           description: Ciudad
 *         state:
 *           type: string
 *           description: Estado
 *         zipCode:
 *           type: string
 *           description: Código postal
 *         country:
 *           type: string
 *           description: País
 *         isDefault:
 *           type: boolean
 *           description: Dirección por defecto
 *
 * tags:
 *   - name: Auth
 *     description: Autenticación y autorización
 */

class AuthController {
  
  /**
   * @swagger
   * /api/auth/register:
   *   post:
   *     summary: Registrar nuevo usuario
   *     tags: [Auth]
   *     security: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/RegisterRequest'
   *     responses:
   *       201:
   *         description: Usuario registrado exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/AuthResponse'
   *                 message:
   *                   type: string
   *                   example: Usuario registrado exitosamente
   *       400:
   *         description: Datos de entrada inválidos
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       409:
   *         description: Email ya registrado
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  static register = AsyncHandler(async (req, res) => {
    const registerSchema = Joi.object({
      firstName: Joi.string().min(2).max(50).required(),
      lastName: Joi.string().min(2).max(50).required(),
      email: Joi.string().email().required(),
      password: Joi.string().min(6).required(),
      phone: Joi.string().optional()
    });

    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.error(error.details[0].message, 400, 'VALIDATION_ERROR');
    }

    const result = await AuthService.register(value);
    
    res.status(201).success(result, 'Usuario registrado exitosamente');
  });

  /**
   * @swagger
   * /api/auth/login:
   *   post:
   *     summary: Iniciar sesión
   *     tags: [Auth]
   *     security: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/LoginRequest'
   *     responses:
   *       200:
   *         description: Login exitoso
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/AuthResponse'
   *                 message:
   *                   type: string
   *                   example: Login exitoso
   *       401:
   *         description: Credenciales inválidas
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       403:
   *         description: Cuenta desactivada
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  static login = AsyncHandler(async (req, res) => {
    const loginSchema = Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().required()
    });

    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.error(error.details[0].message, 400, 'VALIDATION_ERROR');
    }

    const result = await AuthService.login(value.email, value.password);
    
    res.success(result, 'Login exitoso');
  });

  /**
   * @swagger
   * /api/auth/profile:
   *   get:
   *     summary: Obtener perfil del usuario autenticado
   *     tags: [Auth]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Perfil obtenido exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/User'
   *                 message:
   *                   type: string
   *                   example: Perfil obtenido exitosamente
   *       401:
   *         description: No autorizado
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  static getProfile = AsyncHandler(async (req, res) => {
    const profile = await AuthService.getProfile(req.user.id);
    
    res.success(profile, 'Perfil obtenido exitosamente');
  });

  /**
   * @swagger
   * /api/auth/profile:
   *   put:
   *     summary: Actualizar perfil del usuario autenticado
   *     tags: [Auth]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               firstName:
   *                 type: string
   *                 minLength: 2
   *                 maxLength: 50
   *               lastName:
   *                 type: string
   *                 minLength: 2
   *                 maxLength: 50
   *               phone:
   *                 type: string
   *     responses:
   *       200:
   *         description: Perfil actualizado exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/User'
   *                 message:
   *                   type: string
   *                   example: Perfil actualizado exitosamente
   *       400:
   *         description: Datos de entrada inválidos
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  static updateProfile = AsyncHandler(async (req, res) => {
    const updateSchema = Joi.object({
      firstName: Joi.string().min(2).max(50).optional(),
      lastName: Joi.string().min(2).max(50).optional(),
      phone: Joi.string().optional()
    });

    const { error, value } = updateSchema.validate(req.body);
    if (error) {
      return res.error(error.details[0].message, 400, 'VALIDATION_ERROR');
    }

    const updatedProfile = await AuthService.updateProfile(req.user.id, value);
    
    res.success(updatedProfile, 'Perfil actualizado exitosamente');
  });

  /**
   * @swagger
   * /api/auth/change-password:
   *   put:
   *     summary: Cambiar contraseña del usuario autenticado
   *     tags: [Auth]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - currentPassword
   *               - newPassword
   *             properties:
   *               currentPassword:
   *                 type: string
   *                 description: Contraseña actual
   *               newPassword:
   *                 type: string
   *                 minLength: 6
   *                 description: Nueva contraseña
   *     responses:
   *       200:
   *         description: Contraseña cambiada exitosamente
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
   *                   example: Contraseña cambiada exitosamente
   *       400:
   *         description: Contraseña actual incorrecta
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  static changePassword = AsyncHandler(async (req, res) => {
    const changePasswordSchema = Joi.object({
      currentPassword: Joi.string().required(),
      newPassword: Joi.string().min(6).required()
    });

    const { error, value } = changePasswordSchema.validate(req.body);
    if (error) {
      return res.error(error.details[0].message, 400, 'VALIDATION_ERROR');
    }

    await AuthService.changePassword(req.user.id, value.currentPassword, value.newPassword);
    
    res.success(null, 'Contraseña cambiada exitosamente');
  });

  /**
   * @swagger
   * /api/auth/addresses:
   *   get:
   *     summary: Obtener direcciones del usuario autenticado
   *     tags: [Auth]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Direcciones obtenidas exitosamente
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
   *                     $ref: '#/components/schemas/Address'
   *                 message:
   *                   type: string
   *                   example: Direcciones obtenidas exitosamente
   */
  static getAddresses = AsyncHandler(async (req, res) => {
    const addresses = await AuthService.getAddresses(req.user.id);
    
    res.success(addresses, 'Direcciones obtenidas exitosamente');
  });

  /**
   * @swagger
   * /api/auth/addresses:
   *   post:
   *     summary: Agregar nueva dirección al usuario autenticado
   *     tags: [Auth]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - street
   *               - city
   *               - state
   *               - zipCode
   *               - country
   *             properties:
   *               street:
   *                 type: string
   *                 description: Calle
   *               city:
   *                 type: string
   *                 description: Ciudad
   *               state:
   *                 type: string
   *                 description: Estado
   *               zipCode:
   *                 type: string
   *                 description: Código postal
   *               country:
   *                 type: string
   *                 description: País
   *               isDefault:
   *                 type: boolean
   *                 description: Establecer como dirección por defecto
   *                 default: false
   *     responses:
   *       201:
   *         description: Dirección agregada exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/Address'
   *                 message:
   *                   type: string
   *                   example: Dirección agregada exitosamente
   */
  static addAddress = AsyncHandler(async (req, res) => {
    const addressSchema = Joi.object({
      street: Joi.string().required(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      zipCode: Joi.string().required(),
      country: Joi.string().required(),
      isDefault: Joi.boolean().default(false)
    });

    const { error, value } = addressSchema.validate(req.body);
    if (error) {
      return res.error(error.details[0].message, 400, 'VALIDATION_ERROR');
    }

    const address = await AuthService.addAddress(req.user.id, value);
    
    res.status(201).success(address, 'Dirección agregada exitosamente');
  });

  /**
   * @swagger
   * /api/auth/addresses/{addressId}:
   *   put:
   *     summary: Actualizar dirección del usuario autenticado
   *     tags: [Auth]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: addressId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID de la dirección
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               street:
   *                 type: string
   *               city:
   *                 type: string
   *               state:
   *                 type: string
   *               zipCode:
   *                 type: string
   *               country:
   *                 type: string
   *               isDefault:
   *                 type: boolean
   *     responses:
   *       200:
   *         description: Dirección actualizada exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/Address'
   *                 message:
   *                   type: string
   *                   example: Dirección actualizada exitosamente
   */
  static updateAddress = AsyncHandler(async (req, res) => {
    const addressSchema = Joi.object({
      street: Joi.string().optional(),
      city: Joi.string().optional(),
      state: Joi.string().optional(),
      zipCode: Joi.string().optional(),
      country: Joi.string().optional(),
      isDefault: Joi.boolean().optional()
    });

    const { error, value } = addressSchema.validate(req.body);
    if (error) {
      return res.error(error.details[0].message, 400, 'VALIDATION_ERROR');
    }

    const address = await AuthService.updateAddress(req.user.id, req.params.addressId, value);
    
    res.success(address, 'Dirección actualizada exitosamente');
  });

  /**
   * @swagger
   * /api/auth/addresses/{addressId}:
   *   delete:
   *     summary: Eliminar dirección del usuario autenticado
   *     tags: [Auth]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: addressId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID de la dirección
   *     responses:
   *       200:
   *         description: Dirección eliminada exitosamente
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
   *                   example: Dirección eliminada exitosamente
   */
  static removeAddress = AsyncHandler(async (req, res) => {
    await AuthService.removeAddress(req.user.id, req.params.addressId);
    
    res.success(null, 'Dirección eliminada exitosamente');
  });
}

module.exports = AuthController; 