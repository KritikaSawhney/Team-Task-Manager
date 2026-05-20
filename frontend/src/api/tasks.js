import client from './client';
export const getTasks = (params) => client.get('/tasks', { params });
export const getDashboardStats = () => client.get('/tasks/dashboard');
export const getTask = (id) => client.get(`/tasks/${id}`);
export const createTask = (data) => client.post('/tasks', data);
export const updateTask = (id, data) => client.put(`/tasks/${id}`, data);
export const updateTaskStatus = (id, status) => client.patch(`/tasks/${id}/status`, { status });
export const deleteTask = (id) => client.delete(`/tasks/${id}`);
