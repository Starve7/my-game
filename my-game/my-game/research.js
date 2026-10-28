'use strict';

import { state } from './game.js';

export const RESEARCH_TABS = [
  { id: 'industry', name: '🏭 Индустрия' },
  { id: 'military', name: '⚔️ Военная промышленность' },
  { id: 'energy', name: '⚡ Энергетика' },
  { id: 'upgrades', name: '🔧 Улучшения' },
];

export const BRANCHES = {
  industry: [
    { id: 'press', name: '⚙️ Пресс' },
    { id: 'cutter', name: '✂️ Резак' },
    { id: 'assembler', name: '🤖 Сборщик' },
    { id: 'chem', name: '🧪 Химия' },
    { id: 'logistics', name: '📦 Логистика' },
  ],
  military: [
    { id: 'defense', name: '🛡 Оборона' },
    { id: 'ballistics', name: '🚀 Баллистика' },
    { id: 'special', name: '☣️ Спецоружие' },
  ],
  energy: [
    { id: 'generators', name: '🔥 Генераторы' },
    { id: 'storage', name: '🔋 Хранилища' },
    { id: 'wires', name: '⚡ Сеть' },
  ],
  upgrades: [
    { id: 'mining', name: '⛏ Добыча' },
    { id: 'smelting', name: '🔥 Плавка' },
    { id: 'research', name: '🧬 Лаборатория' },
    { id: 'core', name: '💎 Ядро' },
    { id: 'assembly', name: '🔧 Расширение' },
  ],
};

export let activeResearchTab = 'industry';
export function setActiveResearchTab(tab) { activeResearchTab = tab; }

export const TECHNOLOGIES = [
  // --- ЭПОХА I (Индустрия) ---
  { id: 'unlock_press', era: 1, tab: 'industry', branch: 'press', name: 'Пластины', desc: 'Прессование руды в плиты', studyPercent: 5, requires: [], effect: () => {} },
  { id: 'unlock_cutter', era: 1, tab: 'industry', branch: 'cutter', name: 'Провода', desc: '1 медная плита → 2 провода', studyPercent: 10, requires: ['unlock_press'], effect: () => {} },
  { id: 'unlock_logistics', era: 1, tab: 'industry', branch: 'logistics', name: 'Распределители', desc: 'Распределители и подземные конвейеры', studyPercent: 15, requires: [], effect: () => {} },
  
  // --- ЭПОХА II (Индустрия) ---
  { id: 'unlock_assembler', era: 2, tab: 'industry', branch: 'assembler', name: 'Сборщик', desc: 'Шестерни, корпуса, схемы', studyPercent: 30, requires: ['unlock_cutter'], effect: () => { state.LIMITS.assembler = 3; } },
  { id: 'unlock_chemplant', era: 2, tab: 'industry', branch: 'chem', name: 'Химзавод', desc: 'Производство пороха', studyPercent: 40, requires: ['unlock_assembler'], effect: () => {} },

  // --- ВОЕННЫЕ ---
  { id: 'unlock_turret', era: 1, tab: 'military', branch: 'defense', name: 'Турель', desc: 'Авто-атака монстров', studyPercent: 20, requires: ['unlock_assembler'], effect: () => {} },
  { id: 'unlock_walls', era: 2, tab: 'military', branch: 'defense', name: 'Стены', desc: 'Защитные укрепления', studyPercent: 30, requires: ['unlock_turret'], effect: () => {} },
  { id: 'unlock_rockets', era: 2, tab: 'military', branch: 'ballistics', name: 'Ракеты', desc: 'Уничтожение коконов на расстоянии', studyPercent: 50, requires: ['unlock_assembler'], effect: () => {} },

  // --- ЭНЕРГЕТИКА ---
  { id: 'unlock_generator', era: 2, tab: 'energy', branch: 'generators', name: 'Угольный генератор', desc: 'Выработка энергии', studyPercent: 20, requires: ['unlock_assembler'], effect: () => {} },

  // --- УЛУЧШЕНИЯ ---
  { id: 'mine_limit_1', era: 1, tab: 'upgrades', branch: 'mining', name: 'Расширение шахт I', desc: 'Лимит буров +5', studyPercent: 5, requires: [], effect: () => { state.LIMITS.mine += 5; } },
  { id: 'mine_speed_1', era: 1, tab: 'upgrades', branch: 'mining', name: 'Быстрые буры I', desc: 'Скорость добычи +25%', studyPercent: 10, requires: ['mine_limit_1'], effect: () => { state.miningSpeedMult *= 1.25; } },
  { id: 'furnace_limit_1', era: 1, tab: 'upgrades', branch: 'smelting', name: 'Расширение печей I', desc: 'Лимит печей +2', studyPercent: 8, requires: [], effect: () => { state.LIMITS.furnace += 2; } },
  { id: 'lab_limit_1', era: 1, tab: 'upgrades', branch: 'research', name: 'Доп. лаборатория', desc: 'Лимит лабораторий +1', studyPercent: 10, requires: [], effect: () => { state.LIMITS.lab += 1; } },
  { id: 'lab_speed_1', era: 1, tab: 'upgrades', branch: 'research', name: 'Быстрые исследования I', desc: 'Скорость лабораторий +50%', studyPercent: 15, requires: [], effect: () => { state.labSpeedMult *= 1.5; } },
  { id: 'core_damage_1', era: 1, tab: 'upgrades', branch: 'core', name: 'Усиленное ядро I', desc: 'Урон атаки ядра +1', studyPercent: 10, requires: [], effect: () => { state.coreDamageBonus += 1; } },
  { id: 'assembler_limit_1', era: 2, tab: 'upgrades', branch: 'assembly', name: 'Больше сборщиков', desc: 'Лимит сборщиков +1', studyPercent: 18, requires: ['unlock_assembler'], effect: () => { state.LIMITS.assembler += 1; } },
];

