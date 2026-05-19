const GRASS_PALETTES = [
    ['#3a6838', '#4a8048', '#5a9858'],
    ['#3a6038', '#4a7848', '#5a9050'],
    ['#446840', '#528050', '#609860'],
];

class GrassSystem {
    constructor() {
        this.blades = [];
        this.ready = false;
    }

    init(worldW, worldH, playAreaBottom = worldH, safeZone = null) {
        this.blades = [];
        const count = Math.min(22, Math.floor((worldW * worldH) / 45000));
        const topPad = Math.max(100, worldH * 0.14);
        const grassBottom = Math.max(topPad + 40, playAreaBottom - 16);
        const exclusionPad = 12;
        const maxAttempts = count * 24;
        let created = 0;
        let attempts = 0;

        while (created < count && attempts < maxAttempts) {
            attempts++;
            const x = randRange(16, worldW - 16);
            const y = randRange(topPad, grassBottom);
            if (safeZone) {
                const dx = x - safeZone.x;
                const dy = y - safeZone.y;
                const rr = (safeZone.r || 0) + exclusionPad;
                if (dx * dx + dy * dy <= rr * rr) continue;
            }
            const variant = Math.floor(Math.random() * 3);
            this.blades.push({
                x,
                y,
                variant,
                scale: randRange(2, 3),
                height: Math.floor(randRange(3, 6)),
                phase: randRange(0, Math.PI * 2),
                speed: randRange(1.4, 3.2),
                swayAmp: randRange(0.14, 0.28),
                offset: randRange(-1, 1),
            });
            created++;
        }
        this.ready = true;
    }

    update(dt) {
        if (!this.ready) return;
        for (const b of this.blades) {
            b.phase += dt * b.speed;
        }
    }

    _drawTuft(ctx, b) {
        const palette = GRASS_PALETTES[b.variant];
        const s = b.scale;
        const sway = Math.sin(b.phase) * b.swayAmp;
        const baseX = Math.floor(b.x);
        const baseY = Math.floor(b.y);

        ctx.save();
        ctx.translate(baseX + b.offset * s, baseY);

        for (let blade = -1; blade <= 1; blade++) {
            const lean = sway + blade * 0.08;
            ctx.save();
            ctx.rotate(lean + blade * 0.12);
            for (let i = 0; i < b.height; i++) {
                ctx.fillStyle = palette[Math.min(i, palette.length - 1)];
                const w = s + (i === b.height - 1 ? 0 : 0);
                ctx.fillRect(-w / 2 + blade, -i * s - s, w, s);
            }
            ctx.restore();
        }

        ctx.fillStyle = palette[0];
        ctx.fillRect(-s, 0, s * 2, s);
        ctx.restore();
    }

    draw(ctx) {
        if (!this.ready) return;
        for (const b of this.blades) {
            this._drawTuft(ctx, b);
        }
    }
}
