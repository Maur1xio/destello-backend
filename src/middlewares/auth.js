const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { AppError } = require('./errorHandler');
const { asyncHandler } = require('./errorHandler');

// ===== JWT HELPER FUNCTIONS =====
const signToken = (userId, expiresIn = null) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'your-super-secret-jwt-key-here',
    { expiresIn: expiresIn || process.env.JWT_EXPIRES_IN || '7d' }
  );
};

const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key-here');
};

// ===== EXTRACT TOKEN FROM HEADER =====
const extractTokenFromHeader = (req) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return null;
  }

  if (!authHeader.startsWith('Bearer ')) {
    throw new AppError('Formato de token inválido. Usa: Bearer <token>', 401, 'INVALID_TOKEN_FORMAT');
  }

  return authHeader.substring(7); // Remove 'Bearer '
};

// ===== VERIFY JWT AND GET USER =====
const verifyJWTAndGetUser = asyncHandler(async (token) => {
  // 1. Verificar el token
  const decoded = verifyToken(token);
  
  // 2. Verificar si el usuario aún existe
  const user = await User.findById(decoded.userId).select('-passwordHash');
  
  if (!user) {
    throw new AppError('El usuario de este token ya no existe', 401, 'USER_NOT_FOUND');
  }

  // 3. Verificar si el usuario está activo
  if (!user.isActive) {
    throw new AppError('Tu cuenta ha sido desactivada. Contacta al soporte.', 401, 'ACCOUNT_DEACTIVATED');
  }

  return user;
});

// ===== REQUIRE AUTHENTICATION =====
const requireAuth = asyncHandler(async (req, res, next) => {
  // 1. Extraer token del header
  const token = extractTokenFromHeader(req);
  
  if (!token) {
    return next(new AppError('Acceso denegado. Token requerido.', 401, 'TOKEN_REQUIRED'));
  }

  // 2. Verificar token y obtener usuario
  const user = await verifyJWTAndGetUser(token);

  // 3. Adjuntar usuario al request
  req.user = user;
  next();
});

// ===== OPTIONAL AUTHENTICATION =====
const optionalAuth = asyncHandler(async (req, res, next) => {
  // 1. Extraer token del header (opcional)
  const token = extractTokenFromHeader(req);
  
  if (!token) {
    req.user = null;
    return next();
  }

  try {
    // 2. Si hay token, verificar y obtener usuario
    const user = await verifyJWTAndGetUser(token);
    req.user = user;
  } catch (error) {
    // Si el token es inválido, continuar sin usuario
    req.user = null;
  }

  next();
});

// ===== REQUIRE SPECIFIC ROLES =====
const requireRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Acceso denegado. Autenticación requerida.', 401, 'AUTH_REQUIRED'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError('Acceso denegado. Permisos insuficientes.', 403, 'INSUFFICIENT_PERMISSIONS'));
    }

    next();
  };
};

// ===== REQUIRE ADMIN =====
const requireAdmin = requireRoles('admin');

// ===== REQUIRE OWNERSHIP OR ADMIN =====
const requireOwnershipOrAdmin = (getResourceUserId) => {
  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Acceso denegado. Autenticación requerida.', 401, 'AUTH_REQUIRED'));
    }

    // Si es admin, puede acceder a todo
    if (req.user.role === 'admin') {
      return next();
    }

    // Obtener el userId del recurso
    const resourceUserId = typeof getResourceUserId === 'function' 
      ? await getResourceUserId(req) 
      : getResourceUserId;

    // Verificar si es el dueño del recurso
    if (req.user._id.toString() !== resourceUserId.toString()) {
      return next(new AppError('Acceso denegado. Solo puedes acceder a tus propios recursos.', 403, 'OWNERSHIP_REQUIRED'));
    }

    next();
  });
};

// ===== UPDATE LAST LOGIN =====
const updateLastLogin = asyncHandler(async (userId) => {
  await User.findByIdAndUpdate(userId, { lastLogin: new Date() });
});

// ===== CREATE JWT RESPONSE =====
const createJWTResponse = async (user) => {
  const token = signToken(user._id);
  
  // Actualizar último login
  await updateLastLogin(user._id);

  return {
    success: true,
    data: {
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      }
    },
    message: 'Autenticación exitosa'
  };
};

module.exports = {
  signToken,
  verifyToken,
  requireAuth,
  optionalAuth,
  requireRoles,
  requireAdmin,
  requireOwnershipOrAdmin,
  createJWTResponse,
  updateLastLogin
}; 