import axios from '../utils/axios';

export const annotationsApi = {
  getAll: async () => {
    try {
      const response = await axios.get('/api/annotations');
      return response;
    } catch (error) {
      throw error;
    }
  },

  getById: async (id) => {
    try {
      const response = await axios.get(`/api/annotations/${id || 1}`);
      return response;
    } catch (error) {
      throw error;
    }
  },
  create: async (data) => {
    console.log(data)
    try {
      const response = await axios.post('/api/annotations', data);
      return response;
    } catch (error) {
      throw error;
    }
  },

  update: async (id, data) => {
    try {
      const response = await axios.put(`/api/annotations/${id}`, data);
      return response;
    } catch (error) {
      throw error;
    }
  },
  delete: async (id) => {
    try {
      const response = await axios.delete(`/api/annotations/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  },
};
