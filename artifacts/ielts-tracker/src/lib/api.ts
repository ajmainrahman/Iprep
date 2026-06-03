export const api = {
  getSettings: () => fetch('/api/settings').then(r => r.json()),
  updateSettings: (body: any) => fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
  
  getScores: () => fetch('/api/scores').then(r => r.json()),
  addScore: (body: any) => fetch('/api/scores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
  deleteScore: (id: string) => fetch(`/api/scores/${id}`, { method: 'DELETE' }).then(r => r.json()),
  
  getStudySessions: () => fetch('/api/study-sessions').then(r => r.json()),
  addStudySession: (body: any) => fetch('/api/study-sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
  deleteStudySession: (id: string) => fetch(`/api/study-sessions/${id}`, { method: 'DELETE' }).then(r => r.json()),
  
  getPracticeLogs: () => fetch('/api/practice-logs').then(r => r.json()),
  addPracticeLog: (body: any) => fetch('/api/practice-logs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
  deletePracticeLog: (id: string) => fetch(`/api/practice-logs/${id}`, { method: 'DELETE' }).then(r => r.json()),
  
  getVocab: () => fetch('/api/vocab').then(r => r.json()),
  addVocab: (body: any) => fetch('/api/vocab', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
  toggleVocab: (id: string) => fetch(`/api/vocab/${id}/toggle`, { method: 'PATCH' }).then(r => r.json()),
  deleteVocab: (id: string) => fetch(`/api/vocab/${id}`, { method: 'DELETE' }).then(r => r.json()),
  bulkVocab: (body: any[]) => fetch('/api/vocab/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
  
  getAffirmations: () => fetch('/api/affirmations').then(r => r.json()),
  addAffirmation: (body: any) => fetch('/api/affirmations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
  deleteAffirmation: (id: string) => fetch(`/api/affirmations/${id}`, { method: 'DELETE' }).then(r => r.json()),
};