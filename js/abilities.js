const FIREBALL_PIXEL = 4;
const FIREBALL_RADIUS_BLOCKS = 8;
const SHURIKEN_PIXEL = 4;
const WATER_TORNADO_PIXEL = 5;
const WATER_TORNADO_SIZE_SCALE = 3.2;
const WATER_TORNADO_SPEED = 360;
const WATER_TORNADO_LIFE = 1.85;
const SHURIKEN_SPEED_MIN = 340;
const SHURIKEN_SPEED_MAX = 500;
const SHURIKEN_LIFE_MIN = 0.42;
const SHURIKEN_LIFE_MAX = 0.62;
const WHIRL_SIZE_SCALE = 1.5;

const SHURIKEN_SPRITE = [
    [null, '#7a8aa8', null, '#7a8aa8', null],
    ['#7a8aa8', '#e8f4ff', '#b8cce8', '#e8f4ff', '#7a8aa8'],
    [null, '#b8cce8', '#586878', '#b8cce8', null],
    ['#7a8aa8', '#e8f4ff', '#b8cce8', '#e8f4ff', '#7a8aa8'],
    [null, '#7a8aa8', null, '#7a8aa8', null],
];

class AbilityManager {
    constructor(game) {
        this.game = game;
        this.fireballs = [];
        this.waterTornados = [];
        this.blackHoles = [];
        this.whirls = [];
        this.shurikens = [];
        this.vines = [];
        this.batSwarms = [];
        this.autoDartCooldown = 0;
        this.resolveFxTimer = 0;
        this.lightningChain = null;
        this.blackHoleSpawnedThisResolve = false;
    }

    reset() {
        this.fireballs = [];
        this.waterTornados = [];
        this.blackHoles = [];
        this.whirls = [];
        this.shurikens = [];
        this.vines = [];
        this.batSwarms = [];
        this.autoDartCooldown = 0;
        this.resolveFxTimer = 0;
        this.lightningChain = null;
        this.blackHoleSpawnedThisResolve = false;
    }

    hasAutoDarts() {
        return this.shurikens.some(s => s.kind === 'auto');
    }

    _hasFlyingProjectiles() {
        return this.fireballs.length > 0 || this.waterTornados.length > 0 || this.blackHoles.length > 0
            || this.whirls.length > 0 || this.shurikens.length > 0 || this.vines.length > 0
            || this.batSwarms.length > 0 || this.lightningChain != null;
    }

    hasActiveFx() {
        return this.resolveFxTimer > 0 || this.game.combat.isResolving() || this._hasFlyingProjectiles();
    }

    _isResolvePhase() {
        return this.game.combat.isResolving() || this.resolveFxTimer > 0 || this._hasFlyingProjectiles();
    }

    _ctxPos(ctx) {
        if (ctx) return { x: ctx.x, y: ctx.y };
        const p = this.game.player;
        return { x: p.x, y: p.y };
    }

    onResolveStarted(attackPath) {
        this.blackHoleSpawnedThisResolve = false;
        const p = this.game.player;
        if (p) {
            p.healingComboFiredThisResolve = false;
            p.comboFireballMilestone = 0;
        }
    }

    onResolveHit(hit, combo) {
        const p = this.game.player;
        if (!p) return;

        const mx = (hit.pathFrom.x + hit.pathTo.x) * 0.5;
        const my = (hit.pathFrom.y + hit.pathTo.y) * 0.5;
        const segAng = angle(hit.pathFrom.x, hit.pathFrom.y, hit.pathTo.x, hit.pathTo.y);
        const ctx = { x: mx, y: my, segAng, hit };

        this.onComboHit(combo, ctx);
    }

    _spawnComboFireballs(x, y, segAng) {
        const p = this.game.player;
        const lv = p.getUpgradeLevel('great_fireball');
        if (lv <= 0) return;
        const cnt = 3 + Math.max(0, lv - 1);
        const baseAng = segAng;
        for (let i = 0; i < cnt; i++) {
            const a = baseAng + randRange(-0.9, 0.9);
            this.fireballs.push({
                x, y,
                vx: Math.cos(a) * 280, vy: Math.sin(a) * 280,
                life: 0.95,
                maxLife: 0.95,
                rot: a,
                hit: new Set(),
                dmgMul: 1.0,
                kind: 'great',
            });
        }
    }

    onComboHit(combo, ctx) {
        const p = this.game.player;
        if (!p || !this.game.combat.isResolving()) return;
        const pos = this._ctxPos(ctx);

        const comboFloor = Math.floor(combo);
        const fireMilestone = Math.floor(comboFloor / 10) * 10;
        if (p.getUpgradeLevel('great_fireball') > 0 && fireMilestone >= 10 && fireMilestone > p.comboFireballMilestone) {
            p.comboFireballMilestone = fireMilestone;
            this._spawnComboFireballs(pos.x, pos.y, ctx?.segAng ?? 0);
        }
        if (p.getUpgradeLevel('shuriken') > 0 && comboFloor > 0) {
            this._spawnComboShurikens(pos.x, pos.y, ctx?.segAng ?? 0);
        }
        if (comboFloor >= 15 && !p.healingComboFiredThisResolve && p.getUpgradeLevel('healing_combo') > 0) {
            p.healingComboFiredThisResolve = true;
            this._spawnHealingVine(pos.x, pos.y, ctx?.segAng ?? 0);
            const healed = p.heal(p.maxHp * 0.05);
            if (healed > 0) {
                this.game.combat.spawnDamageNumber(
                    p.x, p.y - p.effectiveRadius - 12, healed, false, '#68d878'
                );
            }
        }
        if (p.getUpgradeLevel('lightning_chain') > 0 && comboFloor > 0 && comboFloor % 5 === 0) {
            this._spawnLightningChain(3, pos.x, pos.y);
        }
        if (p.getUpgradeLevel('water_tornado') > 0) {
            p.waterTornadoCharge = (p.waterTornadoCharge || 0) + 1;
            while (p.waterTornadoCharge >= 3) {
                p.waterTornadoCharge -= 3;
                const cnt = p.getUpgradeLevel('water_tornado');
                for (let i = 0; i < cnt; i++) {
                    this._spawnWaterTornado(pos.x, pos.y, ctx?.segAng ?? 0, i, cnt);
                }
            }
        }
        if (p.getUpgradeLevel('black_hole') > 0 && comboFloor === 8 && !this.blackHoleSpawnedThisResolve) {
            this._spawnBlackHole(pos.x, pos.y);
            this.blackHoleSpawnedThisResolve = true;
        }
        if (p.getUpgradeLevel('blade_whirl') > 0) {
            p.whirlCharge = (p.whirlCharge || 0) + 1;
            while (p.whirlCharge >= 5) {
                p.whirlCharge -= 5;
                this._spawnWhirl(pos.x, pos.y);
            }
        }
    }

