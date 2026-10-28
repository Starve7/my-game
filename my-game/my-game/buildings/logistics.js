'use strict';

import { inventory, state, addPopup, TILE, WORLD_W, WORLD_H, RES, RES_COLOR, ctx } from '../game.js';
import { playBuildSound } from '../audio.js';
import { drawResIcon, drawConveyorSprite, drawInserterArm, drawBuildingSprite } from '../sprites.js';
// ВОТ ТУТ Я ДОБАВИЛ МАССИВЫ: conveyors, splitters, undergrounds
import { 
  Building, conveyors, splitters, undergrounds, 
  DIR_DELTA, CONVEYOR_SPEED, CONVEYOR_CAPACITY, BUILDING_HP,
  INSERTER_COST, CONVEYOR_COST, UNDERGROUND_COST, SPLITTER_COST
} from './data.js';

import { 
  getConveyorAt, getBuildingAt, getSplitterAt, getUndergroundAt, isCoreTile, 
  tryAcceptItem, acceptItem, drawArrow, drawBrokenOverlay, drawHpCircle 
} from './utils.js';

export class Inserter extends Building {
  constructor(tx, ty) {
    super(tx, ty, 'inserter', BUILDING_HP.inserter);
    this.paidCost = INSERTER_COST;
    this.dir = state.newConveyorDir;
    this.heldItem = null;
    this.animProgress = 0; 
    this.swingSpeed = 2.5; 
  }
  update(dt) {
    if (this.isBroken) return;
    const [dx, dy] = DIR_DELTA[this.dir];
    const srcX = this.tx - dx, srcY = this.ty - dy; 
    const dstX = this.tx + dx, dstY = this.ty + dy; 

    if (this.heldItem) {
      if (this.animProgress < 1) {
        this.animProgress += dt * this.swingSpeed;
        if (this.animProgress > 1) this.animProgress = 1;
      } else {
        this.tryDrop(dstX, dstY);
      }
    } else {
      if (this.animProgress > 0) {
        this.animProgress -= dt * this.swingSpeed;
        if (this.animProgress < 0) this.animProgress = 0;
      } else {
        this.tryPickup(srcX, srcY);
      }
    }
  }
  tryPickup(sx, sy) {
    const c = getConveyorAt(sx, sy);
    if (c && !c.isBroken && c.items.length > 0) {
      this.heldItem = c.items.shift().type; this.animProgress = 0.01; return;
    }
    const s = getSplitterAt(sx, sy);
    if (s && !s.isBroken && s.items.length > 0) {
      this.heldItem = s.items.shift().type; this.animProgress = 0.01; return;
    }
    const u = getUndergroundAt(sx, sy);
    if (u && !u.isBroken && u.items.length > 0) {
      this.heldItem = u.items.shift().type; this.animProgress = 0.01; return;
    }
    const b = getBuildingAt(sx, sy);
    if (b && !b.isBroken && b.outputBuffer > 0) {
      this.heldItem = b.outputBufferType; 
      b.outputBuffer--;
      if (b.outputBuffer === 0) b.outputBufferType = null;
      this.animProgress = 0.01; return;
    }
  }
  tryDrop(dx, dy) {
    const c = getConveyorAt(dx, dy);
    if (c && !c.isBroken && c.items.length < CONVEYOR_CAPACITY) {
      c.items.push({ type: this.heldItem, progress: 0 }); this.heldItem = null; return;
    }
    const s = getSplitterAt(dx, dy);
    if (s && !s.isBroken && s.items.length < CONVEYOR_CAPACITY) {
      s.items.push({ type: this.heldItem, progress: 0 }); this.heldItem = null; return;
    }
    const u = getUndergroundAt(dx, dy);
    if (u && u.isEntrance && !u.isBroken && u.items.length < CONVEYOR_CAPACITY) {
      u.items.push({ type: this.heldItem, progress: 0 }); this.heldItem = null; return;
    }
    const b = getBuildingAt(dx, dy);
    if (b && !b.isBroken && tryAcceptItem(b, this.heldItem)) {
      acceptItem(b, this.heldItem); this.heldItem = null; return;
    }
  }
  drawSpecific() {
    const sx = this.tx * TILE, sy = this.ty * TILE;
    const cx = sx + TILE / 2, cy = sy + TILE / 2;
    if (!drawBuildingSprite('inserter_base', sx, sy, TILE)) {
      ctx.fillStyle = '#5a5a5a'; ctx.beginPath(); ctx.arc(cx, cy, TILE/2 - 2, 0, Math.PI*2); ctx.fill();
    }
    let baseAngle = 0;
    if (this.dir === 0) baseAngle = -Math.PI / 2;
    else if (this.dir === 1) baseAngle = 0;
    else if (this.dir === 2) baseAngle = Math.PI / 2;
    else if (this.dir === 3) baseAngle = Math.PI;
    const armAngle = baseAngle + (1 - this.animProgress) * Math.PI;
    drawInserterArm(armAngle, this.heldItem, cx, cy);
  }
}

