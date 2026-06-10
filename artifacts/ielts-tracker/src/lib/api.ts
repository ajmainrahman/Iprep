const authHeaders = (): Record<string, string> => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('wfw_token') ?? ''}`,
});

const authGetHeaders = (): Record<string, string> => ({
  'Authorization': `Bearer ${localStorage.getItem('wfw_token') ?? ''}`,
});

async function del(url: string) {
  const r = await fetch(url, { method: 'DELETE', headers: authGetHeaders() });
  if (r.status === 204) return null;
  return r.json();
}

function put(url: string, body: Record<string, unknown>) {
  return fetch(url, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(body) }).then(r => r.json());
}

function post(url: string, body: unknown) {
  return fetch(url, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) }).then(r => r.json());
}

function patch(url: string) {
  return fetch(url, { method: 'PATCH', headers: authGetHeaders() }).then(r => r.json());
}

function get(url: string) {
  return fetch(url, { headers: authGetHeaders() }).then(r => r.json());
}

export const api = {
  getSettings: () => get('/api/settings'),
  updateSettings: (body: Record<string, unknown>) => put('/api/settings', body),

  getScores: () => get('/api/scores'),
  addScore: (body: Record<string, unknown>) => post('/api/scores', body),
  updateScore: (id: number, body: Record<string, unknown>) => put(`/api/scores/${id}`, body),
  deleteScore: (id: number) => del(`/api/scores/${id}`),

  getStudySessions: () => get('/api/study-sessions'),
  addStudySession: (body: Record<string, unknown>) => post('/api/study-sessions', body),
  deleteStudySession: (id: number) => del(`/api/study-sessions/${id}`),

  getPracticeLogs: () => get('/api/practice-logs'),
  addPracticeLog: (body: Record<string, unknown>) => post('/api/practice-logs', body),
  deletePracticeLog: (id: number) => del(`/api/practice-logs/${id}`),

  getVocab: () => get('/api/vocab'),
  addVocab: (body: Record<string, unknown>) => post('/api/vocab', body),
  bulkVocab: (words: Record<string, unknown>[]) => post('/api/vocab/bulk', { words }),
  toggleVocab: (id: number) => patch(`/api/vocab/${id}/toggle`),
  deleteVocab: (id: number) => del(`/api/vocab/${id}`),

  getAffirmations: () => get('/api/affirmations'),
  addAffirmation: (body: Record<string, unknown>) => post('/api/affirmations', body),
  deleteAffirmation: (id: number) => del(`/api/affirmations/${id}`),

  getApplications: () => get('/api/higher-study/applications'),
  addApplication: (body: Record<string, unknown>) => post('/api/higher-study/applications', body),
  updateApplication: (id: number, body: Record<string, unknown>) => put(`/api/higher-study/applications/${id}`, body),
  deleteApplication: (id: number) => del(`/api/higher-study/applications/${id}`),

  getOtherTestScores: () => get('/api/higher-study/test-scores'),
  addOtherTestScore: (body: Record<string, unknown>) => post('/api/higher-study/test-scores', body),
  updateOtherTestScore: (id: number, body: Record<string, unknown>) => put(`/api/higher-study/test-scores/${id}`, body),
  deleteOtherTestScore: (id: number) => del(`/api/higher-study/test-scores/${id}`),

  getScholarships: () => get('/api/higher-study/scholarships'),
  addScholarship: (body: Record<string, unknown>) => post('/api/higher-study/scholarships', body),
  updateScholarship: (id: number, body: Record<string, unknown>) => put(`/api/higher-study/scholarships/${id}`, body),
  deleteScholarship: (id: number) => del(`/api/higher-study/scholarships/${id}`),

  getTemplates: () => get('/api/higher-study/templates'),
  addTemplate: (body: Record<string, unknown>) => post('/api/higher-study/templates', body),
  updateTemplate: (id: number, body: Record<string, unknown>) => put(`/api/higher-study/templates/${id}`, body),
  deleteTemplate: (id: number) => del(`/api/higher-study/templates/${id}`),

  getPlanningNotes: (section?: string) => get(`/api/planning-notes${section ? `?section=${section}` : ''}`),
  addPlanningNote: (body: Record<string, unknown>) => post('/api/planning-notes', body),
  updatePlanningNote: (id: number, body: Record<string, unknown>) => put(`/api/planning-notes/${id}`, body),
  deletePlanningNote: (id: number) => del(`/api/planning-notes/${id}`),
};
