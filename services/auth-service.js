import { api } from './api-client.js';
import { paymentService } from './payment-service.js';
import { paymentSessionChanged } from '../utils/payment-intent.js';

export const authService = {
  current() {
    return api.get('/me');
  },
  register(input) {
    return api.post('/auth/register', input, { csrfContext: null, skipRefresh: true });
  },
  verifyEmailOtp(input) {
    return api.post('/auth/email/verify-otp', input, { csrfContext: null, skipRefresh: true });
  },
  resendEmailOtp(input) {
    return api.post('/auth/email/resend-otp', input, { csrfContext: null, skipRefresh: true });
  },
  async login(input) {
    const result = await api.post('/auth/login', input, { csrfContext: null, skipRefresh: true });
    await paymentSessionChanged(result?.user?.publicId);
    // A failed billing read must not turn successful authentication into a login error.
    void paymentService.capabilities().catch(() => {});
    return result;
  },
  async logout() {
    const request = async () => {
      await api.synchronizeAccessCsrf();
      const result = await api.post('/auth/logout', null, {
        csrfContext: 'access',
        forceAccessCsrf: true,
        skipRefresh: true,
      });
      await paymentSessionChanged();
      return result;
    };
    try {
      return await request();
    } catch (error) {
      // An access token can expire while the page remains open. Rotate the
      // session once, then retry the server-side revocation with the fresh
      // access/CSRF pair. CSRF failures are never bypassed or retried.
      if (error?.status !== 401 || error?.code !== 'AUTH_REQUIRED') throw error;
      await api.post('/auth/refresh', null, {
        csrfContext: 'access',
        forceAccessCsrf: true,
        skipRefresh: true,
      });
      return request();
    }
  },
  forgotPassword(input) {
    return api.post('/auth/forgot-password', input, { csrfContext: null, skipRefresh: true });
  },
  resetPassword(input) {
    return api.post('/auth/reset-password', input, { csrfContext: null, skipRefresh: true });
  },
};
