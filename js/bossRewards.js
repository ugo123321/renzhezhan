const BOSS_REWARD_DEFS = [
    {
        id: 'dual_wield',
        name: '二刀流',
        desc: '攻击时连击次数翻倍',
        icon: '⚔️',
        color: '#e85828',
        apply(player) {
            player.bossRewardDualWield = true;
        },
    },
    {
        id: 'iai_slash',
        name: '居合斩',
        desc: '每次攻击的第一次暴击造成3倍伤害',
        icon: '🗡️',
        color: '#a8d8ff',
        apply(player) {
            player.bossRewardIai = true;
        },
    },
    {
        id: 'deep_breath',
        name: '深呼吸',
        desc: '气力上限+30%',
        icon: '🌬️',
        color: '#48c8e8',
        apply(player) {
            player.bossRewardDeepBreath = true;
            const bonus = Math.floor(player.kiMax * 0.3);
            player.kiMax += bonus;
            player.ki = Math.min(player.kiMax, player.ki + bonus);
        },
    },
];

class BossRewardManager {
    constructor() {
        this.owned = new Set();
        this.choices = [];
        this.active = false;
        this.onSelect = null;
        this._cardRects = [];
    }

    reset() {
        this.owned.clear();
        this.choices = [];
        this.active = false;
        this._cardRects = [];
    }

    hasAvailable() {
        return BOSS_REWARD_DEFS.some(r => !this.owned.has(r.id));
    }

    generateChoices() {
        const available = BOSS_REWARD_DEFS.filter(r => !this.owned.has(r.id));
        if (available.length === 0) return false;
        const shuffled = shuffleArray(available);
        this.choices = shuffled.slice(0, Math.min(2, shuffled.length));
        this.active = true;
        return true;
    }

    selectReward(index, player) {
        if (index < 0 || index >= this.choices.length) return;
        const reward = this.choices[index];
        this.owned.add(reward.id);
        reward.apply(player);
        this.active = false;
        this.choices = [];
        if (this.onSelect) this.onSelect();
    }

    drawUI(ctx, vp, uiScale) {
        if (!this.active) return;

        const s = uiScale || 1;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.78)';
        ctx.fillRect(vp.x, vp.y, vp.w, vp.h);

        drawGameText(ctx, 'Boss奖励！选择一个', vp.cx, vp.y + vp.h * 0.16,
            Math.round(24 * s), '#ffd080', 'center', 'middle');

        const cardW = vp.w * 0.42;
        const cardH = 200 * s;
        const gap = 14 * s;
        const totalW = this.choices.length * cardW + (this.choices.length - 1) * gap;
        let startX = vp.x + (vp.w - totalW) / 2;
        const cardY = vp.y + vp.h * 0.28;
        const innerPad = 16 * s;

        this._cardRects = [];

