import { Router } from 'express';
import walletRouter from './payments/wallet';
import razorpayRouter from './payments/razorpay';
import offlineRouter from './payments/offline';
import internationalRouter from './payments/international';
import youpiRouter from './payments/youpi';

const router = Router();

router.use('/', walletRouter);
router.use('/', razorpayRouter);
router.use('/', offlineRouter);
router.use('/', internationalRouter);
router.use('/youpi', youpiRouter);

export default router;
