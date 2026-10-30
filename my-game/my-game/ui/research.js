'use strict';

import { state, showToast } from '../game.js';
import { CATEGORIES, TECHNOLOGIES, isTechOwned, selectStudyTech, cancelStudy, getTechProgressPct } from '../research.js';
import { researchClose } from './core.js'; // Импортируем кнопку закрытия
import { playClick } from '../audio.js';

// Находим элементы локально, т.к. они специфичны только для этого экрана
const researchScreen = document.getElementById('research-screen');
const researchTabs = document.getElementById('research-tabs');
const researchViewport = document.getElementById('research-viewport');
const researchWorld = document.getElementById('research-world');
const researchSvg = document.getElementById('research-svg');
const researchNodes = document.getElementById('research-nodes');

let cam = { x: 0, y: 0, scale: 1 }, isDragging = false, startX = 0, startY = 0, initialCamX = 0, initialCamY = 0, uiLastStudyTechId = null;
let activeResearchCat = 'production';
let researchFirstOpen = true;

if (researchClose) researchClose.addEventListener('click', closeResearchPanel);

function applyCamera() { researchWorld.style.transform = `translate(${cam.x}px, ${cam.y}px) scale(${cam.scale})`; }

researchViewport.addEventListener('wheel', (e) => {
  e.preventDefault();
  const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
  const newScale = Math.max(0.15, Math.min(2, cam.scale * zoomFactor));
  const rect = researchViewport.getBoundingClientRect();
  const mouseX = e.clientX - rect.left, mouseY = e.clientY - rect.top;
  cam.x = mouseX - (mouseX - cam.x) * (newScale / cam.scale);
  cam.y = mouseY - (mouseY - cam.y) * (newScale / cam.scale);
  cam.scale = newScale; applyCamera();
}, { passive: false });

let pinchStartDist = 0, initialScale = 1;
const activePointers = new Map();

researchViewport.addEventListener('pointerdown', (e) => {
  if (e.target.closest('#tech-detail-modal') || e.target.closest('.tech-card') || e.target.closest('#research-topbar')) return;
  researchViewport.setPointerCapture(e.pointerId);
  activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (activePointers.size === 1) {
    isDragging = true; startX = e.clientX; startY = e.clientY; initialCamX = cam.x; initialCamY = cam.y;
  } else if (activePointers.size === 2) {
    isDragging = false;
    const pts = [...activePointers.values()];
    pinchStartDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    initialScale = cam.scale;
  }
});

researchViewport.addEventListener('pointermove', (e) => {
  if (!activePointers.has(e.pointerId)) return;
  activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (activePointers.size === 1 && isDragging) {
    cam.x = initialCamX + (e.clientX - startX); cam.y = initialCamY + (e.clientY - startY); applyCamera();
  } else if (activePointers.size === 2) {
    const pts = [...activePointers.values()];
    const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    const newScale = Math.max(0.15, Math.min(2, initialScale * (dist / pinchStartDist)));
    const midX = (pts[0].x + pts[1].x) / 2, midY = (pts[0].y + pts[1].y) / 2;
    const rect = researchViewport.getBoundingClientRect();
    const localMidX = midX - rect.left, localMidY = midY - rect.top;
    cam.x = localMidX - (localMidX - cam.x) * (newScale / cam.scale);
    cam.y = localMidY - (localMidY - cam.y) * (newScale / cam.scale);
    cam.scale = newScale; applyCamera();
  }
});

function endPointer(e) {
  activePointers.delete(e.pointerId);
  if (activePointers.size === 0) isDragging = false;
  else if (activePointers.size === 1) {
    const pts = [...activePointers.values()];
    startX = pts[0].x; startY = pts[0].y; initialCamX = cam.x; initialCamY = cam.y; isDragging = true;
  }
}
researchViewport.addEventListener('pointerup', endPointer);
researchViewport.addEventListener('pointercancel', endPointer);

export function openResearchPanel() { 
  import('./core.js').then(m => m.closeModal()); 
  state.panel = 'research'; 
  if (researchScreen) researchScreen.classList.remove('hidden'); 
  if (researchFirstOpen) cam = { x: 0, y: 0, scale: 1 };
  renderResearchPanel(); 
  researchFirstOpen = false;
}

export function closeResearchPanel() { 
  if (researchScreen) researchScreen.classList.add('hidden'); 
  state.panel = null; 
  closeTechModal(); 
}

