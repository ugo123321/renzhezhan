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
        for (let i = 0; i < poolSize; i++) {
            this.pool.push(new Particle());
        }
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

    freezeEffect(x, y) {
        for (let i = 0; i < 8; i++) {
            const a = randRange(0, Math.PI * 2);
            const speed = randRange(20, 60);
            this.emit(x, y,
                Math.cos(a) * speed, Math.sin(a) * speed,
                randRange(0.3, 0.6), randRange(2, 5),
                ['#0ff', '#8ff', '#aef'][Math.floor(Math.random() * 3)],
                0, true, true);
        }
    }

    lightningEffect(x1, y1, x2, y2) {
        const steps = 6;
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const px = x1 + (x2 - x1) * t + randRange(-8, 8);
            const py = y1 + (y2 - y1) * t + randRange(-8, 8);
            this.emit(px, py, randRange(-10, 10), randRange(-10, 10),
                randRange(0.15, 0.3), randRange(2, 4),
                ['#ff0', '#fff', '#8ff'][Math.floor(Math.random() * 3)],
                0, true, true);
        }
    }

    update(dt) {
        for (const p of this.pool) {
            if (p.active) p.update(dt);
        }
    }

    draw(ctx) {
        for (const p of this.pool) {
            if (p.active) p.draw(ctx);
        }
    }
}
