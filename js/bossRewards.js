const PIXEL_CHEST_SPRITE = [
    [null, '#2a1810', '#2a1810', '#2a1810', '#2a1810', '#2a1810', '#2a1810', null],
    ['#2a1810', '#5a4018', '#5a4018', '#5a4018', '#5a4018', '#5a4018', '#5a4018', '#2a1810'],
    ['#3a2818', '#7a5830', '#ffd850', '#ffe878', '#ffd850', '#7a5830', '#3a2818', '#2a1810'],
    ['#2a1810', '#5a4018', '#5a4018', '#5a4018', '#5a4018', '#5a4018', '#5a1810', '#2a1810'],
    ['#2a1810', '#4a3010', '#6a5028', '#6a5028', '#6a5028', '#6a5028', '#4a3010', '#2a1810'],
    ['#2a1810', '#3a2818', '#4a3818', '#4a3818', '#4a3818', '#4a3818', '#3a2818', '#2a1810'],
    ['#1a1008', '#2a1810', '#2a1810', '#2a1810', '#2a1810', '#2a1810', '#2a1810', '#1a1008'],
];

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

    _drawPx(ctx, ox, oy, col, row, color, px) {
        if (!color) return;
        ctx.fillStyle = color;
        ctx.fillRect(ox + col * px, oy + row * px, px, px);
    }

    _getRewardIconSprite(id) {
        const T = '#f4f8ff';
        const D = '#1d232e';
        const B = '#80d8ff';
        const C = '#48c8e8';
        const O = '#ff9a48';
        const R = '#f06030';
        const G = '#7cc8ff';
        const map = {
            dual_wield: [
                [null, T, null, null, T, null],
                [null, T, O, O, T, null],
                [null, T, O, O, T, null],
                [null, T, null, null, T, null],
                [null, D, null, null, D, null],
                [null, D, null, null, D, null],
            ],
            iai_slash: [
                [null, null, T, T, T, null],
                [null, T, T, T, B, B],
                [T, T, T, B, B, null],
                [null, null, G, G, null, null],
                [null, D, D, D, null, null],
                [null, null, D, null, null, null],
            ],
            deep_breath: [
                [null, C, null, C, null, null],
                [C, B, C, B, C, null],
                [null, C, B, C, null, null],
                [null, null, C, null, null, null],
                [null, C, B, C, null, null],
                [C, B, C, B, C, null],
            ],
        };
        return map[id] || map.iai_slash;
    }

    _drawRewardIcon(ctx, id, centerX, centerY, color, size) {
        const sprite = this._getRewardIconSprite(id);
        const rows = sprite.length;
        const cols = sprite[0].length;
        const px = Math.max(2, Math.floor(size / Math.max(rows, cols)));
        const w = cols * px;
        const h = rows * px;
        const ox = Math.floor(centerX - w / 2);
        const oy = Math.floor(centerY - h / 2);
        const pad = px;

        ctx.fillStyle = 'rgba(10, 14, 24, 0.82)';
        ctx.fillRect(ox - pad, oy - pad, w + pad * 2, h + pad * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.strokeRect(ox - pad, oy - pad, w + pad * 2, h + pad * 2);

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                this._drawPx(ctx, ox, oy, c, r, sprite[r][c], px);
            }
        }
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
            this._drawRewardIcon(
                ctx, u.id, cardCx, cardY + innerPad + iconSize * 0.5, u.color, iconSize);

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
            pickupDelay: 0.35,
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
            if (chest.pickupDelay > 0) chest.pickupDelay -= dt;

            // Require intentional pickup: only when player is idle and close enough.
            const canPickup = player.state === PlayerState.IDLE;
            if (!canPickup) continue;
            if (chest.pickupDelay > 0) continue;
            if (dist(player.x, player.y, chest.x, chest.y) > 26) continue;

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
            const bobY = Math.sin(chest.bob) * 4;
            const pop = chest.spawnPop > 0 ? 1 + chest.spawnPop * 0.25 : 1;
            const x = chest.x;
            const y = chest.y + bobY;
            const pulse = 0.75 + Math.sin(chest.bob * 1.4) * 0.25;
            const pixelScale = Math.round(3 * pop);

            ctx.save();
            ctx.globalAlpha = 0.35 + chest.glow * 0.2;
            const beamH = 90 * pop;
            const beam = ctx.createLinearGradient(x, y, x, y - beamH);
            beam.addColorStop(0, 'rgba(255, 210, 90, 0.5)');
            beam.addColorStop(1, 'rgba(255, 200, 80, 0)');
            ctx.fillStyle = beam;
            ctx.fillRect(x - 10 * pop, y - beamH, 20 * pop, beamH);

            const grad = ctx.createRadialGradient(x, y - 4, 4, x, y - 4, 36 * pulse);
            grad.addColorStop(0, 'rgba(255, 210, 100, 0.7)');
            grad.addColorStop(1, 'rgba(255, 160, 50, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(x, y - 4, 36 * pulse, 0, Math.PI * 2);
            ctx.fill();

            ctx.globalAlpha = 1;
            const sz = getSpriteSize(PIXEL_CHEST_SPRITE, pixelScale);
            drawSprite(ctx, PIXEL_CHEST_SPRITE, x, y - sz.h * 0.08, pixelScale);
            ctx.restore();
        }
    }
}