export function tryConveyorDragStep(cell, prevCell) {
  if (!cell) return false;
  if (Math.abs(cell.tx - (WORLD_W/2)) <= 1 && Math.abs(cell.ty - (WORLD_H/2)) <= 1) return false;
  if (getBuildingAt(cell.tx, cell.ty) || getConveyorAt(cell.tx, cell.ty) || getSplitterAt(cell.tx, cell.ty) || getUndergroundAt(cell.tx, cell.ty)) return false;
  
  let dir = state.newConveyorDir;
  if (prevCell) {
    const dx = cell.tx - prevCell.tx, dy = cell.ty - prevCell.ty;
    if (dx === 1 && dy === 0) dir = 1; else if (dx === -1 && dy === 0) dir = 3; else if (dx === 0 && dy === 1) dir = 2; else if (dx === 0 && dy === -1) dir = 0;
  }
  state.newConveyorDir = dir;

  if (inventory[RES.IRON] < CONVEYOR_COST) return false;
  inventory[RES.IRON] -= CONVEYOR_COST;
  
  if (state.selectedBuilding === 'underground') {
    const [dx, dy] = DIR_DELTA[dir];
    let partner = null, isEntrance = true;
    for (let i = 1; i <= 4; i++) {
      const found = getUndergroundAt(cell.tx - dx * i, cell.ty - dy * i);
      if (found && found.dir === dir && !found.partner) { partner = found; isEntrance = false; break; }
    }
    const u = { type: 'underground', tx: cell.tx, ty: cell.ty, dir, items: [], paidCost: UNDERGROUND_COST.iron, hp: BUILDING_HP.underground, maxHp: BUILDING_HP.underground, isBroken: false, isEntrance, partner };
    if (partner) partner.partner = u;
    undergrounds.push(u); // <--- ВЕРНУЛ УСТАНОВКУ ПОДЗЕМКИ
    return true;
  }

  conveyors.push({ type: 'conveyor', tx: cell.tx, ty: cell.ty, dir, items: [], paidCost: CONVEYOR_COST, hp: BUILDING_HP.conveyor, maxHp: BUILDING_HP.conveyor, isBroken: false }); // <--- ВЕРНУЛ УСТАНОВКУ КОНВЕЙЕРА
  return true;
}

