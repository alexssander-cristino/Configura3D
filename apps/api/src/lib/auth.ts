import bcrypt from 'bcryptjs';
import { FastifyInstance } from 'fastify';

export type JwtPayload = {
  sub: string; // user id
  email: string;
  companyId: string;
  role: string;
  permissions: string[];
};

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(Number(process.env.BCRYPT_SALT_ROUNDS || 12));
  return bcrypt.hash(password, salt);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> =>
  bcrypt.compare(password, hash);

export const signToken = async (
  app: FastifyInstance,
  payload: JwtPayload,
): Promise<string> => {
  const jwt = app.jwt as any;
  return jwt.sign(payload, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
};

export const verifyToken = async (
  app: FastifyInstance,
  token: string,
): Promise<JwtPayload | null> => {
  try {
    const jwt = app.jwt as any;
    return (await jwt.verify(token)) as JwtPayload;
  } catch {
    return null;
  }
};

export const requireTenantAccess = (
  companyIdFromToken: string,
  companyIdFromParams: string | undefined,
): boolean => {
  return !!companyIdFromParams && companyIdFromToken === companyIdFromParams;
};
