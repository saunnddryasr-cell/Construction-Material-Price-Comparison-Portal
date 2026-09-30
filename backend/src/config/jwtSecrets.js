const getJwtSecrets = (env = process.env) => {
  const jwtSecret = env.JWT_SECRET;
  const jwtRefreshSecret = env.JWT_REFRESH_SECRET;

  if (
    env.NODE_ENV === 'production' &&
    (!jwtSecret || jwtSecret.length < 32 || !jwtRefreshSecret || jwtRefreshSecret.length < 32)
  ) {
    throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must each be at least 32 characters in production');
  }

  return {
    JWT_SECRET: jwtSecret || 'local-development-jwt-secret',
    JWT_REFRESH_SECRET: jwtRefreshSecret || 'local-development-refresh-secret',
  };
};

module.exports = getJwtSecrets;
