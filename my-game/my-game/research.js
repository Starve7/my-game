'use strict';

import { state } from './game.js';

// 4 колонки-категории
export const CATEGORIES = [
  { id: 'production', name: '🏭 Производство' },
  { id: 'military', name: '⚔️ Военная промышленность' },
  { id: 'energy', name: '⚡ Энергия' },
  { id: 'liquid', name: '💧 Жидкость' },
];

export const TECHNOLOGIES = [
  // --- ПРОИЗВОДСТВО ---
  { id: 'unlock_cutter', era: 1, cat: 'production', name: 'Резак', desc: '1 медная плита → 2 провода', studyPercent: 10, requires: [], effect: () => {} },
  { id: 'unlock_logistics', era: 1, cat: 'production', name: 'Логистика', desc: 'Распределители и подземки', studyPercent: 15, requires: [], effect: () => {} },
  { id: 'unlock_assembler', era: 1, cat: 'production', name: 'Сборщик', desc: 'Шестерни, корпуса, схемы', studyPercent: 30, requires: ['unlock_cutter'], effect: () => { state.LIMITS.assembler = 3; } },
  { id: 'unlock_storage', era: 1, cat: 'production', name: 'Склад', desc: 'Хранилище на 500 предметов', studyPercent: 40, requires: ['unlock_assembler'], effect: () => {} },
  { id: 'unlock_chemplant', era: 1, cat: 'production', name: 'Химзавод', desc: 'Производство пороха', studyPercent: 50, requires: ['unlock_assembler'], effect: () => {} },

  // --- ВОЕННАЯ ---
  { id: 'unlock_turret', era: 1, cat: 'military', name: 'Турель', desc: 'Авто-атака монстров', studyPercent: 25, requires: ['unlock_assembler'], effect: () => {} },
  { id: 'unlock_rockets', era: 1, cat: 'military', name: 'Ракеты', desc: 'Уничтожение коконов', studyPercent: 60, requires: ['unlock_turret'], effect: () => {} },

  // --- ЭНЕРГИЯ ---
  { id: 'unlock_generator', era: 1, cat: 'energy', name: 'Угольный генератор', desc: 'Выработка энергии', studyPercent: 35, requires: ['unlock_assembler'], effect: () => {} },

  // --- ЖИДКОСТЬ ---
  // Пока пусто
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