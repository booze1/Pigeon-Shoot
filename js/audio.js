"use strict";

// All sound effects are synthesised with WebAudio — no audio assets needed.
const Sfx = {
  ctx: null,
  muted: false,
  noiseBuf: null,

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    const len = this.ctx.sampleRate * 0.5;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  },

  ready() {
    return this.ctx && !this.muted;
  },

  noise(duration, freqStart, freqEnd, vol, when = 0) {
    const t = this.ctx.currentTime + when;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(freqStart, t);
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), t + duration);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    src.connect(filter).connect(gain).connect(this.ctx.destination);
    src.start(t);
    src.stop(t + duration);
  },

  tone(type, freqStart, freqEnd, duration, vol, when = 0) {
    const t = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, freqEnd), t + duration);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + duration);
  },

  shot() {
    if (!this.ready()) return;
    this.noise(0.32, 2600, 220, 0.9);        // blast
    this.tone("triangle", 130, 40, 0.25, 0.7); // body thump
  },

  emptyClick() {
    if (!this.ready()) return;
    this.tone("square", 1900, 1200, 0.04, 0.12);
  },

  reloadStart() {
    if (!this.ready()) return;
    this.tone("square", 700, 500, 0.05, 0.16);       // break open
    this.noise(0.06, 1500, 700, 0.12, 0.09);          // shells out
  },

  reloadEnd() {
    if (!this.ready()) return;
    this.tone("square", 480, 380, 0.05, 0.18);
    this.tone("square", 300, 220, 0.06, 0.2, 0.07);  // snap shut
  },

  coin() {
    if (!this.ready()) return;
    this.tone("sine", 880, 880, 0.07, 0.22);
    this.tone("sine", 1320, 1320, 0.12, 0.22, 0.07);
  },

  brace() {
    if (!this.ready()) return;
    this.tone("sine", 660, 660, 0.08, 0.25);
    this.tone("sine", 880, 880, 0.08, 0.25, 0.08);
    this.tone("sine", 1320, 1320, 0.16, 0.25, 0.16);
  },

  thud() {
    if (!this.ready()) return;
    this.noise(0.09, 500, 120, 0.3);
    this.tone("sine", 95, 50, 0.09, 0.3);
  },

  click() {
    if (!this.ready()) return;
    this.tone("square", 900, 700, 0.03, 0.1);
  },

  buy() {
    if (!this.ready()) return;
    this.tone("square", 520, 520, 0.05, 0.16);        // till key
    this.tone("sine", 990, 990, 0.08, 0.22, 0.06);    // cha-
    this.tone("sine", 1480, 1480, 0.14, 0.22, 0.13);  // ching
  },

  deny() {
    if (!this.ready()) return;
    this.tone("square", 220, 160, 0.12, 0.16);
  },

  fanfare() {
    if (!this.ready()) return;
    this.tone("triangle", 523, 523, 0.1, 0.28);
    this.tone("triangle", 659, 659, 0.1, 0.28, 0.09);
    this.tone("triangle", 784, 784, 0.12, 0.28, 0.18);
    this.tone("triangle", 1046, 1046, 0.24, 0.3, 0.28);
  },

  penalty() {
    if (!this.ready()) return;
    this.tone("sawtooth", 340, 340, 0.12, 0.14);
    this.tone("sawtooth", 254, 254, 0.2, 0.16, 0.12);
  },

  bark() {
    if (!this.ready()) return;
    this.tone("square", 340, 170, 0.07, 0.12);
  },
};
