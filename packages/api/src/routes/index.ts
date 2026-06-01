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
import dashboardRoutes from './dashboard.js';
import apiKeyRoutes from './api-keys.js';
import v1Routes from './v1.js';
import apiDocsRoutes from './api-docs.js';
import complianceRoutes from './compliance.js';
import planRoutes from './plans.js';

const router = Router();

// Internal routes (cookie auth)
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
router.use('/dashboard', dashboardRoutes);

// API key management (cookie auth)
router.use('/api-keys', apiKeyRoutes);

// Public v1 API (Bearer token auth)
router.use('/v1', v1Routes);

// API documentation (public, no auth)
router.use('/v1', apiDocsRoutes);

// Compliance & data rights (cookie auth)
router.use('/compliance', complianceRoutes);

// Plan management (cookie auth)
router.use('/plans', planRoutes);

export default router;