function renderResearchPanel() {
  uiLastStudyTechId = state.activeStudyTechId;
  
  researchTabs.innerHTML = '';
  for (const cat of CATEGORIES) {
    const isActive = cat.id === activeResearchCat;
    const btn = document.createElement('button');
    btn.textContent = cat.name;
    btn.className = isActive ? 'active' : '';
    btn.addEventListener('click', () => { playClick(); activeResearchCat = cat.id; renderResearchPanel(); });
    researchTabs.appendChild(btn);
  }

  researchNodes.innerHTML = ''; 
  researchSvg.innerHTML = '';
  
  const NODE_W = 130, NODE_H = 75, GAP_Y = 40, GAP_X = 12;
  let maxTotalY = 0;
  const globalPositions = {};
  let currentColumnStartX = 50;

  const catTechs = TECHNOLOGIES.filter(t => t.cat === activeResearchCat && t.era === 1);
  
  const header = document.createElement('div');
  header.textContent = CATEGORIES.find(c => c.id === activeResearchCat).name;
  header.style.position = 'absolute';
  header.style.top = '40px';
  header.style.fontSize = '24px'; 
  header.style.fontWeight = '900';
  header.style.color = '#ffd700';
  header.style.zIndex = '2';
  header.style.whiteSpace = 'nowrap';
  header.style.transform = 'translateX(-50%)'; 
  header.style.textShadow = '0 2px 6px rgba(0,0,0,0.9)';
  researchNodes.appendChild(header);

  if (catTechs.length > 0) {
    const techMap = {}; 
    for (const t of catTechs) techMap[t.id] = t;
    
    const children = {}; const roots = [];
    for (const t of catTechs) {
      const parentsInCol = (t.requires || []).filter(r => techMap[r]);
      if (parentsInCol.length === 0) roots.push(t.id);
      for (const p of parentsInCol) { 
        if (!children[p]) children[p] = []; 
        children[p].push(t.id); 
      }
    }

    let rootStartX = currentColumnStartX;
    let colMinX = Infinity;
    let colMaxX = -Infinity;

    function layoutNode(id, depth, startX) {
      const kids = children[id] || [];
      globalPositions[id] = { y: 140 + depth * (NODE_H + GAP_Y) };
      
      if (kids.length === 0) {
        globalPositions[id].x = startX;
        return NODE_W + GAP_X;
      }
      
      let childX = startX;
      let totalWidth = 0;
      
      for (const kid of kids) {
        const w = layoutNode(kid, depth + 1, childX);
        childX += w;
        totalWidth += w;
      }
      
      const firstKidX = globalPositions[kids[0]].x;
      const lastKidX = globalPositions[kids[kids.length - 1]].x;
      globalPositions[id].x = (firstKidX + lastKidX + NODE_W) / 2 - NODE_W / 2;
      
      return totalWidth;
    }

    for (const rid of roots) {
      const width = layoutNode(rid, 0, rootStartX);
      rootStartX += width + 30;
    }
    
    for (const id in globalPositions) {
      colMinX = Math.min(colMinX, globalPositions[id].x);
      colMaxX = Math.max(colMaxX, globalPositions[id].x + NODE_W);
      maxTotalY = Math.max(maxTotalY, globalPositions[id].y + NODE_H);
    }

    const colCenterX = (colMinX + colMaxX) / 2;
    header.style.left = colCenterX + 'px';
    currentColumnStartX = colMaxX + 100;
  } else {
    header.style.left = '100px';
    currentColumnStartX = 200;
  }

  const totalWidth = currentColumnStartX;
  const totalHeight = Math.max(400, maxTotalY + 150);

  researchSvg.style.width = totalWidth + 'px';
  researchSvg.style.height = totalHeight + 'px';
  researchNodes.style.width = totalWidth + 'px';
  researchNodes.style.height = totalHeight + 'px';

  const bgText = document.createElement('div');
  bgText.textContent = 'I ЭПОХА';
  bgText.style.position = 'absolute';
  bgText.style.top = '-90px'; 
  bgText.style.left = '50%';
  bgText.style.transform = 'translateX(-50%)';
  bgText.style.fontSize = '120px'; 
  bgText.style.fontWeight = '900';
  bgText.style.color = 'rgba(255, 255, 255, 0.03)'; 
  bgText.style.pointerEvents = 'none';
  bgText.style.whiteSpace = 'nowrap';
  bgText.style.zIndex = '0';
  researchNodes.appendChild(bgText);

  const cardElements = {};
  for (const id in globalPositions) {
    const t = TECHNOLOGIES.find(x => x.id === id);
    if (!t) continue;

    const cardDiv = document.createElement('div');
    cardDiv.className = 'tech-card-wrapper';
    cardDiv.style.position = 'absolute';
    cardDiv.style.left = globalPositions[id].x + 'px';
    cardDiv.style.top = globalPositions[id].y + 'px';
    cardDiv.style.zIndex = '1';
    cardDiv.innerHTML = renderTechCardHtml(t);
    cardDiv.addEventListener('click', (e) => {
      e.stopPropagation();
      playClick();
      showTechModal(t);
    });
    researchNodes.appendChild(cardDiv);
    cardElements[id] = cardDiv;
  }

  if (researchFirstOpen) {
    const firstRootId = catTechs.find(t => t.requires.length === 0)?.id;
    if (firstRootId && globalPositions[firstRootId]) {
      const startNode = globalPositions[firstRootId];
      const vpRect = researchViewport.getBoundingClientRect();
      cam.x = -(startNode.x - vpRect.width / 2 + NODE_W / 2);
      cam.y = -(startNode.y - vpRect.height / 3);
      applyCamera();
    }
  }

  setTimeout(() => {
    let allSvgLines = '';
    for (const id in globalPositions) {
      const t = TECHNOLOGIES.find(x => x.id === id);
      if (!t) continue;

      for (const reqId of (t.requires || [])) {
        const reqT = TECHNOLOGIES.find(x => x.id === reqId);
        if (!reqT || reqT.cat !== t.cat) continue;

        const parentEl = cardElements[reqId];
        const childEl = cardElements[id];
        if (!parentEl || !childEl) continue;

        const x1 = parentEl.offsetLeft + parentEl.offsetWidth / 2;
        const y1 = parentEl.offsetTop + parentEl.offsetHeight;
        const x2 = childEl.offsetLeft + childEl.offsetWidth / 2;
        const y2 = childEl.offsetTop;

        const midY = y1 + (y2 - y1) * 0.5;
        const strokeColor = isTechOwned(reqId) ? '#5a7a5a' : '#333';
        allSvgLines += `<path d="M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}" stroke="${strokeColor}" stroke-width="2" fill="none" stroke-linejoin="round" />`;
      }
    }
    researchSvg.innerHTML = allSvgLines;
  }, 0);
}

