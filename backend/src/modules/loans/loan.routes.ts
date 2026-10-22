import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { uploadReceipt } from '../../middlewares/upload.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as loanController from './loan.controller';
import {
  createLoanSchema,
  listLoansQuerySchema,
  loanIdParamSchema,
} from './loan.schemas';

const router = Router();

// Every loan route requires a valid JWT.
router.use(requireAuth);

/**
 * GET /api/loans/summary
 * Declared before /:id so "summary" is never parsed as an id.
 */
router.get('/summary', loanController.getLoanSummary);

/** GET /api/loans?status=overdue&search=rahul&page=1&limit=50 */
router.get('/', validate(listLoansQuerySchema, 'query'), loanController.listLoans);

/**
 * POST /api/loans
 * Accepts JSON or multipart/form-data with an optional `receipt` image.
 * Fields: friend_name, amount, due_date, receipt_image_url?
 */
router.post(
  '/',
  uploadReceipt,
  validate(createLoanSchema),
  loanController.createLoan,
);

router.get('/:id', validate(loanIdParamSchema, 'params'), loanController.getLoan);

/** PUT /api/loans/:id/repay — idempotent. */
router.put('/:id/repay', validate(loanIdParamSchema, 'params'), loanController.repayLoan);

router.delete('/:id', validate(loanIdParamSchema, 'params'), loanController.deleteLoan);

export default router;
