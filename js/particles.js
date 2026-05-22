class Particle {
    constructor() { this.active = false; }

    init(x, y, vx, vy, life, size, color, gravity = 0, shrink = true, glow = false) {
        this.x = x; this.y = y;
        this.vx = vx; this.vy = vy;
        this.life = life; this.maxLife = life;
        this.size = size; this.color = color;
        this.gravity = gravity;
        this.shrink = shrink;
        this.glow = glow;
        this.active = true;
    }

    update(dt) {
        if (!this.active) return;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.vy += this.gravity * dt;
        this.life -= dt;
        if (this.life <= 0) this.active = false;
    }

    draw(ctx) {
        if (!this.active) return;
        const t = this.life / this.maxLife;
        const s = this.shrink ? this.size * t : this.size;
        ctx.globalAlpha = t;
        if (this.glow) {
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 8;
        }
        ctx.fillStyle = this.color;
        ctx.fillRect(Math.floor(this.x - s / 2), Math.floor(this.y - s / 2),
            Math.ceil(s), Math.ceil(s));
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
    }
}

class ParticleSystem {
    constructor(poolSize = 500) {
        this.pool = [];
        this.lightningBolts = [];
        for (let i = 0; i < poolSize; i++) {
            this.pool.push(new Particle());
        }
    }

    clear() {
        for (const p of this.pool) p.active = false;
        this.lightningBolts = [];
    }

    emit(x, y, vx, vy, life, size, color, gravity = 0, shrink = true, glow = false) {
        for (const p of this.pool) {
            if (!p.active) {
                p.init(x, y, vx, vy, life, size, color, gravity, shrink, glow);
                return p;
            }
        }
        return null;
    }

    slashTrail(x, y, angle) {
        const count = 6;
        for (let i = 0; i < count; i++) {
            const along = randRange(-12, 18);
            const perpAngle = angle + Math.PI / 2;
            const spread = randRange(-14, 14);
            const px = x + Math.cos(angle) * along + Math.cos(perpAngle) * spread;
            const py = y + Math.sin(angle) * along + Math.sin(perpAngle) * spread;
            const speed = randRange(80, 200);
            this.emit(px, py,
                Math.cos(angle + randRange(-0.4, 0.4)) * speed,
                Math.sin(angle + randRange(-0.4, 0.4)) * speed,
                randRange(0.12, 0.28), randRange(3, 7),
                ['#fff', '#f8faff', '#e8ecf2', '#d0d8e4', '#b8c4d0'][Math.floor(Math.random() * 5)],
                0, true, true);
        }
        for (let i = 0; i < 2; i++) {
            const len = randRange(16, 28);
            const ex = x + Math.cos(angle) * len;
            const ey = y + Math.sin(angle) * len;
            this.emit(ex, ey,
                Math.cos(angle) * randRange(40, 80),
                Math.sin(angle) * randRange(40, 80),
                randRange(0.08, 0.18), randRange(4, 8),
                '#fff', 0, true, true);
        }
    }

    hitSpark(x, y, isCrit) {
        const count = isCrit ? 20 : 10;
        const colors = isCrit
            ? ['#ff0', '#f80', '#f44', '#fff']
            : ['#fff', '#ff0', '#adf'];
        for (let i = 0; i < count; i++) {
            const a = randRange(0, Math.PI * 2);
            const speed = randRange(60, isCrit ? 250 : 150);
            this.emit(x, y,
                Math.cos(a) * speed, Math.sin(a) * speed,
                randRange(0.2, 0.5), randRange(2, isCrit ? 6 : 4),
                colors[Math.floor(Math.random() * colors.length)],
                100, true, true);
        }
    }

    deathEffect(x, y, color) {
        for (let i = 0; i < 16; i++) {
            const a = randRange(0, Math.PI * 2);
            const speed = randRange(30, 100);
            this.emit(x, y,
                Math.cos(a) * speed, Math.sin(a) * speed,
                randRange(0.3, 0.7), randRange(3, 6),
                color, 60, true, false);
        }
    }

