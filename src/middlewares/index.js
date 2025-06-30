// ===== IMPORT ALL MIDDLEWARES =====
const { 
  asyncHandler, 
  globalErrorHandler, 
  notFound, 
  AppError 
} = require('./errorHandler');

const { 
  requireAuth, 
  optionalAuth, 
  requireRoles, 
  requireAdmin, 
  requireOwnershipOrAdmin, 
  createJWTResponse, 
  signToken, 
  verifyToken 
} = require('./auth');

const { 
  validate, 
  commonSchemas, 
  userSchemas, 
  productSchemas, 
  paramSchemas, 
  querySchemas 
} = require('./validation');

const { 
  generalLimiter, 
  authLimiter, 
  createLimiter, 
  cors, 
  helmet, 
  securityHeaders, 
  ipWhitelist, 
  requestSizeLimiter 
} = require('./security');

const { 
  formatSuccess, 
  formatError, 
  formatPagination, 
  formatList, 
  formatMongooseModel, 
  calculatePagination, 
  autoFormatter, 
  commonResponses 
} = require('./responseFormatter');

// ===== GROUPED EXPORTS =====

// Error handling
const errorHandling = {
  asyncHandler,
  globalErrorHandler,
  notFound,
  AppError
};

// Authentication & Authorization
const auth = {
  requireAuth,
  optionalAuth,
  requireRoles,
  requireAdmin,
  requireOwnershipOrAdmin,
  createJWTResponse,
  signToken,
  verifyToken
};

// Validation
const validation = {
  validate,
  schemas: {
    common: commonSchemas,
    user: userSchemas,
    product: productSchemas,
    param: paramSchemas,
    query: querySchemas
  }
};

// Security
const security = {
  rateLimiters: {
    general: generalLimiter,
    auth: authLimiter,
    create: createLimiter
  },
  cors,
  helmet,
  securityHeaders,
  ipWhitelist,
  requestSizeLimiter
};

// Response formatting
const responseFormatting = {
  formatSuccess,
  formatError,
  formatPagination,
  formatList,
  formatMongooseModel,
  calculatePagination,
  autoFormatter,
  commonResponses
};

// ===== INDIVIDUAL EXPORTS =====
module.exports = {
  // Grouped
  errorHandling,
  auth,
  validation,
  security,
  responseFormatting,

  // Individual - Error Handling
  asyncHandler,
  globalErrorHandler,
  notFound,
  AppError,

  // Individual - Auth
  requireAuth,
  optionalAuth,
  requireRoles,
  requireAdmin,
  requireOwnershipOrAdmin,
  createJWTResponse,
  signToken,
  verifyToken,

  // Individual - Validation
  validate,
  commonSchemas,
  userSchemas,
  productSchemas,
  paramSchemas,
  querySchemas,

  // Individual - Security
  generalLimiter,
  authLimiter,
  createLimiter,
  cors,
  helmet,
  securityHeaders,
  ipWhitelist,
  requestSizeLimiter,

  // Individual - Response Formatting
  formatSuccess,
  formatError,
  formatPagination,
  formatList,
  formatMongooseModel,
  calculatePagination,
  autoFormatter,
  commonResponses
}; 