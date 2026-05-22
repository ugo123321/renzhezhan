let nextBossSegmentId = 100000;

class CentipedeSegment {
    constructor(boss, index, radius) {
        this.boss = boss;
        this.id = nextBossSegmentId++;
        this.index = index;
        this.x = 0;
        this.y = 0;
        this.def = 0;
        this.hitboxRadius = radius;
        this.size = radius;
        this.alive = true;
        this.dying = false;
        this._deathHandled = false;
        this.color = '#3d5a48';
        this.frozenTimer = 0;
        this.slowTimer = 0;
        this.slowMult = 1;
        this.vulnerableMark = false;
        this.pathTargetHighlight = false;
        this.isBossSegment = true;
        this.kind = 'BOSS_SEGMENT';
    }

    canSplit() {
        return false;
    }

    freeze(duration) {
        this.frozenTimer = Math.max(this.frozenTimer, duration);
    }

    isFrozen() {
        return this.frozenTimer > 0;
    }

    slow(duration, speedMult = 0.45) {
        this.slowTimer = Math.max(this.slowTimer, duration);
        this.slowMult = Math.min(this.slowMult ?? 1, speedMult);
    }

    takeDamage(rawDamage, hitAngle) {
        return this.boss.applyDamage(rawDamage, this);
    }

    update(dt) {
        if (!this.alive) return;
        if (this.frozenTimer > 0) this.frozenTimer -= dt;
        if (this.slowTimer > 0) {
            this.slowTimer -= dt;
            if (this.slowTimer <= 0) this.slowMult = 1;
        }
    }

    draw(ctx) {
        if (!this.alive) return;
        const alpha = this.boss.getBodyDrawAlpha();
        if (alpha <= 0) return;

        const segAng = this.boss.getSegmentAngle(this.index);
        const r = this.hitboxRadius;
        const w = r * 2.1;
        const h = r * 1.55;
        const frozen = this.isFrozen();

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(this.x, this.y);
        ctx.rotate(segAng);
        if (this.pathTargetHighlight) {
            ctx.shadowColor = '#ffe878';
            ctx.shadowBlur = 10;
        }

        ctx.fillStyle = frozen ? '#5a88b8' : '#2a3830';
        ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.fillStyle = frozen ? '#88c8f0' : '#4a6858';
        ctx.fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 5);
        ctx.fillStyle = frozen ? '#b8e8ff' : '#6a9078';
        ctx.fillRect(-w / 2 + 4, -h / 2 + 3, w - 8, Math.max(2, h * 0.35));

        const legN = 4;
        ctx.fillStyle = '#1a2820';
        for (let i = 0; i < legN; i++) {
            const lx = -w / 2 + (i + 0.5) * (w / legN);
            ctx.fillRect(lx - 1, h / 2 - 1, 2, 4);
            ctx.fillRect(lx - 1, -h / 2 - 3, 2, 4);
        }

        if (frozen) {
            ctx.strokeStyle = 'rgba(200, 240, 255, 0.75)';
            ctx.lineWidth = 2;
            ctx.strokeRect(-w / 2, -h / 2, w, h);
        }

        ctx.restore();
    }
}

class CentipedeBoss {
    constructor(game, w, h, playBottom, safeZone, stageStatScale) {
        this.game = game;
        this.w = w;
        this.h = h;
        this.top = 88;
        this.bottom = playBottom;
        this.cfg = CONFIG.BOSS.CENTIPEDE;
        this.name = this.cfg.name;
        this.stageStatScale = stageStatScale || { hp: 1, def: 1 };

        this.phase = 'warning';
        this.warningTimer = this.cfg.warningTime || 3;
        this.warningPulse = 0;
        this.segments = [];
        this.bullets = [];
        this.crawlProgress = 0;
        this.crawlSpeed = this.cfg.crawlSpeed || 240;
        this.pathStart = { x: 0, y: 0 };
        this.pathEnd = { x: 0, y: 0 };
        this.pathLength = 1;
        this.bodySpan = 0.85;
        this.crawlPause = 0;
        this.shootTimer = 0;
        this.defeated = false;
        this._defeatRewarded = false;
        this.hp = 0;
        this.maxHp = 0;
        this.def = 0;
        this.deathFadeDur = CONFIG.MONSTER_DEATH_FADE;
        this.deathFadeTimer = 0;

        const py = safeZone ? safeZone.y : h * 0.5;
        const px = safeZone ? safeZone.x : w * 0.5;
        this.pathPlayer = { x: px, y: py };

        this._initSegments();
        this._buildCrawlPath();
    }

