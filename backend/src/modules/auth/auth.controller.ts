import { asyncHandler } from '../../common/http/asyncHandler';
import { sendSuccess } from '../../common/http/response';
import { getValidated } from '../../common/http/validated';
import { getAuthUser } from '../../middlewares/auth.middleware';
import { authService } from './auth.service';
import type { RequestOtpInput, VerifyOtpInput } from './auth.schemas';

export const requestOtp = asyncHandler(async (req, res) => {
  const input = getValidated<RequestOtpInput>(req, 'body');
  const result = await authService.requestOtp(input);

  sendSuccess(res, {
    ...result,
    message: 'OTP generated. Check the backend console for the 6-digit code.',
  });
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const input = getValidated<VerifyOtpInput>(req, 'body');
  const result = await authService.verifyOtp(input);

  sendSuccess(res, {
    ...result,
    message: 'Phone verified successfully.',
  });
});

export const me = asyncHandler(async (req, res) => {
  const authUser = getAuthUser(req);
  const user = await authService.getById(authUser.id);

  sendSuccess(res, user);
});
