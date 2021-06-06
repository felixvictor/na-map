/*!
 * JavaScript implementation of Trilateration to find the position of a
 * point (P4) from three known points in 3D space (P1, P2, P3) and their
 * distance from the point in question.
 *
 * The solution used here is based on the derivation found on the Wikipedia
 * page of Trilateration: https://en.wikipedia.org/wiki/Trilateration
 *
 * This library does not need any 3rd party tools as all the non-basic
 * geometric functions needed are declared inside the trilaterate() function.
 *
 * See the GitHub page: https://github.com/gheja/trilateration.js
 */

export interface Vector {
    x: number
    y: number
    z: number
}
interface Circle {
    x: number
    y: number
    z: number
    r: number
}

// Scalar and vector operations

const sqr = (a: number): number => a * a

const norm = (a: Vector): number => Math.sqrt(sqr(a.x) + sqr(a.y) + sqr(a.z))

const dot = (a: Vector, b: Vector): number => a.x * b.x + a.y * b.y + a.z * b.z

const vectorSubtract = (a: Vector, b: Vector): Vector => ({
    x: a.x - b.x,
    y: a.y - b.y,
    z: a.z - b.z,
})

const vectorAdd = (a: Vector, b: Vector): Vector => ({
    x: a.x + b.x,
    y: a.y + b.y,
    z: a.z + b.z,
})

const vectorDivide = (a: Vector, b: number): Vector => ({
    x: a.x / b,
    y: a.y / b,
    z: a.z / b,
})

const vectorMultiply = (a: Vector, b: number): Vector => ({
    x: a.x * b,
    y: a.y * b,
    z: a.z * b,
})

const vectorCross = (a: Vector, b: Vector): Vector => ({
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
})

/**
 * Calculates the coordinates of a point in 3D space from three known points
 * and the distances between those points and the point in question.
 *
 * If no solution found then null will be returned.
 *
 * If two solutions found then both will be returned, unless the fourth
 * parameter (return#middle) is set to true when the middle of the two solution
 * will be returned.
 *
 * @param p1 - Point and distance
 * @param p2 - Point and distance
 * @param p3 - Point and distance
 * @param returnMiddle - If two solutions found then return the center of them
 * @returns Solution
 */
export const trilaterate = (
    p1: Circle,
    p2: Circle,
    p3: Circle,
    returnMiddle = false
): Vector | Vector[] | undefined => {
    // based on: https://en.wikipedia.org/wiki/Trilateration

    const ex = vectorDivide(vectorSubtract(p2, p1), norm(vectorSubtract(p2, p1)))
    const i = dot(ex, vectorSubtract(p3, p1))
    let a = vectorSubtract(vectorSubtract(p3, p1), vectorMultiply(ex, i))
    const ey = vectorDivide(a, norm(a))
    const ez = vectorCross(ex, ey)
    const d = norm(vectorSubtract(p2, p1))
    const j = dot(ey, vectorSubtract(p3, p1))

    const x = (sqr(p1.r) - sqr(p2.r) + sqr(d)) / (2 * d)
    const y = (sqr(p1.r) - sqr(p3.r) + sqr(i) + sqr(j)) / (2 * j) - (i / j) * x

    let b = sqr(p1.r) - sqr(x) - sqr(y)

    // floating point math flaw in IEEE 754 standard
    // see https://github.com/gheja/trilateration.js/issues/2
    if (Math.abs(b) < 0.000_000_000_1) {
        b = 0
    }

    const z = Math.sqrt(b)

    // no solution found
    if (Number.isNaN(z)) {
        return
    }

    a = vectorAdd(p1, vectorAdd(vectorMultiply(ex, x), vectorMultiply(ey, y)))
    const p4a = vectorAdd(a, vectorMultiply(ez, z))
    const p4b = vectorSubtract(a, vectorMultiply(ez, z))

    if (z === 0 || returnMiddle) {
        return a
    }

    return [p4a, p4b]
}
