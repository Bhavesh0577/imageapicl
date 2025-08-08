const serverless = require('serverless-http');
const app = require('../server');

// Export the serverless handler
exports.handler = serverless(app);
