import { api } from './api-client.js';

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
  login(input) {
    return api.post('/auth/login', input, { csrfContext: null, skipRefresh: true });
  },
  async logout() {
    const request = () => api.post('/auth/logout', null, { csrfContext: 'access', skipRefresh: true });
    try {
      return await request();
    } catch (error) {
      // An access token can expire while the page remains open. Rotate the
      // session once, then retry the server-side revocation with the fresh
      // access/CSRF pair. CSRF failures are never bypassed or retried.
      if (error?.status !== 401) throw error;
      await api.post('/auth/refresh', null, { csrfContext: 'access', skipRefresh: true });
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
