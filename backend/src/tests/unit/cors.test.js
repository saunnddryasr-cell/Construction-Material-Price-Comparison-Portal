const { getCorsOptions } = require('../../config/cors');

describe('CORS configuration', () => {
  it('allows the configured frontend origin in production', () => {
    const options = getCorsOptions({
      NODE_ENV: 'production',
      CORS_ORIGIN: 'https://frontend.example.com, ',
    });
    const callback = jest.fn();

    options.origin('https://frontend.example.com', callback);

    expect(callback).toHaveBeenCalledWith(null, true);
  });

  it('rejects unconfigured browser origins in production', () => {
    const options = getCorsOptions({
      NODE_ENV: 'production',
      CORS_ORIGIN: 'https://frontend.example.com',
    });
    const callback = jest.fn();

    options.origin('https://unexpected.example.com', callback);

    expect(callback).toHaveBeenCalledWith(expect.any(Error));
  });
});
