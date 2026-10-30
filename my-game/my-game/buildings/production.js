'use strict';

import { inventory, state, addPopup, TILE, RES, RES_COLOR, ctx } from '../game.js';
import { playMineSound } from '../audio.js';
import { world, oreAmount } from '../world.js';
import { drawResIcon, drawBuildingSprite, isReady, buildingImages } from '../sprites.js';
import { 
  Building, ASSEMBLER_RECIPES, CHEM_RECIPES, getRecipeById, 
  BUILDING_HP, MINE_COST, FURNACE_COST, FURNACE_INTERVAL, MINE_INTERVAL, POLLUTION_PER_PLATE,
  FURNACE_OUTPUT_BUFFER_MAX, INPUT_BUFFER_MAX, STORAGE_CAPACITY, 
  STORAGE_IRON_COST, STORAGE_COPPER_COST, 
  LAB_INTERVAL, LAB_IRON_COST, LAB_COPPER_COST, 
  CUTTER_INTERVAL, CUTTER_IRON_COST, CUTTER_COPPER_COST,
  ASSEMBLER_IRON_COST, ASSEMBLER_COPPER_COST, 
  CHEMPLANT_IRON_COST, CHEMPLANT_COPPER_COST, CHEMPLANT_WIRE_COST,
  FURNACE_BUFFER_MAX
} from './data.js';

import { 
  getOutputConveyor, tryOutputItem, flushOutputBuffer, outputSpace, 
  getStorageTotal, drawProgressBar, drawBufferBadge 
} from './utils.js';

export class Mine extends Building {
  constructor(tx, ty, resourceType) {
    super(tx, ty, 'mine', BUILDING_HP.mine);
    this.resourceType = resourceType; this.timer = 0; this.paidCost = MINE_COST; this.outputDir = state.savedOutputDir;
    this.outputBuffer = 0; this.outputBufferMax = FURNACE_OUTPUT_BUFFER_MAX; this.outputBufferType = resourceType;
  }
  update(dt) {
    if (oreAmount[this.ty][this.tx] <= 0) { flushOutputBuffer(this); return; }
    const outC = getOutputConveyor(this);
    if (!(outC && outC.items.length < 2) && !(this.outputBuffer < this.outputBufferMax)) return;
    const interval = MINE_INTERVAL / state.miningSpeedMult;
    this.timer += dt;
    while (this.timer >= interval && oreAmount[this.ty][this.tx] > 0) {
      if (!tryOutputItem(this, this.resourceType)) break;
      addPopup(this.tx * TILE + TILE / 2, this.ty * TILE + 4, '+1', RES_COLOR[this.resourceType]);
      playMineSound(); this.timer -= interval;
      oreAmount[this.ty][this.tx]--;
      if (oreAmount[this.ty][this.tx] <= 0) { oreAmount[this.ty][this.tx] = 0; world[this.ty][this.tx] = 0; }
    }
    flushOutputBuffer(this);
  }
  drawSpecific() {
    const sx = this.tx * TILE, sy = this.ty * TILE;
    const empty = oreAmount[this.ty][this.tx] <= 0;
    if (empty) {
      ctx.globalAlpha = 0.4;
      if (!drawBuildingSprite('mine', sx, sy, TILE)) { ctx.fillStyle = '#3a3a3a'; ctx.fillRect(sx + 2, sy + 2, TILE - 4, TILE - 4); }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#888'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(sx + 9, sy + 9); ctx.lineTo(sx + TILE - 9, sy + TILE - 9); ctx.moveTo(sx + TILE - 9, sy + 9); ctx.lineTo(sx + 9, sy + TILE - 9); ctx.stroke();
    } else {
      if (!drawBuildingSprite('mine', sx, sy, TILE)) {
        ctx.fillStyle = '#5a5a5a'; ctx.fillRect(sx + 2, sy + 2, TILE - 4, TILE - 4);
        ctx.fillStyle = '#7a7a7a'; ctx.fillRect(sx + 4, sy + 4, TILE - 8, TILE - 8);
        drawResIcon(this.resourceType, sx + TILE / 2 - 8, sy + TILE / 2 - 8, 16, 0);
      } else drawResIcon(this.resourceType, sx + TILE - 12, sy + 2, 10, 0);
      drawProgressBar(sx, sy, this.timer / (MINE_INTERVAL / state.miningSpeedMult), '#7fbf7f');
    }
    drawBufferBadge(sx, sy, this.outputBuffer, this.outputBufferType || this.resourceType);
  }
}

