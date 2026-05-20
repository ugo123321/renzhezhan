class BloodStainSystem {
    constructor() {
        this.stains = [];
        this.maxStains = 800;
        this.fadeDuration = 16;
        this.minAlpha = 0.32;
    }

    clear() {
        this.stains = [];
    }

    update(dt) {
        for (const s of this.stains) s.age += dt;
        this._trim();
    }

    _trim() {
        while (this.stains.length > this.maxStains) {
            const idx = this.stains.findIndex(s => s.age >= this.fadeDuration);
            if (idx < 0) break;
            this.stains.splice(idx, 1);
        }
    }

    _alpha(age) {
        if (age >= this.fadeDuration) return this.minAlpha;
        const t = age / this.fadeDuration;
        return this.minAlpha + (1 - this.minAlpha) * (1 - t);
    }

    spawn(x, y, intensity = 1, fromAngle = null) {
        const base = fromAngle !== null ? fromAngle : Math.random() * Math.PI * 2;
        const drops = [];
        const n = Math.floor(8 + 12 * intensity);
        for (let i = 0; i < n; i++) {
            const a = base + randRange(-1.2, 1.2);
            const d = randRange(3, 28 * intensity);
            drops.push({
                x: Math.cos(a) * d,
                y: Math.sin(a) * d * 0.75,
                r: randRange(1.2, 3.8) * intensity,
                c: pickRandom(['#cc1010', '#e61a1a', '#b80808']),
            });
        }
        this.stains.push({ x, y, drops, age: 0 });
        this._trim();
    }

    draw(ctx) {
        for (const s of this.stains) {
            const a = this._alpha(s.age);
            for (const d of s.drops) {
                ctx.globalAlpha = a;
                ctx.fillStyle = d.c;
                ctx.beginPath();
                ctx.arc(s.x + d.x, s.y + d.y, d.r, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1;
    }
}