function renderTechCardHtml(t) {
  const owned = isTechOwned(t.id), locked = t.requires.some(r => !isTechOwned(r));
  const isActive = state.activeStudyTechId === t.id, progressPct = getTechProgressPct(t.id);
  
  let statusText, statusColor;
  if (owned) { statusText = '✓'; statusColor = '#7fbf7f'; }
  else if (t.isStub) { statusText = '⚙️'; statusColor = '#777'; }
  else if (locked) { statusText = '🔒'; statusColor = '#888'; }
  else if (isActive) { statusText = progressPct.toFixed(0) + '%'; statusColor = '#7fbfff'; }
  else { statusText = `${t.studyPercent * 2}🧬`; statusColor = '#aaa'; }

  return `<div class="tech-card ${owned ? 'owned' : ''} ${locked ? 'locked' : ''} ${isActive ? 'selected' : ''}" style="width:130px; padding:6px; box-sizing:border-box; cursor:pointer;">
    <div class="tech-head" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
      <div class="tech-name" style="font-size:11px; font-weight:bold; line-height:1.1;">${t.name}</div>
      <div class="tech-status" style="font-size:10px; color:${statusColor}; margin-left:2px;">${statusText}</div>
    </div>
    <div class="tech-desc" style="font-size:9px; color:#888; line-height:1.1; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${t.desc}</div>
  </div>`;
}

