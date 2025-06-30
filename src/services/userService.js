const User = require('../models/User');
const { AppError } = require('../middlewares/errorHandler');
const { calculatePagination } = require('../middlewares/responseFormatter');

class UserService {
  // ===== OBTENER TODOS LOS USUARIOS (ADMIN) =====
  static async getAllUsers(filters, paginationData) {
    const { page, limit } = paginationData;
    const { search, role, isActive } = filters;
    
    // Construir filtros de búsqueda
    const searchFilters = {};
    
    if (search) {
      searchFilters.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (role) {
      searchFilters.role = role;
    }
    
    if (isActive !== undefined) {
      searchFilters.isActive = isActive === 'true';
    }

    // Calcular paginación
    const pagination = calculatePagination(page, limit, await User.countDocuments(searchFilters));

    // Buscar usuarios
    const users = await User.find(searchFilters)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .skip(pagination.offset)
      .limit(pagination.limit);

    return {
      users: users.map(user => this.formatUserData(user)),
      pagination
    };
  }

  // ===== OBTENER USUARIO POR ID =====
  static async getUserById(userId, requestingUser = null) {
    const user = await User.findById(userId).select('-passwordHash');
    
    if (!user) {
      throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
    }

    let userData = this.formatUserData(user);
    
    // Si hay un usuario logueado, puede ver más información
    if (requestingUser) {
      // Si es el mismo usuario o es admin, mostrar más detalles
      if (requestingUser._id.toString() === userId || requestingUser.role === 'admin') {
        userData.addresses = user.addresses;
        userData.lastLogin = user.lastLogin;
        userData.phone = user.phone;
      }
    }

    return userData;
  }

  // ===== CREAR USUARIO (ADMIN) =====
  static async createUser(userData) {
    const { firstName, lastName, email, password, phone, role, isActive } = userData;

    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new AppError('Ya existe un usuario con este email', 400, 'EMAIL_ALREADY_EXISTS');
    }

    // Crear usuario
    const newUser = await User.create({
      firstName,
      lastName,
      email: email.toLowerCase(),
      passwordHash: password,
      phone,
      role: role || 'customer',
      isActive: isActive !== undefined ? isActive : true
    });

    return this.formatUserData(newUser);
  }

  // ===== ACTUALIZAR USUARIO (ADMIN) =====
  static async updateUser(userId, updateData) {
    // No permitir actualizar la contraseña por este método
    delete updateData.passwordHash;
    delete updateData.password;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-passwordHash');

    if (!updatedUser) {
      throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
    }

    return this.formatUserData(updatedUser);
  }

  // ===== ELIMINAR USUARIO (ADMIN) =====
  static async deleteUser(userId, adminUserId) {
    // No permitir que un admin se elimine a sí mismo
    if (adminUserId.toString() === userId) {
      throw new AppError('No puedes eliminar tu propia cuenta', 400, 'CANNOT_DELETE_SELF');
    }

    const deletedUser = await User.findByIdAndDelete(userId);

    if (!deletedUser) {
      throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
    }

    return { message: 'Usuario eliminado exitosamente' };
  }

  // ===== ACTIVAR USUARIO (ADMIN) =====
  static async activateUser(userId) {
    const user = await User.findByIdAndUpdate(
      userId,
      { isActive: true },
      { new: true }
    ).select('-passwordHash');

    if (!user) {
      throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
    }

    return this.formatUserData(user);
  }

  // ===== DESACTIVAR USUARIO (ADMIN) =====
  static async deactivateUser(userId, adminUserId) {
    // No permitir que un admin se desactive a sí mismo
    if (adminUserId.toString() === userId) {
      throw new AppError('No puedes desactivar tu propia cuenta', 400, 'CANNOT_DEACTIVATE_SELF');
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { isActive: false },
      { new: true }
    ).select('-passwordHash');

    if (!user) {
      throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
    }

    return this.formatUserData(user);
  }

  // ===== BUSCAR USUARIOS (ADMIN) =====
  static async searchUsers(searchQuery, paginationData) {
    const { q, page, limit } = { ...searchQuery, ...paginationData };

    if (!q || q.trim().length < 2) {
      throw new AppError('El término de búsqueda debe tener al menos 2 caracteres', 400, 'INVALID_SEARCH_TERM');
    }

    const searchRegex = { $regex: q.trim(), $options: 'i' };
    
    const filters = {
      $or: [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex }
      ]
    };

