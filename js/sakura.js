class SakuraSystem {
    constructor() {
        this.petals = [];
        this.active = false;
        this.timer = 0;
        this.duration = 5.5;
        this.fadeOutDuration = 1.8;
    }

    start(worldW, worldH, duration) {
        this.petals = [];
        this.active = true;
        if (duration != null) this.duration = duration;
        this.timer = this.duration;
        const count = 42;
        for (let i = 0; i < count; i++) {
            this.petals.push({
                x: randRange(0, worldW),
                y: randRange(-worldH * 0.25, worldH * 0.08),
                vx: randRange(-18, 18),
                vy: randRange(28, 62),
                rot: randRange(0, Math.PI * 2),
                spin: randRange(-1.8, 1.8),
                sway: randRange(0.8, 2.2),
                swayPhase: randRange(0, Math.PI * 2),
                size: randRange(3, 7),
                color: ['#ffb7c5', '#ffc8d8', '#f8a0b0', '#ffe8ee', '#f5c6d0'][
                    Math.floor(Math.random() * 5)],
            });
        }
    }

    update(dt, worldW, worldH) {
        if (!this.active) return;
        this.timer -= dt;
        if (this.timer <= 0) {
            this.active = false;
            this.petals = [];
            return;
        }

        const fading = this.timer <= this.fadeOutDuration;

        for (const p of this.petals) {
            p.swayPhase += dt * p.sway;
            p.x += (p.vx + Math.sin(p.swayPhase) * 22) * dt;
            p.y += p.vy * dt;
            p.rot += p.spin * dt;

            if (!fading && p.y > worldH + 20) {
                p.y = randRange(-40, -8);
                p.x = randRange(0, worldW);
            }
            if (p.x < -20) p.x = worldW + 10;
            if (p.x > worldW + 20) p.x = -10;
        }
    }

    _getFadeAlpha() {
        if (this.timer <= this.fadeOutDuration) {
            return clamp(this.timer / this.fadeOutDuration, 0, 1);
        }
        return 1;
    }

    _drawPetal(ctx, p, masterAlpha) {
        const s = p.size;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.82 * masterAlpha;

        for (let i = 0; i < 5; i++) {
            ctx.save();
            ctx.rotate((i / 5) * Math.PI * 2);
            ctx.beginPath();
            ctx.ellipse(0, -s * 0.55, s * 0.38, s * 0.72, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        ctx.fillStyle = '#fff5f8';
        ctx.globalAlpha = 0.55 * masterAlpha;
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.18, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    draw(ctx) {
        if (!this.active || this.petals.length === 0) return;
        const masterAlpha = this._getFadeAlpha();
        if (masterAlpha <= 0) return;

        ctx.save();
        ctx.globalAlpha = (0.4 + masterAlpha * 0.5) * masterAlpha;
        for (const p of this.petals) {
            this._drawPetal(ctx, p, masterAlpha);
        }
        ctx.restore();
    }
}