function showTechModal(t) {
  let modalEl = document.getElementById('tech-detail-modal');
  if (modalEl) modalEl.remove();
  
  modalEl = document.createElement('div');
  modalEl.id = 'tech-detail-modal';
  modalEl.style.cssText = 'position:absolute; inset:0; background:rgba(0,0,0,0.7); z-index:100; display:flex; align-items:center; justify-content:center; padding:20px; opacity:0; transition:opacity 0.15s;';
  
  const owned = isTechOwned(t.id), locked = t.requires.some(r => !isTechOwned(r));
  const isActive = state.activeStudyTechId === t.id, progressPct = getTechProgressPct(t.id);
  
  let btnHtml = '';
  if (t.isStub) {
    btnHtml = `<div style="text-align:center; color:#888; font-size:13px; margin-top:12px; border:1px dashed #444; padding:10px; border-radius:8px;">⚙️ В РАЗРАБОТКЕ</div>`;
  } else if (owned) {
    btnHtml = `<div style="text-align:center; color:#7fbf7f; font-size:13px; margin-top:12px; border:1px solid #4a7a4a; background:#1a2a1a; padding:10px; border-radius:8px;">✓ Изучено</div>`;
  } else if (locked) {
    btnHtml = `<div style="text-align:center; color:#a06060; font-size:13px; margin-top:12px; border:1px solid #5a2a2a; background:#2a1a1a; padding:10px; border-radius:8px;">🔒 Требуются предыдущие технологии</div>`;
  } else if (isActive) {
    btnHtml = `<button id="modal-cancel-btn" class="option-btn" style="margin-top:12px; justify-content:center; background:#7a3a3a; border-color:#a04040; color:#fff;">Отменить изучение (${progressPct.toFixed(1)}%)</button>`;
  } else {
    btnHtml = `<button id="modal-start-btn" class="option-btn" style="margin-top:12px; justify-content:center; border-color:#c8a040; color:#ffd700;">🧬 Изучать (${t.studyPercent * 2} ДНК)</button>`;
  }

  let reqHtml = '';
  if (t.requires.length > 0) {
    reqHtml = `<div style="margin-top:10px; font-size:12px; color:#ccc;"><strong>Требуется:</strong><ul style="margin:4px 0 0 16px; padding:0;">`;
    for (const r of t.requires) {
      const rt = TECHNOLOGIES.find(x => x.id === r);
      const isReqOwned = isTechOwned(r);
      reqHtml += `<li style="color:${isReqOwned ? '#7fbf7f' : '#e06060'}">${rt ? rt.name : r} ${isReqOwned ? '✓' : ''}</li>`;
    }
    reqHtml += `</ul></div>`;
  }

  modalEl.innerHTML = `
    <div style="background:#1e1e1e; border:2px solid #555; border-radius:12px; padding:16px; width:100%; max-width:320px; color:#fff; box-shadow:0 8px 24px rgba(0,0,0,0.8); transform:translateY(10px); transition:transform 0.15s;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
        <div style="font-size:16px; font-weight:bold; color:#ffd700;">${t.name}</div>
        <button id="modal-close-btn" style="background:transparent; border:none; color:#888; font-size:16px; cursor:pointer; padding:0 4px;">✕</button>
      </div>
      <div style="font-size:13px; color:#bbb; line-height:1.4;">${t.desc}</div>
      ${reqHtml}
      ${btnHtml}
    </div>
  `;

  researchScreen.appendChild(modalEl);
  
  requestAnimationFrame(() => {
    modalEl.style.opacity = '1';
    modalEl.firstElementChild.style.transform = 'translateY(0)';
  });

  const close = () => {
    modalEl.style.opacity = '0';
    modalEl.firstElementChild.style.transform = 'translateY(10px)';
    setTimeout(() => modalEl.remove(), 150);
  };

  modalEl.querySelector('#modal-close-btn').addEventListener('click', () => { playClick(); close(); });
  modalEl.addEventListener('click', (e) => { if (e.target === modalEl) close(); });

  const startBtn = modalEl.querySelector('#modal-start-btn');
  if (startBtn) startBtn.addEventListener('click', () => {
    playClick();
    if (selectStudyTech(t.id)) { close(); renderResearchPanel(); }
    else showToast('Нельзя изучать');
  });

  const cancelBtn = modalEl.querySelector('#modal-cancel-btn');
  if (cancelBtn) cancelBtn.addEventListener('click', () => {
    playClick();
    cancelStudy(); close(); renderResearchPanel();
  });
}

function closeTechModal() {
  const el = document.getElementById('tech-detail-modal');
  if (el) el.remove();
}

export function updateResearchLive() {
  if (state.panel !== 'research') return;
  if (uiLastStudyTechId && !state.activeStudyTechId) renderResearchPanel();
  uiLastStudyTechId = state.activeStudyTechId;
  
  if (state.activeStudyTechId) {
    const activeCard = researchNodes.querySelector('.tech-card.selected');
    if (activeCard) {
      const statusEl = activeCard.querySelector('.tech-status');
      const pct = getTechProgressPct(state.activeStudyTechId);
      if (statusEl) statusEl.textContent = pct.toFixed(0) + '%';
    }
  }
}