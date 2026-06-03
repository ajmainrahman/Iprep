async function del(url: string) {
  const r = await fetch(url, { method: 'DELETE' });
  if (r.status === 204) return null;
  return r.json();
}

export const api = {
  getSettings: () => fetch('/api/settings').then(r => r.json()),
  updateSettings: (body: Record<string, unknown>) =>
    fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),

  getScores: () => fetch('/api/scores').then(r => r.json()),
  addScore: (body: Record<string, unknown>) =>
    fetch('/api/scores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
  deleteScore: (id: number) => del(`/api/scores/${id}`),

  getStudySessions: () => fetch('/api/study-sessions').then(r => r.json()),
  addStudySession: (body: Record<string, unknown>) =>
    fetch('/api/study-sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
  deleteStudySession: (id: number) => del(`/api/study-sessions/${id}`),

  getPracticeLogs: () => fetch('/api/practice-logs').then(r => r.json()),
  addPracticeLog: (body: Record<string, unknown>) =>
    fetch('/api/practice-logs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
  deletePracticeLog: (id: number) => del(`/api/practice-logs/${id}`),

  getVocab: () => fetch('/api/vocab').then(r => r.json()),
  addVocab: (body: Record<string, unknown>) =>
    fetch('/api/vocab', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
  bulkVocab: (words: Record<string, unknown>[]) =>
    fetch('/api/vocab/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ words }) }).then(r => r.json()),
  toggleVocab: (id: number) =>
    fetch(`/api/vocab/${id}/toggle`, { method: 'PATCH' }).then(r => r.json()),
  deleteVocab: (id: number) => del(`/api/vocab/${id}`),

  getAffirmations: () => fetch('/api/affirmations').then(r => r.json()),
  addAffirmation: (body: Record<string, unknown>) =>
    fetch('/api/affirmations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
  deleteAffirmation: (id: number) => del(`/api/affirmations/${id}`),
};
