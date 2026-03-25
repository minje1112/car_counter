const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Konva API Documentation',
      version: '2.0.0',
      description: 'REST API for annotations, file management, RTSP camera streaming, and JWT authentication',
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token in the format: Bearer <token>'
        }
      },
      schemas: {
        Organization: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'Acme Corporation' },
            description: { type: 'string', example: 'Technology company' },
            is_active: { type: 'boolean', example: true },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            organization_id: { type: 'integer', example: 1 },
            organization_name: { type: 'string', example: 'Acme Corporation' },
            name: { type: 'string', example: 'John Doe' },
            email: { type: 'string', format: 'email', example: 'john@example.com' },
            phone_number: { type: 'string', example: '1234567890' },
            role: { type: 'string', enum: ['admin', 'user'], example: 'user' },
            is_active: { type: 'boolean', example: true },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },
        Annotation: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            location: { type: 'string', example: 'Draw Detection' },
            image_url: { type: 'string', format: 'uri' },
            annotations: { type: 'object' },
            timestamp: { type: 'string', format: 'date-time' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },
        File: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            original_name: { type: 'string', example: 'photo.jpg' },
            filename: { type: 'string', example: '1234567890-photo.jpg' },
            file_path: { type: 'string', example: '/assets/1234567890-photo.jpg' },
            file_url: { type: 'string', format: 'uri' },
            file_type: { type: 'string', enum: ['image', 'video'] },
            mime_type: { type: 'string', example: 'image/jpeg' },
            file_size: { type: 'integer', example: 1024000 },
            slug: { type: 'string', example: 'my-photo' },
            uploaded_at: { type: 'string', format: 'date-time' }
          }
        },
        RtspStream: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            stream_name: { type: 'string', example: 'Front Camera' },
            rtsp_url: { type: 'string', example: 'rtsp://camera1.local:554/stream' },
            description: { type: 'string', example: 'Main entrance camera' },
            is_active: { type: 'boolean', default: true },
            grid_position: { type: 'integer', example: 1 },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },
        Config: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            config_key: { type: 'string', example: 'max_files' },
            config_value: { type: 'string', example: '1000' },
            description: { type: 'string', example: 'Maximum number of files' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },
        AIJobStatus: {
          type: 'object',
          properties: {
            streamId: { type: 'integer', example: 1 },
            streamName: { type: 'string', example: 'Main Entrance' },
            aiStatus: { type: 'string', enum: ['active', 'inactive'], example: 'active' },
            interval: { type: 'integer', example: 60, description: 'Interval in seconds' },
            lastCount: { type: 'integer', example: 15, description: 'Last detected car count' },
            lastCheck: { type: 'string', format: 'date-time', example: '2026-01-23T10:30:00Z' },
            isRunning: { type: 'boolean', example: true }
          }
        },
        CarCount: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            stream_id: { type: 'integer', example: 1 },
            car_count: { type: 'integer', example: 15 },
            detections: { 
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  class: { type: 'integer', example: 2 },
                  confidence: { type: 'number', example: 0.95 },
                  bbox: { type: 'array', items: { type: 'number' }, example: [100, 150, 300, 450] }
                }
              }
            },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        CarCountStats: {
          type: 'object',
          properties: {
            total: { type: 'integer', example: 450, description: 'Total cars counted' },
            average: { type: 'number', example: 15.5, description: 'Average count per record' },
            max: { type: 'integer', example: 35, description: 'Maximum count in a single record' },
            min: { type: 'integer', example: 2, description: 'Minimum count in a single record' },
            records: { type: 'integer', example: 100, description: 'Number of records' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Error message' }
          }
        },
        Success: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Operation successful' }
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
  apis: ['./routes/*.js', './server.js'] // Path to the API routes
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
