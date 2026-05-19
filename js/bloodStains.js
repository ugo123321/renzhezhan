class BloodStainSystem {
    constructor() {
        this.stains = [];
        this.maxStains = 600;
    }

    clear() {
        this.stains = [];
    }

    spawn(x, y, intensity = 1, fromAngle = null) {
        const base = fromAngle !== null ? fromAngle : Math.random() * Math.PI * 2;
        const drops = [];
        const streaks = [];

        drops.push({
            x: randRange(-2, 2),
            y: randRange(-1, 2),
            r: randRange(3, 5) * intensity,
            color: '#ff2222',
        });

        const dropCount = Math.floor(10 + Math.random() * 14 * intensity);
        for (let i = 0; i < dropCount; i++) {
            const spread = randRange(-1.1, 1.1);
            const a = base + spread;
            const dist = randRange(6, 32 * intensity);
            drops.push({
                x: Math.cos(a) * dist,
                y: Math.sin(a) * dist * 0.75,
                r: randRange(1, 3.5) * intensity,
                color: pickRandom(['#ff1a1a', '#ff3333', '#e60000', '#ff4444', '#cc0000']),
            });
        }

        const streakCount = Math.floor(4 + Math.random() * 6 * intensity);
        for (let i = 0; i < streakCount; i++) {
            const a = base + randRange(-0.8, 0.8);
            const len = randRange(8, 22 * intensity);
            streaks.push({
                x1: Math.cos(a) * 2,
                y1: Math.sin(a) * 2,
                x2: Math.cos(a) * len,
                y2: Math.sin(a) * len * 0.7,
                width: randRange(1, 2.5),
                color: pickRandom(['#ff1a1a', '#e60000', '#ff4444']),
            });
        }

        for (let i = 0; i < Math.floor(2 + Math.random() * 3); i++) {
            const a = base + randRange(-1.5, 1.5);
            const dist = randRange(4, 14);
            drops.push({
                x: Math.cos(a) * dist,
                y: Math.sin(a) * dist * 0.6,
                r: randRange(4, 7) * intensity,
                color: pickRandom(['#ff2222', '#e61010']),
            });
        }

        this.stains.push({ x, y, drops, streaks });

        if (this.stains.length > this.maxStains) {
            this.stains.splice(0, this.stains.length - this.maxStains);
        }
    }

    draw(ctx) {
        for (const stain of this.stains) {
            for (const s of stain.streaks) {
                ctx.strokeStyle = s.color;
                ctx.lineWidth = s.width;
                ctx.lineCap = 'round';
                ctx.globalAlpha = 0.92;
                ctx.beginPath();
                ctx.moveTo(stain.x + s.x1, stain.y + s.y1);
                ctx.lineTo(stain.x + s.x2, stain.y + s.y2);
                ctx.stroke();
            }

            for (const d of stain.drops) {
                ctx.fillStyle = d.color;
                ctx.globalAlpha = 0.95;
                ctx.beginPath();
                ctx.arc(stain.x + d.x, stain.y + d.y, d.r, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1;
    }
}
