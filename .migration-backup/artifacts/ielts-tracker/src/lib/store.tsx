import React, { createContext, useContext, useEffect, useState } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';

export type Module = 'Reading' | 'Writing' | 'Speaking' | 'Listening' | 'Full Mock';

export interface Settings {
  name: string;
  examDate: string;
  targets: Record<string, number>;
  dailyGoal: number;
  darkMode: boolean;
}

export interface Score {
  id: string;
  date: string;
  module: Module;
  score: string;
  band: number;
  notes: string;
}

export interface StudySession {
  id: string;
  date: string;
  module: Module | 'Vocabulary' | 'Mixed';
  duration: number;
  activityType: string;
  well: string;
  improve: string;
}

export interface PracticeLog {
  id: string;
  date: string;
  typeId: string;
  score: number;
  total: number;
  notes: string;
}

export interface VocabWord {
  id: string;
  word: string;
  pos: string;
  definition: string;
  example: string;
  topic: string;
  known: boolean;
}

interface AppContextType {
  settings: Settings;
  setSettings: (settings: Settings) => void;
  scores: Score[];
  setScores: (scores: Score[]) => void;
  studySessions: StudySession[];
  setStudySessions: (sessions: StudySession[]) => void;
  practiceLogs: PracticeLog[];
  setPracticeLogs: (logs: PracticeLog[]) => void;
  vocabulary: VocabWord[];
  setVocabulary: (vocab: VocabWord[]) => void;
  favouriteAffirmations: string[];
  setFavouriteAffirmations: (favs: string[]) => void;
  triggerConfetti: () => void;
  showConfetti: boolean;
  resetAll: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

const DEFAULT_SETTINGS: Settings = {
  name: 'Student',
  examDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  targets: { Reading: 6.5, Writing: 6.5, Speaking: 6.0, Listening: 6.5 },
  dailyGoal: 30,
  darkMode: false,
};

const STARTER_WORDS: VocabWord[] = [
  { id: 'env-1', topic: 'Environment', word: 'biodiversity', pos: 'noun', definition: 'The variety of plant and animal life in the world or in a particular habitat.', example: 'The biodiversity of the rainforest is threatened by logging.', known: false },
  { id: 'env-2', topic: 'Environment', word: 'carbon footprint', pos: 'noun', definition: 'The amount of carbon dioxide released into the atmosphere as a result of the activities of a particular individual, organization, or community.', example: 'We can reduce our carbon footprint by using public transport.', known: false },
  { id: 'env-3', topic: 'Environment', word: 'deforestation', pos: 'noun', definition: 'The action of clearing a wide area of trees.', example: 'Deforestation is a major contributor to climate change.', known: false },
  { id: 'env-4', topic: 'Environment', word: 'emissions', pos: 'noun', definition: 'The production and discharge of something, especially gas or radiation.', example: 'Strict regulations were introduced to reduce greenhouse gas emissions.', known: false },
  { id: 'env-5', topic: 'Environment', word: 'ecosystem', pos: 'noun', definition: 'A biological community of interacting organisms and their physical environment.', example: 'Pollution can severely damage a fragile marine ecosystem.', known: false },
  { id: 'env-6', topic: 'Environment', word: 'renewable energy', pos: 'noun', definition: 'Energy from a source that is not depleted when used, such as wind or solar power.', example: 'Investment in renewable energy is crucial for a sustainable future.', known: false },
  { id: 'env-7', topic: 'Environment', word: 'sustainable', pos: 'adjective', definition: 'Able to be maintained at a certain rate or level.', example: 'We need to develop sustainable methods of agriculture.', known: false },
  { id: 'env-8', topic: 'Environment', word: 'climate change', pos: 'noun', definition: 'A change in global or regional climate patterns.', example: 'Climate change is causing more frequent extreme weather events.', known: false },
  { id: 'env-9', topic: 'Environment', word: 'contamination', pos: 'noun', definition: 'The action or state of making or being made impure by polluting or poisoning.', example: 'The contamination of the river killed thousands of fish.', known: false },
  { id: 'env-10', topic: 'Environment', word: 'conservation', pos: 'noun', definition: 'Preservation, protection, or restoration of the natural environment and of wildlife.', example: 'Wildlife conservation programs need more funding.', known: false },

  { id: 'tech-1', topic: 'Technology', word: 'artificial intelligence', pos: 'noun', definition: 'The theory and development of computer systems able to perform tasks normally requiring human intelligence.', example: 'Artificial intelligence is transforming the healthcare industry.', known: false },
  { id: 'tech-2', topic: 'Technology', word: 'automation', pos: 'noun', definition: 'The use or introduction of automatic equipment in a manufacturing or other process or facility.', example: 'Automation will lead to the loss of certain manual jobs.', known: false },
  { id: 'tech-3', topic: 'Technology', word: 'algorithm', pos: 'noun', definition: 'A process or set of rules to be followed in calculations or other problem-solving operations, especially by a computer.', example: 'The social media platform uses a complex algorithm to show content.', known: false },
  { id: 'tech-4', topic: 'Technology', word: 'innovation', pos: 'noun', definition: 'The action or process of innovating; a new method, idea, product, etc.', example: 'Technological innovation is key to economic growth.', known: false },
  { id: 'tech-5', topic: 'Technology', word: 'cybersecurity', pos: 'noun', definition: 'The state of being protected against the criminal or unauthorized use of electronic data.', example: 'Companies must invest in cybersecurity to protect customer data.', known: false },
  { id: 'tech-6', topic: 'Technology', word: 'digital divide', pos: 'noun', definition: 'The gulf between those who have ready access to computers and the internet, and those who do not.', example: 'The government aims to bridge the digital divide in rural areas.', known: false },
  { id: 'tech-7', topic: 'Technology', word: 'obsolete', pos: 'adjective', definition: 'No longer produced or used; out of date.', example: 'Smartphones have rendered many traditional cameras obsolete.', known: false },
  { id: 'tech-8', topic: 'Technology', word: 'infrastructure', pos: 'noun', definition: 'The basic physical and organizational structures and facilities needed for the operation of a society.', example: 'A strong IT infrastructure is necessary for remote work.', known: false },
  { id: 'tech-9', topic: 'Technology', word: 'surveillance', pos: 'noun', definition: 'Close observation, especially of a suspected spy or criminal.', example: 'Mass surveillance raises significant privacy concerns.', known: false },
  { id: 'tech-10', topic: 'Technology', word: 'biotechnology', pos: 'noun', definition: 'The exploitation of biological processes for industrial and other purposes.', example: 'Biotechnology has revolutionized the development of new medicines.', known: false },

  { id: 'health-1', topic: 'Health', word: 'epidemic', pos: 'noun', definition: 'A widespread occurrence of an infectious disease in a community at a particular time.', example: 'The city faced a severe flu epidemic last winter.', known: false },
  { id: 'health-2', topic: 'Health', word: 'chronic', pos: 'adjective', definition: 'Persisting for a long time or constantly recurring.', example: 'Chronic diseases like diabetes require long-term management.', known: false },
  { id: 'health-3', topic: 'Health', word: 'sedentary', pos: 'adjective', definition: 'Tending to spend much time seated; somewhat inactive.', example: 'A sedentary lifestyle is a major risk factor for heart disease.', known: false },
  { id: 'health-4', topic: 'Health', word: 'mortality rate', pos: 'noun', definition: 'The number of deaths in a given area or period, or from a particular cause.', example: 'The infant mortality rate has decreased significantly in recent decades.', known: false },
  { id: 'health-5', topic: 'Health', word: 'nutrition', pos: 'noun', definition: 'The process of providing or obtaining the food necessary for health and growth.', example: 'Good nutrition is essential for a child\'s development.', known: false },
  { id: 'health-6', topic: 'Health', word: 'immunity', pos: 'noun', definition: 'The ability of an organism to resist a particular infection or toxin.', example: 'Vaccines stimulate the body\'s immune system to build immunity.', known: false },
  { id: 'health-7', topic: 'Health', word: 'obesity', pos: 'noun', definition: 'The condition of being grossly fat or overweight.', example: 'Childhood obesity is a growing problem in many developed nations.', known: false },
  { id: 'health-8', topic: 'Health', word: 'pandemic', pos: 'noun', definition: 'An outbreak of a disease prevalent over a whole country or the world.', example: 'The global pandemic forced widespread lockdowns.', known: false },
  { id: 'health-9', topic: 'Health', word: 'preventable', pos: 'adjective', definition: 'Able to be prevented or avoided.', example: 'Many chronic conditions are largely preventable through lifestyle changes.', known: false },
  { id: 'health-10', topic: 'Health', word: 'well-being', pos: 'noun', definition: 'The state of being comfortable, healthy, or happy.', example: 'Employers should care about the mental well-being of their staff.', known: false },

  { id: 'soc-1', topic: 'Society', word: 'urbanisation', pos: 'noun', definition: 'The process of making an area more urban.', example: 'Rapid urbanisation has led to severe housing shortages in cities.', known: false },
  { id: 'soc-2', topic: 'Society', word: 'inequality', pos: 'noun', definition: 'Difference in size, degree, circumstances, etc.; lack of equality.', example: 'Income inequality remains a pressing issue in modern society.', known: false },
  { id: 'soc-3', topic: 'Society', word: 'demographic', pos: 'noun', definition: 'A particular sector of a population.', example: 'The ageing demographic poses challenges for the healthcare system.', known: false },
  { id: 'soc-4', topic: 'Society', word: 'migration', pos: 'noun', definition: 'Movement of people to a new area or country in order to find work or better living conditions.', example: 'Economic hardship is a primary driver of mass migration.', known: false },
  { id: 'soc-5', topic: 'Society', word: 'cohesion', pos: 'noun', definition: 'The action or fact of forming a united whole.', example: 'Community projects help build social cohesion.', known: false },
  { id: 'soc-6', topic: 'Society', word: 'discrimination', pos: 'noun', definition: 'The unjust or prejudicial treatment of different categories of people.', example: 'Laws were passed to prevent discrimination in the workplace.', known: false },
  { id: 'soc-7', topic: 'Society', word: 'indigenous', pos: 'adjective', definition: 'Originating or occurring naturally in a particular place; native.', example: 'We must respect the land rights of indigenous populations.', known: false },
  { id: 'soc-8', topic: 'Society', word: 'stereotype', pos: 'noun', definition: 'A widely held but fixed and oversimplified image or idea of a particular type of person or thing.', example: 'Media representation often reinforces cultural stereotypes.', known: false },
  { id: 'soc-9', topic: 'Society', word: 'social mobility', pos: 'noun', definition: 'The movement of individuals, families, or groups through a system of social hierarchy.', example: 'Free education is a crucial engine for social mobility.', known: false },
  { id: 'soc-10', topic: 'Society', word: 'globalisation', pos: 'noun', definition: 'The process by which businesses or other organizations develop international influence or start operating on an international scale.', example: 'Globalisation has increased cultural exchange worldwide.', known: false },

  { id: 'hist-1', topic: 'History', word: 'civilisation', pos: 'noun', definition: 'The stage of human social and cultural development and organization that is considered most advanced.', example: 'The Indus Valley is one of the world\'s oldest civilisations.', known: false },
  { id: 'hist-2', topic: 'History', word: 'colonialism', pos: 'noun', definition: 'The policy or practice of acquiring full or partial political control over another country.', example: 'The impacts of colonialism are still felt in many nations today.', known: false },
  { id: 'hist-3', topic: 'History', word: 'dynasty', pos: 'noun', definition: 'A line of hereditary rulers of a country.', example: 'The Ming dynasty ruled China for nearly three centuries.', known: false },
  { id: 'hist-4', topic: 'History', word: 'excavation', pos: 'noun', definition: 'The action of excavating something, especially an archaeological site.', example: 'Recent excavations have revealed a Roman villa.', known: false },
  { id: 'hist-5', topic: 'History', word: 'imperialism', pos: 'noun', definition: 'A policy of extending a country\'s power and influence through colonization, use of military force, or other means.', example: 'British imperialism shaped global trade routes.', known: false },
  { id: 'hist-6', topic: 'History', word: 'archaeological', pos: 'adjective', definition: 'Relating to the study of human history and prehistory through the excavation of sites.', example: 'The team made a significant archaeological discovery.', known: false },
  { id: 'hist-7', topic: 'History', word: 'chronological', pos: 'adjective', definition: 'Starting with the earliest and following the order in which they occurred.', example: 'The events are presented in chronological order.', known: false },
  { id: 'hist-8', topic: 'History', word: 'decline', pos: 'noun', definition: 'A gradual and continuous loss of strength, numbers, quality, or value.', example: 'The historian studied the decline of the Roman Empire.', known: false },
  { id: 'hist-9', topic: 'History', word: 'revolution', pos: 'noun', definition: 'A forcible overthrow of a government or social order, in favour of a new system.', example: 'The Industrial Revolution transformed working practices.', known: false },
  { id: 'hist-10', topic: 'History', word: 'artefact', pos: 'noun', definition: 'An object made by a human being, typically one of cultural or historical interest.', example: 'The museum displays ancient Egyptian artefacts.', known: false }
];

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useLocalStorage<Settings>('ielts_settings', DEFAULT_SETTINGS);
  const [scores, setScores] = useLocalStorage<Score[]>('ielts_scores', []);
  const [studySessions, setStudySessions] = useLocalStorage<StudySession[]>('ielts_study', []);
  const [practiceLogs, setPracticeLogs] = useLocalStorage<PracticeLog[]>('ielts_practice', []);
  const [vocabulary, setVocabulary] = useLocalStorage<VocabWord[]>('ielts_vocab', STARTER_WORDS);
  const [favouriteAffirmations, setFavouriteAffirmations] = useLocalStorage<string[]>('ielts_affirmations', []);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.darkMode]);

  const triggerConfetti = () => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
  };

  const resetAll = () => {
    if (window.confirm("Are you sure you want to reset all data? This cannot be undone.")) {
      setSettings(DEFAULT_SETTINGS);
      setScores([]);
      setStudySessions([]);
      setPracticeLogs([]);
      setVocabulary(STARTER_WORDS);
      setFavouriteAffirmations([]);
    }
  };

  return (
    <AppContext.Provider value={{
      settings, setSettings,
      scores, setScores,
      studySessions, setStudySessions,
      practiceLogs, setPracticeLogs,
      vocabulary, setVocabulary,
      favouriteAffirmations, setFavouriteAffirmations,
      triggerConfetti, showConfetti,
      resetAll
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
