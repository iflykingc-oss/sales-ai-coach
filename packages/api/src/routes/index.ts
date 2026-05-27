import { Router } from 'express';
import authRoutes from './auth.js';
import sessionRoutes from './sessions.js';
import scriptRoutes from './scripts.js';
import practiceRoutes from './practices.js';
import knowledgeRoutes from './knowledge.js';
import reviewRoutes from './reviews.js';
import teamRoutes from './teams.js';
import pluginRoutes from './plugins.js';
import adminRoutes from './admin.js';
import achievementRoutes from './achievements.js';
import sharedScriptRoutes from './shared-scripts.js';
import modelConfigRoutes from './model-configs.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/sessions', sessionRoutes);
router.use('/scripts', scriptRoutes);
router.use('/practices', practiceRoutes);
router.use('/knowledge', knowledgeRoutes);
router.use('/reviews', reviewRoutes);
router.use('/teams', teamRoutes);
router.use('/plugins', pluginRoutes);
router.use('/admin', adminRoutes);
router.use('/achievements', achievementRoutes);
router.use('/shared-scripts', sharedScriptRoutes);
router.use('/model-configs', modelConfigRoutes);

export default router;
