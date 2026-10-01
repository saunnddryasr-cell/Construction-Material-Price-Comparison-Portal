// Vercel serverless entry point.
// Vercel's Node runtime treats a module that exports an Express app
// (a function with the (req, res) signature) as the request handler,
// so no app.listen() call or extra adapter is needed here.
module.exports = require('../src/app');
