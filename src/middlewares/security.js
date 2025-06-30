const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');

// ===== RATE LIMITING CONFIGURATIONS =====

// Rate limiter general para toda la API
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 requests por ventana por IP
  message: {
    success: false,
    error: {
      message: 'Demasiadas solicitudes desde esta IP. Intenta de nuevo en 15 minutos.',
      errorCode: 'TOO_MANY_REQUESTS'
    }
  },
  standardHeaders: true, // Incluir headers `RateLimit-*`
  legacyHeaders: false, // Deshabilitar headers `X-RateLimit-*`
  skip: (req) => {
    // Saltar rate limiting para health checks
    return req.path === '/health';
  }
});

// Rate limiter estricto para autenticación
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Solo 5 intentos de login por IP
  message: {
    success: false,
    error: {
      message: 'Demasiados intentos de autenticación. Intenta de nuevo en 15 minutos.',
      errorCode: 'AUTH_RATE_LIMIT_EXCEEDED'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true // No contar requests exitosos
});

// Rate limiter para creación de contenido
const createLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 10, // 10 creaciones por 5 minutos
  message: {
    success: false,
    error: {
      message: 'Demasiadas creaciones. Intenta de nuevo en 5 minutos.',
      errorCode: 'CREATE_RATE_LIMIT_EXCEEDED'
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

// ===== CORS CONFIGURATION =====
const corsOptions = {
  origin: function (origin, callback) {
    // Lista de orígenes permitidos
    const allowedOrigins = [
      'http://localhost:3000',    // React dev server
      'http://localhost:5173',    // Vite dev server
      'http://localhost:8080',    // Vue dev server
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:8080'
    ];

    // Permitir requests sin origin (mobile apps, postman, etc.)
    if (!origin) return callback(null, true);

    // En desarrollo, permitir cualquier localhost
    if (process.env.NODE_ENV === 'development') {
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true);
      }
    }

    // Verificar si el origin está en la lista permitida
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true, // Permitir cookies y headers de auth
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-API-Key'
  ],
  exposedHeaders: [
    'X-Total-Count',
    'X-Page-Count',
    'X-Current-Page'
  ]
};

// ===== HELMET CONFIGURATION =====
const helmetOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  },
  crossOriginEmbedderPolicy: false, // Para permitir Swagger UI
  hsts: {
    maxAge: 31536000, // 1 año
    includeSubDomains: true,
    preload: true
  }
};

// ===== SECURITY HEADERS MIDDLEWARE =====
const securityHeaders = (req, res, next) => {
  // Headers adicionales de seguridad
  res.setHeader('X-API-Version', '1.0.0');
  res.setHeader('X-Powered-By', 'Destello Shop API');
  
  // Prevenir clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevenir MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // XSS Protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  next();
};

// ===== IP WHITELIST (OPCIONAL) =====
const ipWhitelist = (whitelistedIPs = []) => {
  return (req, res, next) => {
    if (whitelistedIPs.length === 0) {
      return next(); // Sin whitelist, permitir todo
    }

    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (whitelistedIPs.includes(clientIP)) {
      next();
    } else {
      res.status(403).json({
        success: false,
        error: {
          message: 'Acceso denegado desde esta IP',
          errorCode: 'IP_NOT_WHITELISTED'
        }
      });
    }
  };
};

// ===== REQUEST SIZE LIMITER =====
const requestSizeLimiter = (maxSize = '10mb') => {
  return (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    const maxSizeBytes = parseInt(maxSize) * 1024 * 1024; // Convert MB to bytes
    
    if (contentLength > maxSizeBytes) {
      return res.status(413).json({
        success: false,
        error: {
          message: `Payload demasiado grande. Máximo permitido: ${maxSize}`,
          errorCode: 'PAYLOAD_TOO_LARGE'
        }
      });
    }
    
    next();
  };
};

module.exports = {
  // Rate limiters
  generalLimiter,
  authLimiter,
  createLimiter,
  
  // CORS
  corsOptions,
  
  // Helmet
  helmetOptions,
  
  // Custom middlewares
  securityHeaders,
  ipWhitelist,
  requestSizeLimiter,
  
  // Configured middlewares
  cors: cors(corsOptions),
  helmet: helmet(helmetOptions)
}; 