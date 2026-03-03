export const BACKEND_URL = 'http://localhost:8092';

export const performSearch = async (query, location, isPremium, preload = false) => {
    const fullQuery = location.trim() ? `${query} ${location}` : query;
    const depth = isPremium ? 5 : 3;

    const response = await fetch(`${BACKEND_URL}/webhook/scraper/go`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            query: {
                q: fullQuery,
                depth,
                preload
            }
        }),
    });

    if (!response.ok) {
        throw new Error('Fallo de conexión con el motor IA');
    }

    return response.json();
};

export const preloadItem = async (itemName) => {
    try {
        console.log("Precarga:", itemName);
        await fetch(`${BACKEND_URL}/webhook/scraper/go`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: { q: itemName, depth: 3, preload: true }
            }),
        });
    } catch (err) {
        console.log("Error precarga:", err);
    }
};
