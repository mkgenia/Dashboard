// Usamos fetch nativo para evitar problemas de dependencias externas
const WEBHOOK_URL = 'https://test-n8n.pzkz6e.easypanel.host/webhook-test/launch-ads';

export interface AdCampaignData {
  platform: 'meta' | 'google';
  campaignType: 'organic' | 'paid';
  campaignName: string;
  budget: string;
  location: string;
  adCopy: string;
  adAccount?: string;
  imageUrl?: string;
}

export const marketingService = {
  launchCampaign: async (data: AdCampaignData) => {
    try {
      let response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.status === 404) {
        const testUrl = WEBHOOK_URL.replace('/webhook/', '/webhook-test/');
        response = await fetch(testUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  improveCopy: async (description: string) => {
    try {
      const response = await fetch('https://test-n8n.pzkz6e.easypanel.host/webhook/improve-copy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description }),
      });

      if (!response.ok) return null;
      const data = await response.json();
      return data.improvedCopy;
    } catch (error) {
      return null;
    }
  },

  getAdAccounts: async () => {
    try {
      const response = await fetch('https://test-n8n.pzkz6e.easypanel.host/webhook/get-ad-accounts', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) throw new Error('Error fetching accounts');
      const result = await response.json();
      
      // Si recibimos un objeto directo (no array), lo metemos en una lista
      if (result && !Array.isArray(result) && !result.data) {
        return [result];
      }
      
      const accounts = Array.isArray(result) ? result : (result.data || []);
      return accounts;
    } catch (error) {
      return [];
    }
  },

  getAccountStats: async (adAccountId: string) => {
    try {
      const response = await fetch('https://test-n8n.pzkz6e.easypanel.host/webhook/account-stats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adAccountId }),
      });

      if (!response.ok) throw new Error('Error fetching stats');
      const stats = await response.json();
      return stats;
    } catch (error) {
      // Solo devolvemos el fallback si realmente no podemos conectar
      return {
        spent: 0,
        currency: 'EUR',
        status: 'PENDING',
        limit: 1000
      };
    }
  }
};
