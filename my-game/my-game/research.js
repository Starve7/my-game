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
  // ================= ПРОИЗВОДСТВО =================
  // --- Базовые (уже есть в игре) ---
  { id: 'unlock_cutter', era: 1, cat: 'production', name: 'Резак', desc: '1 медная плита → 2 провода', studyPercent: 10, requires: [], effect: () => {} },
  { id: 'unlock_logistics', era: 1, cat: 'production', name: 'Логистика', desc: 'Распределители и подземки', studyPercent: 15, requires: [], effect: () => {} },
  { id: 'unlock_assembler', era: 1, cat: 'production', name: 'Сборщик', desc: 'Шестерни, корпуса, схемы', studyPercent: 30, requires: ['unlock_cutter'], effect: () => { state.LIMITS.assembler = 3; } },
  { id: 'unlock_storage', era: 1, cat: 'production', name: 'Склад', desc: 'Хранилище на 500 предметов', studyPercent: 40, requires: ['unlock_assembler'], effect: () => {} },
  { id: 'unlock_chemplant', era: 1, cat: 'production', name: 'Химзавод', desc: 'Производство пороха', studyPercent: 50, requires: ['unlock_assembler'], effect: () => {} },

  // --- Эволюция добычи и плавки ---
  // TODO: УДАЛИТЬ_ЗАГЛУШКУ
  { id: 'unlock_advanced_coal_mine', isStub: true, era: 1, cat: 'production', name: 'Продвинутый угольный бур', desc: 'Добывает в 2 раза быстрее', studyPercent: 25, requires: ['unlock_cutter'], effect: () => {} },
  // TODO: УДАЛИТЬ_ЗАГЛУШКУ
  { id: 'unlock_stone_furnace', isStub: true, era: 1, cat: 'production', name: 'Каменная печь', desc: 'Плавит быстрее обычной', studyPercent: 20, requires: ['unlock_advanced_coal_mine'], effect: () => {} },
  // TODO: УДАЛИТЬ_ЗАГЛУШКУ
  { id: 'unlock_brick_furnace', isStub: true, era: 1, cat: 'production', name: 'Кирпичная печь', desc: 'Плавит быстрее каменной', studyPercent: 40, requires: ['unlock_brick_factory'], effect: () => {} },
  // TODO: УДАЛИТЬ_ЗАГЛУШКУ
  { id: 'unlock_steel_furnace', isStub: true, era: 1, cat: 'production', name: 'Сталелитейная печь', desc: 'Плавит сталь', studyPercent: 60, requires: ['unlock_brick_furnace'], effect: () => {} },

  // --- Ветка "Стройка" ---
  // TODO: УДАЛИТЬ_ЗАГЛУШКУ
  { id: 'unlock_sawmill', isStub: true, era: 1, cat: 'production', name: 'Лесопильный комбинат', desc: 'Доски, брусья', studyPercent: 15, requires: ['unlock_logistics'], effect: () => {} },
  // TODO: УДАЛИТЬ_ЗАГЛУШКУ
  { id: 'unlock_crusher', isStub: true, era: 1, cat: 'production', name: 'Дробильный завод', desc: 'Щебень, песок, гравий, балласт', studyPercent: 20, requires: ['unlock_sawmill'], effect: () => {} },
  // TODO: УДАЛИТЬ_ЗАГЛУШКУ
  { id: 'unlock_brick_factory', isStub: true, era: 1, cat: 'production', name: 'Кирпичный завод', desc: 'Кирпич, плитка', studyPercent: 30, requires: ['unlock_crusher'], effect: () => {} },
  // TODO: УДАЛИТЬ_ЗАГЛУШКУ
  { id: 'unlock_concrete_factory', isStub: true, era: 1, cat: 'production', name: 'Бетонный завод', desc: 'Блоки, плиты, армированные панели', studyPercent: 45, requires: ['unlock_brick_factory'], effect: () => {} },

  // --- Ветка "Металлургия и Машиностроение" ---
  // TODO: УДАЛИТЬ_ЗАГЛУШКУ
  { id: 'unlock_glass_factory', isStub: true, era: 1, cat: 'production', name: 'Стеклозавод', desc: 'Стекло', studyPercent: 35, requires: ['unlock_crusher'], effect: () => {} },
  // TODO: УДАЛИТЬ_ЗАГЛУШКУ
  { id: 'unlock_rolling_mill', isStub: true, era: 1, cat: 'production', name: 'Прокатный стан', desc: 'Прутки, балки', studyPercent: 35, requires: ['unlock_assembler'], effect: () => {} },
  // TODO: УДАЛИТЬ_ЗАГЛУШКУ
  { id: 'unlock_fastener_factory', isStub: true, era: 1, cat: 'production', name: 'Метизный завод', desc: 'Болты, гайки, шайбы, заклёпки', studyPercent: 45, requires: ['unlock_rolling_mill'], effect: () => {} },
  // TODO: УДАЛИТЬ_ЗАГЛУШКУ
  { id: 'unlock_mechanical_factory', isStub: true, era: 1, cat: 'production', name: 'Механический завод', desc: 'Валы, подшипники, редукторы', studyPercent: 55, requires: ['unlock_fastener_factory'], effect: () => {} },
  // TODO: УДАЛИТЬ_ЗАГЛУШКУ
  { id: 'unlock_assembly_plant', isStub: true, era: 1, cat: 'production', name: 'Сборочный завод', desc: 'Рамы, корпуса, каркасы, двигатель', studyPercent: 70, requires: ['unlock_mechanical_factory'], effect: () => {} },

  // --- Ветка "Легкая промышленность" ---
  // TODO: УДАЛИТЬ_ЗАГЛУШКУ
  { id: 'unlock_textile_factory', isStub: true, era: 1, cat: 'production', name: 'Текстильная фабрика', desc: 'Ткань, канаты, ремни', studyPercent: 30, requires: ['unlock_sawmill'], effect: () => {} },
  // TODO: УДАЛИТЬ_ЗАГЛУШКУ
  { id: 'unlock_wire_factory', isStub: true, era: 1, cat: 'production', name: 'Проволочный завод', desc: 'Проволока, тросы, сетка', studyPercent: 40, requires: ['unlock_rolling_mill'], effect: () => {} },
  
  // --- Ветка "Трубы (связь с жидкостями)" ---
  // TODO: УДАЛИТЬ_ЗАГЛУШКУ
  { id: 'unlock_pipe_factory', isStub: true, era: 1, cat: 'production', name: 'Трубный завод', desc: 'Трубы, профили, фитинги. Открывает ветку Жидкостей.', studyPercent: 65, requires: ['unlock_wire_factory', 'unlock_concrete_factory'], effect: () => {} },
];

const STUDY_TICK = 2, STUDY_PERCENT_PER_DNA = 0.5;

export function isTechOwned(id) { return state.techState[id] === true; }

export function canSelectTech(id) {
  const t = TECHNOLOGIES.find(x => x.id === id);
  if (!t || isTechOwned(id) || t.isStub) return false; // Заглушки нельзя изучать
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
  // Если есть доступные для изучения (не заглушки) - показываем значок
  return TECHNOLOGIES.some(t => !t.isStub && canSelectTech(t.id));
}

console.debug('[research] loaded');