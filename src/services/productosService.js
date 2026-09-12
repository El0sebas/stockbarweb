const API_URL = 'https://localhost:7123/api/productos';

export const productosService = {
  getAll: async () => {
    const res = await fetch(API_URL);
    return await res.json();
  },
  create: async (data) => {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  },
  update: async (id, data) => {
    const res = await fetch(`${API_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  },
  delete: async (id) => {
    await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
  }
};