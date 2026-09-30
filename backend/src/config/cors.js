const DEVELOPMENT_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
];

const normalizeOrigin = (value) => {
  try {
    return new URL(value).origin;
  } catch {
    throw new Error('CORS_ORIGIN and FRONTEND_URL must contain valid origins');
  }
};

const getCorsOptions = (env = process.env) => {
  const configuredOrigins = [env.CORS_ORIGIN, env.FRONTEND_URL]
    .filter(Boolean)
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => normalizeOrigin(value.trim()));
  const allowedOrigins = new Set(configuredOrigins);

  if (env.NODE_ENV !== 'production') {
    DEVELOPMENT_ORIGINS.forEach((origin) => allowedOrigins.add(origin));
  }

  return {
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Refresh-Token',
      'Accept',
      'Origin',
    ],
    exposedHeaders: ['Authorization', 'X-Refresh-Token', 'X-Total-Count'],
    credentials: true,
    optionsSuccessStatus: 204,
  };
};

module.exports = { getCorsOptions };