    _initSegments() {
        const playH = this.bottom - this.top;
        const spacing = this.cfg.segmentSpacing || 28;
        const lengthScale = this.cfg.lengthScale ?? 1;
        const count = Math.max(12, Math.floor((playH / spacing) * lengthScale));
        const hpEach = Math.round((this.cfg.segmentHp || 300) * this.stageStatScale.hp);
        const defEach = Math.max(1, Math.round((this.cfg.segmentDef || 3) * this.stageStatScale.def));
        const radius = this.cfg.segmentRadius || 15;

        const hpScale = this.cfg.hpScale ?? 1;
        this.maxHp = Math.round(count * hpEach * hpScale);
        this.hp = this.maxHp;
        this.def = defEach;

        this.segments = [];
        for (let i = 0; i < count; i++) {
            this.segments.push(new CentipedeSegment(this, i, radius));
        }
        this.bodySpan = count > 1 ? (count - 1) * spacing / Math.max(1, this.pathLength) : 0.5;
    }

    applyDamage(rawDamage, hitSegment) {
        if (this.defeated || this.phase !== 'active') {
            return { actualDamage: 0, blockedByShield: false };
        }
        const vulnerableMult = hitSegment.vulnerableMark ? 2 : 1;
        hitSegment.vulnerableMark = false;
        const actualDamage = Math.max(1, Math.round((rawDamage - this.def) * vulnerableMult));
        this.hp = Math.max(0, this.hp - actualDamage);
        if (this.hp <= 0) this._defeat();
        return { actualDamage, blockedByShield: false };
    }

    getBodyDrawAlpha() {
        if (this.phase === 'active') return 1;
        if (this.phase === 'dead') {
            return clamp(this.deathFadeTimer / this.deathFadeDur, 0, 1);
        }
        return 0;
    }

    _buildCrawlPath() {
        const p = this.game && this.game.player;
        if (p) {
            this.pathPlayer.x = p.homeX;
            this.pathPlayer.y = p.homeY;
        }
        const margin = 58;
        const px = this.pathPlayer.x;
        const py = this.pathPlayer.y;
        const side = randInt(0, 3);
        let ex;
        let ey;

        if (side === 0) {
            ex = randRange(margin, this.w - margin);
            ey = this.top - margin;
        } else if (side === 1) {
            ex = randRange(margin, this.w - margin);
            ey = this.bottom + margin;
        } else if (side === 2) {
            ex = -margin;
            ey = randRange(this.top + margin, this.bottom - margin);
        } else {
            ex = this.w + margin;
            ey = randRange(this.top + margin, this.bottom - margin);
        }

        const ang = Math.atan2(py - ey, px - ex);
        const back = margin + 45;
        const forward = (this.bottom - this.top) + margin * 2 + 100;
        this.pathStart = {
            x: ex - Math.cos(ang) * back,
            y: ey - Math.sin(ang) * back,
        };
        this.pathEnd = {
            x: ex + Math.cos(ang) * forward,
            y: ey + Math.sin(ang) * forward,
        };
        this.pathLength = Math.max(80, dist(
            this.pathStart.x, this.pathStart.y,
            this.pathEnd.x, this.pathEnd.y
        ));
        const spacing = this.cfg.segmentSpacing || 28;
        const count = this.segments.length;
        this.bodySpan = count > 1 ? ((count - 1) * spacing) / this.pathLength : 0.5;
    }

    _posOnPath(t) {
        const tt = clamp(t, 0, 1);
        return {
            x: lerp(this.pathStart.x, this.pathEnd.x, tt),
            y: lerp(this.pathStart.y, this.pathEnd.y, tt),
        };
    }

    getSegmentAngle(index) {
        const t0 = clamp(this.crawlProgress - (index / Math.max(1, this.segments.length - 1)) * this.bodySpan, 0, 1);
        const t1 = clamp(t0 + 0.02, 0, 1);
        const p0 = this._posOnPath(t0);
        const p1 = this._posOnPath(t1);
        return Math.atan2(p1.y - p0.y, p1.x - p0.x);
    }

    _updateSegmentPositions() {
        const n = this.segments.length;
        for (let i = 0; i < n; i++) {
            const seg = this.segments[i];
            const offset = n > 1 ? (i / (n - 1)) * this.bodySpan : 0;
            const t = clamp(this.crawlProgress - offset, 0, 1);
            const pos = this._posOnPath(t);
            seg.x = pos.x;
            seg.y = pos.y;
        }
    }

    get totalHp() {
        return this.hp;
    }

    get maxTotalHp() {
        return this.maxHp;
    }

    get hpRatio() {
        return this.maxHp > 0 ? clamp(this.hp / this.maxHp, 0, 1) : 0;
    }

    isDefeated() {
        return this.defeated;
    }

    getActiveSegments() {
        if (this.phase !== 'active') return [];
        return this.segments;
    }

    activate() {
        this.phase = 'active';
        this.crawlProgress = 0;
        this.crawlPause = 0;
        this._buildCrawlPath();
        this._updateSegmentPositions();
    }

