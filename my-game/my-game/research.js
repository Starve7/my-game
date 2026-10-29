'use strict';

import { state } from './game.js';

export const CATEGORIES = [
  { id: 'production', name: '🏭 Производство' },
  { id: 'military', name: '⚔️ Военная промышленность' },
  { id: 'energy', name: '⚡ Энергия' },
  { id: 'liquid', name: '💧 Жидкость' },
];

export const TECHNOLOGIES = [
  // ================= ПРОИЗВОДСТВО =================
  // --- Корневые технологии ---
  { id: 'unlock_cutter', era: 1, cat: 'production', name: 'Резак', desc: '1 медная плита → 2 провода', studyPercent: 10, requires: [], effect: () => {} },
  { id: 'unlock_logistics', era: 1, cat: 'production', name: 'Логистика', desc: 'Базовые манипуляторы и распределители', studyPercent: 15, requires: [], effect: () => {} },
  // TODO: УДАЛИТЬ_ЗАГЛУШКУ
  { id: 'unlock_sawmill', isStub: true, era: 1, cat: 'production', name: 'Лесопильный комбинат', desc: 'Доски, брусья', studyPercent: 15, requires: [], effect: () => {} },

  // --- Ветка Логистики ---
  // TODO: УДАЛИТЬ_ЗАГЛУШКУ
  { id: 'unlock_fast_inserter', isStub: true, era: 1, cat: 'production', name: 'Быстрый манипулятор', desc: 'Скорость переноса х2', studyPercent: 25, requires: ['unlock_logistics'], effect: () => {} },
  // TODO: УДАЛИТЬ_ЗАГЛУШКУ
  { id: 'unlock_filtering_inserter', isStub: true, era: 1, cat: 'production', name: 'Фильтрующий манипулятор', desc: 'Берет только выбранный предмет', studyPercent: 40, requires: ['unlock_logistics'], effect: () => {} },

  // --- Ветка Резака и Сборки ---
  { id: 'unlock_assembler', era: 1, cat: 'production', name: 'Сборщик', desc: 'Шестерни, корпуса, схемы', studyPercent: 30, requires: ['unlock_cutter'], effect: () => { state.LIMITS.assembler = 3; } },
  { id: 'unlock_storage', era: 1, cat: 'production', name: 'Склад', desc: 'Хранилище на 500 предметов', studyPercent: 40, requires: ['unlock_cutter'], effect: () => {} },

  // От Сборщика идут 3 ветки:
  // 1. Прокатный стан
  // TODO: УДАЛИТЬ_ЗАГЛУШКУ
  { id: 'unlock_rolling_mill', isStub: true, era: 1, cat: 'production', name: 'Прокатный стан', desc: 'Прутки, балки', studyPercent: 40, requires: ['unlock_assembler'], effect: () => {} },
  // 2. Химзавод (убрали стекло)
  { id: 'unlock_chemplant', era: 1, cat: 'production', name: 'Химзавод', desc: 'Производство пороха', studyPercent: 55, requires: ['unlock_assembler'], effect: () => {} },
  // 3. Проволочный завод
  // TODO: УДАЛИТЬ_ЗАГЛУШКУ
  { id: 'unlock_wire_factory', isStub: true, era: 1, cat: 'production', name: 'Проволочный завод', desc: 'Проволока, тросы, сетка', studyPercent: 45, requires: ['unlock_assembler'], effect: () => {} },

  // Дальнейшая цепочка от Прокатного стана
  // TODO: УДАЛИТЬ_ЗАГЛУШКУ
  { id: 'unlock_fastener_factory', isStub: true, era: 1, cat: 'production', name: 'Метизный завод', desc: 'Болты, гайки, заклёпки', studyPercent: 45, requires: ['unlock_rolling_mill'], effect: () => {} },
  // TODO: УДАЛИТЬ_ЗАГЛУШКУ
  { id: 'unlock_mechanical_factory', isStub: true, era: 1, cat: 'production', name: 'Механический завод', desc: 'Валы, подшипники, редукторы', studyPercent: 60, requires: ['unlock_fastener_factory'], effect: () => {} },
  // TODO: УДАЛИТЬ_ЗАГЛУШКУ
  { id: 'unlock_assembly_plant', isStub: true, era: 1, cat: 'production', name: 'Сборочный завод', desc: 'Рамы, корпуса, двигатели', studyPercent: 75, requires: ['unlock_mechanical_factory'], effect: () => {} },
  // TODO: УДАЛИТЬ_ЗАГЛУШКУ
  { id: 'unlock_advanced_coal_mine', isStub: true, era: 1, cat: 'production', name: 'Продвинутый угольный бур', desc: 'Добывает в 2 раза быстрее', studyPercent: 70, requires: ['unlock_mechanical_factory'], effect: () => {} },

  // --- Ветка Стройки (от Лесопилки) ---
  // TODO: УДАЛИТЬ_ЗАГЛУШКУ
  { id: 'unlock_textile_factory', isStub: true, era: 1, cat: 'production', name: 'Текстильная фабрика', desc: 'Ткань, канаты, ремни', studyPercent: 30, requires: ['unlock_sawmill'], effect: () => {} },
  // TODO: УДАЛИТЬ_ЗАГЛУШКУ
  { id: 'unlock_crusher', isStub: true, era: 1, cat: 'production', name: 'Дробильный завод', desc: 'Щебень, песок, гравий', studyPercent: 25, requires: ['unlock_sawmill'], effect: () => {} },

  // От Дробильного завода:
  // TODO: УДАЛИТЬ_ЗАГЛУШКУ
  { id: 'unlock_glass_factory', isStub: true, era: 1, cat: 'production', name: 'Стеклозавод', desc: 'Стекло', studyPercent: 35, requires: ['unlock_crusher'], effect: () => {} },
  // TODO: УДАЛИТЬ_ЗАГЛУШКУ
  { id: 'unlock_brick_factory', isStub: true, era: 1, cat: 'production', name: 'Кирпичный завод', desc: 'Кирпич, плитка', studyPercent: 35, requires: ['unlock_crusher'], effect: () => {} },

  // От Кирпичного завода:
  // TODO: УДАЛИТЬ_ЗАГЛУШКУ
  { id: 'unlock_brick_furnace', isStub: true, era: 1, cat: 'production', name: 'Кирпичная печь', desc: 'Плавит быстрее обычной', studyPercent: 50, requires: ['unlock_brick_factory'], effect: () => {} },
  // TODO: УДАЛИТЬ_ЗАГЛУШКУ
  { id: 'unlock_concrete_factory', isStub: true, era: 1, cat: 'production', name: 'Бетонный завод', desc: 'Блоки, плиты, панели', studyPercent: 50, requires: ['unlock_brick_factory'], effect: () => {} },

  // От Кирпичной печи:
  // TODO: УДАЛИТЬ_ЗАГЛУШКУ
  { id: 'unlock_steel_furnace', isStub: true, era: 1, cat: 'production', name: 'Сталелитейная печь', desc: 'Плавит сталь', studyPercent: 80, requires: ['unlock_brick_furnace'], effect: () => {} },

  // От Бетонного завода:
  // TODO: УДАЛИТЬ_ЗАГЛУШКУ
  { id: 'unlock_pipe_factory', isStub: true, era: 1, cat: 'production', name: 'Трубный завод', desc: 'Трубы, профили. Открывает Жидкости.', studyPercent: 85, requires: ['unlock_concrete_factory', 'unlock_wire_factory'], effect: () => {} },

  // ================= ВОЕННАЯ ПРОМЫШЛЕННОСТЬ =================
  // TODO: УДАЛИТЬ_ЗАГЛУШКУ
  { id: 'unlock_stone_walls', isStub: true, era: 1, cat: 'military', name: 'Каменные стены', desc: 'Защита от монстров', studyPercent: 20, requires: ['unlock_brick_factory'], effect: () => {} },
  // TODO: УДАЛИТЬ_ЗАГЛУШКУ
  { id: 'unlock_basic_ammo', isStub: true, era: 1, cat: 'military', name: 'Патроны (базовые)', desc: 'Боеприпасы для турелей', studyPercent: 30, requires: ['unlock_fastener_factory'], effect: () => {} },
  // TODO: УДАЛИТЬ_ЗАГЛУШКУ
  { id: 'unlock_powder_tech', isStub: true, era: 1, cat: 'military', name: 'Порох', desc: 'Основа для боеприпасов', studyPercent: 35, requires: ['unlock_chemplant'], effect: () => {} },
  
  // TODO: УДАЛИТЬ_ЗАГЛУШКУ
  { id: 'unlock_mg_turret', isStub: true, era: 1, cat: 'military', name: 'Пулемётная турель', desc: 'Стреляет простыми патронами', studyPercent: 45, requires: ['unlock_mechanical_factory', 'unlock_basic_ammo', 'unlock_powder_tech'], effect: () => {} },

  // TODO: УДАЛИТЬ_ЗАГЛУШКУ
  { id: 'unlock_artillery_shells', isStub: true, era: 1, cat: 'military', name: 'Артиллерийские снаряды', desc: 'Для тяжелых орудий', studyPercent: 60, requires: ['unlock_rolling_mill', 'unlock_powder_tech'], effect: () => {} },
  // TODO: УДАЛИТЬ_ЗАГЛУШКУ
  { id: 'unlock_artillery', isStub: true, era: 1, cat: 'military', name: 'Артиллерийская установка', desc: 'Дальний обстрел', studyPercent: 80, requires: ['unlock_artillery_shells'], effect: () => {} },
  // TODO: УДАЛИТЬ_ЗАГЛУШКУ
  { id: 'unlock_dumb_rockets', isStub: true, era: 1, cat: 'military', name: 'Неуправляемые ракеты', desc: 'Слабые ракеты по площади', studyPercent: 100, requires: ['unlock_artillery_shells', 'unlock_artillery'], effect: () => {} },

  // TODO: УДАЛИТЬ_ЗАГЛУШКУ
  { id: 'unlock_flamethrower_turret', isStub: true, era: 1, cat: 'military', name: 'Огнемётная турель', desc: 'Сжигает врагов вблизи', studyPercent: 70, requires: ['unlock_pipe_factory', 'unlock_mechanical_factory'], effect: () => {} },

  // ================= ЭНЕРГИЯ =================
  // --- Ветка Генерации ---
  // TODO: УДАЛИТЬ_ЗАГЛУШКУ
  { id: 'unlock_coal_generator', isStub: true, era: 1, cat: 'energy', name: 'Угольный генератор', desc: 'Выработка энергии сжиганием угля', studyPercent: 25, requires: ['unlock_mechanical_factory'], effect: () => {} },
  // TODO: УДАЛИТЬ_ЗАГЛУШКУ
  { id: 'unlock_steam_generator', isStub: true, era: 1, cat: 'energy', name: 'Паровой генератор', desc: 'Требует воду и уголь', studyPercent: 50, requires: ['unlock_coal_generator', 'unlock_pipe_factory'], effect: () => {} },
  // TODO: УДАЛИТЬ_ЗАГЛУШКУ
  { id: 'unlock_diesel_generator', isStub: true, era: 1, cat: 'energy', name: 'Дизель-генератор', desc: 'Сжигает жидкое топливо (мазут/солярку)', studyPercent: 80, requires: ['unlock_oil_derrick', 'unlock_assembly_plant'], effect: () => {} },

  // --- Ветка Передачи ---
  // TODO: УДАЛИТЬ_ЗАГЛУШКУ
  { id: 'unlock_copper_cables', isStub: true, era: 1, cat: 'energy', name: 'Медные кабели', desc: 'Передача энергии', studyPercent: 15, requires: ['unlock_cutter'], effect: () => {} },
  // TODO: УДАЛИТЬ_ЗАГЛУШКУ
  { id: 'unlock_wooden_power_lines', isStub: true, era: 1, cat: 'energy', name: 'Деревянный ЛЭП', desc: 'Дальняя передача энергии', studyPercent: 25, requires: ['unlock_copper_cables', 'unlock_sawmill'], effect: () => {} },

  // --- Ветка Хранения ---
  // TODO: УДАЛИТЬ_ЗАГЛУШКУ
  { id: 'unlock_weak_battery', isStub: true, era: 1, cat: 'energy', name: 'Слабый аккумулятор', desc: 'Запас энергии (малый)', studyPercent: 35, requires: ['unlock_copper_cables'], effect: () => {} },
  // TODO: УДАЛИТЬ_ЗАГЛУШКУ
  { id: 'unlock_improved_battery', isStub: true, era: 1, cat: 'energy', name: 'Улучшенный аккумулятор', desc: 'Запас энергии (большой)', studyPercent: 90, requires: ['unlock_weak_battery', 'unlock_assembly_plant'], effect: () => {} },

  // ================= ЖИДКОСТИ =================
  // --- Ветка Генерации (Добыча и переработка) ---
  // TODO: УДАЛИТЬ_ЗАГЛУШКУ
  { id: 'unlock_water_pump', isStub: true, era: 1, cat: 'liquid', name: 'Водяной насос', desc: 'Качает воду для паровых двигателей', studyPercent: 25, requires: ['unlock_mechanical_factory'], effect: () => {} },
  // TODO: УДАЛИТЬ_ЗАГЛУШКУ
  { id: 'unlock_oil_derrick', isStub: true, era: 1, cat: 'liquid', name: 'Нефтяная вышка', desc: 'Качает сырую нефть из под земли', studyPercent: 40, requires: ['unlock_water_pump', 'unlock_assembly_plant'], effect: () => {} },
  // TODO: УДАЛИТЬ_ЗАГЛУШКУ
  { id: 'unlock_basic_oil_refining', isStub: true, era: 1, cat: 'liquid', name: 'Базовая нефтепереработка', desc: 'Делит нефть на мазут и солярку', studyPercent: 60, requires: ['unlock_oil_derrick'], effect: () => {} },
  // TODO: УДАЛИТЬ_ЗАГЛУШКУ
  { id: 'unlock_rough_water_treatment', isStub: true, era: 1, cat: 'liquid', name: 'Очистка воды (грубая)', desc: 'Фильтрует воду от грязи для котлов', studyPercent: 35, requires: ['unlock_wire_factory'], effect: () => {} },

  // --- Ветка Транспортировки ---
  // TODO: УДАЛИТЬ_ЗАГЛУШКУ
  { id: 'unlock_steel_pipes', isStub: true, era: 1, cat: 'liquid', name: 'Стальные трубы', desc: 'Прочные трубы для жидкостей', studyPercent: 50, requires: ['unlock_pipe_factory'], effect: () => {} },
  // TODO: УДАЛИТЬ_ЗАГЛУШКУ
  { id: 'unlock_mech_pump', isStub: true, era: 1, cat: 'liquid', name: 'Механический насос', desc: 'Толкает жидкость (увеличивает дальность)', studyPercent: 45, requires: ['unlock_mechanical_factory'], effect: () => {} },

  // --- Ветка Хранения ---
  // TODO: УДАЛИТЬ_ЗАГЛУШКУ
  { id: 'unlock_steel_tank', isStub: true, era: 1, cat: 'liquid', name: 'Стальной резервуар', desc: 'Бочка гигант для жидкостей', studyPercent: 55, requires: ['unlock_steel_furnace'], effect: () => {} },
];

const STUDY_TICK = 2, STUDY_PERCENT_PER_DNA = 0.5;

export function isTechOwned(id) { return state.techState[id] === true; }

export function canSelectTech(id) {
  const t = TECHNOLOGIES.find(x => x.id === id);
  if (!t || isTechOwned(id) || t.isStub) return false;
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
  if (type === 'turret') return isTechOwned('unlock_mg_turret');
  return true;
}

export function hasAvailableResearch() {
  if (state.activeStudyTechId) return false;
  return TECHNOLOGIES.some(t => !t.isStub && canSelectTech(t.id));
}

console.debug('[research] loaded');