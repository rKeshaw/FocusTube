// ============================================================
// FocusTube — Route Aggregator
// All routes are registered HERE and only here.
// Adding a new route = one line in this file.
// ============================================================

import { Router } from 'express';
import healthRouter   from './health.route.js';
import infoRouter     from './info.route.js';
import searchRouter   from './search.route.js';
import streamRouter   from './stream.route.js';
import downloadRouter from './download.route.js';
import clipRouter     from './clip.route.js';

const router = Router();

router.use('/health',   healthRouter);
router.use('/info',     infoRouter);
router.use('/search',   searchRouter);
router.use('/stream',   streamRouter);
router.use('/download', downloadRouter);
router.use('/clip',     clipRouter);

export default router;