    _spawnComboShurikens(x, y, segAng) {
        const count = 2;
        for (let i = 0; i < count; i++) {
            const spread = segAng + randRange(-0.55, 0.55);
            const spd = randRange(SHURIKEN_SPEED_MIN, SHURIKEN_SPEED_MAX);
            this.shurikens.push({
                kind: 'skill',
                x: x + randRange(-4, 4),
                y: y + randRange(-4, 4),
                vx: Math.cos(spread) * spd,
                vy: Math.sin(spread) * spd,
                rot: randRange(0, Math.PI * 2),
                spin: randRange(10, 18) * (Math.random() < 0.5 ? 1 : -1),
                life: randRange(SHURIKEN_LIFE_MIN, SHURIKEN_LIFE_MAX),
                hit: new Set(),
                dmgMul: 0.10,
            });
        }
    }

    _spawnHealingVine(x, y, segAng) {
        const p = this.game.player;
        const lv = p.getUpgradeLevel('healing_combo');
        const a = this._nearestMonsterAngle(x, y, segAng);
        const spd = 320;
        this.vines.push({
            x, y,
            vx: Math.cos(a) * spd,
            vy: Math.sin(a) * spd,
            rot: a,
            life: 0.95,
            maxLife: 0.95,
            hit: new Set(),
            hitR: 28 + lv * 4,
            damage: p.getAbilityDamage(0.12 + 0.04 * Math.max(0, lv - 1)),
            slowDur: 3,
        });
    }

    spawnVampireBatSwarm(fromX, fromY) {
        const p = this.game.player;
        const lv = p.getUpgradeLevel('vampire_bat');
        if (!p || lv <= 0) return;
        const radius = 130 + lv * 12;
        const monsters = this.game.spawner.getActiveMonsters()
            .filter(m => dist(fromX, fromY, m.x, m.y) <= radius + m.hitboxRadius)
            .sort((a, b) => dist(fromX, fromY, a.x, a.y) - dist(fromX, fromY, b.x, b.y));
        const maxTargets = Math.min(monsters.length, 4 + lv * 2);
        this.batSwarms.push({
            ox: fromX,
            oy: fromY,
            targets: monsters.slice(0, maxTargets),
            idx: 0,
            phase: 'attack',
            timer: 0,
            stepDelay: 0.07,
            damage: p.getAbilityDamage(0.14),
            healAmount: Math.round(p.maxHp * 0.02 * lv),
            batParticles: [],
        });
    }

    _spawnLightningChain(maxTargets, fromX, fromY) {
        const monsters = this.game.spawner.getActiveMonsters();
        if (monsters.length === 0) return;
        monsters.sort((a, b) => dist(fromX, fromY, a.x, a.y) - dist(fromX, fromY, b.x, b.y));
        this.lightningChain = {
            targets: monsters.slice(0, maxTargets),
            cx: fromX,
            cy: fromY,
            idx: 0,
            timer: 0,
            stepDelay: 0.09,
            dmg: this.game.player.getAbilityDamage(0.45),
        };
    }

    _updateLightningChain(dt) {
        const ch = this.lightningChain;
        if (!ch) return;
        ch.timer -= dt;
        if (ch.timer > 0) return;

        if (ch.idx >= ch.targets.length) {
            this.lightningChain = null;
            return;
        }

        const m = ch.targets[ch.idx];
        if (!m.alive || m.dying) {
            ch.idx++;
            ch.timer = ch.stepDelay * 0.35;
            return;
        }

        this.game.particles.lightningEffect(ch.cx, ch.cy, m.x, m.y);
        const hit = m.takeDamage(ch.dmg, angle(ch.cx, ch.cy, m.x, m.y));
        if (hit.actualDamage > 0) {
            this.game.combat.spawnDamageNumber(m.x, m.y - m.hitboxRadius - 4, hit.actualDamage, false, '#f8d020');
            this.game.particles.hitSpark(m.x, m.y, false);
        }
        if (m.dying) this.game.combat._handleMonsterKilled(m);

        ch.cx = m.x;
        ch.cy = m.y;
        ch.idx++;
        ch.timer = ch.stepDelay;
        if (ch.idx === 1) this.game.renderer.shake(10, 0.28);
    }

