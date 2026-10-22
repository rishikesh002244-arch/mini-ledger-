import { Router } from 'express';
import { sendSuccess } from '../common/http/response';
import authRoutes from '../modules/auth/auth.routes';
import loanRoutes from '../modules/loans/loan.routes';

const router = Router();

router.get('/', (_req, res) => {
  sendSuccess(res, {
    name: 'MiniLedger API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      loans: '/api/loans',
      health: '/health',
    },
  });
});

router.use('/auth', authRoutes);
router.use('/loans', loanRoutes);

export default router;
