const J = { 'Content-Type': 'application/json' };

async function del(url: string) {
  const r = await fetch(url, { method: 'DELETE' });
  if (r.status === 204) return null;
  return r.json();
}

function put(url: string, body: Record<string, unknown>) {
  return fetch(url, { method: 'PUT', headers: J, body: JSON.stringify(body) }).then(r => r.json());
}

function post(url: string, body: unknown) {
  return fetch(url, { method: 'POST', headers: J, body: JSON.stringify(body) }).then(r => r.json());
}

export const api = {
  getSettings: () => fetch('/api/settings').then(r => r.json()),
  updateSettings: (body: Record<string, unknown>) => put('/api/settings', body),

  getScores: () => fetch('/api/scores').then(r => r.json()),
  addScore: (body: Record<string, unknown>) => post('/api/scores', body),
  deleteScore: (id: number) => del(`/api/scores/${id}`),

  getStudySessions: () => fetch('/api/study-sessions').then(r => r.json()),
  addStudySession: (body: Record<string, unknown>) => post('/api/study-sessions', body),
  deleteStudySession: (id: number) => del(`/api/study-sessions/${id}`),

  getPracticeLogs: () => fetch('/api/practice-logs').then(r => r.json()),
  addPracticeLog: (body: Record<string, unknown>) => post('/api/practice-logs', body),
  deletePracticeLog: (id: number) => del(`/api/practice-logs/${id}`),

  getVocab: () => fetch('/api/vocab').then(r => r.json()),
  addVocab: (body: Record<string, unknown>) => post('/api/vocab', body),
  bulkVocab: (words: Record<string, unknown>[]) => post('/api/vocab/bulk', { words }),
  toggleVocab: (id: number) =>
    fetch(`/api/vocab/${id}/toggle`, { method: 'PATCH' }).then(r => r.json()),
  deleteVocab: (id: number) => del(`/api/vocab/${id}`),

  getAffirmations: () => fetch('/api/affirmations').then(r => r.json()),
  addAffirmation: (body: Record<string, unknown>) => post('/api/affirmations', body),
  deleteAffirmation: (id: number) => del(`/api/affirmations/${id}`),

  getApplications: () => fetch('/api/higher-study/applications').then(r => r.json()),
  addApplication: (body: Record<string, unknown>) => post('/api/higher-study/applications', body),
  updateApplication: (id: number, body: Record<string, unknown>) => put(`/api/higher-study/applications/${id}`, body),
  deleteApplication: (id: number) => del(`/api/higher-study/applications/${id}`),

  getOtherTestScores: () => fetch('/api/higher-study/test-scores').then(r => r.json()),
  addOtherTestScore: (body: Record<string, unknown>) => post('/api/higher-study/test-scores', body),
  deleteOtherTestScore: (id: number) => del(`/api/higher-study/test-scores/${id}`),

  getScholarships: () => fetch('/api/higher-study/scholarships').then(r => r.json()),
  addScholarship: (body: Record<string, unknown>) => post('/api/higher-study/scholarships', body),
  updateScholarship: (id: number, body: Record<string, unknown>) => put(`/api/higher-study/scholarships/${id}`, body),
  deleteScholarship: (id: number) => del(`/api/higher-study/scholarships/${id}`),

  getTemplates: () => fetch('/api/higher-study/templates').then(r => r.json()),
  addTemplate: (body: Record<string, unknown>) => post('/api/higher-study/templates', body),
  deleteTemplate: (id: number) => del(`/api/higher-study/templates/${id}`),
};