export function updateConveyors(dt) {
  for (const c of conveyors) { if (c.isBroken) continue; for (const it of c.items) it.progress += dt * CONVEYOR_SPEED; }
  for (const s of splitters) { if (s.isBroken) continue; for (const it of s.items) it.progress += dt * CONVEYOR_SPEED; }
  for (const u of undergrounds) { if (u.isBroken) continue; for (const it of u.items) it.progress += dt * CONVEYOR_SPEED; }

  for (const c of conveyors) {
    if (c.isBroken) continue;
    for (let i = c.items.length - 1; i >= 0; i--) {
      const it = c.items[i];
      if (it.progress < 1) continue;
      const [dx, dy] = DIR_DELTA[c.dir];
      const nx = c.tx + dx, ny = c.ty + dy;
      if (nx < 0 || nx >= WORLD_W || ny < 0 || ny >= WORLD_H) { it.progress = 1; continue; }
      if (isCoreTile(nx, ny)) { inventory[it.type]++; addPopup(nx * TILE + TILE / 2, ny * TILE + TILE / 2, '+1', RES_COLOR[it.type]); c.items.splice(i, 1); continue; }
      
      const nextC = getConveyorAt(nx, ny);
      if (nextC) { if (!nextC.isBroken && nextC.items.length < CONVEYOR_CAPACITY) { nextC.items.push({ type: it.type, progress: 0 }); c.items.splice(i, 1); } else it.progress = 1; continue; }
      
      const nextS = getSplitterAt(nx, ny);
      if (nextS) { if (!nextS.isBroken && nextS.items.length < CONVEYOR_CAPACITY) { nextS.items.push({ type: it.type, progress: 0 }); c.items.splice(i, 1); } else it.progress = 1; continue; }
      
      const nextU = getUndergroundAt(nx, ny);
      if (nextU && nextU.isEntrance) { if (!nextU.isBroken && nextU.items.length < CONVEYOR_CAPACITY) { nextU.items.push({ type: it.type, progress: 0 }); c.items.splice(i, 1); } else it.progress = 1; continue; }
      
      const nextB = getBuildingAt(nx, ny);
      if (nextB && tryAcceptItem(nextB, it.type)) { acceptItem(nextB, it.type); c.items.splice(i, 1); continue; }
      it.progress = 1;
    }
  }

  for (const s of splitters) {
    if (s.isBroken) continue;
    for (let i = s.items.length - 1; i >= 0; i--) {
      const it = s.items[i];
      if (it.progress < 1) continue;
      
      const [dx, dy] = DIR_DELTA[s.dir];
      let out1x, out1y, out2x, out2y;
      
      if (s.dir === 1 || s.dir === 3) {
        out1x = s.tx + dx; out1y = s.ty;
        out2x = s.tx + dx; out2y = s.ty + 1;
      } else {
        out1x = s.tx; out1y = s.ty + dy;
        out2x = s.tx + 1; out2y = s.ty + dy;
      }

      let targetX, targetY;
      let fallbackX = null, fallbackY = null;

      if (s.filterLeft === it.type) {
        targetX = out1x; targetY = out1y;
      } else if (s.filterRight === it.type) {
        targetX = out2x; targetY = out2y;
      } else if (s.filterLeft !== null && s.filterRight !== null) {
        it.progress = 1; continue; 
      } else if (s.filterLeft !== null) {
        if (s.filterLeft === it.type) { targetX = out1x; targetY = out1y; }
        else { targetX = out2x; targetY = out2y; }
      } else if (s.filterRight !== null) {
        if (s.filterRight === it.type) { targetX = out2x; targetY = out2y; }
        else { targetX = out1x; targetY = out1y; }
      } else {
        if (s.lastOut === 1) {
          targetX = out1x; targetY = out1y;
          fallbackX = out2x; fallbackY = out2y;
          s.lastOut = 2;
        } else {
          targetX = out2x; targetY = out2y;
          fallbackX = out1x; fallbackY = out1y;
          s.lastOut = 1;
        }
      }

      const tryPush = (tx, ty) => {
        if (tx === null || ty === null) return false;
        const nextC = getConveyorAt(tx, ty);
        if (nextC && !nextC.isBroken && nextC.items.length < CONVEYOR_CAPACITY) { nextC.items.push({ type: it.type, progress: 0 }); return true; }
        const nextS = getSplitterAt(tx, ty);
        if (nextS && !nextS.isBroken && nextS.items.length < CONVEYOR_CAPACITY) { nextS.items.push({ type: it.type, progress: 0 }); return true; }
        const nextU = getUndergroundAt(tx, ty);
        if (nextU && nextU.isEntrance && !nextU.isBroken && nextU.items.length < CONVEYOR_CAPACITY) { nextU.items.push({ type: it.type, progress: 0 }); return true; }
        return false;
      };

      let placed = tryPush(targetX, targetY);
      if (!placed && fallbackX !== null) placed = tryPush(fallbackX, fallbackY);

      if (placed) s.items.splice(i, 1);
      else it.progress = 1; 
    }
  }

  for (const u of undergrounds) {
    if (u.isBroken) continue;
    if (u.isEntrance) {
      for (let i = u.items.length - 1; i >= 0; i--) {
        const it = u.items[i];
        if (it.progress < 1) continue;
        if (u.partner && !u.partner.isBroken && u.partner.items.length < CONVEYOR_CAPACITY) { u.partner.items.push({ type: it.type, progress: 0 }); u.items.splice(i, 1); } 
        else it.progress = 1;
      }
    } else {
      for (let i = u.items.length - 1; i >= 0; i--) {
        const it = u.items[i];
        if (it.progress < 1) continue;
        const [dx, dy] = DIR_DELTA[u.dir];
        const nx = u.tx + dx, ny = u.ty + dy;
        
        const nextC = getConveyorAt(nx, ny);
        if (nextC) { if (!nextC.isBroken && nextC.items.length < CONVEYOR_CAPACITY) { nextC.items.push({ type: it.type, progress: 0 }); u.items.splice(i, 1); } else it.progress = 1; continue; }
        
        const nextS = getSplitterAt(nx, ny);
        if (nextS) { if (!nextS.isBroken && nextS.items.length < CONVEYOR_CAPACITY) { nextS.items.push({ type: it.type, progress: 0 }); u.items.splice(i, 1); } else it.progress = 1; continue; }

        const nextU = getUndergroundAt(nx, ny);
        if (nextU && nextU.isEntrance) { if (!nextU.isBroken && nextU.items.length < CONVEYOR_CAPACITY) { nextU.items.push({ type: it.type, progress: 0 }); u.items.splice(i, 1); } else it.progress = 1; continue; }

        const nextB = getBuildingAt(nx, ny);
        if (nextB && tryAcceptItem(nextB, it.type)) { acceptItem(nextB, it.type); u.items.splice(i, 1); continue; }
        it.progress = 1;
      }
    }
  }
}

