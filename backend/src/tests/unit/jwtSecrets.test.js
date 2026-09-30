const getJwtSecrets = require('../../config/jwtSecrets');

describe('JWT secret configuration', () => {
  it('requires strong secrets in production', () => {
    expect(() => getJwtSecrets({ NODE_ENV: 'production' })).toThrow(
      'JWT_SECRET and JWT_REFRESH_SECRET must each be at least 32 characters in production'
    );
  });

  it('uses configured secrets without modifying them', () => {
    const secrets = getJwtSecrets({
      NODE_ENV: 'production',
      JWT_SECRET: 'a'.repeat(32),
      JWT_REFRESH_SECRET: 'b'.repeat(32),
    });

    expect(secrets.JWT_SECRET).toBe('a'.repeat(32));
    expect(secrets.JWT_REFRESH_SECRET).toBe('b'.repeat(32));
  });
});
