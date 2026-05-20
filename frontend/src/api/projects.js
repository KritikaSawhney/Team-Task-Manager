import client from './client';
export const getProjects = () => client.get('/projects');
export const getProject = (id) => client.get(`/projects/${id}`);
export const createProject = (data) => client.post('/projects', data);
export const updateProject = (id, data) => client.put(`/projects/${id}`, data);
export const deleteProject = (id) => client.delete(`/projects/${id}`);
export const addMember = (id, data) => client.post(`/projects/${id}/members`, data);
export const removeMember = (id, userId) => client.delete(`/projects/${id}/members/${userId}`);
