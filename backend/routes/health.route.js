import express from 'express';

const router = express.Router();

// Used for docker health check and monitoring
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    // In a real app we'd fetch actual queued job count if using bull or similar
  });
});

export default router;