export class Furnace extends Building {
  constructor(tx, ty) {
    super(tx, ty, 'furnace', BUILDING_HP.furnace);
    this.timer = 0; this.paidCost = FURNACE_COST; this.pollutionMade = 0; this.inputOreType = null;
    this.inputOre = 0; this.inputCoal = 0; this.outputDir = state.savedOutputDir;
    this.outputBuffer = 0; this.outputBufferMax = FURNACE_OUTPUT_BUFFER_MAX; this.outputBufferType = null;
  }
  tryAccept(itemType) {
    if (itemType === RES.COAL) return this.inputCoal < FURNACE_BUFFER_MAX;
    if (itemType === RES.IRON || itemType === RES.COPPER) {
      if (this.inputOre >= FURNACE_BUFFER_MAX) return false;
      if (this.inputOreType !== null && this.inputOreType !== itemType) return false;
      return true;
    }
    return false;
  }
  accept(itemType) { if (itemType === RES.COAL) { this.inputCoal++; return; } this.inputOreType = itemType; this.inputOre++; }
  update(dt) {
    if (this.inputOreType && this.inputOre >= 1 && this.inputCoal >= 1) {
      const dst = this.inputOreType === RES.IRON ? RES.PLATE_IRON : RES.PLATE_COPPER;
      if (outputSpace(this) >= 1) {
        this.timer += dt;
        while (this.timer >= FURNACE_INTERVAL && this.inputOre >= 1 && this.inputCoal >= 1) {
          if (!tryOutputItem(this, dst)) break;
          addPopup(this.tx * TILE + TILE / 2, this.ty * TILE + 4, '+1', RES_COLOR[dst]);
          this.timer -= FURNACE_INTERVAL; this.inputOre--; this.inputCoal--;
          state.pollution += POLLUTION_PER_PLATE; this.pollutionMade = (this.pollutionMade || 0) + POLLUTION_PER_PLATE;
        }
      }
    }
    flushOutputBuffer(this);
    if (this.inputOre === 0 && this.outputBuffer === 0) { this.inputOreType = null; if (!getOutputConveyor(this)) this.timer = 0; }
  }
  drawAmbient() {
    const canWork = this.inputOreType && this.inputOre > 0 && this.inputCoal > 0;
    if (!canWork) return;
    const cx = this.tx * TILE + TILE / 2, cy = this.ty * TILE + TILE / 2;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, TILE * 2);
    grad.addColorStop(0, 'rgba(50,50,40,0.35)'); grad.addColorStop(1, 'rgba(50,50,40,0)');
    ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(cx, cy, TILE * 2, 0, Math.PI * 2); ctx.fill();
  }
  drawSpecific() {
    const sx = this.tx * TILE, sy = this.ty * TILE;
    if (!drawBuildingSprite('furnace', sx, sy, TILE)) { ctx.fillStyle = '#5a3a2a'; ctx.fillRect(sx + 2, sy + 2, TILE - 4, TILE - 4); ctx.fillStyle = '#8a5a3a'; ctx.fillRect(sx + 4, sy + 4, TILE - 8, TILE - 8); }
    const canWork = this.inputOreType && this.inputOre > 0 && this.inputCoal > 0;
    if (!isReady(buildingImages.furnace)) {
      const t = performance.now() / 300; const flicker = canWork ? (0.7 + 0.3 * Math.sin(t + this.tx + this.ty)) : 0.15;
      ctx.fillStyle = `rgba(255,140,40,${flicker})`; ctx.fillRect(sx + 10, sy + 10, TILE - 20, TILE - 20);
    }
    if (canWork) drawProgressBar(sx, sy, this.timer / FURNACE_INTERVAL, '#ffa040');
    else if (this.inputOre > 0 && this.inputCoal === 0) {
      if (Math.sin(performance.now() / 200) > 0) { ctx.fillStyle = '#ff5050'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', sx + TILE / 2, sy + TILE / 2); }
    }
    drawBufferBadge(sx, sy, this.outputBuffer, this.outputBufferType);
  }
}

