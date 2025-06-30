const UserService = require('../services/userService');
const { AsyncHandler } = require('../middlewares/errorHandler');
const Joi = require('joi');

/**
 * @swagger
 * components:
 *   schemas:
 *     UserFilters:
 *       type: object
 *       properties:
 *         search:
 *           type: string
 *           description: Buscar por nombre o email
 *         role:
 *           type: string
 *           enum: [user, admin]
 *           description: Filtrar por rol
 *         isActive:
 *           type: boolean
 *           description: Filtrar por estado activo
 *         dateFrom:
 *           type: string
 *           format: date
 *           description: Fecha de creación desde
 *         dateTo:
 *           type: string
 *           format: date
 *           description: Fecha de creación hasta
 *     
 *     UserStats:
 *       type: object
 *       properties:
 *         userId:
 *           type: string
 *         memberSince:
 *           type: string
 *           format: date-time
 *         role:
 *           type: string
 *         isActive:
 *           type: boolean
 *         profile:
 *           type: object
 *           properties:
 *             completeness:
 *               type: number
 *             hasPhone:
 *               type: boolean
 *             hasAddresses:
 *               type: boolean
 *             addressCount:
 *               type: number
 *         commerce:
 *           type: object
 *           properties:
 *             orders:
 *               type: object
 *             spending:
 *               type: object
 *             currentCart:
 *               type: object
 *             wishlist:
 *               type: object
 *         social:
 *           type: object
 *           properties:
 *             posts:
 *               type: number
 *             reviews:
 *               type: number
 *             following:
 *               type: number
 *             followers:
 *               type: number
 *
 * tags:
 *   - name: Users
 *     description: Gestión de usuarios (Admin)
 */

class UserController {

  /**
   * @swagger
   * /api/users:
   *   get:
   *     summary: Obtener todos los usuarios (Admin)
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *         description: Número de página
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 20
   *         description: Elementos por página
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *         description: Buscar por nombre o email
   *       - in: query
   *         name: role
   *         schema:
   *           type: string
   *           enum: [user, admin]
   *         description: Filtrar por rol
   *       - in: query
   *         name: isActive
   *         schema:
   *           type: boolean
   *         description: Filtrar por estado activo
   *       - in: query
   *         name: dateFrom
   *         schema:
   *           type: string
   *           format: date
   *         description: Fecha de creación desde
   *       - in: query
   *         name: dateTo
   *         schema:
   *           type: string
   *           format: date
   *         description: Fecha de creación hasta
   *     responses:
   *       200:
   *         description: Lista de usuarios obtenida exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               allOf:
   *                 - $ref: '#/components/schemas/PaginatedResponse'
   *                 - type: object
   *                   properties:
   *                     data:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/User'
   *       403:
   *         description: Acceso denegado - Solo administradores
   */
  static getAllUsers = AsyncHandler(async (req, res) => {
    const filtersSchema = Joi.object({
      search: Joi.string().optional(),
      role: Joi.string().valid('user', 'admin').optional(),
      isActive: Joi.boolean().optional(),
      dateFrom: Joi.date().optional(),
      dateTo: Joi.date().optional()
    });

    const paginationSchema = Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(20)
    });

    const { error: filtersError, value: filters } = filtersSchema.validate(req.query);
    const { error: paginationError, value: pagination } = paginationSchema.validate(req.query);

    if (filtersError || paginationError) {
      const error = filtersError || paginationError;
      return res.error(error.details[0].message, 400, 'VALIDATION_ERROR');
    }

    const result = await UserService.getAllUsers(filters, pagination);
    
