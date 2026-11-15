'use strict';

import { TILE, RES } from '../game.js';

export { 
  MINE_COST, 
  FURNACE_COST, 
  MINE_INTERVAL, 
  FURNACE_INTERVAL, 
  POLLUTION_PER_PLATE 
} from '../game.js';

export const CONVEYOR_COST = 3;
export const SPLITTER_COST = { iron: 8, plate_iron: 4 };
export const UNDERGROUND_COST = { iron: 6 };
export const RADAR_COST = { circuit: 5, corps: 2, plate_iron: 10 };
export const INSERTER_COST = { iron: 5, gear: 2, plate_iron: 5 };
export const CONVEYOR_SPEED = 1.5;
export const CONVEYOR_CAPACITY = 2; // Вместимость клетки (теперь это стек до 2 шт? Нет, оставим 2 клетки по 4)
export const MAX_STACK = 4; // НОВОЕ: стекирование предметов
export const FURNACE_BUFFER_MAX = 10;
export const FURNACE_OUTPUT_BUFFER_MAX = 5;
export const INPUT_BUFFER_MAX = 10;
export const STORAGE_CAPACITY = 500;

export const LAB_INTERVAL = 4.0;
export const LAB_IRON_COST = 10;
export const LAB_COPPER_COST = 10;
export const CUTTER_INTERVAL = 0.8;
export const CUTTER_IRON_COST = 15;
export const CUTTER_COPPER_COST = 5;
export const ASSEMBLER_IRON_COST = 20;
export const ASSEMBLER_COPPER_COST = 10;
export const CHEMPLANT_IRON_COST = 15;
export const CHEMPLANT_COPPER_COST = 15;
export const CHEMPLANT_WIRE_COST = 5;
export const STORAGE_IRON_COST = 30;
export const STORAGE_COPPER_COST = 10;

export const LUMBERJACK_COST = 10;
export const SAWMILL_IRON_COST = 20;
export const SAWMILL_WOOD_COST = 15;
export const SAWMILL_WIRE_COST = 5;

// НОВЫЕ ЗДАНИЯ (Стоимость)
export const ROLLING_MILL_IRON = 25;
export const ROLLING_MILL_COPPER = 10;
export const FASTENER_FACTORY_IRON = 20;
export const FASTENER_FACTORY_COPPER = 10;
export const FASTENER_FACTORY_ROD = 5;
export const MECH_FACTORY_IRON = 30;
export const MECH_FACTORY_BOLT = 10;
export const MECH_FACTORY_ENGINE = 2;
export const MECH_FACTORY_CORPS = 6;
export const ASSEMBLY_PLANT_IRON = 50;
export const ASSEMBLY_PLANT_FRAME = 10;
export const ASSEMBLY_PLANT_ENGINE = 5;

export const TURRET_CORPS_COST = 5;
export const TURRET_ENGINE_COST = 2;
export const TURRET_CIRCUIT_COST = 3;
export const TURRET_HP_BASE = 150;
export const TURRET_DAMAGE_BASE = 10; 
export const TURRET_RANGE_BASE = TILE * 6;
export const TURRET_FIRE_INTERVAL = 1.0;
export const TURRET_AMMO_PER_SHOT = 1;

export const BUILDING_HP = {
  mine: 100, furnace: 150, lab: 80, conveyor: 20, splitter: 50, underground: 30,
  cutter: 80, assembler: 120, chemplant: 150, storage: 200, turret: 150, radar: 100,
  inserter: 60, minicore: 500, lumberjack: 100, sawmill: 120,
  rolling_mill: 150, fastener_factory: 150, mechanical_factory: 200, assembly_plant: 400
};

export const DIR_DELTA = [[0, -1], [1, 0], [0, 1], [-1, 0]];

export const buildings = [];
export const conveyors = [];
export const splitters = [];
export const undergrounds = [];
export const turretBeams = [];