const STUDY_TICK = 2, STUDY_PERCENT_PER_DNA = 0.5;

export function isTechOwned(id) { return state.techState[id] === true; }

export function canSelectTech(id) {
  const t = TECHNOLOGIES.find(x => x.id === id);
  if (!t || isTechOwned(id)) return false;
  for (const req of t.requires) if (!isTechOwned(req)) return false;
  return true;
}

export function selectStudyTech(id) {
  if (!canSelectTech(id)) return false;
  state.activeStudyTechId = id; state.studyTickTimer = 0; return true;
}

export function cancelStudy() { state.activeStudyTechId = null; state.studyTickTimer = 0; }

export function getTechProgress(id) { return state.studyProgressByTech[id] || 0; }

export function getTechProgressPct(id) {
  const t = TECHNOLOGIES.find(x => x.id === id);
  if (!t) return 0;
  return Math.min(100, (getTechProgress(id) / t.studyPercent) * 100);
}

export function updateStudy(dt) {
  if (!state.activeStudyTechId) { state.studyTickTimer = 0; return; }
  if (state.dna < 1) { state.studyTickTimer = 0; return; }
  state.studyTickTimer += dt;
  while (state.studyTickTimer >= STUDY_TICK && state.dna >= 1) {
    state.studyTickTimer -= STUDY_TICK; state.dna -= 1;
    const cur = getTechProgress(state.activeStudyTechId);
    const next = cur + STUDY_PERCENT_PER_DNA;
    state.studyProgressByTech[state.activeStudyTechId] = next;
    const tech = TECHNOLOGIES.find(t => t.id === state.activeStudyTechId);
    if (tech && next >= tech.studyPercent) {
      state.techState[tech.id] = true; tech.effect();
      delete state.studyProgressByTech[tech.id]; state.activeStudyTechId = null;
      if (typeof window !== 'undefined' && window.__showToast) window.__showToast(`✓ Изучено: ${tech.name}`);
      break;
    }
  }
}

export function getTechsForTab(tabId) { return TECHNOLOGIES.filter(t => t.tab === tabId); }

export function isBuildingUnlocked(type) {
  if (type === 'mine' || type === 'furnace' || type === 'lab' || type === 'conveyor') return true;
  if (type === 'splitter' || type === 'underground') return isTechOwned('unlock_logistics');
  if (type === 'cutter') return isTechOwned('unlock_cutter');
  if (type === 'assembler') return isTechOwned('unlock_assembler');
  if (type === 'chemplant') return isTechOwned('unlock_chemplant');
  if (type === 'storage') return isTechOwned('unlock_storage');
  if (type === 'turret') return isTechOwned('unlock_turret');
  return true;
}

export function hasAvailableResearch() {
  if (state.activeStudyTechId) return false;
  return TECHNOLOGIES.some(t => canSelectTech(t.id));
}

console.debug('[research] loaded');