    _findNearestMonster(x, y) {
        const monsters = this.game.spawner.getActiveMonsters();
        if (!monsters.length) return null;
        let nearest = monsters[0];
        let best = dist(x, y, nearest.x, nearest.y);
        for (let i = 1; i < monsters.length; i++) {
            const m = monsters[i];
            const d = dist(x, y, m.x, m.y);
            if (d < best) {
                best = d;
                nearest = m;
            }
        }
        return nearest;
    }

    _nearestMonsterAngle(x, y, segAng) {
        const nearest = this._findNearestMonster(x, y);
        if (!nearest) return segAng;
        return angle(x, y, nearest.x, nearest.y);
    }

    _canAutoDart() {
        const g = this.game;
        if (!g || g.state !== 'PLAYING') return false;
        const p = g.player;
        if (!p || p.hp <= 0) return false;
        if (p.state === PlayerState.BULLET_TIME) return false;
        if (g.isUpgradeBlocked()) return false;
        return g.spawner.getActiveMonsters().length > 0;
    }

    _getAutoDartOrigin() {
        const p = this.game.player;
        if (p.state === PlayerState.ATTACKING) return { x: p.x, y: p.y };
        return { x: p.homeX, y: p.homeY };
    }

    _spawnAutoDart() {
        const p = this.game.player;
        const origin = this._getAutoDartOrigin();
        const target = this._findNearestMonster(origin.x, origin.y);
        if (!target) return;

        const cfg = CONFIG.PLAYER.AUTO_DART || {};
        const baseAng = angle(origin.x, origin.y, target.x, target.y);
        const spd = cfg.SPEED || 420;
        const count = 1 + p.getUpgradeLevel('multi_dart');
        const scale = p.getAutoDartScale();
        const hitR = this._shurikenHitRadius() * scale;
        const damage = p.getAutoDartDamage();
        const isSpirit = p.hasSpiritBomb();

        for (let i = 0; i < count; i++) {
            const spread = count > 1
                ? baseAng + (i - (count - 1) * 0.5) * 0.18
                : baseAng;
            this.shurikens.push({
                kind: 'auto',
                x: origin.x,
                y: origin.y,
                vx: Math.cos(spread) * spd,
                vy: Math.sin(spread) * spd,
                rot: spread,
                spin: isSpirit ? 6 : 14,
                life: cfg.LIFE || 0.9,
                hit: new Set(),
                damage,
                hitRadius: hitR,
                visualScale: scale,
                isSpirit,
            });
        }
    }

    _getIceDartProcChance() {
        const lv = this.game.player.getUpgradeLevel('ice_dart');
        if (lv <= 0) return 0;
        return Math.min(0.95, 0.05 + 0.04 * Math.max(0, lv - 1));
    }

    _getIceDartFrostMult() {
        const lv = this.game.player.getUpgradeLevel('ice_dart');
        if (lv <= 0) return 0;
        return 0.2 + 0.05 * Math.max(0, lv - 1);
    }

    _tryIceDartBurst(x, y, dartDamage) {
        if (this.game.player.getUpgradeLevel('ice_dart') <= 0) return;
        if (Math.random() >= this._getIceDartProcChance()) return;
        this._triggerIceDartBurst(x, y, dartDamage);
    }

    _triggerIceDartBurst(x, y, dartDamage) {
        const p = this.game.player;
        const lv = p.getUpgradeLevel('ice_dart');
        if (lv <= 0) return;
        const radius = 78 + lv * 8;
        const dmg = Math.max(1, Math.round(dartDamage * this._getIceDartFrostMult()));
        const monsters = this.game.spawner.getActiveMonsters();
        let hitAny = false;
        for (const m of monsters) {
            if (dist(x, y, m.x, m.y) > radius + m.hitboxRadius) continue;
            m.freeze(2);
            const hit = m.takeDamage(dmg, angle(x, y, m.x, m.y));
            if (hit.actualDamage > 0) {
                hitAny = true;
                this.game.combat.spawnDamageNumber(m.x, m.y - m.hitboxRadius - 4, hit.actualDamage, false, '#78d8ff');
                this.game.particles.freezeEffect(m.x, m.y, 1.35);
            }
            if (m.dying) this.game.combat._handleMonsterKilled(m);
        }
        this.game.particles.iceBurstEffect(x, y, radius);
        if (!hitAny) this.game.particles.freezeEffect(x, y, 1.2);
    }

    _updateAutoDartFire(dt) {
        if (!this._canAutoDart()) return;
        const interval = CONFIG.PLAYER.AUTO_DART?.INTERVAL ?? 0.5;
        this.autoDartCooldown -= dt;
        if (this.autoDartCooldown > 0) return;
        this._spawnAutoDart();
        this.autoDartCooldown = interval;
    }

    _spawnWaterTornado(x, y, segAng, idx, total) {
        const p = this.game.player;
        const lv = p.getUpgradeLevel('water_tornado');
        const spread = total > 1 ? (idx - (total - 1) * 0.5) * 0.22 : 0;
        const a = this._nearestMonsterAngle(x, y, segAng) + spread;
        this.waterTornados.push({
            x, y,
            vx: Math.cos(a) * WATER_TORNADO_SPEED,
            vy: Math.sin(a) * WATER_TORNADO_SPEED,
            life: WATER_TORNADO_LIFE,
            maxLife: WATER_TORNADO_LIFE,
            spin: randRange(0, Math.PI * 2),
            spinSpeed: 14 + lv * 1.5,
            hit: new Set(),
            dmgMul: 0.55 + 0.1 * lv,
        });
        const colors = ['#b8f8ff', '#68d0f8', '#38a8e8', '#e8ffff'];
        for (let i = 0; i < 22; i++) {
            const burst = a + randRange(-0.7, 0.7);
            const bspd = randRange(100, 260);
            this.game.particles.emit(
                x, y,
                Math.cos(burst) * bspd, Math.sin(burst) * bspd,
                randRange(0.2, 0.4), randRange(5, 10),
                colors[Math.floor(Math.random() * colors.length)],
                0, true, false
            );
        }
        this.game.renderer.shake(8, 0.18);
    }

