"use strict";

const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Approximate normal distribution in [-1, 1], peaked at 0.
const randNorm = () =>
  (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