        for (let i = 0; i < this.choices.length; i++) {
            const u = this.choices[i];
            const x = startX;
            const cardCx = x + cardW / 2;

            this._cardRects.push({ x, y: cardY, w: cardW, h: cardH, index: i });

            ctx.fillStyle = 'rgba(24, 18, 48, 0.96)';
            ctx.strokeStyle = u.color;
            ctx.lineWidth = 3;
            if (typeof ctx.roundRect === 'function') {
                ctx.beginPath();
                ctx.roundRect(x, cardY, cardW, cardH, 10);
                ctx.fill();
                ctx.stroke();
            } else {
                ctx.fillRect(x, cardY, cardW, cardH);
                ctx.strokeRect(x, cardY, cardW, cardH);
            }

            const iconSize = Math.round(40 * s);
            ctx.font = `${iconSize}px serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#fff';
            ctx.fillText(u.icon, cardCx, cardY + innerPad + iconSize * 0.5);

            const nameSize = Math.round(18 * s);
            ctx.font = `bold ${nameSize}px ${GAME_FONT}`;
            ctx.fillStyle = u.color;
            ctx.fillText(u.name, cardCx, cardY + innerPad + iconSize + 18 * s);

            const descSize = Math.round(13 * s);
            ctx.font = `${descSize}px ${GAME_FONT}`;
            ctx.fillStyle = '#ccc';
            const lines = this._wrapLines(ctx, u.desc, cardW - innerPad * 2);
            let lineY = cardY + innerPad + iconSize + 44 * s;
            for (const ln of lines) {
                ctx.fillText(ln, cardCx, lineY);
                lineY += Math.round(18 * s);
            }

            startX += cardW + gap;
        }
    }

    _wrapLines(ctx, text, maxW) {
        const lines = [];
        let line = '';
        for (let i = 0; i < text.length; i++) {
            const test = line + text[i];
            if (ctx.measureText(test).width > maxW && line.length > 0) {
                lines.push(line);
                line = text[i];
            } else {
                line = test;
            }
        }
        if (line) lines.push(line);
        return lines;
    }

    handleClick(x, y) {
        if (!this.active || !this._cardRects) return -1;
        for (const r of this._cardRects) {
            if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
                return r.index;
            }
        }
        return -1;
    }
}

class BossChestManager {
    constructor(game) {
        this.game = game;
        this.chests = [];
    }

    reset() {
        this.chests = [];
    }

    hasActiveChest() {
        return this.chests.some(c => !c.opened);
    }

    getSpawnPos(boss) {
        const player = this.game.player;
        const w = this.game.renderer.w;
        const h = this.game.renderer.h;
        if (!player) {
            return { x: boss.x, y: clamp(boss.y + 90, h * 0.35, h * 0.65) };
        }
        const t = 0.58;
        let x = boss.x + (player.x - boss.x) * t;
        let y = boss.y + (player.y - boss.y) * t;
        y = clamp(y, h * 0.30, h * 0.70);
        x = clamp(x, 48, w - 48);
        return { x, y };
    }

    spawnForBoss(boss) {
        if (!boss || boss.chestDropped || this.hasActiveChest()) return;
        boss.chestDropped = true;
        const pos = this.getSpawnPos(boss);
        this.spawn(pos.x, pos.y);
    }

    spawn(x, y) {
        this.chests.push({
            x,
            y,
            bob: Math.random() * Math.PI * 2,
            glow: 0,
            opened: false,
            spawnPop: 0.45,
        });
        const { particles, renderer } = this.game;
        renderer.shake(5, 0.12);
        for (let i = 0; i < 24; i++) {
            const a = (i / 24) * Math.PI * 2;
            particles.emit(
                x + Math.cos(a) * 12, y + Math.sin(a) * 8,
                Math.cos(a) * randRange(50, 130), Math.sin(a) * randRange(30, 100),
                randRange(0.35, 0.7), randRange(4, 9),
                ['#ffd080', '#ffb040', '#fff8c0'][Math.floor(Math.random() * 3)],
                0, true, true);
        }
    }

    update(dt) {
        const player = this.game.player;
        if (!player) return;

        for (const chest of this.chests) {
            if (chest.opened) continue;
            chest.bob += dt * 4;
            chest.glow = Math.min(1, chest.glow + dt * 2);
            if (chest.spawnPop > 0) chest.spawnPop -= dt;

            const canPickup = player.state === PlayerState.IDLE ||
                player.state === PlayerState.RETURNING;
            if (!canPickup) continue;
            if (dist(player.x, player.y, chest.x, chest.y) > 52) continue;

            chest.opened = true;
            this._openChest(chest);
            break;
        }

        this.chests = this.chests.filter(c => !c.opened);
    }

    getActiveChest() {
        return this.chests.find(c => !c.opened) || null;
    }

    _openChest(chest) {
        if (this.game.state === 'BOSS_REWARD' || this.game.state === 'LEVEL_UP') return;

        const { particles, renderer, bossRewards } = this.game;
        for (let i = 0; i < 20; i++) {
            const a = randRange(0, Math.PI * 2);
            particles.emit(
                chest.x, chest.y - 8,
                Math.cos(a) * randRange(40, 120), Math.sin(a) * randRange(-80, -20),
                randRange(0.25, 0.55), randRange(4, 8),
                ['#ffd080', '#fff', '#ffb850'][Math.floor(Math.random() * 3)],
                80, true, true);
        }
        renderer.shake(6, 0.18);

        if (bossRewards.hasAvailable()) {
            bossRewards.generateChoices();
            this.game.state = 'BOSS_REWARD';
            this.game._lockOverlayInput();
        }
    }

    draw(ctx) {
        for (const chest of this.chests) {
            if (chest.opened) continue;
            const bobY = Math.sin(chest.bob) * 6;
            const pop = chest.spawnPop > 0 ? 1 + chest.spawnPop * 0.35 : 1;
            const x = Math.floor(chest.x);
            const y = Math.floor(chest.y + bobY);
            const pulse = 0.7 + Math.sin(chest.bob * 1.4) * 0.3;
            const scale = pop;

            ctx.save();
            ctx.globalAlpha = 0.4 + chest.glow * 0.25;
            const beamH = 120 * scale;
            const beam = ctx.createLinearGradient(x, y, x, y - beamH);
            beam.addColorStop(0, 'rgba(255, 220, 100, 0.55)');
            beam.addColorStop(1, 'rgba(255, 200, 80, 0)');
            ctx.fillStyle = beam;
            ctx.fillRect(x - 14 * scale, y - beamH, 28 * scale, beamH);

            const grad = ctx.createRadialGradient(x, y - 8, 6, x, y - 8, 52 * pulse * scale);
            grad.addColorStop(0, 'rgba(255, 220, 120, 0.95)');
            grad.addColorStop(0.5, 'rgba(255, 160, 50, 0.45)');
            grad.addColorStop(1, 'rgba(255, 140, 40, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(x, y - 8, 52 * pulse * scale, 0, Math.PI * 2);
            ctx.fill();

            ctx.globalAlpha = 1;
            const bw = 44 * scale;
            const bh = 28 * scale;
            const topH = 20 * scale;
            ctx.fillStyle = '#5a3818';
            ctx.fillRect(x - bw / 2, y - 6, bw, bh);
            ctx.fillStyle = '#9a6828';
            ctx.fillRect(x - bw / 2 + 3, y - topH - 6, bw - 6, topH);
            ctx.fillStyle = '#ffd060';
            ctx.fillRect(x - bw / 2 + 5, y - topH - 4, bw - 10, 5 * scale);
            ctx.strokeStyle = '#ffe8a0';
            ctx.lineWidth = 2;
            ctx.strokeRect(x - bw / 2 + 3, y - topH - 6, bw - 6, topH + bh - 4);

            ctx.fillStyle = '#ffea90';
            ctx.font = `bold ${Math.round(20 * scale)}px serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('📦', x, y - 2);

            ctx.fillStyle = '#fff8c0';
            ctx.font = `bold ${Math.round(13 * scale)}px ${GAME_FONT}`;
            ctx.fillText('Boss宝箱', x, y + bh + 10);
            ctx.restore();
        }
    }

    drawHint(ctx, vp, uiScale) {
        const chest = this.getActiveChest();
        const player = this.game.player;
        if (!chest || !player) return;
        if (dist(player.x, player.y, chest.x, chest.y) < 80) return;

        const dx = chest.x - player.x;
        const dy = chest.y - player.y;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len;
        const uy = dy / len;
        const s = uiScale || 1;

        ctx.save();
        ctx.globalAlpha = 0.9;
        drawGameText(ctx, 'Boss宝箱 →',
            vp.cx + ux * 72 * s, vp.cy + uy * 72 * s,
            Math.round(15 * s), '#ffd080', 'center', 'middle');
        ctx.restore();
    }
}
