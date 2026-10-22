import { asyncHandler } from '../../common/http/asyncHandler';
import { sendSuccess } from '../../common/http/response';
import { getValidated } from '../../common/http/validated';
import { getAuthUser } from '../../middlewares/auth.middleware';
import { toReceiptUrl } from '../../middlewares/upload.middleware';
import { loanService } from './loan.service';
import type { CreateLoanInput, ListLoansQuery, LoanIdParam } from './loan.schemas';

export const createLoan = asyncHandler(async (req, res) => {
  const authUser = getAuthUser(req);
  const input = getValidated<CreateLoanInput>(req, 'body');

  // A multipart receipt file wins over a client-supplied path.
  const uploadedReceipt = req.file ? toReceiptUrl(req.file.filename) : undefined;
  const loan = await loanService.create(authUser.id, input, uploadedReceipt);

  sendSuccess(res, loan, undefined, 201);
});

export const listLoans = asyncHandler(async (req, res) => {
  const authUser = getAuthUser(req);
  const query = getValidated<ListLoansQuery>(req, 'query');

  const { loans, meta } = await loanService.list(authUser.id, query);
  sendSuccess(res, loans, meta);
});

export const getLoanSummary = asyncHandler(async (req, res) => {
  const authUser = getAuthUser(req);
  const summary = await loanService.summary(authUser.id);

  sendSuccess(res, summary);
});

export const getLoan = asyncHandler(async (req, res) => {
  const authUser = getAuthUser(req);
  const { id } = getValidated<LoanIdParam>(req, 'params');

  const loan = await loanService.getById(authUser.id, id);
  sendSuccess(res, loan);
});

export const repayLoan = asyncHandler(async (req, res) => {
  const authUser = getAuthUser(req);
  const { id } = getValidated<LoanIdParam>(req, 'params');

  const result = await loanService.repay(authUser.id, id);
  sendSuccess(res, {
    ...result,
    message: result.alreadyRepaid
      ? 'This loan was already marked as repaid.'
      : 'Loan marked as repaid.',
  });
});

export const deleteLoan = asyncHandler(async (req, res) => {
  const authUser = getAuthUser(req);
  const { id } = getValidated<LoanIdParam>(req, 'params');

  const result = await loanService.remove(authUser.id, id);
  sendSuccess(res, { ...result, message: 'Loan deleted.' });
});
