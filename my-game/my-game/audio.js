'use strict';

import { state } from './game.js';

let audioCtx = null;
let lastMineSound = 0;

export function initAudio() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      audioCtx = new AudioContext();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playTone(freq, type, duration, vol, slideTo = null) {
  if (!audioCtx || !state.soundEnabled) return;
  
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  
  if (slideTo !== null) {
    osc.frequency.exponentialRampToValueAtTime(slideTo, audioCtx.currentTime + duration);
  }
  
  gain.gain.setValueAtTime(vol, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
  
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

export function playMineSound() {
  const now = performance.now();
  if (now - lastMineSound < 100) return; 
  lastMineSound = now;
  playTone(400 + Math.random() * 100, 'square', 0.05, 0.02);
}

export function playBuildSound() {
  playTone(300, 'triangle', 0.1, 0.1, 600);
}

export function playTurretShot() {
  playTone(800, 'sawtooth', 0.1, 0.05, 200);
}

export function playExplosion() {
  if (!audioCtx || !state.soundEnabled) return;
  const bufferSize = audioCtx.sampleRate * 0.3;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
  
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1000;

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  noise.start();
}

export function playClick() {
  playTone(600, 'sine', 0.05, 0.1);
}

export function playGameOver() {
  playTone(200, 'sawtooth', 1.5, 0.2, 50);
}