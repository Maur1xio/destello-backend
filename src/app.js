const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

// ===== IMPORT CONFIGURATION =====
const connectDB = require('./config/database');
const { PORT, NODE_ENV, API_VERSION } = require('./config/constants');

const {
  // Security
  generalLimiter,
  authLimiter,
  cors,
  helmet,
  securityHeaders,
  
  // Response formatting
  autoFormatter,
  
  // Error handling
  globalErrorHandler,
  notFound
} = require('./middlewares');

const apiRoutes = require('./routes');

const User = require('./models/User');
const Category = require('./models/Category');
const Product = require('./models/Product');
const Cart = require('./models/Cart');
const Wishlist = require('./models/Wishlist');
const Order = require('./models/Order');
const Shipment = require('./models/Shipment');
const Review = require('./models/Review');
const Comment = require('./models/Comment');
const Reaction = require('./models/Reaction');
const Post = require('./models/Post');
const Follow = require('./models/Follow');
const InventoryTransaction = require('./models/InventoryTransaction');

const app = express();

app.set('trust proxy', 1);

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Destello Shop API',
      version: API_VERSION,
      description: 'API completa para E-commerce con funcionalidades sociales - Destello Shop',
      contact: {
        name: 'Destello Shop Team',
        email: 'api@destello-shop.com'
      }
    },
    servers: [
      {
        url: `http://20.245.229.182:${PORT}`,
        description: 'Destello Shop API - Azure VM Server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Ingresa tu JWT token'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'object',
              properties: {
                message: {
                  type: 'string',
                  example: 'Mensaje de error'
                },
                errorCode: {
                  type: 'string',
                  example: 'ERROR_CODE'
                }
              }
            }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'object',
              description: 'Datos de respuesta'
            },
            message: {
              type: 'string',
              example: 'Operación exitosa'
            }
          }
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'array',
              items: {}
            },
            pagination: {
              type: 'object',
              properties: {
                currentPage: { type: 'integer', example: 1 },
                totalPages: { type: 'integer', example: 10 },
                totalItems: { type: 'integer', example: 200 },
                itemsPerPage: { type: 'integer', example: 20 },
                hasNextPage: { type: 'boolean', example: true },
                hasPrevPage: { type: 'boolean', example: false },
                nextPage: { type: 'integer', example: 2 },
                prevPage: { type: 'integer', nullable: true, example: null }
              }
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.use(helmet); // Security headers
app.use(cors); // Cross-origin resource sharing
app.use(securityHeaders); // Custom security headers

app.use(generalLimiter); // Apply to all routes

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===== RESPONSE FORMATTER =====
app.use(autoFormatter); // Add res.success, res.error, etc.

// ===== SWAGGER DOCUMENTATION =====
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Destello Shop API Documentation'
}));

// ===== HEALTH CHECK ENDPOINTS =====
app.get('/health', (req, res) => {
  res.success({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: NODE_ENV,
    version: API_VERSION,
    database: 'Connected' // This will be enhanced with actual DB status
  }, 'API funcionando correctamente');
});

app.get('/health/detailed', (req, res) => {
  const memoryUsage = process.memoryUsage();
  
  res.success({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: NODE_ENV,
    version: API_VERSION,
    system: {
      platform: process.platform,
      nodeVersion: process.version,
      cpuUsage: process.cpuUsage(),
      memoryUsage: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`
      }
    },
    database: {
      status: 'Connected',
      models: [
        'User', 'Category', 'Product', 'Cart', 'Wishlist', 
        'Order', 'Shipment', 'Review', 'Comment', 'Reaction', 
        'Post', 'Follow', 'InventoryTransaction'
      ]
    }
  }, 'Estado detallado del sistema');
});

// ===== API ROUTES =====
app.use('/api', apiRoutes);

// ===== ROOT ENDPOINT =====
app.get('/', (req, res) => {
  res.success({
    api: 'Destello Shop API',
    version: API_VERSION,
    environment: NODE_ENV,
    documentation: '/api-docs',
    health: '/health',
    endpoints: {
      // Core API
      api: '/api',
      
      // E-Commerce Core (10 módulos)
      auth: '/api/auth',
      users: '/api/users',
      products: '/api/products',
      categories: '/api/categories',
      cart: '/api/cart',
      orders: '/api/orders',
      wishlist: '/api/wishlist',
      reviews: '/api/reviews',
      shipments: '/api/shipments',
      inventory: '/api/inventory',
      
      // Social Media (4 módulos)
      posts: '/api/posts',
      comments: '/api/comments',
      reactions: '/api/reactions',
      follows: '/api/follows'
    },
    modules: {
      ecommerce: [
        'auth', 'users', 'products', 'categories', 
        'cart', 'orders', 'wishlist', 'reviews', 
        'shipments', 'inventory'
      ],
      social: [
        'posts', 'comments', 'reactions', 'follows'
      ]
    },
    totalEndpoints: '~110 endpoints',
    totalModules: 14
  }, 'Bienvenido a Destello Shop API - Backend Completo');
});

// ===== 404 HANDLER =====
app.use(notFound);

// ===== GLOBAL ERROR HANDLER =====
app.use(globalErrorHandler);

// ===== SERVER STARTUP =====
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Start server
    const server = app.listen(PORT, () => {
      console.log('\n🚀 ===== DESTELLO SHOP API =====');
      console.log(`🌟 Servidor iniciado en puerto ${PORT}`);
      console.log(`🌐 Entorno: ${NODE_ENV}`);
      console.log(`📚 Documentación: http://localhost:${PORT}/api-docs`);
      console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
      console.log(`🔗 API Base: http://localhost:${PORT}/api`);
      console.log('🔒 Middlewares activos:');
      console.log('   ✅ CORS configurado');
      console.log('   ✅ Helmet (security headers)');
      console.log('   ✅ Rate limiting activo');
      console.log('   ✅ JWT authentication listo');
      console.log('   ✅ Validación con Joi');
      console.log('   ✅ Error handling global');
      console.log('   ✅ Response formatting');
      console.log('\n📋 Modelos cargados:');
      console.log('   👤 User, 📂 Category, 🛍️ Product');
      console.log('   🛒 Cart, ❤️ Wishlist, 📦 Order');
      console.log('   🚚 Shipment, ⭐ Review, 💬 Comment');
      console.log('   👍 Reaction, 📝 Post, 👥 Follow');
      console.log('   📊 InventoryTransaction');
      console.log('\n🛣️  Rutas configuradas:');
      console.log('   🔐 /api/auth - Autenticación');
      console.log('   👥 /api/users - Usuarios (Admin)');
      console.log('   🛍️  /api/products - Productos');
      console.log('   📂 /api/categories - Categorías');
      console.log('   🛒 /api/cart - Carrito');
      console.log('   📦 /api/orders - Órdenes');
      console.log('\n💻 API lista para recibir requests! 🎯\n');
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('🔄 SIGTERM received. Shutting down gracefully...');
      server.close(() => {
        console.log('✅ Server closed successfully');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('\n🔄 SIGINT received. Shutting down gracefully...');
      server.close(() => {
        console.log('✅ Server closed successfully');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Error starting server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

module.exports = app;
