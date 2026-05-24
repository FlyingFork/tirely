const DEFAULT_ORIGINS = ['http://localhost:3000'];

export const parseAllowedOrigins = (value: string | undefined, fallback = DEFAULT_ORIGINS) => {
  const origins = value
    ?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return origins && origins.length > 0 ? origins : fallback;
};

export const getCorsOrigin = () => {
  const origins = parseAllowedOrigins(process.env.CORS_ORIGIN);
  return origins.length === 1 ? origins[0]! : origins;
};
