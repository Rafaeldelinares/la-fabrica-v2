/**
 * Vitest setup — runs before every test file.
 * Extends `expect` with @testing-library/jest-dom matchers
 * (toBeInTheDocument, toHaveAttribute, toHaveTextContent, etc.).
 */
import '@testing-library/jest-dom';

/**
 * DOMMatrix polyfill for pdfjs-dist in jsdom test environment.
 * pdfjs-dist's canvas.js requires DOMMatrix which is not available in jsdom.
 */
if (typeof global.DOMMatrix === 'undefined') {
  global.DOMMatrix = class DOMMatrix {
    constructor() {
      this.a = 1; this.b = 0; this.c = 0; this.d = 1;
      this.e = 0; this.f = 0;
      this.m11 = 1; this.m12 = 0; this.m13 = 0; this.m14 = 0;
      this.m21 = 0; this.m22 = 1; this.m23 = 0; this.m24 = 0;
      this.m31 = 0; this.m32 = 0; this.m33 = 1; this.m34 = 0;
      this.m41 = 0; this.m42 = 0; this.m43 = 0; this.m44 = 1;
    }
    translate() { return this; }
    scale() { return this; }
    rotate() { return this; }
    flipX() { return this; }
    flipY() { return this; }
    transformPoint() { return { x: 0, y: 0 }; }
  };
}

/**
 * URL.createObjectURL polyfill for jsdom test environment.
 * pdfjs-dist's worker setup uses URL.createObjectURL to create blob URLs.
 */
if (typeof URL === 'undefined') {
  global.URL = { createObjectURL: () => 'blob:test', revokeObjectURL: () => {} };
} else if (typeof URL.createObjectURL === 'undefined') {
  URL.createObjectURL = () => 'blob:test';
}
