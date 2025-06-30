const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { 
  signToken, 
  verifyToken,
  updateLastLogin 
} = require('../middlewares/auth');
const { AppError } = require('../middlewares/errorHandler');

class AuthService {
  // ===== REGISTRO DE USUARIO =====
  static async registerUser(userData) {
    const { firstName, lastName, email, password, phone } = userData;

    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new AppError('Ya existe un usuario con este email', 400, 'EMAIL_ALREADY_EXISTS');
    }

    // Crear nuevo usuario
    const newUser = await User.create({
      firstName,
      lastName,
      email: email.toLowerCase(),
      passwordHash: password, // Se encripta automáticamente en el modelo
      phone,
      role: 'customer' // Por defecto es customer
    });

    // Generar token de 7 días
    const token = signToken(newUser._id, '7d');
    
    // Actualizar último login
    await updateLastLogin(newUser._id);

    return {
      token,
      expiresIn: '7 días',
      tokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días desde ahora
      user: {
        id: newUser._id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        fullName: newUser.fullName,
        email: newUser.email,
        role: newUser.role,
        isActive: newUser.isActive
      }
    };
  }

  // ===== LOGIN DE USUARIO =====
  static async loginUser(credentials) {
    const { email, password } = credentials;

    // Buscar usuario con password incluido
    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
    
    if (!user) {
      throw new AppError('Credenciales inválidas', 401, 'INVALID_CREDENTIALS');
    }

    // Verificar si el usuario está activo
    if (!user.isActive) {
      throw new AppError('Tu cuenta ha sido desactivada. Contacta al soporte.', 401, 'ACCOUNT_DEACTIVATED');
    }

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw new AppError('Credenciales inválidas', 401, 'INVALID_CREDENTIALS');
    }

    // Generar token de 7 días
    const token = signToken(user._id, '7d');
    
    // Actualizar último login
    await updateLastLogin(user._id);

    return {
      token,
      expiresIn: '7 días',
      tokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días desde ahora
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      }
    };
  }

  // ===== VERIFICAR TOKEN =====
  static async verifyAuthToken(token) {
    if (!token) {
      return { isValid: false, message: 'Token no proporcionado' };
    }

    try {
      const decoded = verifyToken(token);
      
      // Verificar si el usuario aún existe
      const user = await User.findById(decoded.userId);
      
      if (!user || !user.isActive) {
        return { isValid: false, message: 'Token inválido o usuario inactivo' };
      }

      return {
        isValid: true,
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          isActive: user.isActive
        }
      };

    } catch (error) {
      return { isValid: false, message: 'Token inválido' };
    }
  }

  // ===== RECUPERAR CONTRASEÑA =====
  static async requestPasswordReset(email) {
    const user = await User.findOne({ email: email.toLowerCase() });
    
    // Por seguridad, siempre devolvemos el mismo mensaje
    const message = 'Si el email existe, recibirás instrucciones para resetear tu contraseña';
    
    if (!user) {
      return { message };
    }

    // Generar token de reset (válido por 1 hora)
    const resetToken = signToken(user._id, '1h');
    
    // En un entorno real, aquí se enviaría un email
    // Por ahora, devolvemos el token para testing
    return {
      message,
      resetToken, // Solo para desarrollo
      development: {
        message: 'Token generado para testing. En producción se enviaría por email.',
        expiresIn: '1 hora'
      }
    };
  }

  // ===== RESETEAR CONTRASEÑA =====
  static async resetPassword(token, newPassword) {
    if (!newPassword || newPassword.length < 6) {
      throw new AppError('La nueva contraseña debe tener al menos 6 caracteres', 400, 'INVALID_PASSWORD');
    }

    try {
      const decoded = verifyToken(token);
      
      // Buscar usuario
      const user = await User.findById(decoded.userId);
      if (!user) {
        throw new AppError('Token inválido o expirado', 400, 'INVALID_RESET_TOKEN');
      }

      // Actualizar contraseña
      user.passwordHash = newPassword; // Se encripta automáticamente
      await user.save();

      return { message: 'Contraseña actualizada exitosamente' };

    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new AppError('El token de reseteo ha expirado', 400, 'TOKEN_EXPIRED');
      }
      throw new AppError('Token inválido o expirado', 400, 'INVALID_RESET_TOKEN');
    }
  }

  // ===== OBTENER PERFIL =====
  static async getUserProfile(userId) {
    const user = await User.findById(userId);
    
    if (!user) {
      throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
    }

    return {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      addresses: user.addresses,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin
    };
  }

  // ===== ACTUALIZAR PERFIL =====
  static async updateUserProfile(userId, updateData) {
    const { firstName, lastName, phone } = updateData;
    
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { firstName, lastName, phone },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
    }

    return {
      id: updatedUser._id,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      fullName: updatedUser.fullName,
      email: updatedUser.email,
      phone: updatedUser.phone,
      role: updatedUser.role,
      isActive: updatedUser.isActive,
      addresses: updatedUser.addresses
    };
  }

  // ===== CAMBIAR CONTRASEÑA =====
  static async changePassword(userId, passwordData) {
    const { currentPassword, newPassword } = passwordData;

    // Buscar usuario con password
    const user = await User.findById(userId).select('+passwordHash');
    
    if (!user) {
      throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
    }

    // Verificar contraseña actual
    const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValidPassword) {
      throw new AppError('La contraseña actual es incorrecta', 400, 'INVALID_CURRENT_PASSWORD');
    }

    // Verificar que la nueva contraseña sea diferente
    const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);
    if (isSamePassword) {
      throw new AppError('La nueva contraseña debe ser diferente a la actual', 400, 'SAME_PASSWORD');
    }

    // Actualizar contraseña
    user.passwordHash = newPassword; // Se encripta automáticamente
    await user.save();

    return { message: 'Contraseña cambiada exitosamente' };
  }

  // ===== AGREGAR DIRECCIÓN =====
  static async addAddress(userId, addressData) {
    const { type, street, city, state, zipCode, country, isDefault } = addressData;

    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
    }
    
    // Si es la primera dirección o se marca como default, hacer default
    const shouldBeDefault = isDefault || user.addresses.length === 0;
    
    // Si se marca como default, quitar default de las demás
    if (shouldBeDefault) {
      user.addresses.forEach(addr => addr.isDefault = false);
    }

    // Agregar nueva dirección
    const newAddress = {
      type: type || 'home',
      street,
      city,
      state,
      zipCode,
      country: country || 'Mexico',
      isDefault: shouldBeDefault
    };

    user.addresses.push(newAddress);
    await user.save();

    return user.addresses[user.addresses.length - 1];
  }

  // ===== ACTUALIZAR DIRECCIÓN =====
  static async updateAddress(userId, addressId, updateData) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
    }

    const address = user.addresses.id(addressId);
    if (!address) {
      throw new AppError('Dirección no encontrada', 404, 'ADDRESS_NOT_FOUND');
    }

    // Si se marca como default, quitar default de las demás
    if (updateData.isDefault) {
      user.addresses.forEach(addr => addr.isDefault = false);
    }

    // Actualizar dirección
    Object.assign(address, updateData);
    await user.save();

    return address;
  }

  // ===== ELIMINAR DIRECCIÓN =====
  static async deleteAddress(userId, addressId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
    }

    const address = user.addresses.id(addressId);
    if (!address) {
      throw new AppError('Dirección no encontrada', 404, 'ADDRESS_NOT_FOUND');
    }

    const wasDefault = address.isDefault;
    address.deleteOne();

    // Si era default y hay más direcciones, hacer default la primera
    if (wasDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }

    await user.save();

    return { message: 'Dirección eliminada exitosamente' };
  }

  // ===== ESTABLECER DIRECCIÓN POR DEFECTO =====
  static async setDefaultAddress(userId, addressId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
    }

    const address = user.addresses.id(addressId);
    if (!address) {
      throw new AppError('Dirección no encontrada', 404, 'ADDRESS_NOT_FOUND');
    }

    // Quitar default de todas las direcciones
    user.addresses.forEach(addr => addr.isDefault = false);
    
    // Establecer esta como default
    address.isDefault = true;
    await user.save();

    return address;
  }

  // ===== LOGOUT (ACTUALIZAR ÚLTIMO LOGIN) =====
  static async logoutUser(userId) {
    await updateLastLogin(userId);
    return { message: 'Sesión cerrada exitosamente' };
  }
}

module.exports = AuthService;

// ===== CONFIGURACIÓN DE TOKENS =====
// ✅ Tokens de autenticación: 7 días (sin refresh tokens)
// ✅ Tokens de reset: 1 hora
// ✅ Información de expiración incluida en respuestas 