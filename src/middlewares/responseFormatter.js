// ===== SUCCESS RESPONSE FORMATTER =====
const formatSuccess = (data, message = 'Operación exitosa', meta = {}) => {
  const response = {
    success: true,
    data,
    message
  };

  // Agregar metadata si existe (pagination, counts, etc.)
  if (Object.keys(meta).length > 0) {
    response.meta = meta;
  }

  return response;
};

// ===== ERROR RESPONSE FORMATTER =====
const formatError = (message, errorCode = 'GENERIC_ERROR', details = null) => {
  const response = {
    success: false,
    error: {
      message,
      errorCode
    }
  };

  // Agregar detalles adicionales si existen (solo en desarrollo)
  if (details && process.env.NODE_ENV === 'development') {
    response.error.details = details;
  }

  return response;
};

// ===== PAGINATION FORMATTER =====
const formatPagination = (data, pagination) => {
  const {
    page = 1,
    limit = 20,
    total = 0,
    totalPages = Math.ceil(total / limit)
  } = pagination;

  return {
    success: true,
    data,
    pagination: {
      currentPage: parseInt(page),
      totalPages: parseInt(totalPages),
      totalItems: parseInt(total),
      itemsPerPage: parseInt(limit),
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      nextPage: page < totalPages ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null
    }
  };
};

// ===== LIST RESPONSE FORMATTER =====
const formatList = (data, message = 'Lista obtenida exitosamente') => {
  return {
    success: true,
    data,
    count: Array.isArray(data) ? data.length : 0,
    message
  };
};

// ===== MIDDLEWARE PARA RESPUESTAS AUTOMÁTICAS =====
const autoFormatter = (req, res, next) => {
  // Método para respuestas de éxito
  res.success = (data, message, meta) => {
    const response = formatSuccess(data, message, meta);
    return res.json(response);
  };

  // Método para respuestas de error
  res.error = (message, statusCode = 400, errorCode) => {
    const response = formatError(message, errorCode);
    return res.status(statusCode).json(response);
  };

  // Método para respuestas paginadas
  res.paginated = (data, pagination, message) => {
    const response = formatPagination(data, pagination);
    if (message) response.message = message;
    return res.json(response);
  };

  // Método para listas simples
  res.list = (data, message) => {
    const response = formatList(data, message);
    return res.json(response);
  };

  // Método para respuestas creadas
  res.created = (data, message = 'Recurso creado exitosamente') => {
    const response = formatSuccess(data, message);
    return res.status(201).json(response);
  };

  // Método para respuestas de actualización
  res.updated = (data, message = 'Recurso actualizado exitosamente') => {
    const response = formatSuccess(data, message);
    return res.json(response);
  };

  // Método para respuestas de eliminación
  res.deleted = (message = 'Recurso eliminado exitosamente') => {
    const response = formatSuccess(null, message);
    return res.json(response);
  };

  // Método para respuestas sin contenido
  res.noContent = () => {
    return res.status(204).send();
  };

  next();
};

// ===== FORMATTER PARA MODELOS MONGOOSE =====
const formatMongooseModel = (model, excludeFields = ['passwordHash', '__v']) => {
  if (!model) return null;

  // Si es un array
  if (Array.isArray(model)) {
    return model.map(item => formatMongooseModel(item, excludeFields));
  }

  // Si es un objeto de Mongoose
  if (model.toObject) {
    const obj = model.toObject();
    
    // Remover campos excluidos
    excludeFields.forEach(field => {
      delete obj[field];
    });

    return obj;
  }

  // Si es un objeto plano
  if (typeof model === 'object') {
    const obj = { ...model };
    
    // Remover campos excluidos
    excludeFields.forEach(field => {
      delete obj[field];
    });

    return obj;
  }

  return model;
};

// ===== HELPER PARA CALCULAR PAGINACIÓN =====
const calculatePagination = (page, limit, total) => {
  const currentPage = parseInt(page) || 1;
  const itemsPerPage = parseInt(limit) || 20;
  const totalItems = parseInt(total) || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const offset = (currentPage - 1) * itemsPerPage;

  return {
    page: currentPage,
    limit: itemsPerPage,
    total: totalItems,
    totalPages,
    offset,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
    nextPage: currentPage < totalPages ? currentPage + 1 : null,
    prevPage: currentPage > 1 ? currentPage - 1 : null
  };
};

// ===== RESPUESTAS PREDEFINIDAS =====
const commonResponses = {
  // Auth responses
  loginSuccess: (data) => formatSuccess(data, 'Inicio de sesión exitoso'),
  logoutSuccess: () => formatSuccess(null, 'Sesión cerrada exitosamente'),
  registerSuccess: (data) => formatSuccess(data, 'Usuario registrado exitosamente'),
  
  // CRUD responses
  created: (data, resource = 'Recurso') => formatSuccess(data, `${resource} creado exitosamente`),
  updated: (data, resource = 'Recurso') => formatSuccess(data, `${resource} actualizado exitosamente`),
  deleted: (resource = 'Recurso') => formatSuccess(null, `${resource} eliminado exitosamente`),
  retrieved: (data, resource = 'Recurso') => formatSuccess(data, `${resource} obtenido exitosamente`),
  
  // Common errors
  notFound: (resource = 'Recurso') => formatError(`${resource} no encontrado`, 'RESOURCE_NOT_FOUND'),
  unauthorized: () => formatError('No autorizado', 'UNAUTHORIZED'),
  forbidden: () => formatError('Acceso denegado', 'FORBIDDEN'),
  validationError: (message) => formatError(message, 'VALIDATION_ERROR'),
  internalError: () => formatError('Error interno del servidor', 'INTERNAL_ERROR')
};

module.exports = {
  formatSuccess,
  formatError,
  formatPagination,
  formatList,
  formatMongooseModel,
  calculatePagination,
  autoFormatter,
  commonResponses
}; 