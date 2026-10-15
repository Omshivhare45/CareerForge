import api from './axios';

const codeApi = {
  run: (payload) => api.post('/code/run', payload),
  execute: (payload) => api.post('/code/execute', payload),
  judge: (payload) => api.post('/code/judge', payload),
  submit: (payload) => api.post('/code/submit', payload),
  status: () => api.get('/code/status')
};

export default codeApi;
