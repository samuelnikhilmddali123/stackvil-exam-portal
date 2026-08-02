const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Stackvil Online Examination Portal API Reference',
      version: '1.0.0',
      description: 'REST API documentation for user roles, exam schedules, question banks, interactive Monaco editors, and real-time proctoring logs.',
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Local development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./routes/*.js', './routes/**/*.js'],
};

const specs = swaggerJsdoc(options);

module.exports = specs;
