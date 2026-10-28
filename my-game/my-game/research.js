'use strict';
import { state } from './game.js';

export const RESEARCH_TABS = [
  { id: 'industry', name: '🏭 Индустрия' },
  { id: 'military', name: '⚔️ Военная промышленность' },
  { id: 'research', name: '🧬 Исследования', empty: 'Улучшения лабораторий и новые науки — скоро' },
  { id: 'energy', name: '⚡ Энергетика', empty: 'Генераторы, линии электропередач — скоро' },
  { id: 'upgrades', name: '🔧 Улучшения' },
];
export const BRANCHES = {
  industry: [
    { id: 'production', name: '🏭 Производство' },
    { id: 'logistics', name: '📦 Логистика' },
    { id: 'storage', name: '📦 Хранение' }
  ],
  military: [{ id: 'defense', name: '🛡 Оборона' }],
  upgrades: [{ id: 'mining', name: '⛏ Добыча' }, { id: 'smelting', name: '🔥 Плавка' }, { id: 'research', name: '🧬 Лаборатория' }, { id: 'core', name: '💎 Ядро' }, { id: 'assembly', name: '🔧 Расширение' }],
};
export let activeResearchTab = 'industry';
export function setActiveResearchTab(tab) { activeResearchTab = tab; }

export const TECHNOLOGIES = [
  { id: 'unlock_cutter', tab: 'industry', branch: 'production', name: 'Резак', desc: '1 медная плита → 2 провода', studyPercent: 5, requires: [], effect: () => {} },
  { id: 'unlock_assembler', tab: 'industry', branch: 'production', name: 'Сборщик', desc: 'Шестерни, корпуса, схемы, двигатели, патроны', studyPercent: 15, requires: ['unlock_cutter'], effect: () => { state.LIMITS.assembler = 3; } },
  { id: 'unlock_chemplant', tab: 'industry', branch: 'production', name: 'Химзавод', desc: 'Производство пороха', studyPercent: 30, requires: ['unlock_assembler'], effect: () => {} },
  
  { id: 'unlock_logistics', tab: 'industry', branch: 'logistics', name: 'Продвинутая логистика', desc: 'Распределители и подземные конвейеры', studyPercent: 15, requires: [], effect: () => {} },

  { id: 'unlock_storage', tab: 'industry', branch: 'storage', name: 'Склад', desc: 'Хранилище на 500 предметов', studyPercent: 10, requires: [], effect: () => {} },
  { id: 'unlock_turret', tab: 'military', branch: 'defense', name: 'Турель', desc: 'Авто-атака монстров в радиусе 4 тайлов', studyPercent: 40, requires: ['unlock_assembler'], effect: () => {} },
  { id: 'mine_limit_1', tab: 'upgrades', branch: 'mining', name: 'Расширение шахт I', desc: 'Лимит буров +5', studyPercent: 5, requires: [], effect: () => { state.LIMITS.mine += 5; } },
  { id: 'mine_limit_2', tab: 'upgrades', branch: 'mining', name: 'Расширение шахт II', desc: 'Лимит буров +10', studyPercent: 15, requires: ['mine_limit_1'], effect: () => { state.LIMITS.mine += 10; } },
  { id: 'mine_speed_1', tab: 'upgrades', branch: 'mining', name: 'Быстрые буры I', desc: 'Скорость добычи +25%', studyPercent: 12, requires: ['mine_limit_1'], effect: () => { state.miningSpeedMult *= 1.25; } },
  { id: 'mine_speed_2', tab: 'upgrades', branch: 'mining', name: 'Быстрые буры II', desc: 'Скорость добычи ещё +25%', studyPercent: 30, requires: ['mine_speed_1'], effect: () => { state.miningSpeedMult *= 1.25; } },
  { id: 'furnace_limit_1', tab: 'upgrades', branch: 'smelting', name: 'Расширение печей I', desc: 'Лимит печей +2', studyPercent: 8, requires: [], effect: () => { state.LIMITS.furnace += 2; } },
  { id: 'furnace_limit_2', tab: 'upgrades', branch: 'smelting', name: 'Расширение печей II', desc: 'Лимит печей +4', studyPercent: 22, requires: ['furnace_limit_1'], effect: () => { state.LIMITS.furnace += 4; } },
  { id: 'lab_limit_1', tab: 'upgrades', branch: 'research', name: 'Доп. лаборатория', desc: 'Лимит лабораторий +1', studyPercent: 10, requires: [], effect: () => { state.LIMITS.lab += 1; } },
  { id: 'lab_speed_1', tab: 'upgrades', branch: 'research', name: 'Быстрые исследования I', desc: 'Скорость лабораторий +50%', studyPercent: 15, requires: [], effect: () => { state.labSpeedMult *= 1.5; } },
  { id: 'lab_speed_2', tab: 'upgrades', branch: 'research', name: 'Быстрые исследования II', desc: 'Скорость лабораторий ещё +50%', studyPercent: 40, requires: ['lab_speed_1'], effect: () => { state.labSpeedMult *= 1.5; } },
  { id: 'core_damage_1', tab: 'upgrades', branch: 'core', name: 'Усиленное ядро I', desc: 'Урон атаки ядра +1', studyPercent: 10, requires: [], effect: () => { state.coreDamageBonus += 1; } },
  { id: 'core_damage_2', tab: 'upgrades', branch: 'core', name: 'Усиленное ядро II', desc: 'Урон атаки ядра ещё +1', studyPercent: 25, requires: ['core_damage_1'], effect: () => { state.coreDamageBonus += 1; } },
  { id: 'core_damage_3', tab: 'upgrades', branch: 'core', name: 'Усиленное ядро III', desc: 'Урон атаки ядра ещё +1', studyPercent: 60, requires: ['core_damage_2'], effect: () => { state.coreDamageBonus += 1; } },
  { id: 'assembler_limit_1', tab: 'upgrades', branch: 'assembly', name: 'Больше сборщиков', desc: 'Лимит сборщиков +1', studyPercent: 18, requires: ['unlock_assembler'], effect: () => { state.LIMITS.assembler += 1; } },
  { id: 'turret_limit_1', tab: 'upgrades', branch: 'assembly', name: 'Больше турелей', desc: 'Лимит турелей +4', studyPercent: 30, requires: ['unlock_turret'], effect: () => { state.LIMITS.turret += 4; } },
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