    spawnEffect(x, y, color) {
        for (let i = 0; i < 12; i++) {
            const a = randRange(0, Math.PI * 2);
            const r = randRange(10, 30);
            this.emit(x + Math.cos(a) * r, y + Math.sin(a) * r,
                Math.cos(a) * -20, Math.sin(a) * -20,
                randRange(0.5, 1.0), randRange(2, 4),
                color, 0, true, true);
        }
    }

    bulletShatter(x, y) {
        for (let i = 0; i < 8; i++) {
            const a = randRange(0, Math.PI * 2);
            const speed = randRange(40, 100);
            this.emit(x, y,
                Math.cos(a) * speed, Math.sin(a) * speed,
                randRange(0.15, 0.35), randRange(2, 4),
                ['#f4f', '#f8f', '#faf'][Math.floor(Math.random() * 3)],
                80, true, false);
        }
    }

    xpPickup(x, y) {
        for (let i = 0; i < 5; i++) {
            this.emit(x, y,
                randRange(-30, 30), randRange(-60, -20),
                randRange(0.2, 0.4), randRange(2, 3),
                '#4a90e8', 0, true, true);
        }
    }

    freezeEffect(x, y, intensity = 1) {
        const n = Math.round(10 * intensity);
        for (let i = 0; i < n; i++) {
            const a = randRange(0, Math.PI * 2);
            const speed = randRange(25, 80) * intensity;
            this.emit(x, y,
                Math.cos(a) * speed, Math.sin(a) * speed,
                randRange(0.35, 0.7), randRange(3, 7) * intensity,
                ['#c8f0ff', '#78d8ff', '#a8e8ff', '#e8ffff'][Math.floor(Math.random() * 4)],
                0, true, true);
        }
    }

    iceBurstEffect(x, y, radius) {
        for (let i = 0; i < 28; i++) {
            const a = (i / 28) * Math.PI * 2 + randRange(-0.2, 0.2);
            const speed = randRange(90, 200);
            this.emit(x, y,
                Math.cos(a) * speed, Math.sin(a) * speed,
                randRange(0.25, 0.55), randRange(5, 11),
                ['#c8f0ff', '#58b8f0', '#88e0ff', '#e8ffff'][Math.floor(Math.random() * 4)],
                0, true, true);
        }
        for (let i = 0; i < 16; i++) {
            const a = randRange(0, Math.PI * 2);
            const distR = radius * randRange(0.25, 0.95);
            this.emit(
                x + Math.cos(a) * distR, y + Math.sin(a) * distR,
                Math.cos(a) * randRange(10, 40), Math.sin(a) * randRange(10, 40),
                randRange(0.4, 0.75), randRange(4, 9),
                '#a8e8ff', 0, true, true
            );
        }
    }

    iaiCritEffect(x, y) {
        for (let ring = 0; ring < 3; ring++) {
            const count = 10 + ring * 4;
            for (let i = 0; i < count; i++) {
                const a = (i / count) * Math.PI * 2 + ring * 0.4;
                const spd = randRange(100, 220) * (1 - ring * 0.15);
                this.emit(x, y, Math.cos(a) * spd, Math.sin(a) * spd,
                    randRange(0.35, 0.65), randRange(5, 11),
                    ['#fff', '#cef', '#8ef', '#48f'][Math.floor(Math.random() * 4)],
                    0, true, true);
            }
        }
        for (let i = 0; i < 8; i++) {
            const a = randRange(0, Math.PI * 2);
            const len = randRange(30, 70);
            const ex = x + Math.cos(a) * len;
            const ey = y + Math.sin(a) * len;
            this.lightningBolts.push({
                points: [{ x, y }, { x: ex, y: ey }],
                life: 0.35,
                maxLife: 0.35,
            });
        }
    }

