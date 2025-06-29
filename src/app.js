
const express   = require('express');
const mongoose  = require('mongoose');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const app = express();

app.use(express.json());

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Destello Shop API',
      version: '1.0.0',
      description: 'Documentación de la API de Destello Shop',
    },
    servers: [{ url: `http://localhost:${3000}` }],
  },
  apis: ['./src/routes/*.js'],
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/', (_req, res) => {
  res.send('🚀 Destello Shop API is up and running');
});

mongoose.set('bufferCommands', false);

const PORT =  3000;
mongoose
  .connect("mongodb://mongo:27017/destello_shop", {
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