export const ASSEMBLER_RECIPES = [
  { id: 'gear', name: 'Шестерня', output: RES.GEAR, inputs: [[RES.PLATE_IRON, 2]], count: 1, time: 1.5 },
  { id: 'corps', name: 'Корпус', output: RES.CORPS, inputs: [[RES.PLATE_IRON, 3]], count: 1, time: 2.0 },
  { id: 'circuit', name: 'Электросхема', output: RES.CIRCUIT, inputs: [[RES.PLATE_IRON, 1], [RES.WIRE, 3]], count: 1, time: 2.5 },
  { id: 'engine', name: 'Двигатель', output: RES.ENGINE, inputs: [[RES.CORPS, 1], [RES.GEAR, 2], [RES.CIRCUIT, 1]], count: 1, time: 4.0 },
  { id: 'ammo', name: 'Патроны (базовые)', output: RES.AMMO, inputs: [[RES.POWDER, 1], [RES.PLATE_IRON, 1]], count: 4, time: 1.5 },
];

export const CHEM_RECIPES = [
  { id: 'powder', name: 'Порох', output: RES.POWDER, inputs: [[RES.COAL, 1], [RES.PLATE_IRON, 1]], count: 2, time: 2.5 }
];

export const SAWMILL_RECIPES = [
  { id: 'board', name: 'Доски', output: RES.BOARD, inputs: [[RES.WOOD, 2]], count: 1, time: 2.0 }
];

export const ROLLING_MILL_RECIPES = [
  // Медь (доступно сразу)
  { id: 'cu_rod', name: 'Медный пруток', output: RES.COPPER_ROD, inputs: [[RES.PLATE_COPPER, 3]], count: 1, time: 2.0, requires: null },
  { id: 'cu_beam', name: 'Медная балка', output: RES.COPPER_BEAM, inputs: [[RES.PLATE_COPPER, 4]], count: 1, time: 2.5, requires: null },
  // Железо (требует unlock_iron_rods)
  { id: 'fe_rod', name: 'Железный пруток', output: RES.IRON_ROD, inputs: [[RES.PLATE_IRON, 3]], count: 1, time: 2.0, requires: 'unlock_iron_rods' },
  { id: 'fe_beam', name: 'Железная балка', output: RES.IRON_BEAM, inputs: [[RES.PLATE_IRON, 4]], count: 1, time: 2.5, requires: 'unlock_iron_rods' },
  // Сталь (требует unlock_steel_rods)
  { id: 'st_rod', name: 'Стальной пруток', output: RES.STEEL_ROD, inputs: [[RES.PLATE_IRON, 6]], count: 1, time: 3.0, requires: 'unlock_steel_rods' }, // Заглушка, потом заменим на стальные плиты
  { id: 'st_beam', name: 'Стальная балка', output: RES.STEEL_BEAM, inputs: [[RES.PLATE_IRON, 8]], count: 1, time: 3.5, requires: 'unlock_steel_rods' }
];

export const FASTENER_FACTORY_RECIPES = [
  { id: 'cu_bolt', name: 'Медные болты', output: RES.COPPER_BOLT, inputs: [[RES.COPPER_ROD, 1]], count: 2, time: 1.5, requires: null },
  { id: 'fe_bolt', name: 'Железные болты', output: RES.IRON_BOLT, inputs: [[RES.IRON_ROD, 1]], count: 2, time: 1.5, requires: 'unlock_iron_fasteners' },
  { id: 'st_bolt', name: 'Стальные болты', output: RES.STEEL_BOLT, inputs: [[RES.STEEL_ROD, 1]], count: 2, time: 1.5, requires: 'unlock_steel_fasteners' }
];