    _drawPixelWaterTornado(ctx, t) {
        const px = WATER_TORNADO_PIXEL;
        const s = WATER_TORNADO_SIZE_SCALE;
        const lifeT = t.maxLife ? t.life / t.maxLife : 1;
        const pulse = 0.92 + Math.sin((1 - lifeT) * 10 + t.spin) * 0.08;
        const cx = Math.floor(t.x);
        const cy = Math.floor(t.y);
        const block = Math.ceil(px * s * pulse);

        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.translate(cx, cy);
        ctx.rotate(t.spin);
        ctx.globalAlpha = clamp(0.55 + lifeT * 0.45, 0.45, 1);

        const ringColors = ['#1868a8', '#2890d0', '#48b8f0', '#88e0ff', '#d8ffff'];
        for (let layer = 0; layer < 5; layer++) {
            const r = (7 + layer * 4) * s * pulse;
            const count = 10 + layer * 4;
            for (let i = 0; i < count; i++) {
                const a = (i / count) * Math.PI * 2 + layer * 0.65;
                const bx = Math.cos(a) * r;
                const by = Math.sin(a) * r * 1.28;
                ctx.fillStyle = ringColors[layer];
                ctx.fillRect(
                    Math.floor(bx - block * 0.5),
                    Math.floor(by - block * 0.5),
                    block,
                    block
                );
            }
        }

        for (let j = -5; j <= 5; j++) {
            const w = j === 0 ? block * 2.2 : block * 1.6;
            ctx.fillStyle = j % 2 === 0 ? '#e8ffff' : '#a0e8ff';
            ctx.fillRect(Math.floor(-w * 0.5), Math.floor(j * block * 1.05), Math.ceil(w), block);
        }

        ctx.globalAlpha = clamp(0.35 + lifeT * 0.35, 0.25, 0.7);
        ctx.strokeStyle = '#d8ffff';
        ctx.lineWidth = Math.max(2, block * 0.35);
        ctx.beginPath();
        ctx.ellipse(0, 0, 14 * s * pulse, 20 * s * pulse, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalAlpha = clamp(0.2 + lifeT * 0.25, 0.15, 0.5);
        const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 22 * s);
        glow.addColorStop(0, 'rgba(200, 248, 255, 0.95)');
        glow.addColorStop(0.5, 'rgba(72, 184, 240, 0.55)');
        glow.addColorStop(1, 'rgba(24, 104, 168, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.ellipse(0, 0, 24 * s * pulse, 30 * s * pulse, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    _spawnBlackHole(x, y) {
        const lv = this.game.player.getUpgradeLevel('black_hole');
        const life = 1.75;
        this.blackHoles.push({
            x, y,
            r: 82 + lv * 24,
            life,
            maxLife: life,
            pull: 220 + lv * 65,
            dmgTimer: 0,
        });
    }

    _spawnWhirl(x, y) {
        const p = this.game.player;
        const lv = p.getUpgradeLevel('blade_whirl');
        const baseR = (92 + lv * 12) * WHIRL_SIZE_SCALE;
        this.whirls.push({
            x, y,
            r: baseR * 0.55,
            maxR: baseR,
            life: 0.9,
            maxLife: 0.9,
            spin: Math.random() * Math.PI * 2,
            spinSpeed: 16 + lv * 2.5,
            bladeCount: Math.round((14 + lv * 2) * WHIRL_SIZE_SCALE),
            bladePx: Math.round(4 * WHIRL_SIZE_SCALE),
            hit: new Set(),
            dmgMul: 0.35 + lv * 0.12,
            ringPhase: 0,
        });
        for (let i = 0; i < 48; i++) {
            const a = (i / 48) * Math.PI * 2;
            const spd = randRange(140, 320);
            this.game.particles.emit(
                x, y,
                Math.cos(a) * spd, Math.sin(a) * spd,
                randRange(0.25, 0.5), randRange(6, 12),
                ['#ff9020', '#ffb830', '#ffe060', '#fff0a8'][Math.floor(Math.random() * 4)],
                0, true, false
            );
        }
        this.game.renderer.shake(16, 0.34);
    }

    _drawPixelBlade(ctx, px) {
        const blade = [
            [null, '#6a5048', '#8a7060'],
            ['#a89078', '#d8c8b0', '#f0e8d8'],
            ['#d8c8b0', '#fff8e8', '#fff8e8'],
            ['#e8dcc8', '#fff8e8', '#fff8e8'],
            ['#c8b8a0', '#f0e8d8', '#e8dcc8'],
            ['#a89888', '#d8c8b8', null],
            [null, '#8a7060', null],
        ];
        const rows = blade.length;
        const cols = blade[0].length;
        const ox = -Math.floor((cols * px) / 2);
        const oy = -Math.floor((rows * px) / 2);
        ctx.imageSmoothingEnabled = false;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const color = blade[r][c];
                if (!color) continue;
                ctx.fillStyle = color;
                ctx.fillRect(ox + c * px, oy + r * px, px, px);
            }
        }
    }

    _drawPixelBladeWhirl(ctx, w) {
        const lifeT = w.maxLife ? w.life / w.maxLife : 1;
        const radius = w.r;
        const cx = Math.floor(w.x);
        const cy = Math.floor(w.y);
        const bladePx = w.bladePx || Math.round(4 * WHIRL_SIZE_SCALE);
        const alpha = clamp(0.55 + lifeT * 0.45, 0.5, 1);
        const s = WHIRL_SIZE_SCALE;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.globalAlpha = alpha * 0.62;
        const glow = ctx.createRadialGradient(0, 0, radius * 0.1, 0, 0, radius * 1.2);
        glow.addColorStop(0, 'rgba(255, 220, 120, 0.95)');
        glow.addColorStop(0.45, 'rgba(255, 150, 40, 0.65)');
        glow.addColorStop(1, 'rgba(255, 100, 20, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, radius * 1.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.translate(cx, cy);
        ctx.globalAlpha = alpha;

        for (let ring = 0; ring < 4; ring++) {
            const ringR = radius * (0.68 + ring * 0.12);
            const ringA = 0.42 - ring * 0.07;
            ctx.globalAlpha = alpha * ringA;
            if (ring === 0) ctx.strokeStyle = '#fff8c0';
            else if (ring === 1) ctx.strokeStyle = '#ffc840';
            else ctx.strokeStyle = '#ff9028';
            ctx.lineWidth = (ring === 0 ? 8 : ring === 1 ? 6 : 4) * (s * 0.85);
            ctx.lineCap = 'round';
            ctx.setLineDash(ring === 2 ? [14, 10] : []);
            ctx.lineDashOffset = -w.ringPhase * (36 + ring * 12);
            ctx.beginPath();
            ctx.arc(0, 0, ringR, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.setLineDash([]);

        const count = w.bladeCount || 14;
        for (let i = 0; i < count; i++) {
            const a = w.spin + (i / count) * Math.PI * 2;
            const dist = radius * (0.8 + (i % 3) * 0.07);
            ctx.save();
            ctx.rotate(a);
            ctx.translate(dist, 0);
            ctx.rotate(Math.PI * 0.5);
            ctx.globalAlpha = alpha;
            this._drawPixelBlade(ctx, bladePx);
            ctx.restore();
        }

        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#fff8d0';
        const core = Math.ceil(bladePx * 1.2);
        ctx.fillRect(-core, -core, core * 2, core * 2);
        ctx.fillStyle = '#ff9020';
        ctx.fillRect(-bladePx, -bladePx, bladePx * 2, bladePx * 2);
        ctx.restore();
    }

    onResolveEnded() {
        this.resolveFxTimer = 0.28;
    }

    _fireballBlockColor(distRatio, flicker) {
        if (distRatio > 0.92) return flicker ? '#3a1408' : '#4a1808';
        if (distRatio > 0.78) return flicker ? '#b83818' : '#c83818';
        if (distRatio > 0.55) return flicker ? '#ff8830' : '#ff9c38';
        if (distRatio > 0.32) return flicker ? '#ffb858' : '#ffc868';
        return flicker ? '#fff0c0' : '#ffe8b0';
    }

    _drawPixelFireball(ctx, f) {
        const px = FIREBALL_PIXEL;
        const rb = FIREBALL_RADIUS_BLOCKS;
        const ang = f.rot != null ? f.rot : Math.atan2(f.vy, f.vx);
        const lifeT = f.maxLife ? f.life / f.maxLife : 1;
        const flicker = Math.floor(Date.now() / 50) % 2 === 0;
        const cx = Math.floor(f.x);
        const cy = Math.floor(f.y);

        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.globalAlpha = clamp(0.88 + lifeT * 0.12, 0.75, 1);
        ctx.translate(cx, cy);
        ctx.rotate(ang);

        for (let by = -rb; by <= rb; by++) {
            for (let bx = -rb; bx <= rb; bx++) {
                const d = Math.sqrt(bx * bx + by * by);
                if (d > rb + 0.35) continue;
                const ratio = d / rb;
                ctx.fillStyle = this._fireballBlockColor(ratio, flicker && ratio > 0.45);
                ctx.fillRect(bx * px - px / 2, by * px - px / 2, px, px);
            }
        }

        ctx.fillStyle = flicker ? '#fff8e8' : '#fffaf0';
        ctx.fillRect(-px, -px, px, px);
        ctx.fillRect(px - px, -px, px, px);
        ctx.fillRect(-px, px - px, px, px);
        ctx.fillRect(px - px, px - px, px, px);

        ctx.restore();
    }

    _drawPixelShuriken(ctx, x, y, rot, px) {
        const rows = SHURIKEN_SPRITE.length;
        const cols = SHURIKEN_SPRITE[0].length;
        ctx.save();
        ctx.translate(Math.floor(x), Math.floor(y));
        ctx.rotate(rot);
        const ox = -Math.floor((cols * px) / 2);
        const oy = -Math.floor((rows * px) / 2);
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const color = SHURIKEN_SPRITE[r][c];
                if (!color) continue;
                ctx.fillStyle = color;
                ctx.fillRect(ox + c * px, oy + r * px, px, px);
            }
        }
        ctx.restore();
    }

    _shurikenHitRadius(s) {
        if (s && s.hitRadius != null) return s.hitRadius;
        return 7 * (SHURIKEN_PIXEL / 2);
    }

    _shurikenDamage(s) {
        if (s.damage != null) return s.damage;
        return this.game.player.getAbilityDamage(s.dmgMul);
    }

    _updateShurikens(dt, kindFilter = 'all') {
        const monsters = this.game.spawner.getActiveMonsters();
        const p = this.game.player;
        for (const s of this.shurikens) {
            if (kindFilter === 'auto' && s.kind !== 'auto') continue;
            if (kindFilter === 'skill' && s.kind === 'auto') continue;
            const hitR = this._shurikenHitRadius(s);
            s.life -= dt;
            s.x += s.vx * dt;
            s.y += s.vy * dt;
            s.rot += s.spin * dt;
            for (const m of monsters) {
                if (s.hit.has(m.id)) continue;
                if (!circlesCollide(s.x, s.y, hitR, m.x, m.y, m.hitboxRadius)) continue;
                s.hit.add(m.id);
                const dmg = this._shurikenDamage(s);
                const hit = m.takeDamage(dmg, angle(s.x, s.y, m.x, m.y));
                if (hit.actualDamage > 0) {
                    const color = s.isSpirit ? '#ffe878' : (s.kind === 'auto' ? '#98b8d8' : '#a8c0e8');
                    this.game.combat.spawnDamageNumber(m.x, m.y - m.hitboxRadius - 4, hit.actualDamage, false, color);
                    this.game.particles.hitSpark(m.x, m.y, false);
                }
                if (s.kind === 'auto') {
                    this._tryIceDartBurst(s.x, s.y, dmg);
                }
                if (m.dying) this.game.combat._handleMonsterKilled(m);
            }
        }
        this.shurikens = this.shurikens.filter(s => s.life > 0);
    }

    _fireballHitRadius(f) {
        if (f.kind === 'great') return FIREBALL_RADIUS_BLOCKS * FIREBALL_PIXEL;
        return 10;
    }

    _updateFireballs(dt) {
        const monsters = this.game.spawner.getActiveMonsters();
        for (const f of this.fireballs) {
            f.life -= dt;
            f.x += f.vx * dt;
            f.y += f.vy * dt;
            if (f.kind === 'great' && Math.random() < 0.35) {
                const trailAng = Math.atan2(f.vy, f.vx) + Math.PI + randRange(-0.4, 0.4);
                const spd = randRange(20, 60);
                this.game.particles.emit(
                    f.x, f.y,
                    Math.cos(trailAng) * spd, Math.sin(trailAng) * spd,
                    randRange(0.15, 0.3), randRange(4, 7),
                    ['#ff6020', '#ff9038', '#ffc060'][Math.floor(Math.random() * 3)],
                    0, true, false
                );
            }
            const hitR = this._fireballHitRadius(f);
            for (const m of monsters) {
                if (f.hit.has(m.id)) continue;
                if (!circlesCollide(f.x, f.y, hitR, m.x, m.y, m.hitboxRadius)) continue;
                f.hit.add(m.id);
                const dmg = this.game.player.getAbilityDamage(f.dmgMul);
                const hit = m.takeDamage(dmg, angle(f.x, f.y, m.x, m.y));
                if (hit.actualDamage > 0) {
                    this.game.combat.spawnDamageNumber(m.x, m.y - m.hitboxRadius - 4, hit.actualDamage, false, '#ff8a3a');
                    this.game.particles.hitSpark(m.x, m.y, true);
                }
                if (m.dying) this.game.combat._handleMonsterKilled(m);
            }
        }
        this.fireballs = this.fireballs.filter(f => f.life > 0);
    }

    _updateWaterTornados(dt) {
        const monsters = this.game.spawner.getActiveMonsters();
        const hitR = 14 * WATER_TORNADO_SIZE_SCALE;
        for (const t of this.waterTornados) {
            t.life -= dt;
            t.spin += t.spinSpeed * dt;
            t.x += t.vx * dt;
            t.y += t.vy * dt;
            if (Math.random() < 0.55) {
                const trailAng = Math.atan2(t.vy, t.vx) + Math.PI + randRange(-0.5, 0.5);
                const spd = randRange(25, 70);
                this.game.particles.emit(
                    t.x, t.y,
                    Math.cos(trailAng) * spd, Math.sin(trailAng) * spd,
                    randRange(0.12, 0.24), randRange(4, 8),
                    ['#88e0ff', '#48b8f0', '#d8ffff'][Math.floor(Math.random() * 3)],
                    0, true, false
                );
            }
            for (const m of monsters) {
                if (t.hit.has(m.id)) continue;
                if (!circlesCollide(t.x, t.y, hitR, m.x, m.y, m.hitboxRadius)) continue;
                t.hit.add(m.id);
                const dmg = this.game.player.getAbilityDamage(t.dmgMul);
                const hit = m.takeDamage(dmg, angle(t.x, t.y, m.x, m.y));
                if (hit.actualDamage > 0) {
                    this.game.combat.spawnDamageNumber(m.x, m.y - m.hitboxRadius - 4, hit.actualDamage, false, '#7ad8ff');
                    this.game.particles.hitSpark(m.x, m.y, false);
                }
                if (m.dying) this.game.combat._handleMonsterKilled(m);
            }
        }
        this.waterTornados = this.waterTornados.filter(t => t.life > 0);
    }

    _updateBlackHoles(dt) {
        const monsters = this.game.spawner.getActiveMonsters();
        for (const b of this.blackHoles) {
            b.life -= dt;
            b.dmgTimer += dt;
            const reach = b.r * 2.1;
            for (const m of monsters) {
                const d = dist(b.x, b.y, m.x, m.y);
                if (d > reach || d < 1) continue;
                const n = normalize(b.x - m.x, b.y - m.y);
                const f = b.pull * dt * (1 - d / reach);
                m.x += n.x * f;
                m.y += n.y * f;
                if (b.dmgTimer >= 0.18 && d < b.r * 1.05) {
                    const dmg = this.game.player.getAbilityDamage(0.22);
                    const hit = m.takeDamage(dmg, angle(b.x, b.y, m.x, m.y));
                    if (hit.actualDamage > 0) this.game.combat.spawnDamageNumber(m.x, m.y - m.hitboxRadius - 4, hit.actualDamage, false, '#9c7cff');
                    if (m.dying) this.game.combat._handleMonsterKilled(m);
                }
            }
            if (b.dmgTimer >= 0.18) b.dmgTimer = 0;
        }
        this.blackHoles = this.blackHoles.filter(b => b.life > 0);
    }

    _updateWhirls(dt) {
        const monsters = this.game.spawner.getActiveMonsters();
        for (const w of this.whirls) {
            w.life -= dt;
            w.spin += w.spinSpeed * dt;
            w.ringPhase += dt * 10;
            const expand = w.maxLife ? 1 - w.life / w.maxLife : 0;
            w.r = (w.maxR || w.r) * (0.55 + easeOutQuad(expand) * 0.45);
            if (Math.random() < 0.65) {
                const a = w.spin + randRange(0, Math.PI * 2);
                const distR = w.r * randRange(0.55, 1.05);
                this.game.particles.emit(
                    w.x + Math.cos(a) * distR, w.y + Math.sin(a) * distR,
                    Math.cos(a + Math.PI * 0.5) * randRange(30, 90),
                    Math.sin(a + Math.PI * 0.5) * randRange(30, 90),
                    randRange(0.08, 0.18), randRange(2, 5),
                    ['#ffe8a0', '#ffd060', '#fff8d8'][Math.floor(Math.random() * 3)],
                    0, true, false
                );
            }
            for (const m of monsters) {
                if (w.hit.has(m.id)) continue;
                if (dist(w.x, w.y, m.x, m.y) > w.r + m.hitboxRadius) continue;
                w.hit.add(m.id);
                const dmg = this.game.player.getAbilityDamage(w.dmgMul);
                const hit = m.takeDamage(dmg, angle(w.x, w.y, m.x, m.y));
                if (hit.actualDamage > 0) this.game.combat.spawnDamageNumber(m.x, m.y - m.hitboxRadius - 4, hit.actualDamage, false, '#f0d090');
                if (m.dying) this.game.combat._handleMonsterKilled(m);
            }
        }
        this.whirls = this.whirls.filter(w => w.life > 0);
    }

    _updateVines(dt) {
        const monsters = this.game.spawner.getActiveMonsters();
        for (const v of this.vines) {
            v.life -= dt;
            v.x += v.vx * dt;
            v.y += v.vy * dt;
            for (const m of monsters) {
                if (v.hit.has(m.id)) continue;
                if (!circlesCollide(v.x, v.y, v.hitR, m.x, m.y, m.hitboxRadius)) continue;
                v.hit.add(m.id);
                m.slow(v.slowDur, 0.4);
                const hit = m.takeDamage(v.damage, angle(v.x, v.y, m.x, m.y));
                if (hit.actualDamage > 0) {
                    this.game.combat.spawnDamageNumber(m.x, m.y - m.hitboxRadius - 4, hit.actualDamage, false, '#58c878');
                    this.game.particles.hitSpark(m.x, m.y, false);
                }
                if (m.dying) this.game.combat._handleMonsterKilled(m);
            }
        }
        this.vines = this.vines.filter(v => v.life > 0);
    }

    _updateBatSwarms(dt) {
        const p = this.game.player;
        if (!p) return;
        for (const swarm of this.batSwarms) {
            swarm.timer -= dt;
            if (swarm.timer > 0) continue;

            if (swarm.phase === 'attack') {
                if (swarm.idx >= swarm.targets.length) {
                    swarm.phase = 'return';
                    swarm.idx = 0;
                    swarm.timer = swarm.stepDelay * 0.5;
                    continue;
                }
                const m = swarm.targets[swarm.idx];
                if (m.alive && !m.dying) {
                    this.game.particles.emit(
                        swarm.ox, swarm.oy,
                        (m.x - swarm.ox) * 2, (m.y - swarm.oy) * 2,
                        0.12, 4, '#402858', 0, true, false
                    );
                    const hit = m.takeDamage(swarm.damage, angle(swarm.ox, swarm.oy, m.x, m.y));
                    if (hit.actualDamage > 0) {
                        this.game.combat.spawnDamageNumber(m.x, m.y - m.hitboxRadius - 4, hit.actualDamage, false, '#a070c8');
                        this.game.particles.hitSpark(m.x, m.y, false);
                    }
                    if (m.dying) this.game.combat._handleMonsterKilled(m);
                }
                swarm.idx++;
                swarm.timer = swarm.stepDelay;
            } else if (swarm.phase === 'return') {
                const healed = p.heal(swarm.healAmount);
                if (healed > 0) {
                    this.game.combat.spawnDamageNumber(
                        p.x, p.y - p.effectiveRadius - 12, healed, false, '#68d878'
                    );
                }
                swarm.phase = 'done';
            }
        }
        this.batSwarms = this.batSwarms.filter(s => s.phase !== 'done');
    }

    _drawVine(ctx, v) {
        const lifeT = v.maxLife ? v.life / v.maxLife : 1;
        const cx = Math.floor(v.x);
        const cy = Math.floor(v.y);
        const len = 36 + v.hitR;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(v.rot);
        ctx.globalAlpha = clamp(0.55 + lifeT * 0.45, 0.4, 1);
        const g = ctx.createLinearGradient(-len * 0.5, 0, len * 0.5, 0);
        g.addColorStop(0, 'rgba(40, 100, 48, 0)');
        g.addColorStop(0.35, 'rgba(72, 168, 88, 0.85)');
        g.addColorStop(0.65, 'rgba(48, 130, 62, 0.9)');
        g.addColorStop(1, 'rgba(30, 80, 40, 0)');
        ctx.strokeStyle = g;
        ctx.lineWidth = 10 + v.hitR * 0.15;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-len * 0.5, 0);
        ctx.lineTo(len * 0.5, 0);
        ctx.stroke();
        ctx.fillStyle = '#88e8a0';
        for (let i = -2; i <= 2; i++) {
            ctx.fillRect(len * 0.15 * i - 2, -4 + (i % 2) * 3, 4, 4);
        }
        ctx.restore();
    }

    _drawBatSwarm(ctx, swarm) {
        const p = this.game.player;
        if (!p) return;
        const t = Date.now() * 0.01;
        const count = 6;
        for (let i = 0; i < count; i++) {
            const a = t + (i / count) * Math.PI * 2;
            const orbit = swarm.phase === 'return' ? 8 : 18 + i * 3;
            const cx = swarm.phase === 'return'
                ? lerp(swarm.ox, p.x, 0.55 + Math.sin(t + i) * 0.15)
                : swarm.ox + Math.cos(a) * orbit;
            const cy = swarm.phase === 'return'
                ? lerp(swarm.oy, p.y, 0.55 + Math.cos(t + i) * 0.15)
                : swarm.oy + Math.sin(a) * orbit;
            ctx.fillStyle = '#302040';
            ctx.fillRect(Math.floor(cx) - 3, Math.floor(cy) - 2, 6, 4);
            ctx.fillStyle = '#8060a8';
            ctx.fillRect(Math.floor(cx) - 2, Math.floor(cy) - 3, 4, 2);
        }
    }

    updatePassive(dt) {
        this._updateAutoDartFire(dt);
        if (this.shurikens.some(s => s.kind === 'auto')) this._updateShurikens(dt, 'auto');
        if (this.batSwarms.length > 0) this._updateBatSwarms(dt);
    }

    update(dt) {
        if (this.resolveFxTimer > 0) this.resolveFxTimer -= dt;
        if (!this._isResolvePhase()) return;

        this._updateLightningChain(dt);
        if (this.shurikens.some(s => s.kind !== 'auto')) this._updateShurikens(dt, 'skill');
        if (this.vines.length > 0) this._updateVines(dt);
        this._updateFireballs(dt);
        this._updateWaterTornados(dt);
        this._updateBlackHoles(dt);
        this._updateWhirls(dt);
    }

    drawBehind(ctx) {
        if (!this._isResolvePhase()) return;
        for (const b of this.blackHoles) {
            const p = 0.8 + Math.sin(Date.now() * 0.008) * 0.2;
            ctx.save();
            const maxLife = b.maxLife || 1.75;
            ctx.globalAlpha = clamp(b.life / maxLife, 0, 1);
            const g = ctx.createRadialGradient(b.x, b.y, 4, b.x, b.y, b.r * 1.55);
            g.addColorStop(0, 'rgba(70,30,120,0.9)');
            g.addColorStop(1, 'rgba(10,6,18,0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.r * p, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    _drawSpiritBomb(ctx, x, y, rot, scale) {
        const px = Math.floor(x);
        const py = Math.floor(y);
        const r = 10 * scale;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(rot);
        const pulse = 0.9 + Math.sin(Date.now() * 0.012) * 0.1;
        const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, r * 1.6 * pulse);
        glow.addColorStop(0, 'rgba(255, 248, 200, 0.95)');
        glow.addColorStop(0.45, 'rgba(255, 210, 80, 0.75)');
        glow.addColorStop(1, 'rgba(255, 140, 40, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.5 * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff8c8';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.55 * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffb830';
        ctx.beginPath();
        ctx.arc(0, 0, r * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    drawAutoDarts(ctx) {
        for (const s of this.shurikens) {
            if (s.kind !== 'auto') continue;
            const scale = s.visualScale || 1;
            if (s.isSpirit) {
                this._drawSpiritBomb(ctx, s.x, s.y, s.rot, scale);
            } else {
                const px = SHURIKEN_PIXEL * scale;
                this._drawPixelShuriken(ctx, s.x, s.y, s.rot, px);
            }
        }
    }

    drawFront(ctx) {
        const showAuto = this.hasAutoDarts();
        if (!this._isResolvePhase() && !showAuto) return;

        for (const s of this.shurikens) {
            if (s.kind === 'auto') continue;
            this._drawPixelShuriken(ctx, s.x, s.y, s.rot, SHURIKEN_PIXEL);
        }

        for (const f of this.fireballs) {
            if (f.kind === 'great') {
                this._drawPixelFireball(ctx, f);
            } else {
                ctx.imageSmoothingEnabled = false;
                ctx.fillStyle = '#ff8a38';
                ctx.fillRect(Math.floor(f.x - 4), Math.floor(f.y - 4), 8, 8);
                ctx.fillStyle = '#ffd0a0';
                ctx.fillRect(Math.floor(f.x - 2), Math.floor(f.y - 2), 4, 4);
            }
        }
        for (const t of this.waterTornados) {
            this._drawPixelWaterTornado(ctx, t);
        }
        for (const w of this.whirls) {
            this._drawPixelBladeWhirl(ctx, w);
        }
        for (const v of this.vines) {
            this._drawVine(ctx, v);
        }
    }

    drawBatSwarms(ctx) {
        for (const swarm of this.batSwarms) {
            this._drawBatSwarm(ctx, swarm);
        }
    }
}
