import { apiRequest } from '../lib/api';
import type { AuthResult, OtpRequestResult, User } from '../types';

export const authApi = {
  async requestOtp(phone: string): Promise<OtpRequestResult> {
    const { data } = await apiRequest<OtpRequestResult>('/auth/request-otp', {
      method: 'POST',
      body: { phone },
    });
    return data;
  },

  async verifyOtp(phone: string, otp: string): Promise<AuthResult> {
    const { data } = await apiRequest<AuthResult>('/auth/verify-otp', {
      method: 'POST',
      body: { phone, otp },
    });
    return data;
  },

  async me(token: string): Promise<User> {
    const { data } = await apiRequest<User>('/auth/me', { token });
    return data;
  },
};