    // Calcular paginación
    const pagination = calculatePagination(page, limit, await User.countDocuments(filters));

    // Buscar usuarios
    const users = await User.find(filters)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .skip(pagination.offset)
      .limit(pagination.limit);

    return {
      users: users.map(user => this.formatUserData(user)),
      pagination,
      searchTerm: q
    };
  }

  // ===== OBTENER ESTADÍSTICAS DEL USUARIO =====
  static async getUserStats(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
    }

    // Estadísticas básicas (se expandirán cuando tengamos más modelos)
    const stats = {
      userId: user._id,
      memberSince: user.createdAt,
      lastLogin: user.lastLogin,
      role: user.role,
      isActive: user.isActive,
      addressCount: user.addresses.length,
      profile: {
        completeness: this.calculateProfileCompleteness(user),
        hasPhone: !!user.phone,
        hasAddresses: user.addresses.length > 0
      }
      // TODO: Cuando tengamos otros modelos, agregar:
      // orderCount: await Order.countDocuments({ userId: userId }),
      // reviewCount: await Review.countDocuments({ userId: userId }),
      // postsCount: await Post.countDocuments({ userId: userId }),
      // followersCount: await Follow.countDocuments({ followedId: userId }),
      // followingCount: await Follow.countDocuments({ followerId: userId }),
      // cartItemsCount: await Cart.findOne({ userId }).then(cart => cart?.totalItems || 0),
      // wishlistItemsCount: await Wishlist.findOne({ userId }).then(wish => wish?.items.length || 0)
    };

    return stats;
  }

  // ===== OBTENER ACTIVIDAD DEL USUARIO =====
  static async getUserActivity(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
    }

    // Actividad básica (se expandirá cuando tengamos más modelos)
    const activity = {
      userId: user._id,
      recentActivity: [
        {
          type: 'profile_update',
          timestamp: user.updatedAt,
          description: 'Perfil actualizado'
        },
        {
          type: 'account_created',
          timestamp: user.createdAt,
          description: 'Cuenta creada'
        }
      ],
      lastLogin: user.lastLogin,
      accountAge: this.calculateAccountAge(user.createdAt)
      // TODO: Cuando tengamos otros modelos, agregar actividad real:
      // - Últimas órdenes
      // - Últimas reviews
      // - Últimos posts
      // - Actividad social reciente
    };

    return activity;
  }

  // ===== VERIFICAR EXISTENCIA DE USUARIO =====
  static async userExists(userId) {
    const user = await User.findById(userId).select('_id isActive');
    return user && user.isActive;
  }

  // ===== VERIFICAR EMAIL ÚNICO =====
  static async isEmailUnique(email, excludeUserId = null) {
    const query = { email: email.toLowerCase() };
    if (excludeUserId) {
      query._id = { $ne: excludeUserId };
    }
    
    const user = await User.findOne(query);
    return !user;
  }

  // ===== OBTENER USUARIOS POR ROLE =====
  static async getUsersByRole(role, includeInactive = false) {
    const filters = { role };
    if (!includeInactive) {
      filters.isActive = true;
    }

    const users = await User.find(filters)
      .select('-passwordHash')
      .sort({ createdAt: -1 });

    return users.map(user => this.formatUserData(user));
  }

  // ===== UTILITY METHODS =====

  // Formatear datos del usuario para respuesta
  static formatUserData(user) {
    return {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }

  // Calcular completitud del perfil
  static calculateProfileCompleteness(user) {
    let completeness = 0;
    const fields = ['firstName', 'lastName', 'email', 'phone'];
    
    fields.forEach(field => {
      if (user[field]) completeness += 25;
    });

    if (user.addresses.length > 0) completeness += 25;

    return Math.min(completeness, 100);
  }

  // Calcular antigüedad de la cuenta
  static calculateAccountAge(createdAt) {
    const now = new Date();
    const created = new Date(createdAt);
    const diffTime = Math.abs(now - created);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) {
      return `${diffDays} días`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} ${months === 1 ? 'mes' : 'meses'}`;
    } else {
      const years = Math.floor(diffDays / 365);
      return `${years} ${years === 1 ? 'año' : 'años'}`;
    }
  }
}

module.exports = UserService; 