export class Lab extends Building {
  constructor(tx, ty) { super(tx, ty, 'lab', BUILDING_HP.lab); this.timer = 0; this.paidCost = { ironPlate: LAB_IRON_COST, copperPlate: LAB_COPPER_COST }; }
  update(dt) {
    const interval = LAB_INTERVAL / state.labSpeedMult;
    if (inventory[RES.PLATE_IRON] < 1 || inventory[RES.PLATE_COPPER] < 1) return;
    this.timer += dt;
    while (this.timer >= interval && inventory[RES.PLATE_IRON] >= 1 && inventory[RES.PLATE_COPPER] >= 1) {
      this.timer -= interval; inventory[RES.PLATE_IRON]--; inventory[RES.PLATE_COPPER]--; state.dna++;
      addPopup(this.tx * TILE + TILE / 2, this.ty * TILE + 4, '+1 🧬', '#7fbfff');
    }
  }
  drawSpecific() {
    const sx = this.tx * TILE, sy = this.ty * TILE;
    ctx.fillStyle = '#2a3a5a'; ctx.fillRect(sx + 2, sy + 2, TILE - 4, TILE - 4);
    ctx.fillStyle = '#3a5a8a'; ctx.fillRect(sx + 4, sy + 4, TILE - 8, TILE - 8);
    const canWork = inventory[RES.PLATE_IRON] >= 1 && inventory[RES.PLATE_COPPER] >= 1;
    const pulse = canWork ? (0.5 + 0.5 * Math.sin(performance.now() / 400 + this.tx)) : 0.2;
    ctx.fillStyle = `rgba(100, 180, 255, ${0.4 + pulse * 0.5})`; ctx.beginPath(); ctx.arc(sx + TILE / 2, sy + TILE / 2, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#a0d0ff'; ctx.beginPath(); ctx.arc(sx + TILE / 2, sy + TILE / 2, 4, 0, Math.PI * 2); ctx.fill();
    if (canWork) drawProgressBar(sx, sy, this.timer / (LAB_INTERVAL / state.labSpeedMult), '#7fbfff');
  }
}

export class Cutter extends Building {
  constructor(tx, ty) {
    super(tx, ty, 'cutter', BUILDING_HP.cutter);
    this.timer = 0; this.paidCost = { ironPlate: CUTTER_IRON_COST, copperPlate: CUTTER_COPPER_COST };
    this.inputBuffer = 0; this.outputDir = state.savedOutputDir;
    this.outputBuffer = 0; this.outputBufferMax = FURNACE_OUTPUT_BUFFER_MAX; this.outputBufferType = null;
  }
  tryAccept(itemType) { return itemType === RES.PLATE_COPPER && this.inputBuffer < INPUT_BUFFER_MAX; }
  accept(itemType) { if (itemType === RES.PLATE_COPPER) this.inputBuffer++; }
  update(dt) {
    if (this.inputBuffer < 1) { flushOutputBuffer(this); return; }
    this.timer += dt;
    while (this.timer >= CUTTER_INTERVAL && this.inputBuffer >= 1) {
      if (outputSpace(this) < 2) break;
      tryOutputItem(this, RES.WIRE); tryOutputItem(this, RES.WIRE);
      addPopup(this.tx * TILE + TILE / 2, this.ty * TILE + 4, '+2', RES_COLOR[RES.WIRE]);
      this.timer -= CUTTER_INTERVAL; this.inputBuffer--;
    }
    flushOutputBuffer(this);
  }
  drawSpecific() {
    const sx = this.tx * TILE, sy = this.ty * TILE;
    if (!drawBuildingSprite('cutter', sx, sy, TILE)) { ctx.fillStyle = '#4a3a5a'; ctx.fillRect(sx + 2, sy + 2, TILE - 4, TILE - 4); ctx.fillStyle = '#6a5a7a'; ctx.fillRect(sx + 4, sy + 4, TILE - 8, TILE - 8); drawResIcon(RES.WIRE, sx + TILE / 2 - 6, sy + TILE / 2 - 6, 12, 0); }
    if (this.inputBuffer > 0) drawProgressBar(sx, sy, this.timer / CUTTER_INTERVAL, '#c08040');
    drawBufferBadge(sx, sy, this.outputBuffer, this.outputBufferType);
  }
}

export class Crafter extends Building {
  constructor(tx, ty, type, hp, paidCost) {
    super(tx, ty, type, hp); this.timer = 0; this.paidCost = paidCost; this.selectedRecipe = null;
    this.inputBuffer = {}; this.outputDir = state.savedOutputDir; this.outputBuffer = 0;
    this.outputBufferMax = FURNACE_OUTPUT_BUFFER_MAX; this.outputBufferType = null;
  }
  tryAccept(itemType) {
    if (!this.selectedRecipe) return false;
    const recipe = getRecipeById(this.selectedRecipe);
    if (!recipe) return false;
    const need = recipe.inputs.find(p => p[0] === itemType);
    if (!need) return false;
    return (this.inputBuffer[itemType] || 0) < INPUT_BUFFER_MAX;
  }
  accept(itemType) { this.inputBuffer[itemType] = (this.inputBuffer[itemType] || 0) + 1; }
  update(dt) {
    if (!this.selectedRecipe) return;
    const recipe = getRecipeById(this.selectedRecipe);
    if (!recipe) return;
    let canCraft = true;
    for (const [resType, count] of recipe.inputs) { if ((this.inputBuffer[resType] || 0) < count) { canCraft = false; break; } }
    if (!canCraft) { this.timer = 0; return; }
    this.timer += dt;
    if (this.timer >= recipe.time) {
      if (outputSpace(this) < recipe.count) return;
      for (const [resType, count] of recipe.inputs) this.inputBuffer[resType] -= count;
      for (let i = 0; i < recipe.count; i++) tryOutputItem(this, recipe.output);
      addPopup(this.tx * TILE + TILE / 2, this.ty * TILE + 4, '+' + recipe.count, RES_COLOR[recipe.output]);
      this.timer = 0;
    }
    flushOutputBuffer(this);
  }
  drawAmbient() {
    const canWork = this.selectedRecipe && getRecipeById(this.selectedRecipe);
    if (!canWork) return;
    const cx = this.tx * TILE + TILE / 2, cy = this.ty * TILE + TILE / 2;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, TILE * 2);
    grad.addColorStop(0, 'rgba(50,50,40,0.35)'); grad.addColorStop(1, 'rgba(50,50,40,0)');
    ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(cx, cy, TILE * 2, 0, Math.PI * 2); ctx.fill();
  }
  drawSpecific() {
    const sx = this.tx * TILE, sy = this.ty * TILE;
    const spriteOk = drawBuildingSprite(this.type, sx, sy, TILE);
    if (!spriteOk) {
      const baseColor = this.type === 'assembler' ? '#3a4a3a' : '#5a3a4a';
      const borderColor = this.type === 'assembler' ? '#5a7a5a' : '#8a5a6a';
      ctx.fillStyle = baseColor; ctx.fillRect(sx + 2, sy + 2, TILE - 4, TILE - 4);
      ctx.fillStyle = borderColor; ctx.fillRect(sx + 4, sy + 4, TILE - 8, TILE - 8);
    }
    const recipe = this.selectedRecipe ? getRecipeById(this.selectedRecipe) : null;
    if (recipe) {
      let canCraft = true;
      for (const [resType, count] of recipe.inputs) { if ((this.inputBuffer[resType] || 0) < count) { canCraft = false; break; } }
      if (canCraft) drawProgressBar(sx, sy, this.timer / recipe.time, this.type === 'assembler' ? '#7fbf7f' : '#c080c0');
      else if (Math.sin(performance.now() / 250) > 0) { ctx.fillStyle = '#ff5050'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', sx + TILE / 2, sy + TILE / 2); }
    } else {
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(sx + 8, sy + 8, TILE - 16, TILE - 16);
      ctx.fillStyle = '#ffcc66'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', sx + TILE / 2, sy + TILE / 2);
    }
    drawBufferBadge(sx, sy, this.outputBuffer, this.outputBufferType);
  }
}

export class Assembler extends Crafter { 
  constructor(tx, ty) { super(tx, ty, 'assembler', BUILDING_HP.assembler, { ironPlate: ASSEMBLER_IRON_COST, copperPlate: ASSEMBLER_COPPER_COST }); } 
  getRecipes() { return ASSEMBLER_RECIPES; } 
}
export class Chemplant extends Crafter { 
  constructor(tx, ty) { super(tx, ty, 'chemplant', BUILDING_HP.chemplant, { ironPlate: CHEMPLANT_IRON_COST, copperPlate: CHEMPLANT_COPPER_COST, wire: CHEMPLANT_WIRE_COST }); } 
  getRecipes() { return CHEM_RECIPES; } 
}

export class Storage extends Building {
  constructor(tx, ty) { super(tx, ty, 'storage', BUILDING_HP.storage); this.paidCost = { ironPlate: STORAGE_IRON_COST, copperPlate: STORAGE_COPPER_COST }; this.items = {}; }
  tryAccept(itemType) { return getStorageTotal(this) < STORAGE_CAPACITY; }
  accept(itemType) { this.items[itemType] = (this.items[itemType] || 0) + 1; }
  update(dt) {}
  drawSpecific() {
    const sx = this.tx * TILE, sy = this.ty * TILE;
    if (!drawBuildingSprite('storage', sx, sy, TILE)) {
      ctx.fillStyle = '#3a3a3a'; ctx.fillRect(sx + 2, sy + 2, TILE - 4, TILE - 4);
      ctx.fillStyle = '#5a5a5a'; ctx.fillRect(sx + 4, sy + 4, TILE - 8, TILE - 8);
      ctx.strokeStyle = '#888'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(sx + 6, sy + 8); ctx.lineTo(sx + TILE - 6, sy + 8); ctx.moveTo(sx + 6, sy + TILE / 2); ctx.lineTo(sx + TILE - 6, sy + TILE / 2); ctx.moveTo(sx + 6, sy + TILE - 8); ctx.lineTo(sx + TILE - 6, sy + TILE - 8); ctx.stroke();
    }
    const pct = getStorageTotal(this) / STORAGE_CAPACITY;
    drawProgressBar(sx, sy, pct, '#a0a0c0');
  }
}

export class MiniCore extends Building {
  constructor(tx, ty) {
    super(tx, ty, 'minicore', BUILDING_HP.minicore);
    this.items = {};
    this.paidCost = 100; // 100 железа
    this.maxItems = 1000;
  }
  tryAccept(itemType) { return (this.items[itemType] || 0) < this.maxItems; }
  accept(itemType) {
    this.items[itemType] = (this.items[itemType] || 0) + 1;
    inventory[itemType]++;
  }
  update(dt) {}
  drawSpecific() {
    const sx = this.tx * TILE, sy = this.ty * TILE;
    ctx.fillStyle = '#1a2a3a'; ctx.fillRect(sx + 2, sy + 2, TILE - 4, TILE - 4);
    ctx.fillStyle = '#3a6a9a'; ctx.fillRect(sx + 4, sy + 4, TILE - 8, TILE - 8);
    const glow = 0.5 + 0.5 * Math.sin(performance.now() / 500);
    ctx.fillStyle = `rgba(120, 180, 255, ${0.6 + glow * 0.4})`; 
    ctx.beginPath(); ctx.arc(sx + TILE/2, sy + TILE/2, 6, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#e0f0ff'; ctx.beginPath(); ctx.arc(sx + TILE/2, sy + TILE/2, 3, 0, Math.PI*2); ctx.fill();
  }
}