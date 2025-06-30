const Joi = require('joi');
const { AppError } = require('./errorHandler');

// ===== VALIDATION HELPER =====
const validateData = (schema, data, location) => {
  const { error, value } = schema.validate(data, {
    abortEarly: false, // Mostrar todos los errores
    stripUnknown: true, // Remover campos no definidos
    convert: true // Convertir tipos automáticamente
  });

  if (error) {
    const errorMessages = error.details.map(detail => detail.message).join(', ');
    throw new AppError(
      `Error de validación en ${location}: ${errorMessages}`,
      400,
      'VALIDATION_ERROR'
    );
  }

  return value;
};

// ===== GENERIC VALIDATION MIDDLEWARE =====
const validate = (schema) => {
  return (req, res, next) => {
    try {
      // Validar body si existe schema.body
      if (schema.body) {
        req.body = validateData(schema.body, req.body, 'body');
      }

      // Validar params si existe schema.params
      if (schema.params) {
        req.params = validateData(schema.params, req.params, 'parámetros');
      }

      // Validar query si existe schema.query
      if (schema.query) {
        req.query = validateData(schema.query, req.query, 'query');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// ===== COMMON VALIDATION SCHEMAS =====
const commonSchemas = {
  // MongoDB ObjectId
  objectId: Joi.string().hex().length(24),
  
  // Email
  email: Joi.string().email().lowercase().max(100),
  
  // Password
  password: Joi.string().min(6).max(128),
  
  // Names
  name: Joi.string().trim().min(1).max(50),
  
  // Phone
  phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/),
  
  // SKU
  sku: Joi.string().trim().uppercase().min(3).max(20),
  
  // Price
  price: Joi.number().positive().precision(2),
  
  // Quantity
  quantity: Joi.number().integer().min(1),
  
  // Rating
  rating: Joi.number().integer().min(1).max(5),
  
  // Pagination
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  
  // Sort
  sort: Joi.string().valid('asc', 'desc', '1', '-1').default('desc')
};

// ===== USER VALIDATION SCHEMAS =====
const userSchemas = {
  register: {
    body: Joi.object({
      firstName: commonSchemas.name.required(),
      lastName: commonSchemas.name.required(),
      email: commonSchemas.email.required(),
      password: commonSchemas.password.required(),
      phone: commonSchemas.phone.optional()
    })
  },

  login: {
    body: Joi.object({
      email: commonSchemas.email.required(),
      password: Joi.string().required()
    })
  },

  updateProfile: {
    body: Joi.object({
      firstName: commonSchemas.name.optional(),
      lastName: commonSchemas.name.optional(),
      phone: commonSchemas.phone.optional()
    }).min(1)
  },

  addAddress: {
    body: Joi.object({
      type: Joi.string().valid('home', 'work', 'other').default('home'),
      street: Joi.string().trim().min(5).max(200).required(),
      city: Joi.string().trim().min(2).max(100).required(),
      state: Joi.string().trim().min(2).max(100).required(),
      zipCode: Joi.string().trim().min(3).max(20).required(),
      country: Joi.string().trim().min(2).max(100).default('Mexico'),
      isDefault: Joi.boolean().default(false)
    })
  }
};

// ===== PRODUCT VALIDATION SCHEMAS =====
const productSchemas = {
  create: {
    body: Joi.object({
      name: Joi.string().trim().min(1).max(200).required(),
      sku: commonSchemas.sku.required(),
      description: Joi.string().trim().min(10).max(2000).required(),
      price: commonSchemas.price.required(),
      weight: Joi.number().positive().required(),
      dimensions: Joi.object({
        length: Joi.number().positive().required(),
        width: Joi.number().positive().required(),
        height: Joi.number().positive().required(),
        unit: Joi.string().valid('cm', 'inches').default('cm')
      }).required(),
      stockQty: Joi.number().integer().min(0).default(0),
      categories: Joi.array().items(commonSchemas.objectId).min(1).required(),
      isFeatured: Joi.boolean().default(false)
    })
  },

  update: {
    body: Joi.object({
      name: Joi.string().trim().min(1).max(200).optional(),
      description: Joi.string().trim().min(10).max(2000).optional(),
      price: commonSchemas.price.optional(),
      weight: Joi.number().positive().optional(),
      dimensions: Joi.object({
        length: Joi.number().positive().required(),
        width: Joi.number().positive().required(),
        height: Joi.number().positive().required(),
        unit: Joi.string().valid('cm', 'inches').default('cm')
      }).optional(),
      stockQty: Joi.number().integer().min(0).optional(),
      categories: Joi.array().items(commonSchemas.objectId).min(1).optional(),
      isFeatured: Joi.boolean().optional(),
      isActive: Joi.boolean().optional()
    }).min(1)
  },

  getAll: {
    query: Joi.object({
      page: commonSchemas.page,
      limit: commonSchemas.limit,
      sort: Joi.string().optional(),
      category: commonSchemas.objectId.optional(),
      minPrice: Joi.number().positive().optional(),
      maxPrice: Joi.number().positive().optional(),
      inStock: Joi.boolean().optional(),
      featured: Joi.boolean().optional(),
      search: Joi.string().trim().min(1).max(100).optional()
    })
  }
};

// ===== COMMON PARAM SCHEMAS =====
const paramSchemas = {
  id: {
    params: Joi.object({
      id: commonSchemas.objectId.required()
    })
  }
};

// ===== QUERY SCHEMAS =====
const querySchemas = {
  pagination: {
    query: Joi.object({
      page: commonSchemas.page,
      limit: commonSchemas.limit,
      sort: commonSchemas.sort
    })
  }
};

module.exports = {
  validate,
  commonSchemas,
  userSchemas,
  productSchemas,
  paramSchemas,
  querySchemas
}; 