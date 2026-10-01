const DEVELOPMENT_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
];

const normalizeOrigin = (value) => {
  try {
    return new URL(value).origin;
  } catch {
    // eslint-disable-next-line no-console
    console.error(
      `Ignoring invalid CORS origin "${value}" from CORS_ORIGIN/FRONTEND_URL. `
        + 'Expected a full URL such as https://example.com.',
    );
    return null;
  }
};

const getCorsOptions = (env = process.env) => {
  const configuredOrigins = [env.CORS_ORIGIN, env.FRONTEND_URL]
    .filter(Boolean)
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => normalizeOrigin(value.trim()))
    .filter(Boolean);
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