    res.success(result.users, 'Lista de usuarios obtenida exitosamente', result.pagination);
  });

  /**
   * @swagger
   * /api/users/{userId}:
   *   get:
   *     summary: Obtener usuario por ID (Admin)
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID del usuario
   *     responses:
   *       200:
   *         description: Usuario obtenido exitosamente
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
   *                   example: Usuario obtenido exitosamente
   *       404:
   *         description: Usuario no encontrado
   *       403:
   *         description: Acceso denegado - Solo administradores
   */
  static getUserById = AsyncHandler(async (req, res) => {
    const user = await UserService.getUserById(req.params.userId, req.user);
    
    res.success(user, 'Usuario obtenido exitosamente');
  });

  /**
   * @swagger
   * /api/users:
   *   post:
   *     summary: Crear nuevo usuario (Admin)
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - firstName
   *               - lastName
   *               - email
   *               - password
   *             properties:
   *               firstName:
   *                 type: string
   *                 minLength: 2
   *                 maxLength: 50
   *               lastName:
   *                 type: string
   *                 minLength: 2
   *                 maxLength: 50
   *               email:
   *                 type: string
   *                 format: email
   *               password:
   *                 type: string
   *                 minLength: 6
   *               phone:
   *                 type: string
   *               role:
   *                 type: string
   *                 enum: [user, admin]
   *                 default: user
   *     responses:
   *       201:
   *         description: Usuario creado exitosamente
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
   *                   example: Usuario creado exitosamente
   *       400:
   *         description: Datos de entrada inválidos
   *       409:
   *         description: Email ya registrado
   *       403:
   *         description: Acceso denegado - Solo administradores
   */
  static createUser = AsyncHandler(async (req, res) => {
    const createUserSchema = Joi.object({
      firstName: Joi.string().min(2).max(50).required(),
      lastName: Joi.string().min(2).max(50).required(),
      email: Joi.string().email().required(),
      password: Joi.string().min(6).required(),
      phone: Joi.string().optional(),
      role: Joi.string().valid('user', 'admin').default('user')
    });

    const { error, value } = createUserSchema.validate(req.body);
    if (error) {
      return res.error(error.details[0].message, 400, 'VALIDATION_ERROR');
    }

    const user = await UserService.createUser(value);
    
    res.status(201).success(user, 'Usuario creado exitosamente');
  });

  /**
   * @swagger
   * /api/users/{userId}:
   *   put:
   *     summary: Actualizar usuario (Admin)
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID del usuario
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
   *               role:
   *                 type: string
   *                 enum: [user, admin]
   *     responses:
   *       200:
   *         description: Usuario actualizado exitosamente
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
   *                   example: Usuario actualizado exitosamente
   *       404:
   *         description: Usuario no encontrado
   *       403:
   *         description: Acceso denegado - Solo administradores
   */
  static updateUser = AsyncHandler(async (req, res) => {
    const updateUserSchema = Joi.object({
      firstName: Joi.string().min(2).max(50).optional(),
      lastName: Joi.string().min(2).max(50).optional(),
      phone: Joi.string().optional(),
      role: Joi.string().valid('user', 'admin').optional()
    });

    const { error, value } = updateUserSchema.validate(req.body);
    if (error) {
      return res.error(error.details[0].message, 400, 'VALIDATION_ERROR');
    }

    const user = await UserService.updateUser(req.params.userId, value);
    
    res.success(user, 'Usuario actualizado exitosamente');
  });

  /**
   * @swagger
   * /api/users/{userId}:
   *   delete:
   *     summary: Eliminar usuario (Admin)
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID del usuario
   *     responses:
   *       200:
   *         description: Usuario eliminado exitosamente
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
   *                   example: Usuario eliminado exitosamente
   *       404:
   *         description: Usuario no encontrado
   *       403:
   *         description: Acceso denegado - Solo administradores
   *       400:
   *         description: No se puede eliminar a si mismo
   */
  static deleteUser = AsyncHandler(async (req, res) => {
    await UserService.deleteUser(req.params.userId, req.user.id);
    
    res.success(null, 'Usuario eliminado exitosamente');
  });

  /**
   * @swagger
   * /api/users/{userId}/activate:
   *   put:
   *     summary: Activar usuario (Admin)
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID del usuario
   *     responses:
   *       200:
   *         description: Usuario activado exitosamente
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
   *                   example: Usuario activado exitosamente
   *       404:
   *         description: Usuario no encontrado
   *       403:
   *         description: Acceso denegado - Solo administradores
   */
  static activateUser = AsyncHandler(async (req, res) => {
    const user = await UserService.activateUser(req.params.userId);
    
    res.success(user, 'Usuario activado exitosamente');
  });

  /**
   * @swagger
   * /api/users/{userId}/deactivate:
   *   put:
   *     summary: Desactivar usuario (Admin)
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID del usuario
   *     responses:
   *       200:
   *         description: Usuario desactivado exitosamente
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
   *                   example: Usuario desactivado exitosamente
   *       404:
   *         description: Usuario no encontrado
   *       403:
   *         description: Acceso denegado - Solo administradores
   *       400:
   *         description: No se puede desactivar a si mismo
   */
  static deactivateUser = AsyncHandler(async (req, res) => {
    const user = await UserService.deactivateUser(req.params.userId, req.user.id);
    
    res.success(user, 'Usuario desactivado exitosamente');
  });

  /**
   * @swagger
   * /api/users/search:
   *   get:
   *     summary: Buscar usuarios (Admin)
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: q
   *         required: true
   *         schema:
   *           type: string
   *           minLength: 2
   *         description: Término de búsqueda
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *         description: Número de página
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 50
   *           default: 20
   *         description: Elementos por página
   *     responses:
   *       200:
   *         description: Resultados de búsqueda obtenidos exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               allOf:
   *                 - $ref: '#/components/schemas/PaginatedResponse'
   *                 - type: object
   *                   properties:
   *                     data:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/User'
   *                     searchTerm:
   *                       type: string
   *       400:
   *         description: Término de búsqueda inválido
   *       403:
   *         description: Acceso denegado - Solo administradores
   */
  static searchUsers = AsyncHandler(async (req, res) => {
    const searchSchema = Joi.object({
      q: Joi.string().min(2).required(),
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(50).default(20)
    });

    const { error, value } = searchSchema.validate(req.query);
    if (error) {
      return res.error(error.details[0].message, 400, 'VALIDATION_ERROR');
    }

    const result = await UserService.searchUsers(
      { q: value.q },
      { page: value.page, limit: value.limit }
    );
    
    res.success(result.users, 'Resultados de búsqueda obtenidos exitosamente', result.pagination);
  });

  /**
   * @swagger
   * /api/users/{userId}/stats:
   *   get:
   *     summary: Obtener estadísticas del usuario (Admin)
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID del usuario
   *     responses:
   *       200:
   *         description: Estadísticas del usuario obtenidas exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/UserStats'
   *                 message:
   *                   type: string
   *                   example: Estadísticas del usuario obtenidas exitosamente
   *       404:
   *         description: Usuario no encontrado
   *       403:
   *         description: Acceso denegado - Solo administradores
   */
  static getUserStats = AsyncHandler(async (req, res) => {
    const stats = await UserService.getUserStats(req.params.userId);
    
    res.success(stats, 'Estadísticas del usuario obtenidas exitosamente');
  });

  /**
   * @swagger
   * /api/users/{userId}/activity:
   *   get:
   *     summary: Obtener actividad del usuario (Admin)
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID del usuario
   *     responses:
   *       200:
   *         description: Actividad del usuario obtenida exitosamente
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
   *                     userId:
   *                       type: string
   *                     recentActivity:
   *                       type: array
   *                       items:
   *                         type: object
   *                     lastLogin:
   *                       type: string
   *                       format: date-time
   *                     accountAge:
   *                       type: string
   *                 message:
   *                   type: string
   *                   example: Actividad del usuario obtenida exitosamente
   *       404:
   *         description: Usuario no encontrado
   *       403:
   *         description: Acceso denegado - Solo administradores
   */
  static getUserActivity = AsyncHandler(async (req, res) => {
    const activity = await UserService.getUserActivity(req.params.userId);
    
    res.success(activity, 'Actividad del usuario obtenida exitosamente');
  });
}

module.exports = UserController; 