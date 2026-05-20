function dist(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
}

function randRange(min, max) {
    return min + Math.random() * (max - min);
}

function randInt(min, max) {
    return Math.floor(randRange(min, max + 1));
}

function normalize(x, y) {
    const len = Math.sqrt(x * x + y * y);
    if (len === 0) return { x: 0, y: 0 };
    return { x: x / len, y: y / len };
}

function angle(x1, y1, x2, y2) {
    return Math.atan2(y2 - y1, x2 - x1);
}

function easeInQuad(t) {
    return t * t;
}

function easeOutQuad(t) {
    return t * (2 - t);
}

function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function circlesCollide(x1, y1, r1, x2, y2, r2) {
    const d = dist(x1, y1, x2, y2);
    return d < r1 + r2;
}

function distPointToSegment(px, py, ax, ay, bx, by) {
    const vx = bx - ax;
    const vy = by - ay;
    const len2 = vx * vx + vy * vy;
    if (len2 < 1e-8) return dist(px, py, ax, ay);
    let t = ((px - ax) * vx + (py - ay) * vy) / len2;
    t = clamp(t, 0, 1);
    return dist(px, py, ax + vx * t, ay + vy * t);
}

function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
