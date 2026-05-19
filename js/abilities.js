class AbilityManager {
    constructor(game) {
        this.game = game;
        this.reset();
    }

    reset() {
        this.orbitAngle = 0;
        this.shurikenHitCd = new Map();
        this.shurikenTrails = [];
        this.crescents = [];
        this.blackHoles = [];
        this.whirlwinds = [];
        this.fireballs = [];
        this.fireballTimer = 2;
        this.lastCrescentAtCombo = 0;
        this.lastWhirlAtCombo = 0;
        this.lastBlackHoleAtCombo = 0;
    }

    onComboHit(combo) {
        const player = this.game.player;
        if (!player) return;

        if (player.crescentLevel > 0) {
            player.crescentCharge = (player.crescentCharge || 0) + 1;
            if (player.crescentCharge >= 3) {
                player.crescentCharge = 0;
                const waves = player.crescentWaves || 1;
                const target = this._nearestMonster(player.x, player.y);
                for (let i = 0; i < waves; i++) {
                    this._spawnCrescent(player, target, i, waves);
                }
            }
        }

        if (player.bladeWhirlLevel > 0 && combo >= 5 && combo % 5 === 0 && combo !== this.lastWhirlAtCombo) {
            this.lastWhirlAtCombo = combo;
            this._spawnWhirlwind(player.x, player.y, player.bladeWhirlLevel);
        }

        if (player.blackHoleLevel > 0 && combo >= 8 && combo % 8 === 0 &&
            combo !== this.lastBlackHoleAtCombo) {
            this.lastBlackHoleAtCombo = combo;
            this._spawnBlackHoleAt(player.x, player.y, player.blackHoleLevel);
        }
    }

    update(dt) {
        const player = this.game.player;
        if (!player) return;

        this.orbitAngle += dt * 4.8;
        this._updateShurikens(dt, player);
        this._updateCrescents(dt);
        this._updateBlackHoles(dt);
        this._updateWhirlwinds(dt);
        this._updateFireballs(dt);

        if (player.fireballLevel > 0) {
            this.fireballTimer -= dt;
            if (this.fireballTimer <= 0) {
                this.fireballTimer = 2;
                this._spawnFireballVolley(player);
            }
        }
    }

    drawBehind(ctx) {
        for (const h of this.blackHoles) this._drawBlackHole(ctx, h);
        for (const w of this.whirlwinds) this._drawWhirlwind(ctx, w);
    }

    drawFront(ctx) {
        for (const c of this.crescents) this._drawCrescent(ctx, c);
        for (const f of this.fireballs) this._drawFireball(ctx, f);
        this._drawShurikenTrails(ctx);
        this._drawShurikens(ctx);
    }

    draw(ctx) {
        this.drawBehind(ctx);
        this.drawFront(ctx);
    }

    _burstParticles(x, y, count, colors, speedMin, speedMax, life, size, glow) {
        const particles = this.game.particles;
        for (let i = 0; i < count; i++) {
            const a = randRange(0, Math.PI * 2);
            const sp = randRange(speedMin, speedMax);
            particles.emit(x, y,
                Math.cos(a) * sp, Math.sin(a) * sp,
                randRange(life * 0.7, life), randRange(size * 0.8, size * 1.2),
                colors[Math.floor(Math.random() * colors.length)],
                0, true, glow);
        }
    }

    _abilityDamage(player, mult) {
        let dmg = player.baseDamage * (1 + player.damageBonus) * mult;
        const isCrit = Math.random() < player.critRate;
        if (isCrit) dmg *= player.critMultiplier;
        return { damage: Math.round(dmg), isCrit };
    }

    _hitMonster(m, damage, isCrit, color) {
        const actual = m.takeDamage(damage);
        this.game.combat.spawnDamageNumber(
            m.x, m.y - m.hitboxRadius - 5, actual, isCrit, color || '#cef');
        this.game.particles.hitSpark(m.x, m.y, isCrit);
        if (m.dying) this.game.combat.onMonsterKilled(m);
        return actual;
    }

    _nearestMonster(x, y, maxDist = 9999) {
        let best = null;
        let bestD = maxDist;
        const boss = this.game.bossManager && this.game.bossManager.boss;
        if (boss && boss.alive && !boss.dying) {
            const d = dist(x, y, boss.x, boss.y + 10);
            if (d < bestD) {
                bestD = d;
                best = boss;
            }
        }
        for (const m of this.game.spawner.monsters) {
            if (!m.alive || m.dying || m.spawning) continue;
            const d = dist(x, y, m.x, m.y);
            if (d < bestD) {
                bestD = d;
                best = m;
            }
        }
        return best;
    }

    _nearestMonsters(x, y, count, usedIds = new Set()) {
        const candidates = [];
        const boss = this.game.bossManager && this.game.bossManager.boss;
        if (boss && boss.alive && !boss.dying && !usedIds.has('boss')) {
            candidates.push({ m: boss, d: dist(x, y, boss.x, boss.y + 10) });
        }
        for (const m of this.game.spawner.monsters) {
            if (!m.alive || m.dying || m.spawning || usedIds.has(m.id)) continue;
            candidates.push({ m, d: dist(x, y, m.x, m.y) });
        }
        candidates.sort((a, b) => a.d - b.d);
        const picked = [];
        for (const c of candidates) {
            if (picked.length >= count) break;
            picked.push(c.m);
            usedIds.add(c.m.id);
        }
        return picked;
    }

    _spawnFireballVolley(player) {
        const count = Math.max(1, player.fireballCount || 1);
        const used = new Set();
        const targets = this._nearestMonsters(player.x, player.y, count, used);

        for (let i = 0; i < count; i++) {
            const target = targets[i] || targets[0] || null;
            let ang;
            if (target) {
                ang = Math.atan2(target.y - player.y, target.x - player.x);
            } else {
                ang = player.facingRight ? 0 : Math.PI;
            }
            if (count > 1 && !target) {
                ang += (i - (count - 1) / 2) * 0.35;
            } else if (count > 1 && target && i > 0 && targets.length <= 1) {
                ang += (i - (count - 1) / 2) * 0.22;
            }
            this._spawnFireball(player, ang);
        }
    }

    _spawnFireball(player, ang) {
        const lvl = player.fireballLevel || 1;
        const speed = 340 + lvl * 22;
        this.fireballs.push({
            x: player.x,
            y: player.y,
            vx: Math.cos(ang) * speed,
            vy: Math.sin(ang) * speed,
            radius: 11 + lvl * 1.5,
            damageMult: 0.62 + (lvl - 1) * 0.09,
            life: 2.4,
            maxLife: 2.4,
            hitIds: new Set(),
            spin: 0,
        });
        this._burstParticles(player.x, player.y, 10,
            ['#ff6620', '#ffaa44', '#ff4400', '#ffcc66'], 60, 160, 0.28, 4, true);
    }

    _updateFireballs(dt) {
        const player = this.game.player;
        if (!player) return;
        const w = this.game.renderer.w;
        const h = this.game.renderer.h;

        for (const f of this.fireballs) {
            f.life -= dt;
            f.spin += dt * 14;
            f.x += f.vx * dt;
            f.y += f.vy * dt;

            if (Math.random() < 0.55) {
                this.game.particles.emit(
                    f.x - f.vx * 0.03, f.y - f.vy * 0.03,
                    -f.vx * 0.05 + randRange(-20, 20), -f.vy * 0.05 + randRange(-20, 20),
                    randRange(0.1, 0.22), randRange(3, 5),
                    ['#ff6620', '#ffaa44', '#ff8830'][Math.floor(Math.random() * 3)],
                    0, true, true);
            }

            for (const m of this.game.spawner.monsters) {
                if (!m.alive || m.dying || m.spawning || f.hitIds.has(m.id)) continue;
                if (!circlesCollide(f.x, f.y, f.radius, m.x, m.y, m.hitboxRadius)) continue;
                f.hitIds.add(m.id);
                const { damage, isCrit } = this._abilityDamage(player, f.damageMult);
                this._hitMonster(m, damage, isCrit, '#f84');
                this._burstParticles(f.x, f.y, 14,
                    ['#ff6620', '#ffaa44', '#ff4400', '#fff4c0'], 80, 200, 0.32, 5, true);
                f.life = 0;
                break;
            }
        }
        this.fireballs = this.fireballs.filter(f =>
            f.life > 0 && f.x > -40 && f.x < w + 40 && f.y > -40 && f.y < h + 40);
    }

    _drawFireball(ctx, f) {
        const alpha = clamp(f.life / f.maxLife, 0, 1);
        const r = f.radius;

        ctx.save();
        ctx.translate(f.x, f.y);

        ctx.globalAlpha = 0.25 * alpha;
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2.2);
        glow.addColorStop(0, 'rgba(255, 180, 80, 0.9)');
        glow.addColorStop(0.5, 'rgba(255, 80, 20, 0.35)');
        glow.addColorStop(1, 'rgba(255, 40, 0, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, r * 2.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.rotate(f.spin);
        ctx.globalAlpha = 0.9 * alpha;
        ctx.fillStyle = '#ff6620';
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffcc66';
        ctx.beginPath();
        ctx.arc(-r * 0.15, -r * 0.1, r * 0.55, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff8e0';
        ctx.beginPath();
        ctx.arc(-r * 0.2, -r * 0.15, r * 0.28, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    _canHitMonster(id, cooldown) {
        const t = this.shurikenHitCd.get(id) || 0;
        return performance.now() - t > cooldown * 1000;
    }

    _markHitMonster(id) {
        this.shurikenHitCd.set(id, performance.now());
    }

    _updateShurikens(dt, player) {
        if (player.shurikenCount <= 0) return;
        const orbitR = 28 + player.sizeScale * 6;
        const hitR = 10;
        const dmgMult = 0.32 + (player.shurikenLevel - 1) * 0.05;

        this.shurikenTrails = [];
        for (let i = 0; i < player.shurikenCount; i++) {
            const a = this.orbitAngle + (i / player.shurikenCount) * Math.PI * 2;
            const sx = player.x + Math.cos(a) * orbitR;
            const sy = player.y + Math.sin(a) * orbitR;
            this.shurikenTrails.push({ x: sx, y: sy, a });

            for (const m of this.game.spawner.monsters) {
                if (!m.alive || m.dying || m.spawning) continue;
                if (!circlesCollide(sx, sy, hitR, m.x, m.y, m.hitboxRadius)) continue;
                if (!this._canHitMonster(`s${m.id}`, 0.32)) continue;
                this._markHitMonster(`s${m.id}`);
                const { damage, isCrit } = this._abilityDamage(player, dmgMult);
                this._hitMonster(m, damage, isCrit, '#9cf');
                this._burstParticles(sx, sy, 4, ['#adf', '#fff', '#8cf'], 40, 90, 0.15, 3, true);
            }
        }
    }

    _drawShurikenTrails(ctx) {
        for (const t of this.shurikenTrails) {
            ctx.save();
            ctx.globalAlpha = 0.35;
            ctx.translate(t.x, t.y);
            ctx.rotate(t.a);
            ctx.fillStyle = '#88c8f8';
            ctx.fillRect(-8, -1, 16, 2);
            ctx.fillRect(-1, -8, 2, 16);
            ctx.globalAlpha = 0.18;
            ctx.fillStyle = '#fff';
            ctx.fillRect(-12, -2, 24, 4);
            ctx.fillRect(-2, -12, 4, 24);
            ctx.restore();
        }
    }

    _drawShurikens(ctx) {
        const player = this.game.player;
        if (!player || player.shurikenCount <= 0) return;
        const orbitR = 28 + player.sizeScale * 6;

        for (let i = 0; i < player.shurikenCount; i++) {
            const a = this.orbitAngle + (i / player.shurikenCount) * Math.PI * 2;
            const sx = Math.floor(player.x + Math.cos(a) * orbitR);
            const sy = Math.floor(player.y + Math.sin(a) * orbitR);

            ctx.save();
            ctx.translate(sx, sy);
            ctx.rotate(a + Math.PI / 4);

            ctx.globalAlpha = 0.45;
            ctx.fillStyle = '#5ac8ff';
            ctx.fillRect(-7, -7, 14, 14);

            ctx.globalAlpha = 1;
            ctx.fillStyle = '#1a2838';
            ctx.fillRect(-5, -1, 10, 2);
            ctx.fillRect(-1, -5, 2, 10);
            ctx.fillStyle = '#e8f4ff';
            ctx.fillRect(-3, -3, 6, 6);
            ctx.fillStyle = '#88b8e0';
            ctx.fillRect(-1, -4, 2, 8);
            ctx.fillRect(-4, -1, 8, 2);
            ctx.restore();
        }
    }

    _spawnCrescent(player, target, index, total) {
        let ang;
        if (target) {
            ang = Math.atan2(target.y - player.y, target.x - player.x);
        } else if (player.state === PlayerState.ATTACKING && player.pathIndex < player.attackPath.length - 1) {
            const to = player.attackPath[player.pathIndex + 1];
            ang = Math.atan2(to.y - player.y, to.x - player.x);
        } else {
            ang = player.facingRight ? 0 : Math.PI;
        }
        if (total > 1) {
            ang += (index - (total - 1) / 2) * 0.28;
        }
        const speed = 380 + player.crescentLevel * 24;
        const lvl = player.crescentLevel;
        const cx = player.x;
        const cy = player.y;
        this.crescents.push({
            x: cx, y: cy,
            vx: Math.cos(ang) * speed,
            vy: Math.sin(ang) * speed,
            radius: 18 + lvl * 3,
            damageMult: 0.55 + (lvl - 1) * 0.08,
            life: 2.0,
            maxLife: 2.0,
            hitIds: new Set(),
            spin: ang,
            travel: 0,
        });
        this._burstParticles(cx, cy, 18, ['#ffaa44', '#ff8830', '#ffcc66', '#ff6620'], 90, 220, 0.38, 5, true);
        this.game.renderer.shake(5, 0.14);
    }

    /** 月牙路径：开口朝后，弧顶朝飞行方向（局部 +X） */
    _crescentPath(ctx, r, outerMul, innerMul, innerOffsetX) {
        const or = r * outerMul;
        const ir = r * innerMul;
        const ix = -r * innerOffsetX;
        ctx.beginPath();
        ctx.arc(r * 0.22, 0, or, -Math.PI * 0.58, Math.PI * 0.58);
        ctx.arc(ix, 0, ir, Math.PI * 0.5, -Math.PI * 0.5, true);
        ctx.closePath();
    }

    _updateCrescents(dt) {
        const player = this.game.player;
        const w = this.game.renderer.w;
        const h = this.game.renderer.h;

        for (const c of this.crescents) {
            c.life -= dt;
            c.travel += dt;
            c.x += c.vx * dt;
            c.y += c.vy * dt;

            if (Math.random() < 0.4) {
                const tailX = c.x - c.vx * 0.04;
                const tailY = c.y - c.vy * 0.04;
                this.game.particles.emit(tailX, tailY,
                    -c.vx * 0.06 + randRange(-16, 16), -c.vy * 0.06 + randRange(-16, 16),
                    randRange(0.14, 0.28), randRange(3, 5),
                    ['#ffaa44', '#ff8830', '#ffcc88'][Math.floor(Math.random() * 3)],
                    0, true, true);
            }

            const boss = this.game.bossManager && this.game.bossManager.boss;
            if (boss && boss.alive && !boss.dying && !c.hitIds.has('boss')) {
                if (circlesCollide(c.x, c.y, c.radius * 1.15, boss.x, boss.y + 10, boss.hitboxRadius)) {
                    c.hitIds.add('boss');
                    const { damage, isCrit } = this._abilityDamage(player, c.damageMult);
                    const actual = boss.takeDamage(damage);
                    this.game.combat.spawnDamageNumber(boss.x, boss.y - 30, actual, isCrit, '#fa0');
                    this.game.particles.hitSpark(boss.x, boss.y + 15, isCrit);
                    if (boss.dying) this.game.combat.onBossKilled(boss);
                }
            }
            for (const m of this.game.spawner.monsters) {
                if (!m.alive || m.dying || m.spawning || c.hitIds.has(m.id)) continue;
                if (!circlesCollide(c.x, c.y, c.radius * 1.15, m.x, m.y, m.hitboxRadius)) continue;
                c.hitIds.add(m.id);
                const { damage, isCrit } = this._abilityDamage(player, c.damageMult);
                this._hitMonster(m, damage, isCrit, '#fa0');
                this._burstParticles(c.x, c.y, 8, ['#ffcc66', '#ff8830', '#ffaa44'], 50, 120, 0.22, 4, true);
            }
        }
        this.crescents = this.crescents.filter(c =>
            c.life > 0 && c.x > -40 && c.x < w + 40 && c.y > -40 && c.y < h + 40);
    }

    _drawCrescent(ctx, c) {
        const alpha = clamp(c.life / c.maxLife, 0, 1);
        const r = c.radius;
        const flightAngle = c.spin;

        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(flightAngle);

        ctx.globalAlpha = 0.22 * alpha;
        ctx.fillStyle = '#ff6620';
        this._crescentPath(ctx, r, 1.45, 1.05, 0.42);
        ctx.fill();

        ctx.globalAlpha = 0.5 * alpha;
        ctx.fillStyle = '#ff8830';
        this._crescentPath(ctx, r, 1.22, 0.88, 0.38);
        ctx.fill();

        ctx.globalAlpha = 0.88 * alpha;
        ctx.fillStyle = '#ffaa44';
        this._crescentPath(ctx, r, 1.05, 0.78, 0.34);
        ctx.fill();

        ctx.globalAlpha = 0.95 * alpha;
        ctx.fillStyle = '#ffd080';
        this._crescentPath(ctx, r * 0.88, 0.92, 0.68, 0.3);
        ctx.fill();

        ctx.globalAlpha = 0.75 * alpha;
        ctx.strokeStyle = '#fff4c8';
        ctx.lineWidth = 2;
        this._crescentPath(ctx, r, 1.05, 0.78, 0.34);
        ctx.stroke();

        ctx.restore();
    }

    _spawnBlackHoleAt(x, y, level) {
        const radius = 82 + level * 12;
        this.blackHoles.push({
            x, y,
            radius,
            coreRadius: 14,
            pull: 100 + level * 18,
            life: 4.2,
            maxLife: 4.2,
            spin: Math.random() * Math.PI * 2,
            spawnBurst: 0.35,
        });
        this._burstParticles(x, y, 22, ['#6a48a8', '#9a78d0', '#2a1840', '#c8b0ff'], 30, 120, 0.5, 5, true);
        this.game.renderer.shake(4, 0.14);
    }

    _updateBlackHoles(dt) {
        const monsters = this.game.spawner.monsters;

        for (const hole of this.blackHoles) {
            hole.life -= dt;
            hole.spin += dt * 3.2;
            if (hole.spawnBurst > 0) hole.spawnBurst -= dt;

            if (Math.random() < 0.35) {
                const a = hole.spin + randRange(0, Math.PI * 2);
                const distR = randRange(hole.coreRadius, hole.radius * 0.9);
                this.game.particles.emit(
                    hole.x + Math.cos(a) * distR,
                    hole.y + Math.sin(a) * distR,
                    Math.cos(a + Math.PI / 2) * randRange(-40, 40),
                    Math.sin(a + Math.PI / 2) * randRange(-40, 40),
                    randRange(0.2, 0.45), randRange(2, 4),
                    ['#8a68c8', '#c8a8ff', '#4a3080'][Math.floor(Math.random() * 3)],
                    0, true, true);
            }

            for (const m of monsters) {
                if (!m.alive || m.dying || m.spawning) continue;
                const d = dist(m.x, m.y, hole.x, hole.y);
                if (d >= hole.radius || d <= hole.coreRadius) continue;

                const n = normalize(hole.x - m.x, hole.y - m.y);
                const pull = hole.pull * dt * (1 - d / hole.radius);
                m.x += n.x * Math.min(pull, d - hole.coreRadius);
                m.y += n.y * Math.min(pull, d - hole.coreRadius);

                for (const other of monsters) {
                    if (other === m || !other.alive || other.dying || other.spawning) continue;
                    const sd = dist(m.x, m.y, other.x, other.y);
                    const minD = (m.hitboxRadius + other.hitboxRadius) * 0.82;
                    if (sd < minD && sd > 0.1) {
                        const push = normalize(m.x - other.x, m.y - other.y);
                        const amt = (minD - sd) * 0.55;
                        m.x += push.x * amt;
                        m.y += push.y * amt;
                    }
                }
            }
        }
        this.blackHoles = this.blackHoles.filter(h => h.life > 0);
    }

    _drawBlackHole(ctx, h) {
        const pulse = 0.82 + Math.sin(h.spin * 2.2) * 0.18;
        const alpha = clamp(h.life / h.maxLife, 0, 1) * pulse;
        const burst = h.spawnBurst > 0 ? h.spawnBurst / 0.35 : 0;

        ctx.save();

        ctx.globalAlpha = (0.32 + burst * 0.2) * alpha;
        const grad = ctx.createRadialGradient(h.x, h.y, h.coreRadius, h.x, h.y, h.radius);
        grad.addColorStop(0, '#0a0614');
        grad.addColorStop(0.45, '#1a1030');
        grad.addColorStop(0.85, 'rgba(90, 60, 140, 0.35)');
        grad.addColorStop(1, 'rgba(90, 60, 140, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.radius * (1 + burst * 0.15), 0, Math.PI * 2);
        ctx.fill();

        for (let ring = 0; ring < 3; ring++) {
            const rr = h.radius * (0.55 + ring * 0.18);
            ctx.globalAlpha = (0.35 - ring * 0.08) * alpha;
            ctx.strokeStyle = ring === 0 ? '#c8a8ff' : '#7a58b0';
            ctx.lineWidth = ring === 0 ? 3 : 2;
            ctx.setLineDash([8 - ring * 2, 6 + ring * 2]);
            ctx.beginPath();
            ctx.arc(h.x, h.y, rr, h.spin + ring * 0.5, h.spin + ring * 0.5 + Math.PI * 1.6);
            ctx.stroke();
        }
        ctx.setLineDash([]);

        ctx.globalAlpha = 0.95 * alpha;
        ctx.fillStyle = '#120820';
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.coreRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#9a78d0';
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.coreRadius * 0.45, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 0.85 * alpha;
        for (let i = 0; i < 10; i++) {
            const a = h.spin * 1.4 + (i / 10) * Math.PI * 2;
            const px = h.x + Math.cos(a) * (h.radius * 0.65);
            const py = h.y + Math.sin(a) * (h.radius * 0.65);
            ctx.fillStyle = i % 2 === 0 ? '#e8d8ff' : '#8868b8';
            ctx.fillRect(Math.floor(px) - 2, Math.floor(py) - 1, 4, 2);
            ctx.fillRect(Math.floor(px) - 1, Math.floor(py) - 2, 2, 4);
        }
        ctx.restore();
    }

    _spawnWhirlwind(x, y, level) {
        this.whirlwinds.push({
            x, y,
            radius: 6,
            maxRadius: 118 + level * 16,
            expandSpeed: 280 + level * 25,
            damageMult: 0.42 + (level - 1) * 0.12,
            life: 0.75,
            maxLife: 0.75,
            spin: 0,
            hitIds: new Set(),
        });
        this._burstParticles(x, y, 32, ['#fff', '#e8f0ff', '#c8d8e8', '#8898b0', '#adf'], 100, 320, 0.45, 5, true);
        this.game.renderer.shake(9, 0.22);
        this.game.audio.playSlash();
    }

    _updateWhirlwinds(dt) {
        const player = this.game.player;

        for (const w of this.whirlwinds) {
            w.life -= dt;
            w.spin += dt * 22;
            const prevR = w.radius;
            w.radius = Math.min(w.maxRadius, w.radius + w.expandSpeed * dt);

            if (w.radius > prevR && Math.random() < 0.6) {
                const a = randRange(0, Math.PI * 2);
                const px = w.x + Math.cos(a) * w.radius;
                const py = w.y + Math.sin(a) * w.radius;
                this.game.particles.emit(px, py,
                    Math.cos(a) * randRange(-30, 30), Math.sin(a) * randRange(-30, 30),
                    randRange(0.1, 0.22), randRange(2, 5),
                    ['#fff', '#d8e8f8', '#b0c0d0'][Math.floor(Math.random() * 3)],
                    0, true, true);
            }

            for (const m of this.game.spawner.monsters) {
                if (!m.alive || m.dying || m.spawning || w.hitIds.has(m.id)) continue;
                const d = dist(w.x, w.y, m.x, m.y);
                if (d > w.radius + m.hitboxRadius) continue;
                w.hitIds.add(m.id);
                const { damage, isCrit } = this._abilityDamage(player, w.damageMult);
                this._hitMonster(m, damage, isCrit, '#eef');
            }
        }
        this.whirlwinds = this.whirlwinds.filter(w => w.life > 0);
    }

    _drawWhirlwind(ctx, w) {
        const alpha = clamp(w.life / w.maxLife, 0, 1);
        const t = 1 - alpha;
        const pulse = 0.9 + Math.sin(w.spin * 1.5) * 0.1;

        ctx.save();
        ctx.translate(w.x, w.y);

        for (let ring = 0; ring < 4; ring++) {
            const rr = w.radius * (0.35 + ring * 0.22);
            if (rr < 8) continue;
            ctx.save();
            ctx.rotate(w.spin * (1 + ring * 0.15) + ring);
            ctx.globalAlpha = (0.12 + ring * 0.06) * alpha * pulse;
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2 + ring;
            ctx.beginPath();
            ctx.arc(0, 0, rr, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        ctx.rotate(w.spin);
        const blades = 14;
        for (let i = 0; i < blades; i++) {
            const a = (i / blades) * Math.PI * 2;
            const inner = w.radius * (0.15 + t * 0.1);
            const outer = w.radius * (0.92 + (i % 3) * 0.04);
            const ex = Math.cos(a) * outer;
            const ey = Math.sin(a) * outer;
            const ix = Math.cos(a) * inner;
            const iy = Math.sin(a) * inner;

            ctx.globalAlpha = (0.5 + (i % 2) * 0.2) * alpha;
            ctx.strokeStyle = i % 3 === 0 ? '#fff' : (i % 2 === 0 ? '#d8e8f8' : '#98a8b8');
            ctx.lineWidth = i % 3 === 0 ? 5 : 3;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(ix, iy);
            ctx.lineTo(ex, ey);
            ctx.stroke();

            ctx.globalAlpha = 0.75 * alpha;
            ctx.fillStyle = '#fff';
            ctx.fillRect(Math.floor(ex) - 2, Math.floor(ey) - 2, 4, 4);
        }

        ctx.globalAlpha = 0.35 * alpha * pulse;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(0, 0, w.radius * 0.55, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 0.65 * alpha;
        ctx.fillStyle = '#f0f8ff';
        ctx.beginPath();
        ctx.arc(0, 0, 10 + t * 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}
