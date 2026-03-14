import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const BASE_URL = 'http://localhost:5678/webhook/';

export const useN8n = () => {
    const queryClient = useQueryClient();

    const fetchN8n = async (endpoint, options = {}) => {
        const defaultHeaders = {
            'Content-Type': 'application/json',
            // Agregar cabeceras de autorización si fuera necesario
        };

        const response = await fetch(`${BASE_URL}${endpoint}`, {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers,
            },
        });

        if (!response.ok) {
            throw new Error(`Error en llamada a n8n: ${response.statusText}`);
        }

        return response.json();
    };

    const useN8nQuery = (queryKey, endpoint, options = {}) => {
        return useQuery({
            queryKey,
            queryFn: () => fetchN8n(endpoint, { method: 'GET' }),
            ...options,
        });
    };

    const useN8nMutation = (endpoint, options = {}) => {
        return useMutation({
            mutationFn: (data) => fetchN8n(endpoint, {
                method: 'POST',
                body: JSON.stringify(data),
            }),
            ...options,
        });
    };

    return {
        fetchN8n,
        useN8nQuery,
        useN8nMutation,
    };
};

export default useN8n;
