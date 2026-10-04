import { api } from './api-client.js';

export const dashboardService = {
  async loadOverview() {
    const [cards, subscription] = await Promise.all([
      api.get('/cards'),
      api.get('/subscriptions/current').catch((error) => {
        if (error.status === 404) return null;
        throw error;
      }),
    ]);
    if (!Array.isArray(cards)) throw Object.assign(new Error('Data kartu belum dapat diverifikasi. Muat ulang dashboard.'), { code: 'CARD_RESPONSE_INVALID' });
    return { cards, subscription };
  },
};
