// Ambient type declaration for @thednp/dommatrix@3.0.4.
// The package ships an empty .d.ts (`export {}`), so TypeScript
// can't see the default export even with esModuleInterop. This
// declaration gives us just enough to type the shim and any
// consumer of the class.
//
// Only the methods our shim (src/lib/parsers/dommatrix-shim.ts)
// and consumers actually touch are typed. Extend if more is needed.

declare module '@thednp/dommatrix' {
  class DOMMatrix {
    constructor()
    isIdentity: boolean
    is2D: boolean
    a: number
    b: number
    c: number
    d: number
    e: number
    f: number
    m11: number
    m12: number
    m13: number
    m14: number
    m21: number
    m22: number
    m23: number
    m24: number
    m31: number
    m32: number
    m33: number
    m34: number
    m41: number
    m42: number
    m43: number
    m44: number
    multiply(other: DOMMatrix): DOMMatrix
    multiplySelf(other: DOMMatrix): this
    translateSelf(x: number, y?: number, z?: number): this
    scaleSelf(x: number, y?: number, z?: number): this
    rotateSelf(x: number, y?: number, z?: number): this
    transformPoint(p: { x: number; y: number; z?: number; w?: number }): unknown
    invertSelf(): this
    preMultiplySelf(other: DOMMatrix): this
    invert(): this
  }
  export default DOMMatrix
}
