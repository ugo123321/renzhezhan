/**
 * 天雷 / 野狼 / 野牛 / 天神 — 被动召唤与落雷
 */
(function () {
    const SUMMON_CFG = {
        heavenly_thunder: {
            interval: 1.0,
            radius: 40,
            dmgMult: 0.38,
            warnTime: 0.22,
            boltTime: 0.09,
            explodeTime: 0.32,
            skyY: 0,
        },
        wild_wolf: { speed: 118, aggro: 200, atkRange: 36, atkCd: 0.75, dmgMult: 2 },
        wild_bull: { aggro: 240, chargeSpeed: 420, chargeDmgMult: 2.5, idleCd: 1.1, dmgMult: 3 },
        divine_god: { followSpeed: 52, atkInterval: 0.28, swordSpeed: 540, dmgMult: 2, orbitDist: 14 },
        wild_wolf_orbit: 22,
        wild_bull_orbit: 24,
    };

    function _playBottom(game) {
        const ui = game.ui;
        return ui && ui.getPlayAreaBottom
            ? ui.getPlayAreaBottom(game.renderer.h, game.renderer.uiScale)
            : game.renderer.h;
    }

    Object.assign(AbilityManager.prototype, {
        _initSummonState() {
            this.thunderBolts = [];
            this.thunderTimer = 0;
            this.companions = [];
            this.godSwords = [];
        },

        _summonDealDamage(m, damage, color, fromX, fromY) {
            if (!m || !m.alive || m.dying) return;
            const ang = angle(fromX ?? m.x, fromY ?? m.y, m.x, m.y);
            const hit = m.takeDamage(damage, ang);
            if (hit.actualDamage > 0) {
                this.game.combat.spawnDamageNumber(
                    m.x, m.y - m.hitboxRadius - 4, hit.actualDamage, false, color || '#e8c040'
                );
                this.game.particles.hitSpark(m.x, m.y, false);
            }
            if (m.dying) this.game.combat._handleMonsterKilled(m);
        },

        _summonAoeDamage(x, y, radius, damage, color) {
            const monsters = this.game.spawner.getActiveMonsters();
            for (const m of monsters) {
                if (dist(x, y, m.x, m.y) > radius + m.hitboxRadius) continue;
                this._summonDealDamage(m, damage, color, x, y);
            }
        },

        _anchorNearPlayer(p, index, total, distMul) {
            const base = (index / Math.max(1, total)) * Math.PI * 2;
            const orbit = Date.now() * 0.001 + base;
            const r = p.effectiveRadius + 36 + distMul;
            return {
                x: p.homeX + Math.cos(orbit) * r,
                y: p.homeY + Math.sin(orbit) * r * 0.85,
            };
        },

        _getPetCountMultiplier(p) {
            const heart = p.getUpgradeLevel('nurturing_heart');
            return heart > 0 ? Math.pow(2, heart) : 1;
        },

        _getDesiredPetCount(p, upgradeId) {
            const base = p.getUpgradeLevel(upgradeId);
            if (base <= 0) return 0;
            const def = typeof UPGRADE_DEFS !== 'undefined'
                ? UPGRADE_DEFS.find(u => u.id === upgradeId)
                : null;
            if (!def || !def.pet) return base;
            return base * this._getPetCountMultiplier(p);
        },

        _spawnPetWorldPos(p, index, total, scatterInField = false) {
            const w = this.game.renderer.w;
            const top = 88;
            const bottom = _playBottom(this.game);
            if (scatterInField) {
                return {
                    x: randRange(40, w - 40),
                    y: randRange(top + 30, bottom - 30),
                };
            }
            const spread = (index / Math.max(1, total)) * Math.PI * 2 + randRange(-0.35, 0.35);
            const r = randRange(55, 95 + index * 14);
            return {
                x: clamp(p.homeX + Math.cos(spread) * r, 30, w - 30),
                y: clamp(p.homeY + Math.sin(spread) * r * 0.85, top + 24, bottom - 24),
            };
        },

        _spawnCompanion(type, index, total) {
            const p = this.game.player;
            const isPet = type === 'wolf' || type === 'bull';
            const scatter = isPet && this._playerRepositioning(p);
            const pos = isPet
                ? this._spawnPetWorldPos(p, index, total, scatter)
                : this._anchorNearPlayer(p, index, total, SUMMON_CFG.divine_god.orbitDist);
            const cfg = SUMMON_CFG[type === 'wolf' ? 'wild_wolf' : type === 'bull' ? 'wild_bull' : 'divine_god'];
            const lvKey = type === 'wolf' ? 'wild_wolf' : type === 'bull' ? 'wild_bull' : 'divine_god';
            const lv = p.getUpgradeLevel(lvKey);
            return {
                type,
                isPet,
                x: pos.x,
                y: pos.y,
                slot: index,
                state: 'idle',
                atkTimer: randRange(0, 0.4),
                chargeTimer: 0,
                targetId: null,
                chargeHit: new Set(),
                walkPhase: randRange(0, Math.PI * 2),
                facing: 1,
                lv,
                damage: p.getAbilityDamage(cfg.dmgMult * (1 + (lv - 1) * 0.08)),
            };
        },

        _ensureCompanions() {
            const p = this.game.player;
            if (!p) return;
            const specs = [
                { id: 'wild_wolf', type: 'wolf' },
                { id: 'wild_bull', type: 'bull' },
                { id: 'divine_god', type: 'god' },
            ];
            for (const spec of specs) {
                const need = this._getDesiredPetCount(p, spec.id);
                let list = this.companions.filter(c => c.type === spec.type);
                while (list.length < need) {
                    const c = this._spawnCompanion(spec.type, list.length, need);
                    this.companions.push(c);
                    list.push(c);
                }
                while (list.length > need) {
                    const rem = this.companions.findIndex(c => c.type === spec.type);
                    if (rem >= 0) this.companions.splice(rem, 1);
                    list = this.companions.filter(c => c.type === spec.type);
                }
            }
        },

        _spawnThunderStrikes() {
            const p = this.game.player;
            const lv = p.getUpgradeLevel('heavenly_thunder');
            if (lv <= 0) return;
            const cfg = SUMMON_CFG.heavenly_thunder;
            const monsters = this.game.spawner.getActiveMonsters();
            const count = lv;
            const w = this.game.renderer.w;
            const top = 88;

            for (let i = 0; i < count; i++) {
                let tx;
                let ty;
                if (monsters.length > 0) {
                    const m = monsters[randInt(0, monsters.length - 1)];
                    tx = m.x + randRange(-20, 20);
                    ty = m.y + randRange(-16, 16);
                } else {
                    tx = p.homeX + randRange(-80, 80);
                    ty = p.homeY + randRange(-60, 60);
                }
                tx = clamp(tx, 30, w - 30);
                ty = clamp(ty, top + 20, _playBottom(this.game) - 20);
                this.thunderBolts.push({
                    x: tx,
                    y: ty,
                    phase: 'warn',
                    timer: cfg.warnTime || 0.22,
                    radius: cfg.radius + lv * 3,
                    damage: p.getAbilityDamage(cfg.dmgMult * (1 + (lv - 1) * 0.06)),
                    skyY: cfg.skyY ?? 0,
                    boltPoints: null,
                    explodeMax: cfg.explodeTime || 0.32,
                });
            }
        },

        _generateThunderBoltPath(gx, gy, skyY) {
            const points = [{ x: gx, y: skyY }];
            const steps = 14;
            for (let i = 1; i < steps; i++) {
                const t = i / steps;
                points.push({
                    x: gx + randRange(-22, 22) * (1 - t * 0.45),
                    y: lerp(skyY, gy, t) + randRange(-10, 10),
                });
            }
            points.push({ x: gx, y: gy });
            return points;
        },

        _spawnThunderExplosionFx(x, y, radius) {
            const parts = this.game.particles;
            if (!parts) return;
            for (let i = 0; i < 22; i++) {
                const a = randRange(0, Math.PI * 2);
                const spd = randRange(90, 200);
                parts.emit(
                    x, y,
                    Math.cos(a) * spd, Math.sin(a) * spd,
                    randRange(0.18, 0.42), randRange(5, 12),
                    i % 3 === 0 ? '#fff8d0' : (i % 3 === 1 ? '#ffb040' : '#ff6020'),
                    0, true, true
                );
            }
            for (let i = 0; i < 8; i++) {
                const a = randRange(0, Math.PI * 2);
                parts.emit(
                    x + Math.cos(a) * radius * 0.3,
                    y + Math.sin(a) * radius * 0.2,
                    Math.cos(a) * randRange(30, 70),
                    Math.sin(a) * randRange(20, 50) - 40,
                    randRange(0.35, 0.55), randRange(8, 16),
                    '#888898', 0.15, true, false
                );
            }
        },

        _updateThunder(dt) {
            const p = this.game.player;
            const lv = p ? p.getUpgradeLevel('heavenly_thunder') : 0;
            if (lv <= 0) {
                this.thunderBolts = [];
                return;
            }

            const cfg = SUMMON_CFG.heavenly_thunder;
            this.thunderTimer -= dt;
            if (this.thunderTimer <= 0) {
                this._spawnThunderStrikes();
                this.thunderTimer = cfg.interval;
            }

            for (const t of this.thunderBolts) {
                t.timer -= dt;
                if (t.phase === 'warn' && t.timer <= 0) {
                    t.phase = 'bolt';
                    t.timer = cfg.boltTime || 0.09;
                    t.boltPoints = this._generateThunderBoltPath(t.x, t.y, t.skyY);
                } else if (t.phase === 'bolt' && t.timer <= 0) {
                    t.phase = 'explode';
                    t.timer = t.explodeMax || cfg.explodeTime || 0.32;
                    this._summonAoeDamage(t.x, t.y, t.radius, t.damage, '#ffe878');
                    this._spawnThunderExplosionFx(t.x, t.y, t.radius);
                    this.game.renderer.shake(7 + lv * 0.5, 0.16);
                } else if (t.phase === 'explode' && t.timer <= 0) {
                    t.phase = 'done';
                }
            }
            this.thunderBolts = this.thunderBolts.filter(t => t.phase !== 'done');
        },

        _updateWolf(c, dt, p, cfg) {
            c.walkPhase += dt * 9;
            const monsters = this.game.spawner.getActiveMonsters();
            let target = null;
            let best = cfg.aggro;
            for (const m of monsters) {
                const d = dist(c.x, c.y, m.x, m.y);
                if (d < best) {
                    best = d;
                    target = m;
                }
            }

            if (target) {
                c.facing = target.x >= c.x ? 1 : -1;
                const d = dist(c.x, c.y, target.x, target.y);
                if (d > cfg.atkRange) {
                    const dx = target.x - c.x;
                    const dy = target.y - c.y;
                    const len = Math.hypot(dx, dy) || 1;
                    c.x += (dx / len) * cfg.speed * dt;
                    c.y += (dy / len) * cfg.speed * dt;
                } else {
                    c.atkTimer -= dt;
                    if (c.atkTimer <= 0) {
                        c.atkTimer = cfg.atkCd;
                        this._summonDealDamage(target, c.damage, '#c8d8b0', c.x, c.y);
                    }
                }
            }
        },

        _updateBull(c, dt, p, cfg) {
            const monsters = this.game.spawner.getActiveMonsters();

            if (c.state === 'charging') {
                c.chargeTimer -= dt;
                const tx = c.chargeTx;
                const ty = c.chargeTy;
                const dx = tx - c.x;
                const dy = ty - c.y;
                const len = Math.hypot(dx, dy) || 1;
                c.facing = dx >= 0 ? 1 : -1;
                const step = cfg.chargeSpeed * dt;
                c.x += (dx / len) * step;
                c.y += (dy / len) * step;

                for (const m of monsters) {
                    if (c.chargeHit.has(m.id)) continue;
                    if (!circlesCollide(c.x, c.y, 32, m.x, m.y, m.hitboxRadius)) continue;
                    c.chargeHit.add(m.id);
                    this._summonDealDamage(m, c.damage, '#e8b878', c.x, c.y);
                }

                if (dist(c.x, c.y, tx, ty) < 18 || c.chargeTimer <= 0) {
                    c.state = 'idle';
                    c.atkTimer = cfg.idleCd;
                }
                return;
            }

            c.atkTimer -= dt;
            if (c.atkTimer > 0) return;

            let target = null;
            let best = cfg.aggro;
            for (const m of monsters) {
                const d = dist(c.x, c.y, m.x, m.y);
                if (d < best) {
                    best = d;
                    target = m;
                }
            }

            if (target) {
                c.facing = target.x >= c.x ? 1 : -1;
                c.state = 'charging';
                c.chargeTx = target.x;
                c.chargeTy = target.y;
                c.chargeTimer = 1.4;
                c.chargeHit = new Set();
                c.damage = p.getAbilityDamage(cfg.chargeDmgMult * (1 + (c.lv - 1) * 0.08));
            }
        },

        _fireGodSword(c, p, cfg) {
            const monsters = this.game.spawner.getActiveMonsters();
            if (!monsters.length) return;
            monsters.sort((a, b) => dist(c.x, c.y, a.x, a.y) - dist(c.x, c.y, b.x, b.y));
            const target = monsters[0];
            const a = angle(c.x, c.y, target.x, target.y);
            this.godSwords.push({
                x: c.x,
                y: c.y - 18,
                tx: target.x,
                ty: target.y,
                targetId: target.id,
                vx: Math.cos(a) * cfg.swordSpeed,
                vy: Math.sin(a) * cfg.swordSpeed,
                rot: a,
                damage: c.damage,
                life: 2.5,
            });
        },

        _updateGod(c, dt, p, cfg) {
            const godCount = this._getDesiredPetCount(p, 'divine_god');
            const anchor = this._anchorNearPlayer(p, c.slot, godCount, cfg.orbitDist);
            c.x = lerp(c.x, anchor.x, dt * 2.2);
            c.y = lerp(c.y, anchor.y, dt * 2.2);
            c.atkTimer -= dt;
            if (c.atkTimer <= 0) {
                c.atkTimer = cfg.atkInterval;
                this._fireGodSword(c, p, cfg);
            }
        },

        _updateGodSwords(dt) {
            for (const s of this.godSwords) {
                s.life -= dt;
                s.x += s.vx * dt;
                s.y += s.vy * dt;
                const monsters = this.game.spawner.getActiveMonsters();
                if (!s.hitTarget) {
                    for (const m of monsters) {
                        if (!m.alive || m.dying) continue;
                        if (m.id !== s.targetId) continue;
                        if (!circlesCollide(s.x, s.y, 16, m.x, m.y, m.hitboxRadius)) continue;
                        s.hitTarget = true;
                        this._summonDealDamage(m, s.damage, '#fff8c8', s.x, s.y);
                        this.game.particles.slashTrail(m.x, m.y, s.rot);
                        break;
                    }
                }
                if (!s.hitTarget && dist(s.x, s.y, s.tx, s.ty) < 24) s.life = 0;
            }
            this.godSwords = this.godSwords.filter(s => s.life > 0 && !s.hitTarget);
        },

        _playerRepositioning(p) {
            return p.state === PlayerState.BULLET_TIME || p.state === PlayerState.ATTACKING;
        },

        _updateCompanions(dt) {
            const p = this.game.player;
            if (!p || p.hp <= 0) return;
            this._ensureCompanions();

            const w = this.game.renderer.w;
            const h = _playBottom(this.game);
            const top = 88;
            const freezeWolfBull = this._playerRepositioning(p);

            for (const c of this.companions) {
                c.lv = p.getUpgradeLevel(
                    c.type === 'wolf' ? 'wild_wolf' : c.type === 'bull' ? 'wild_bull' : 'divine_god'
                );
                if (c.lv <= 0) continue;

                c.x = clamp(c.x, 20, w - 20);
                c.y = clamp(c.y, top + 16, h - 16);

                if (freezeWolfBull && (c.type === 'wolf' || c.type === 'bull')) {
                    continue;
                }

                if (c.type === 'wolf') {
                    this._updateWolf(c, dt, p, SUMMON_CFG.wild_wolf);
                } else if (c.type === 'bull') {
                    this._updateBull(c, dt, p, SUMMON_CFG.wild_bull);
                } else if (c.type === 'god') {
                    this._updateGod(c, dt, p, SUMMON_CFG.divine_god);
                }
            }

            this.companions = this.companions.filter(c => {
                const key = c.type === 'wolf' ? 'wild_wolf' : c.type === 'bull' ? 'wild_bull' : 'divine_god';
                return p.getUpgradeLevel(key) > 0;
            });

            if (this.godSwords.length) this._updateGodSwords(dt);
        },

        _updateSummonPassives(dt) {
            const p = this.game.player;
            if (!p || this.game.state !== 'PLAYING') return;
            if (p.getUpgradeLevel('heavenly_thunder') > 0) this._updateThunder(dt);
            if (p.getUpgradeLevel('wild_wolf') > 0
                || p.getUpgradeLevel('wild_bull') > 0
                || p.getUpgradeLevel('divine_god') > 0) {
                this._updateCompanions(dt);
            }
        },

        hasSummonFx() {
            return this.companions.length > 0 || this.thunderBolts.length > 0 || this.godSwords.length > 0;
        },

        _drawThunderBoltPath(ctx, points, alpha, width) {
            if (!points || points.length < 2) return;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = '#e8fcff';
            ctx.lineWidth = width;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.shadowColor = '#68d0ff';
            ctx.shadowBlur = 18;
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i].x, points[i].y);
            }
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = Math.max(1, width * 0.45);
            ctx.stroke();
            ctx.restore();
        },

        _drawThunderExplosion(ctx, t) {
            const cx = t.x;
            const cy = t.y;
            const maxT = t.explodeMax || 0.32;
            const prog = clamp(1 - t.timer / maxT, 0, 1);
            const r = t.radius * (0.25 + prog * 0.85);
            const alpha = 1 - prog * 0.85;

            ctx.save();
            ctx.globalAlpha = alpha;

            const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.55);
            core.addColorStop(0, 'rgba(255, 255, 240, 0.95)');
            core.addColorStop(0.35, 'rgba(255, 210, 80, 0.75)');
            core.addColorStop(1, 'rgba(255, 100, 30, 0)');
            ctx.fillStyle = core;
            ctx.beginPath();
            ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
            ctx.fill();

            const ring = ctx.createRadialGradient(cx, cy, r * 0.4, cx, cy, r);
            ring.addColorStop(0, 'rgba(255, 180, 50, 0.5)');
            ring.addColorStop(0.6, 'rgba(255, 90, 30, 0.35)');
            ring.addColorStop(1, 'rgba(80, 40, 10, 0)');
            ctx.fillStyle = ring;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = `rgba(255, 240, 180, ${alpha * 0.8})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(cx, cy, r * prog, 0, Math.PI * 2);
            ctx.stroke();

            ctx.restore();
        },

        _drawThunder(ctx) {
            const cfg = SUMMON_CFG.heavenly_thunder;
            const boltDur = cfg.boltTime || 0.09;

            for (const t of this.thunderBolts) {
                const cx = t.x;
                const cy = t.y;

                if (t.phase === 'warn') {
                    const pulse = 0.4 + Math.sin(Date.now() * 0.025) * 0.2;
                    ctx.save();
                    ctx.globalAlpha = pulse;
                    ctx.strokeStyle = '#ffe878';
                    ctx.lineWidth = 2;
                    ctx.setLineDash([5, 5]);
                    ctx.beginPath();
                    ctx.ellipse(cx, cy, t.radius * 0.65, t.radius * 0.4, 0, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.setLineDash([]);
                    ctx.fillStyle = 'rgba(255, 230, 120, 0.12)';
                    ctx.beginPath();
                    ctx.ellipse(cx, cy, t.radius * 0.5, t.radius * 0.32, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                    continue;
                }

                if (t.phase === 'bolt' && t.boltPoints) {
                    const boltProg = clamp(1 - t.timer / boltDur, 0, 1);
                    const visCount = Math.max(2, Math.floor(t.boltPoints.length * boltProg));
                    const visPts = t.boltPoints.slice(0, visCount);
                    this._drawThunderBoltPath(ctx, visPts, 0.95, 5);
                    if (boltProg >= 0.95) {
                        ctx.save();
                        ctx.globalAlpha = 0.85;
                        const flash = ctx.createRadialGradient(cx, cy, 0, cx, cy, 18);
                        flash.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
                        flash.addColorStop(1, 'rgba(255, 220, 100, 0)');
                        ctx.fillStyle = flash;
                        ctx.beginPath();
                        ctx.arc(cx, cy, 18, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.restore();
                    }
                }

                if (t.phase === 'bolt' && t.boltPoints && t.timer > 0) {
                    const skyX = t.boltPoints[0].x;
                    const skyY = t.boltPoints[0].y;
                    ctx.save();
                    ctx.globalAlpha = 0.2;
                    const cloud = ctx.createRadialGradient(skyX, skyY, 0, skyX, skyY, 50);
                    cloud.addColorStop(0, 'rgba(200, 230, 255, 0.5)');
                    cloud.addColorStop(1, 'rgba(100, 140, 200, 0)');
                    ctx.fillStyle = cloud;
                    ctx.beginPath();
                    ctx.arc(skyX, skyY, 50, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }

                if (t.phase === 'explode') {
                    if (t.boltPoints) {
                        this._drawThunderBoltPath(ctx, t.boltPoints, 0.35, 3);
                    }
                    this._drawThunderExplosion(ctx, t);
                }
            }
        },

        _fillPx(ctx, ox, oy, col, row, color, px) {
            if (!color) return;
            ctx.fillStyle = color;
            ctx.fillRect(ox + col * px, oy + row * px, px, px);
        },

        _drawWolf(ctx, c) {
            const px = 4;
            const x = Math.floor(c.x);
            const y = Math.floor(c.y);
            const bob = Math.sin(c.walkPhase) * 3;
            const leg = Math.sin(c.walkPhase * 2) > 0;
            const facing = c.facing ?? 1;
            ctx.save();
            ctx.imageSmoothingEnabled = false;
            ctx.translate(x, y + bob);
            if (facing < 0) ctx.scale(-1, 1);

            const ox = -11 * px;
            const oy = -7 * px;
            const B = '#383c48';
            const F = '#687080';
            const L = '#98a8b8';
            const E = '#1a1c22';
            const N = '#2a2a30';

            // 尾
            this._fillPx(ctx, ox, oy, -4, 2, B, px);
            this._fillPx(ctx, ox, oy, -3, 1, F, px);
            this._fillPx(ctx, ox, oy, -3, 2, F, px);
            this._fillPx(ctx, ox, oy, -2, 0, B, px);
            // 后腿
            this._fillPx(ctx, ox, oy, -1, 4, B, px);
            this._fillPx(ctx, ox, oy, 0, 5, E, px);
            this._fillPx(ctx, ox, oy, 1, 4, B, px);
            this._fillPx(ctx, ox, oy, 2, 5, E, px);
            // 身
            for (let col = 0; col <= 5; col++) {
                this._fillPx(ctx, ox, oy, col, 2, F, px);
                this._fillPx(ctx, ox, oy, col, 3, B, px);
            }
            this._fillPx(ctx, ox, oy, 2, 1, L, px);
            this._fillPx(ctx, ox, oy, 3, 1, L, px);
            // 前腿
            this._fillPx(ctx, ox, oy, 4, 4, B, px);
            this._fillPx(ctx, ox, oy, 5, 5, E, px);
            this._fillPx(ctx, ox, oy, 6, 4, B, px);
            if (leg) this._fillPx(ctx, ox, oy, 6, 5, E, px);
            // 头颈
            this._fillPx(ctx, ox, oy, 5, 0, F, px);
            this._fillPx(ctx, ox, oy, 6, 0, F, px);
            this._fillPx(ctx, ox, oy, 7, 1, F, px);
            this._fillPx(ctx, ox, oy, 7, 2, B, px);
            // 耳
            this._fillPx(ctx, ox, oy, 6, -2, B, px);
            this._fillPx(ctx, ox, oy, 7, -2, B, px);
            this._fillPx(ctx, ox, oy, 8, -1, B, px);
            // 吻部
            this._fillPx(ctx, ox, oy, 8, 1, L, px);
            this._fillPx(ctx, ox, oy, 9, 2, L, px);
            this._fillPx(ctx, ox, oy, 10, 2, N, px);
            this._fillPx(ctx, ox, oy, 10, 3, N, px);
            this._fillPx(ctx, ox, oy, 9, 3, F, px);
            // 眼
            this._fillPx(ctx, ox, oy, 8, 0, '#e8e8f0', px);
            this._fillPx(ctx, ox, oy, 8, 0, E, px);
            ctx.fillStyle = E;
            ctx.fillRect(ox + 8 * px + 1, oy + 0 * px + 1, px - 2, px - 2);

            ctx.restore();
        },

        _drawBull(ctx, c) {
            const px = 4;
            const x = Math.floor(c.x);
            const y = Math.floor(c.y);
            const facing = c.facing ?? 1;
            const charge = c.state === 'charging';
            ctx.save();
            ctx.imageSmoothingEnabled = false;
            ctx.translate(x, y);
            if (facing < 0) ctx.scale(-1, 1);

            const ox = -13 * px;
            const oy = -8 * px;
            const D = '#4a3020';
            const M = '#7a5030';
            const H = '#a07040';
            const L = '#c8a060';
            const E = '#1a1008';
            const Horn = '#e8dcc8';

            // 尾
            this._fillPx(ctx, ox, oy, -3, 2, D, px);
            this._fillPx(ctx, ox, oy, -2, 1, M, px);
            // 后腿
            this._fillPx(ctx, ox, oy, 0, 5, D, px);
            this._fillPx(ctx, ox, oy, 0, 6, E, px);
            this._fillPx(ctx, ox, oy, 1, 5, D, px);
            this._fillPx(ctx, ox, oy, 1, 6, E, px);
            // 躯干
            for (let col = -1; col <= 6; col++) {
                this._fillPx(ctx, ox, oy, col, 2, M, px);
                this._fillPx(ctx, ox, oy, col, 3, D, px);
                this._fillPx(ctx, ox, oy, col, 4, D, px);
            }
            this._fillPx(ctx, ox, oy, 2, 1, H, px);
            this._fillPx(ctx, ox, oy, 3, 1, H, px);
            // 前腿
            this._fillPx(ctx, ox, oy, 5, 5, D, px);
            this._fillPx(ctx, ox, oy, 5, 6, E, px);
            this._fillPx(ctx, ox, oy, 6, 5, D, px);
            this._fillPx(ctx, ox, oy, 6, 6, E, px);
            // 头
            this._fillPx(ctx, ox, oy, 6, 0, H, px);
            this._fillPx(ctx, ox, oy, 7, 0, H, px);
            this._fillPx(ctx, ox, oy, 7, 1, M, px);
            this._fillPx(ctx, ox, oy, 8, 1, M, px);
            this._fillPx(ctx, ox, oy, 8, 2, M, px);
            this._fillPx(ctx, ox, oy, 9, 2, L, px);
            this._fillPx(ctx, ox, oy, 10, 3, L, px);
            this._fillPx(ctx, ox, oy, 10, 4, E, px);
            // 鼻环
            this._fillPx(ctx, ox, oy, 10, 3, '#d8b040', px);
            // 角
            this._fillPx(ctx, ox, oy, 6, -2, Horn, px);
            this._fillPx(ctx, ox, oy, 7, -3, Horn, px);
            this._fillPx(ctx, ox, oy, 8, -2, Horn, px);
            this._fillPx(ctx, ox, oy, 9, -3, Horn, px);
            this._fillPx(ctx, ox, oy, 7, -1, D, px);
            // 眼
            this._fillPx(ctx, ox, oy, 8, 0, E, px);

            if (charge) {
                ctx.globalAlpha = 0.35;
                ctx.fillStyle = '#ffe8a0';
                ctx.fillRect(ox - 4 * px, oy + 2 * px, 18 * px, 5 * px);
            }

            ctx.restore();
        },

        _drawGod(ctx, c) {
            const x = Math.floor(c.x);
            const y = Math.floor(c.y);
            const pulse = 0.9 + Math.sin(Date.now() * 0.006 + c.slot) * 0.08;
            ctx.save();
            ctx.translate(x, y);
            const g = ctx.createRadialGradient(0, -16, 4, 0, -8, 28 * pulse);
            g.addColorStop(0, 'rgba(255, 248, 220, 0.9)');
            g.addColorStop(1, 'rgba(255, 200, 80, 0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.ellipse(0, -10, 14 * pulse, 20 * pulse, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffe8c8';
            ctx.fillRect(-5, -22, 10, 10);
            ctx.fillStyle = '#fff8f0';
            ctx.fillRect(-8, -8, 16, 14);
            ctx.fillStyle = '#ffd878';
            ctx.fillRect(-10, 4, 20, 4);
            ctx.restore();
        },

        _drawGodSword(ctx, s) {
            const x = Math.floor(s.x);
            const y = Math.floor(s.y);
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(s.rot + Math.PI / 2);
            ctx.shadowColor = '#fff8c0';
            ctx.shadowBlur = 10;
            ctx.fillStyle = '#fffce8';
            ctx.fillRect(-3, -14, 6, 28);
            ctx.fillStyle = '#ffd860';
            ctx.fillRect(-5, 10, 10, 6);
            ctx.fillStyle = '#c8a040';
            ctx.fillRect(-2, -18, 4, 6);
            ctx.restore();
        },

        drawSummonFx(ctx) {
            if (this.thunderBolts.length) this._drawThunder(ctx);
            for (const c of this.companions) {
                if (c.type === 'wolf') this._drawWolf(ctx, c);
                else if (c.type === 'bull') this._drawBull(ctx, c);
                else if (c.type === 'god') this._drawGod(ctx, c);
            }
            for (const s of this.godSwords) this._drawGodSword(ctx, s);
        },
    });

    const _origReset = AbilityManager.prototype.reset;
    AbilityManager.prototype.reset = function (opts = {}) {
        const keepCompanions = opts.keepCompanions === true;
        const savedCompanions = keepCompanions && this.companions
            ? this.companions.map((c) => ({
                ...c,
                chargeHit: c.chargeHit instanceof Set ? new Set(c.chargeHit) : new Set(),
            }))
            : null;
        const savedThunderTimer = keepCompanions ? this.thunderTimer : 0;
        _origReset.call(this);
        this.companions = savedCompanions || [];
        this.thunderTimer = savedThunderTimer ?? 0;
        this.thunderBolts = [];
        this.godSwords = [];
    };

    const _origUpdatePassive = AbilityManager.prototype.updatePassive;
    AbilityManager.prototype.updatePassive = function (dt) {
        _origUpdatePassive.call(this, dt);
        this._updateSummonPassives(dt);
    };

})();