    _shootBullet(playerTarget) {
        if (!playerTarget) return;
        const live = this.getActiveSegments();
        if (!live.length) return;
        const spd = this.cfg.bulletSpeed || 200;
        const count = this.cfg.bulletsPerShot || 1;
        for (let n = 0; n < count; n++) {
            const seg = live[randInt(0, live.length - 1)];
            const dir = normalize(playerTarget.x - seg.x, playerTarget.y - seg.y);
            this.bullets.push({
                x: seg.x,
                y: seg.y,
                vx: dir.x * spd,
                vy: dir.y * spd,
                radius: this.cfg.bulletRadius || 5,
                damage: this.cfg.bulletDamage || 8,
                life: this.cfg.bulletLife ?? 4,
            });
        }
    }

    _updateBullets(dt, playerTarget) {
        const player = playerTarget && playerTarget.player;
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            b.life -= dt;
            if (b.life <= 0
                || b.x < -30 || b.x > this.w + 30
                || b.y < -30 || b.y > this.h + 30) {
                this.bullets.splice(i, 1);
                continue;
            }
            if (!player || player.hp <= 0) continue;
            const pr = player.effectiveRadius || 14;
            if (dist(b.x, b.y, player.x, player.y) <= b.radius + pr * 0.55) {
                const dmg = player.takeDamage(b.damage);
                if (dmg > 0 && this.game) {
                    this.game.combat.spawnDamageNumber(
                        player.x, player.y - pr - 8, dmg, false, '#e05840'
                    );
                    this.game.particles.hitSpark(player.x, player.y, false);
                    this.game.renderer.shake(
                        CONFIG.SHAKE.NORMAL.magnitude * 0.55,
                        CONFIG.SHAKE.NORMAL.duration * 0.7
                    );
                }
                this.bullets.splice(i, 1);
            }
        }
    }

    _defeat() {
        if (this.defeated) return;
        this.hp = 0;
        this.defeated = true;
        this.phase = 'dead';
        this.deathFadeTimer = this.deathFadeDur;
        this.bullets = [];

        let cx = 0;
        let cy = 0;
        for (const seg of this.segments) {
            cx += seg.x;
            cy += seg.y;
        }
        const n = this.segments.length;
        if (n > 0) {
            cx /= n;
            cy /= n;
            const combat = this.game && this.game.combat;
            const player = this.game && this.game.player;
            const hitAngle = player
                ? angle(player.x, player.y, cx, cy)
                : Math.random() * Math.PI * 2;
            if (combat) {
                this.game.bloodStains.spawn(cx, cy, 1.5, hitAngle);
                this.game.particles.deathEffect(cx, cy, '#3d5a48');
            }
        }

        if (!this._defeatRewarded && this.game.experience) {
            this._defeatRewarded = true;
            const bonus = this.cfg.defeatExp || 120;
            this.game.experience.addExp(bonus);
            if (this.game.player) {
                this.game.player.queueMessage(`${this.name} 击破!`);
            }
        }
    }

    update(dt, playerTarget) {
        if (this.phase === 'warning') {
            this.warningTimer -= dt;
            this.warningPulse += dt * 5;
            if (this.warningTimer <= 0) this.activate();
            return;
        }
        if (this.phase === 'dead') {
            this.deathFadeTimer -= dt;
            if (this.deathFadeTimer <= 0) {
                for (const seg of this.segments) seg.alive = false;
            }
            return;
        }

        if (this.crawlPause > 0) {
            this.crawlPause -= dt;
        } else {
            this.crawlProgress += (dt * this.crawlSpeed) / this.pathLength;
            if (this.crawlProgress >= 1 + this.bodySpan) {
                this.crawlProgress = 0;
                this.crawlPause = this.cfg.crawlGap || 0.55;
                this._buildCrawlPath();
            }
        }

        this._updateSegmentPositions();

        for (const seg of this.segments) seg.update(dt);

        this.shootTimer -= dt;
        if (this.shootTimer <= 0 && this.crawlPause <= 0) {
            this._shootBullet(playerTarget);
            this.shootTimer = this.cfg.bulletInterval || 0.4;
        }

        this._updateBullets(dt, playerTarget);
    }

    drawWarningOverlay(ctx) {
        const pulse = 0.45 + Math.sin(this.warningPulse) * 0.35;
        const border = Math.max(6, Math.floor(10 + pulse * 8));
        ctx.save();
        ctx.strokeStyle = `rgba(255, 40, 40, ${0.5 + pulse * 0.45})`;
        ctx.lineWidth = border;
        ctx.strokeRect(border / 2, border / 2, this.w - border, this.h - border);
        ctx.restore();
    }

    draw(ctx) {
        if (this.phase === 'warning') return;
        if (this.getBodyDrawAlpha() <= 0) return;
        for (const seg of this.segments) seg.draw(ctx);
    }

    drawBullets(ctx) {
        if (this.phase === 'warning' || this.getBodyDrawAlpha() <= 0) return;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        for (const b of this.bullets) {
            const r = b.radius;
            ctx.shadowBlur = 0;
            ctx.shadowColor = 'transparent';
            ctx.fillStyle = '#c03030';
            ctx.beginPath();
            ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ff8080';
            ctx.beginPath();
            ctx.arc(b.x, b.y, Math.max(1.5, r * 0.55), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}