    kiReadyBurst(cx, cy, barW, barH) {
        const colors = ['#9ae8ff', '#58c8ff', '#d8f8ff', '#ffffff', '#88e8ff', '#b8f0ff'];
        const halfW = barW * 0.48;
        const halfH = barH * 0.55;
        for (let i = 0; i < 42; i++) {
            const px = cx + randRange(-halfW, halfW);
            const py = cy + randRange(-halfH, halfH);
            const a = randRange(0, Math.PI * 2);
            const spd = randRange(90, 260);
            this.emit(
                px, py,
                Math.cos(a) * spd,
                Math.sin(a) * spd - randRange(40, 120),
                randRange(0.35, 0.75),
                randRange(5, 12),
                colors[Math.floor(Math.random() * colors.length)],
                -80, true, true
            );
        }
        for (let i = 0; i < 18; i++) {
            const t = i / 17;
            const px = cx - halfW + halfW * 2 * t;
            const py = cy + randRange(-halfH * 0.35, halfH * 0.35);
            this.emit(
                px, py,
                randRange(-30, 30),
                randRange(-140, -50),
                randRange(0.45, 0.9),
                randRange(6, 11),
                colors[i % colors.length],
                -60, true, true
            );
        }
    }

    kiReadySparkle(cx, cy, barW, barH) {
        const colors = ['#d8f8ff', '#9ae8ff', '#58c8ff', '#ffffff'];
        const halfW = barW * 0.46;
        for (let i = 0; i < 3; i++) {
            const px = cx + randRange(-halfW, halfW);
            const py = cy + randRange(-barH * 0.35, barH * 0.35);
            this.emit(
                px, py,
                randRange(-25, 25),
                randRange(-90, -35),
                randRange(0.22, 0.45),
                randRange(4, 8),
                colors[Math.floor(Math.random() * colors.length)],
                -50, true, true
            );
        }
    }

    lightningEffect(x1, y1, x2, y2) {
        const dist = Math.hypot(x2 - x1, y2 - y1);
        const segments = Math.max(18, Math.floor(dist / 14));
        const jitter = Math.max(22, dist * 0.14);
        const life = clamp(0.75 + dist * 0.0022, 0.85, 1.25);
        const points = [{ x: x1, y: y1 }];
        for (let i = 1; i < segments; i++) {
            const t = i / segments;
            points.push({
                x: x1 + (x2 - x1) * t + randRange(-jitter, jitter),
                y: y1 + (y2 - y1) * t + randRange(-jitter, jitter),
            });
        }
        points.push({ x: x2, y: y2 });
        this.lightningBolts.push({ points, life, maxLife: life });

        const sparkCount = Math.max(28, Math.floor(dist / 10));
        for (let i = 0; i <= sparkCount; i++) {
            const t = i / sparkCount;
            const px = x1 + (x2 - x1) * t + randRange(-14, 14);
            const py = y1 + (y2 - y1) * t + randRange(-14, 14);
            this.emit(px, py, randRange(-40, 40), randRange(-40, 40),
                randRange(0.35, 0.65), randRange(5, 11),
                ['#ff0', '#fff', '#8ef', '#cef'][Math.floor(Math.random() * 4)],
                0, true, true);
        }

        for (let i = 0; i < 14; i++) {
            const a = (i / 14) * Math.PI * 2;
            const spd = randRange(80, 180);
            this.emit(x1, y1, Math.cos(a) * spd, Math.sin(a) * spd,
                randRange(0.28, 0.5), randRange(6, 12), '#fff', 0, true, true);
            this.emit(x2, y2, Math.cos(a) * spd, Math.sin(a) * spd,
                randRange(0.28, 0.5), randRange(6, 12), '#ff0', 0, true, true);
        }
    }

    update(dt) {
        for (const p of this.pool) {
            if (p.active) p.update(dt);
        }
        for (const bolt of this.lightningBolts) {
            bolt.life -= dt;
        }
        this.lightningBolts = this.lightningBolts.filter(b => b.life > 0);
    }

    draw(ctx) {
        for (const bolt of this.lightningBolts) {
            const t = bolt.life / bolt.maxLife;
            const pts = bolt.points;
            if (pts.length < 2) continue;

            ctx.save();
            ctx.globalAlpha = t;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            ctx.strokeStyle = 'rgba(100, 200, 255, 0.65)';
            ctx.lineWidth = 16;
            ctx.shadowColor = '#8cf';
            ctx.shadowBlur = 28;
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
            ctx.stroke();

            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 6;
            ctx.shadowBlur = 16;
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
            ctx.stroke();

            ctx.strokeStyle = '#ffe840';
            ctx.lineWidth = 3;
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
            ctx.stroke();

            ctx.restore();
        }

        for (const p of this.pool) {
            if (p.active) p.draw(ctx);
        }
    }
}
