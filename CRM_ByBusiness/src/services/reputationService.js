
/**
 * Reputation Service - CRM Integration
 * Part of the "Industrial Intelligence" Architecture by IA-ByBusiness
 */

const API_BASE_URL = import.meta.env.VITE_REPUTATION_API_URL || 'http://localhost:8092';

export const getBusinessReputation = async (businessName) => {
  try {
    // We use the scraper endpoint configured in the Go Motor
    const response = await fetch(`${API_BASE_URL}/webhook/scraper/go`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: businessName,
        depth: 3 // Optimal level for Dashboard as per technical report
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const data = await response.json();
    return { data, offline: false };
  } catch (error) {
    console.error('Reputation Service Error:', error);
    return { 
      error: error.message || 'Service Unavailable', 
      offline: true,
      timestamp: new Date().toISOString()
    };
  }
};
