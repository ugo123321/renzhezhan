class BuffOrbManager {
    constructor(game) {
        this.game = game;
        this.orbs = [];
        this.notice = '';
        this.noticeTimer = 0;
        this.pickupFlashes = [];
        this.drawSessionEaten = [];
    }

    reset() {
        this.orbs = [];
        this.notice = '';
        this.noticeTimer = 0;
        this.pickupFlashes = [];
        this.drawSessionEaten = [];
    }

    _pickPos(w, h, playBottom, safeZone) {
        const pad = 28;
        const top = 92;
        const bottom = Math.max(top + 80, playBottom - 30);
        for (let i = 0; i < 80; i++) {
            const x = randRange(pad, w - pad);
            const y = randRange(top, bottom);
            if (!safeZone || dist(x, y, safeZone.x, safeZone.y) > safeZone.r + 30) return { x, y };
        }
        return { x: w * 0.5, y: (top + bottom) * 0.5 };
    }

    _spawn(type, x, y) {
        this.orbs.push({
            type,
            x,
            y,
            r: CONFIG.BUFF_ORB.RADIUS,
            pulse: randRange(0, Math.PI * 2),
            alive: true,
        });
    }

    _posClear(pos, minDist) {
        for (const o of this.orbs) {
            if (dist(pos.x, pos.y, o.x, o.y) < minDist) return false;
        }
        return true;
    }

    _pickSpawnPos(w, h, playBottom, safeZone) {
        for (let i = 0; i < 50; i++) {
            const pos = this._pickPos(w, h, playBottom, safeZone);
            if (this._posClear(pos, 34)) return pos;
        }
        return this._pickPos(w, h, playBottom, safeZone);
    }

    spawnForStage(stageIndex, safeZone, enableIce = false) {
        this.orbs = [];
        const w = this.game.renderer.w;
        const h = this.game.renderer.h;
        const playBottom = this.game.ui.getPlayAreaBottom(h, this.game.renderer.uiScale);
        const types = [...CONFIG.BUFF_ORB.BASE_TYPES];
        if (enableIce) types.push('ice');
        const maxPerType = CONFIG.BUFF_ORB.MAX_PER_TYPE || 4;
        const extraChance = CONFIG.BUFF_ORB.EXTRA_SPAWN_CHANCE ?? 0.48;

        for (const type of types) {
            for (let i = 0; i < maxPerType; i++) {
                const chance = i === 0
                    ? (CONFIG.BUFF_ORB.SPAWN_CHANCE[type] || 0)
                    : extraChance;
                if (Math.random() > chance) break;
                const pos = this._pickSpawnPos(w, h, playBottom, safeZone);
                this._spawn(type, pos.x, pos.y);
            }
        }
        this.notice = '';
        this.noticeTimer = 0;
        this.pickupFlashes = [];
        this.drawSessionEaten = [];
    }

    restoreDrawSessionOrbs() {
        for (const snap of this.drawSessionEaten) {
            this.orbs.push({
                type: snap.type,
                x: snap.x,
                y: snap.y,
                r: snap.r,
                pulse: snap.pulse,
                alive: true,
            });
        }
        this.drawSessionEaten = [];
        this.pickupFlashes = [];
    }

    cancelDrawSession() {
        const p = this.game.player;
        if (p && p.drawSessionSnapshot) {
            p.ki = p.drawSessionSnapshot.ki;
            p.turnBuffs.attackMult = p.drawSessionSnapshot.attackMult;
            p.turnBuffs.comboMult = p.drawSessionSnapshot.comboMult;
            p.turnBuffs.iceReady = p.drawSessionSnapshot.iceReady;
            p.drawSessionSnapshot = null;
        }
        if (p) p.collectedOrbBuffs = [];
        this.restoreDrawSessionOrbs();
    }

    beginDrawSession() {
        this.cancelDrawSession();
        const p = this.game.player;
        if (!p) return;
        p.drawSessionSnapshot = {
            ki: p.ki,
            attackMult: p.turnBuffs.attackMult,
            comboMult: p.turnBuffs.comboMult,
            iceReady: p.turnBuffs.iceReady,
        };
        p.collectedOrbBuffs = [];
        p.kiAtDrawStart = p.ki;
    }

    commitDrawSession() {
        const p = this.game.player;
        if (p) p.drawSessionSnapshot = null;
        this.drawSessionEaten = [];
    }

    _applyOrb(type) {
        const p = this.game.player;
        if (!p) return;
        p.collectedOrbBuffs.push(type);
        if (type === 'attack') {
            p.turnBuffs.attackMult *= 1.3;
            this.notice = '攻击+30%';
        } else if (type === 'ki') {
            const bonus = Math.round(p.kiMax * 0.30);
            p.ki = Math.min(p.kiMax, p.ki + bonus);
            this.notice = '气力+30%';
        } else if (type === 'combo') {
            p.turnBuffs.comboMult *= 2;
            this.notice = '连击×2';
        } else if (type === 'ice') {
            p.turnBuffs.iceReady = true;
            this.notice = '冰冻球';
        } else {
            return;
        }
        p.queueMessage(this.notice);
        this.noticeTimer = 1.6;
        this.game.renderer.shake(9, 0.16);
    }

    _emitPickupBurst(o) {
        const pal = this._orbPalette(o.type);
        const colors = [pal.hi, pal.core, '#fff8e8'];
        for (let i = 0; i < 28; i++) {
            const a = (i / 28) * Math.PI * 2 + randRange(-0.2, 0.2);
            const spd = randRange(90, 200);
            this.game.particles.emit(
                o.x, o.y,
                Math.cos(a) * spd,
                Math.sin(a) * spd,
                randRange(0.28, 0.55), randRange(5, 11),
                colors[i % colors.length],
                0, true, true
            );
        }
        this.pickupFlashes.push({
            x: o.x,
            y: o.y,
            type: o.type,
            timer: 0.5,
            maxTimer: 0.5,
        });
    }

    _collectOrb(o) {
        if (!o.alive) return;
        const p = this.game.player;
        const trackSession = p && p.state === PlayerState.BULLET_TIME;
        if (trackSession) {
            this.drawSessionEaten.push({
                type: o.type,
                x: o.x,
                y: o.y,
                r: o.r,
                pulse: o.pulse,
            });
        }
        o.alive = false;
        this._applyOrb(o.type);
        this._emitPickupBurst(o);
    }

    checkPathSegment(from, to) {
        if (!from || !to) return;
        const segLen = dist(from.x, from.y, to.x, to.y);
        const steps = Math.max(1, Math.ceil(segLen / 5));
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const px = lerp(from.x, to.x, t);
            const py = lerp(from.y, to.y, t);
            for (const o of this.orbs) {
                if (!o.alive) continue;
                if (dist(px, py, o.x, o.y) <= o.r + 10) this._collectOrb(o);
            }
        }
    }

    _orbPalette(type) {
        if (type === 'attack') return { core: '#ff9a58', hi: '#ffd8a8', edge: '#7a2c10' };
        if (type === 'ki') return { core: '#58d0ff', hi: '#b8f0ff', edge: '#1e4e70' };
        if (type === 'combo') return { core: '#ffa0f8', hi: '#ffd8ff', edge: '#5a2a6a' };
        if (type === 'ice') return { core: '#80d8ff', hi: '#d8f6ff', edge: '#245a7a' };
        return { core: '#f0d880', hi: '#ffe8a8', edge: '#6a4a18' };
    }

    _drawPixelOrb(ctx, o) {
        const pulse = 0.86 + Math.sin(o.pulse) * 0.14;
        const rPx = Math.max(5, Math.round(o.r * pulse));
        const pal = this._orbPalette(o.type);
        const cx = Math.floor(o.x);
        const cy = Math.floor(o.y);

        ctx.beginPath();
        ctx.arc(cx, cy, rPx + 3, 0, Math.PI * 2);
        ctx.fillStyle = `${pal.hi}33`;
        ctx.fill();

        for (let y = -rPx; y <= rPx; y++) {
            for (let x = -rPx; x <= rPx; x++) {
                const d2 = x * x + y * y;
                if (d2 > rPx * rPx) continue;
                if (d2 >= (rPx - 1) * (rPx - 1)) ctx.fillStyle = pal.edge;
                else if (y < -rPx * 0.2 || x < -rPx * 0.2) ctx.fillStyle = pal.hi;
                else ctx.fillStyle = pal.core;
                ctx.fillRect(cx + x, cy + y, 1, 1);
            }
        }

        const iconPx = Math.max(2, Math.floor(rPx / 3));
        drawPixelIcon(ctx, getBuffOrbIconSprite(o.type), cx, cy, iconPx);
    }

    _drawPickupFlash(ctx, f) {
        const t = 1 - f.timer / f.maxTimer;
        const pal = this._orbPalette(f.type);
        const cx = f.x;
        const cy = f.y;
        const ringR = 14 + t * 42;
        const alpha = 1 - t;

        ctx.save();
        ctx.globalAlpha = alpha * 0.85;
        ctx.strokeStyle = pal.hi;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalAlpha = alpha;
        ctx.fillStyle = `${pal.core}88`;
        ctx.beginPath();
        ctx.arc(cx, cy, ringR * 0.55, 0, Math.PI * 2);
        ctx.fill();

        const iconPx = Math.max(3, Math.floor(4 + (1 - t) * 3));
        drawPixelIcon(ctx, getBuffOrbIconSprite(f.type), cx, cy - t * 18, iconPx);

        const label = getBuffOrbShortLabel(f.type);
        const labelY = cy - 28 - t * 12;
        const labelSize = Math.round(12 + (1 - t) * 2);
        const tw = label.length * labelSize * 0.65 + 12;
        const th = labelSize + 8;
        drawPixelPanel(ctx, cx - tw / 2, labelY - th / 2, tw, th, 'rgba(42,24,16,0.92)', this._orbPalette(f.type).hi, 2);
        drawPixelText(ctx, label, cx, labelY, labelSize, '#fff8d8');
        ctx.restore();
    }

    update(dt) {
        const p = this.game.player;
        if (!p) return;
        for (const o of this.orbs) {
            if (!o.alive) continue;
            o.pulse += dt * 4.2;
            if (p.state === PlayerState.ATTACKING || p.state === PlayerState.RETURNING) {
                if (dist(p.x, p.y, o.x, o.y) <= p.effectiveRadius + o.r) {
                    this._collectOrb(o);
                }
            }
        }
        this.orbs = this.orbs.filter(o => o.alive);
        for (let i = this.pickupFlashes.length - 1; i >= 0; i--) {
            this.pickupFlashes[i].timer -= dt;
            if (this.pickupFlashes[i].timer <= 0) this.pickupFlashes.splice(i, 1);
        }
        if (this.noticeTimer > 0) this.noticeTimer -= dt;
    }

    draw(ctx) {
        for (const o of this.orbs) {
            ctx.save();
            this._drawPixelOrb(ctx, o);
            ctx.restore();
        }
    }

    drawPickupEffects(ctx) {
        for (const f of this.pickupFlashes) {
            this._drawPickupFlash(ctx, f);
        }
    }
}