export const MECH_FACTORY_RECIPES = [
  // Медь
  { id: 'cu_shaft', name: 'Медный вал', output: RES.COPPER_SHAFT, inputs: [[RES.COPPER_BEAM, 2], [RES.PLATE_COPPER, 2]], count: 1, time: 3.0, requires: null },
  { id: 'cu_bearing', name: 'Мед. подшипник', output: RES.COPPER_BEARING, inputs: [[RES.PLATE_COPPER, 6]], count: 1, time: 2.5, requires: null },
  { id: 'cu_gearbox', name: 'Мед. редуктор', output: RES.COPPER_GEARBOX, inputs: [[RES.COPPER_SHAFT, 1], [RES.COPPER_BEARING, 2], [RES.PLATE_COPPER, 6]], count: 1, time: 4.0, requires: null },
  // Железо
  { id: 'fe_shaft', name: 'Жел. вал', output: RES.IRON_SHAFT, inputs: [[RES.IRON_BEAM, 2], [RES.PLATE_IRON, 2]], count: 1, time: 3.0, requires: 'unlock_iron_mechanics' },
  { id: 'fe_bearing', name: 'Жел. подшипник', output: RES.IRON_BEARING, inputs: [[RES.PLATE_IRON, 6]], count: 1, time: 2.5, requires: 'unlock_iron_mechanics' },
  { id: 'fe_gearbox', name: 'Жел. редуктор', output: RES.IRON_GEARBOX, inputs: [[RES.IRON_SHAFT, 1], [RES.IRON_BEARING, 2], [RES.PLATE_IRON, 6]], count: 1, time: 4.0, requires: 'unlock_iron_mechanics' },
  // Сталь
  { id: 'st_shaft', name: 'Ст. вал', output: RES.STEEL_SHAFT, inputs: [[RES.STEEL_BEAM, 2], [RES.PLATE_IRON, 2]], count: 1, time: 3.0, requires: 'unlock_steel_mechanics' },
  { id: 'st_bearing', name: 'Ст. подшипник', output: RES.STEEL_BEARING, inputs: [[RES.PLATE_IRON, 6]], count: 1, time: 2.5, requires: 'unlock_steel_mechanics' },
  { id: 'st_gearbox', name: 'Ст. редуктор', output: RES.STEEL_GEARBOX, inputs: [[RES.STEEL_SHAFT, 1], [RES.STEEL_BEARING, 2], [RES.PLATE_IRON, 6]], count: 1, time: 4.0, requires: 'unlock_steel_mechanics' }
];

export const ASSEMBLY_PLANT_RECIPES = [
  { id: 'heavy_frame', name: 'Тяжёлая рама', output: RES.HEAVY_FRAME, inputs: [[RES.STEEL_BEAM, 4], [RES.STEEL_GEARBOX, 2], [RES.STEEL_BOLT, 10]], count: 1, time: 8.0, requires: null },
  { id: 'adv_engine', name: 'Улучш. двигатель', output: RES.ADVANCED_ENGINE, inputs: [[RES.ENGINE, 4], [RES.STEEL_SHAFT, 4], [RES.STEEL_BEARING, 10], [RES.CIRCUIT, 6]], count: 1, time: 10.0, requires: null },
  { id: 'control_block', name: 'Блок управления', output: RES.CONTROL_BLOCK, inputs: [[RES.CIRCUIT, 5], [RES.COPPER_BOLT, 4], [RES.STEEL_BOLT, 2], [RES.CORPS, 1]], count: 1, time: 6.0, requires: null }
];

export function getRecipeById(id) { 
  return ASSEMBLER_RECIPES.find(r => r.id === id) || 
         CHEM_RECIPES.find(r => r.id === id) || 
         SAWMILL_RECIPES.find(r => r.id === id) ||
         ROLLING_MILL_RECIPES.find(r => r.id === id) ||
         FASTENER_FACTORY_RECIPES.find(r => r.id === id) ||
         MECH_FACTORY_RECIPES.find(r => r.id === id) ||
         ASSEMBLY_PLANT_RECIPES.find(r => r.id === id);
}

export function getRecipesForBuilding(b) {
  if (b && typeof b.getRecipes === 'function') return b.getRecipes();
  if (b && b.type === 'assembler') return ASSEMBLER_RECIPES;
  if (b && b.type === 'chemplant') return CHEM_RECIPES;
  if (b && b.type === 'sawmill') return SAWMILL_RECIPES;
  if (b && b.type === 'rolling_mill') return ROLLING_MILL_RECIPES;
  if (b && b.type === 'fastener_factory') return FASTENER_FACTORY_RECIPES;
  if (b && b.type === 'mechanical_factory') return MECH_FACTORY_RECIPES;
  if (b && b.type === 'assembly_plant') return ASSEMBLY_PLANT_RECIPES;
  return [];
}

export class Building {
  constructor(tx, ty, type, hp, w = 1, h = 1) { 
    this.tx = tx; 
    this.ty = ty; 
    this.type = type; 
    this.hp = hp; 
    this.maxHp = hp; 
    this.isBroken = false; 
    this.w = w;
    this.h = h;
  }
  update(dt) {} 
  drawSpecific() {} 
  drawAmbient() {} 
  tryAccept(itemType) { return false; } 
  accept(itemType) {} 
  getRecipes() { return []; }
}