// @thednp/dommatrix ships as CJS: `module.exports = Class`. TS's
// `esModuleInterop` unwraps this to `import X from 'pkg'` for us,
// once the ambient declaration in src/types/dommatrix.d.ts provides
// the default export.
import DOMMatrix from '@thednp/dommatrix'

// Augment the prototype with the methods pdfjs-dist uses that
// @thednp/dommatrix doesn't implement (no-op chains: identity
// transform). @thednp/dommatrix already implements multiplySelf,
// translateSelf, scaleSelf, rotateSelf and friends. The actual
// gaps for pdfjs-dist's text-extraction path are:
//   - invertSelf()        (pdf.mjs:7622, 16577, 16607, 16686, 16792)
//   - preMultiplySelf()   (pdf.mjs:16697)
//   - invert()            (defensive; pdfjs-dist doesn't currently
//                          call this on a fresh matrix, but it appears
//                          in related APIs)
if (typeof DOMMatrix.prototype.invertSelf !== 'function') {
  DOMMatrix.prototype.invertSelf = function () { return this }
}
if (typeof DOMMatrix.prototype.preMultiplySelf !== 'function') {
  DOMMatrix.prototype.preMultiplySelf = function () { return this }
}
if (typeof DOMMatrix.prototype.invert !== 'function') {
  DOMMatrix.prototype.invert = function () { return this }
}

if (typeof globalThis.DOMMatrix === 'undefined') {
  // Cast: lib.dom.d.ts types `var DOMMatrix` as the full DOMMatrix
  // interface (with ~20 self-mutating methods our class doesn't
  // implement). At runtime, pdf-parse only calls the methods that
  // are present or that the shim above adds, so the structural
  // mismatch is harmless.
  globalThis.DOMMatrix = DOMMatrix as unknown as typeof globalThis.DOMMatrix
}

export {}
