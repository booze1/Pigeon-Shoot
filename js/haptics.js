"use strict";

// Best-effort haptic feedback.
// - Android / Chrome: navigator.vibrate patterns.
// - iOS Safari 17.4+: toggling a hidden <input type="checkbox" switch>
//   produces a real haptic tick (the only web haptic iOS exposes).
const Haptics = {
  el: null,
  enabled: true,

  init() {
    if (this.el || navigator.vibrate) return;
    const label = document.createElement("label");
    label.style.cssText =
      "position:fixed;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.setAttribute("switch", "");
    label.appendChild(input);
    document.body.appendChild(label);
    this.el = input;
  },

  tick() {
    if (!this.enabled) return;
    try {
      if (navigator.vibrate) navigator.vibrate(12);
      else if (this.el) this.el.click();
    } catch (e) { /* no haptics available */ }
  },

  shot() {
    if (!this.enabled) return;
    try {
      if (navigator.vibrate) navigator.vibrate(20);
      else if (this.el) this.el.click();
    } catch (e) { /* no haptics available */ }
  },

  kill() {
    if (!this.enabled) return;
    try {
      if (navigator.vibrate) navigator.vibrate([16, 40, 24]);
      else if (this.el) setTimeout(() => this.el.click(), 70);
    } catch (e) { /* no haptics available */ }
  },

  brace() {
    if (!this.enabled) return;
    try {
      if (navigator.vibrate) navigator.vibrate([18, 40, 18, 40, 36]);
      else if (this.el) {
        setTimeout(() => this.el.click(), 70);
        setTimeout(() => this.el.click(), 160);
      }
    } catch (e) { /* no haptics available */ }
  },
};