export function drawConveyors() {
  for (const c of conveyors) {
    const sx = c.tx * TILE, sy = c.ty * TILE;
    if (c.isBroken) { 
      ctx.save(); ctx.globalAlpha = 0.35; 
      ctx.fillStyle = '#3a3a3a'; ctx.fillRect(sx + 1, sy + 1, TILE - 2, TILE - 2); 
      ctx.restore(); 
      drawBrokenOverlay(sx, sy, TILE); 
      continue; 
    }

    const inDirs = [];
    for (let d = 0; d < 4; d++) {
      const [dx, dy] = DIR_DELTA[d];
      const nx = c.tx + dx, ny = c.ty + dy;
      let isInput = false;

      const nc = getConveyorAt(nx, ny);
      if (nc && !nc.isBroken && d === (nc.dir + 2) % 4) {
        if (c.dir !== d) inDirs.push(d);
        continue;
      }

      const ns = getSplitterAt(nx, ny);
      if (ns && !ns.isBroken) {
        const [sdx, sdy] = DIR_DELTA[ns.dir];
        const [pdx, pdy] = [sdy, sdx];
        const out1x = ns.tx + sdx, out1y = ns.ty + sdy;
        const out2x = ns.tx + pdx, out2y = ns.ty + pdy;
        if ((out1x === c.tx && out1y === c.ty) || (out2x === c.tx && out2y === c.ty)) {
          inDirs.push(d);
          continue;
        }
      }

      const nu = getUndergroundAt(nx, ny);
      if (nu && !nu.isBroken && !nu.isEntrance && d === (nu.dir + 2) % 4) {
        if (c.dir !== d) inDirs.push(d);
        continue;
      }
    }

    const spriteOk = drawConveyorSprite(c.dir, sx, sy, TILE, inDirs);
    
    if (!spriteOk) {
      ctx.fillStyle = '#3a3a3a'; ctx.fillRect(sx + 1, sy + 1, TILE - 2, TILE - 2); 
      ctx.fillStyle = '#4a4a4a'; ctx.fillRect(sx + 3, sy + 3, TILE - 6, TILE - 6);
      drawArrow(sx, sy, c.dir, '#c8b060');
    }
  }

  for (const s of splitters) {
    const sx = s.tx * TILE, sy = s.ty * TILE;
    if (s.isBroken) { 
      ctx.save(); ctx.globalAlpha = 0.35; 
      if (s.dir === 1 || s.dir === 3) ctx.fillStyle = '#5a4a2a', ctx.fillRect(sx, sy, TILE * 2, TILE); 
      else ctx.fillStyle = '#5a4a2a', ctx.fillRect(sx, sy, TILE, TILE * 2); 
      ctx.restore(); 
      drawBrokenOverlay(sx, sy, TILE * 2); 
      continue; 
    }
    
    const isH = s.dir === 0 || s.dir === 2;
    ctx.fillStyle = '#c8a040'; 
    if (isH) ctx.fillRect(sx, sy, TILE * 2, TILE);
    else ctx.fillRect(sx, sy, TILE, TILE * 2);
    
    ctx.fillStyle = '#a07020';
    if (isH) ctx.fillRect(sx + 4, sy + 4, TILE * 2 - 8, TILE - 8);
    else ctx.fillRect(sx + 4, sy + 4, TILE - 8, TILE * 2 - 8);
    
    ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 3;
    const cx = sx + (isH ? TILE : TILE/2);
    const cy = sy + (isH ? TILE/2 : TILE);
    const [dx, dy] = DIR_DELTA[s.dir];
    
    ctx.beginPath(); ctx.moveTo(cx - dx * TILE/2, cy - dy * TILE/2); ctx.lineTo(cx, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy);
    if (isH) ctx.lineTo(cx + dx * TILE/2, cy - TILE/2); else ctx.lineTo(cx - TILE/2, cy + dy * TILE/2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy);
    if (isH) ctx.lineTo(cx + dx * TILE/2, cy + TILE/2); else ctx.lineTo(cx + TILE/2, cy + dy * TILE/2); ctx.stroke();
    
    if (s.filterLeft) {
      ctx.fillStyle = RES_COLOR[s.filterLeft] || '#fff';
      let dotX, dotY;
      if (isH) { dotX = cx + dx * TILE/2; dotY = cy - TILE/2; } else { dotX = cx - TILE/2; dotY = cy + dy * TILE/2; }
      ctx.beginPath(); ctx.arc(dotX, dotY, 4, 0, Math.PI*2); ctx.fill();
    }
    if (s.filterRight) {
      ctx.fillStyle = RES_COLOR[s.filterRight] || '#fff';
      let dotX, dotY;
      if (isH) { dotX = cx + dx * TILE/2; dotY = cy + TILE/2; } else { dotX = cx + TILE/2; dotY = cy + dy * TILE/2; }
      ctx.beginPath(); ctx.arc(dotX, dotY, 4, 0, Math.PI*2); ctx.fill();
    }
  }

  for (const u of undergrounds) {
    const sx = u.tx * TILE, sy = u.ty * TILE;
    if (u.isBroken) { drawBrokenOverlay(sx, sy, TILE); continue; }
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(sx + TILE/2, sy + TILE/2, TILE/2 - 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(sx + TILE/2, sy + TILE/2, TILE/2 - 6, 0, Math.PI * 2); ctx.fill();
    
    ctx.fillStyle = u.isEntrance ? '#7fbf7f' : '#ffaa00';
    ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const [dx, dy] = DIR_DELTA[u.dir];
    const arrow = dx === 1 ? '→' : dx === -1 ? '←' : dy === 1 ? '↓' : '↑';
    ctx.fillText(arrow, sx + TILE/2, sy + TILE/2);
    
    if (state.activeConveyor === u) {
      if (u.partner && !u.partner.isBroken) {
        ctx.strokeStyle = 'rgba(255, 220, 100, 0.8)'; ctx.lineWidth = 3; ctx.setLineDash([6, 6]);
        ctx.beginPath(); ctx.moveTo(sx + TILE/2, sy + TILE/2); 
        ctx.lineTo(u.partner.tx * TILE + TILE/2, u.partner.ty * TILE + TILE/2); ctx.stroke();
        ctx.setLineDash([]);
      } else {
        ctx.strokeStyle = 'rgba(255, 80, 80, 0.8)'; ctx.lineWidth = 3; ctx.setLineDash([6, 6]);
        ctx.beginPath(); ctx.moveTo(sx + TILE/2, sy + TILE/2); 
        ctx.lineTo(sx + TILE/2 + dx * TILE * 4, sy + TILE/2 + dy * TILE * 4); ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }

  const itemSize = 12;
  for (const c of conveyors) {
    if (c.isBroken) continue;
    const sx = c.tx * TILE, sy = c.ty * TILE;
    for (const it of c.items) {
      const p = Math.min(1, it.progress);
      let ix, iy;
      if (c.dir === 0) { ix = sx + TILE/2 - itemSize/2; iy = sy + TILE - p * TILE - itemSize; }
      else if (c.dir === 2) { ix = sx + TILE/2 - itemSize/2; iy = sy + p * TILE; }
      else if (c.dir === 1) { ix = sx + p * TILE; iy = sy + TILE/2 - itemSize/2; }
      else { ix = sx + TILE - p * TILE - itemSize; iy = sy + TILE/2 - itemSize/2; }
      drawResIcon(it.type, ix, iy, itemSize, 0);
    }
  }
  
  for (const s of splitters) {
    if (s.isBroken) continue;
    const isH = s.dir === 0 || s.dir === 2;
    const cx = s.tx * TILE + (isH ? TILE : TILE / 2);
    const cy = s.ty * TILE + (isH ? TILE / 2 : TILE);

    for (const it of s.items) {
      const p = Math.min(1, it.progress);
      let ix, iy;
      if (p < 1) {
        const [dx, dy] = DIR_DELTA[s.dir];
        const startX = cx - dx * TILE * 0.5;
        const startY = cy - dy * TILE * 0.5;
        ix = startX + (cx - startX) * p - itemSize/2;
        iy = startY + (cy - startY) * p - itemSize/2;
      } else {
        ix = cx - itemSize/2 + (Math.random() - 0.5) * 4;
        iy = cy - itemSize/2 + (Math.random() - 0.5) * 4;
      }
      drawResIcon(it.type, ix, iy, itemSize, 0);
    }
  }

  for (const c of conveyors) { if (c.isBroken || c.hp === undefined) continue; drawHpCircle(c.tx * TILE, c.ty * TILE, c.hp, c.maxHp); }
  for (const s of splitters) { if (s.isBroken || s.hp === undefined) continue; drawHpCircle(s.tx * TILE, s.ty * TILE, s.hp, s.maxHp); }
  for (const u of undergrounds) { if (u.isBroken || u.hp === undefined) continue; drawHpCircle(u.tx * TILE, u.ty * TILE, u.hp, u.maxHp); }
}