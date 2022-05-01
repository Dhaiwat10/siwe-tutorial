export const ironOptions = {
  cookieName: 'siwe',
  password: process.env.IRON_PASSWORD as string,
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
  },
};
