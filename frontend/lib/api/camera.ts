import axios from '../utils/axios';

// RTSP Stream API
export const rtspApi = {
  getAll: () => axios.get('/api/rtsp/streams'),
  getById: (id:any) => axios.get(`/api/rtsp/streams/${id}`),
  create: (data:any) => axios.post('/api/rtsp/streams', data),
  update: (id:any, data:any) => axios.put(`/api/rtsp/streams/${id}`, data),
  delete: (id:any) => axios.delete(`/api/rtsp/streams/${id}`),
  assignAnnotation: (streamId:any, annotationId:any) => 
    axios.put(`/api/rtsp/streams/${streamId}/annotation`, { annotationId }),
};

// AI Counting API
export const aiApi = {
  startCounting: (streamId:any, interval = 60) => 
    axios.post(`/api/ai/streams/${streamId}/start`, { interval }),
  stopCounting: (streamId:any) => 
    axios.post(`/api/ai/streams/${streamId}/stop`),
  restartCounting: (streamId:any, interval = 60) => 
    axios.post(`/api/ai/streams/${streamId}/restart`, { interval }),
  getStatus: (streamId:any) => 
    axios.get(`/api/ai/streams/${streamId}/status`),
  getStats: (streamId:any, limit = 100) => 
    axios.get(`/api/ai/streams/${streamId}/stats?limit=${limit}`),
};

// Annotations API
export const annotationsApi = {
  getAll: () => axios.get('/api/annotations'),
  getById: (id:any) => axios.get(`/api/annotations/${id}`),
  create: (data:any) => axios.post('/api/annotations', data),
  update: (id:any, data:any) => axios.put(`/api/annotations/${id}`, data),
  delete: (id:any) => axios.delete(`/api/annotations/${id}`),
};
