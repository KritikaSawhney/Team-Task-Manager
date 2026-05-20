import client from './client';
export const getUsers = () => client.get('/users');
export const searchUsers = (q) => client.get('/users/search', { params: { q } });
export const getUser = (id) => client.get(`/users/${id}`);
export const updateUserRole = (id, role) => client.put(`/users/${id}/role`, { role });
