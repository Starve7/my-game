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
export const CONVEYOR_CAPACITY = 2;
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

export const TURRET_CORPS_COST = 5;
export const TURRET_ENGINE_COST = 2;
export const TURRET_CIRCUIT_COST = 3;
export const TURRET_HP_BASE = 150;
export const TURRET_DAMAGE_BASE = 10; // <--- БЫЛО 2, СТАЛО 10
export const TURRET_RANGE_BASE = TILE * 6;
export const TURRET_FIRE_INTERVAL = 1.0;
export const TURRET_AMMO_PER_SHOT = 1;

export const BUILDING_HP = {
  mine: 100, furnace: 150, lab: 80, conveyor: 20, splitter: 50, underground: 30, 
  cutter: 80, assembler: 120, chemplant: 150, storage: 200, turret: 150, radar: 100, inserter: 60,
  minicore: 500
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

export function getRecipeById(id) { return ASSEMBLER_RECIPES.find(r => r.id === id) || CHEM_RECIPES.find(r => r.id === id); }
export function getRecipesForBuilding(b) {
  if (b && typeof b.getRecipes === 'function') return b.getRecipes();
  if (b && b.type === 'assembler') return ASSEMBLER_RECIPES;
  if (b && b.type === 'chemplant') return CHEM_RECIPES;
  return [];
}

export class Building {
  constructor(tx, ty, type, hp) { 
    this.tx = tx; 
    this.ty = ty; 
    this.type = type; 
    this.hp = hp; 
    this.maxHp = hp; 
    this.isBroken = false; 
  }
  update(dt) {} 
  drawSpecific() {} 
  drawAmbient() {} 
  tryAccept(itemType) { return false; } 
  accept(itemType) {} 
  getRecipes() { return []; }
}