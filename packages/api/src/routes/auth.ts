import { Router, Request, Response, NextFunction } from 'express';
import { authLimiter } from '../middleware/rateLimit.js';
import { prisma } from '../lib/prisma.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { registerSchema, loginSchema } from '@sales-ai-coach/shared/schemas';

const router = Router();

router.post('/register', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = registerSchema.parse(req.body);
    const hashedPassword = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        industry: data.industry || [],
      },
      select: {
        id: true, name: true, email: true, role: true, plan: true,
        industry: true, teamId: true, createdAt: true, updatedAt: true,
      },
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'dev-secret-change-in-prod',
      { expiresIn: '7d' },
    );

    res.cookie('accessToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ success: true, data: { user, accessToken: token } });
  } catch (err) { next(err); }
});

router.post('/login', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: data.email } });

    if (!user || !(await bcrypt.compare(data.password, user.password))) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'dev-secret-change-in-prod',
      { expiresIn: '7d' },
    );

    res.cookie('accessToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const { password, ...publicUser } = user;
    res.json({ success: true, data: { user: publicUser, accessToken: token } });
  } catch (err) { next(err); }
});

router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('accessToken');
  res.json({ success: true });
});

router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.accessToken || req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, error: 'Not authenticated' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-change-in-prod') as { id: string };
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true, name: true, email: true, role: true, plan: true,
        industry: true, teamId: true, createdAt: true, updatedAt: true,
      },
    });

    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
});

export default router;
