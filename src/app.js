// src/app.js
require('dotenv').config();
const express   = require('express');
const mongoose  = require('mongoose');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const app = express();

// ---------- Middlewares ----------
app.use(express.json());

// ---------- Swagger ----------
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Destello Shop API',
      version: '1.0.0',
      description: 'Documentación de la API de Destello Shop',
    },
    servers: [{ url: `http://localhost:${process.env.PORT || 3000}` }],
  },
  apis: ['./src/routes/*.js'],    // ajusta si tus rutas están en otro sitio
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ---------- Ruta de prueba ----------
app.get('/', (_req, res) => {
  res.send('🚀 Destello Shop API is up and running');
});

// ---------- Conexión a Mongo y arranque ----------
mongoose.set('bufferCommands', false);

const PORT = process.env.PORT || 3000;
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('✅ Connected to MongoDB');
    app.listen(PORT, () =>
      console.log(`🚀 Server listening on port ${PORT}`)
    );
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });
