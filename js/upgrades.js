const UPGRADE_DEFS = [
    {
        id: 'ice_heart',
        name: '冰冻之心',
        desc: '伤害+5%，攻击有30%概率冰冻敌人2秒',
        stackDesc: '冰冻概率+5%，伤害+5%',
        icon: '❄️',
        color: '#0cf',
        apply(player, stacks) {
            if (stacks === 1) {
                player.damageBonus += 0.05;
                player.freezeChance = 0.30;
            } else {
                player.damageBonus += 0.05;
                player.freezeChance += 0.05;
            }
        },
    },
    {
        id: 'cheese',
        name: '奶酪',
        desc: '增加半颗心最大血量',
        stackDesc: '增加半颗心最大血量',
        icon: '🧀',
        color: '#fd0',
        apply(player, stacks) {
            player.maxHearts += 0.5;
            player.hearts += 0.5;
        },
    },
    {
        id: 'lightning',
        name: '闪电链',
        desc: '攻击时释放闪电链，连锁3个敌人',
        stackDesc: '闪电链目标+1',
        icon: '⚡',
        color: '#ff0',
        apply(player, stacks) {
            if (stacks === 1) {
                player.lightningChains = 3;
            } else {
                player.lightningChains += 1;
            }
        },
    },
    {
        id: 'big_mushroom',
        name: '大蘑菇',
        desc: '体型放大6%，暴击率+10%',
        stackDesc: '体型放大6%，暴击率+10%',
        icon: '🍄',
        color: '#e44',
        apply(player, stacks) {
            player.sizeScale *= 1.06;
            player.critRate += 0.10;
        },
    },
    {
        id: 'crescent',
        name: '月牙天冲',
        desc: '暴击率+5%，每连击3次对最近敌人释放穿透月牙波',
        stackDesc: '暴击率+2%，月牙波+1',
        icon: '🌙',
        color: '#bdf',
        apply(player, stacks) {
            if (stacks === 1) {
                player.critRate += 0.05;
                player.crescentLevel = 1;
                player.crescentWaves = 1;
            } else {
                player.critRate += 0.02;
                player.crescentLevel = stacks;
                player.crescentWaves += 1;
            }
        },
    },
    {
        id: 'black_hole',
        name: '黑洞',
        desc: '每连击8次在攻击位置生成黑洞，吸附范围内敌人',
        stackDesc: '吸附范围+10，吸力+18',
        icon: '🕳️',
        color: '#86a',
        apply(player, stacks) {
            player.blackHoleLevel = stacks;
        },
    },
    {
        id: 'blade_whirl',
        name: '刀阵旋风',
        desc: '每连击5次以自身为中心释放刀阵旋风',
        stackDesc: '刀阵旋风伤害+12%',
        icon: '🌀',
        color: '#aab',
        apply(player, stacks) {
            player.bladeWhirlLevel = stacks;
        },
    },
    {
        id: 'fireball',
        name: '火球术',
        desc: '暴击伤害+10%，每2秒对最近敌人释放火球',
        stackDesc: '暴击伤害+5%，火球+1',
        icon: '🔥',
        color: '#f84',
        apply(player, stacks) {
            if (stacks === 1) {
                player.critMultiplier += 0.10;
                player.fireballLevel = 1;
                player.fireballCount = 1;
            } else {
                player.critMultiplier += 0.05;
                player.fireballCount += 1;
                player.fireballLevel = stacks;
            }
        },
    },
    {
        id: 'shadow_clone',
        name: '影分身',
        desc: '连击>10时留下影分身，下次攻击协同作战(30%伤害)',
        stackDesc: '影分身+1',
        icon: '👤',
        color: '#668',
        apply(player, stacks) {
            player.shadowCloneLevel = stacks;
            player.shadowCloneCount = stacks;
        },
    },
];

class UpgradeManager {
    constructor() {
        this.stacks = {};
        for (const u of UPGRADE_DEFS) {
            this.stacks[u.id] = 0;
        }
        this.choices = [];
        this.active = false;
        this.onSelect = null;
    }

    generateChoices() {
        const shuffled = shuffleArray(UPGRADE_DEFS);
        this.choices = shuffled.slice(0, 3);
        this.active = true;
    }

    selectUpgrade(index, player) {
        if (index < 0 || index >= this.choices.length) return;
        const upgrade = this.choices[index];
        this.stacks[upgrade.id]++;
        upgrade.apply(player, this.stacks[upgrade.id]);
        this.active = false;
        this.choices = [];
        if (this.onSelect) this.onSelect();
    }

    getDesc(upgrade) {
        const stk = this.stacks[upgrade.id];
        if (stk > 0) return upgrade.stackDesc;
        return upgrade.desc;
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

    _drawWrappedTextCentered(ctx, text, centerX, y, maxW, fontSize, lineHeight, color) {
        ctx.font = `${fontSize}px "Segoe UI", Arial, "Microsoft YaHei", sans-serif`;
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        const lines = this._wrapLines(ctx, text, maxW);
        let lineY = y;
        for (const ln of lines) {
            ctx.fillText(ln, centerX, lineY);
            lineY += lineHeight;
        }
        return lines.length;
    }

    _drawPx(ctx, ox, oy, col, row, color, px) {
        if (!color) return;
        ctx.fillStyle = color;
        ctx.fillRect(ox + col * px, oy + row * px, px, px);
    }

    _getUpgradeIconSprite(id) {
        const T = '#f4f8ff';
        const D = '#1e2738';
        const B = '#57a8ff';
        const Y = '#ffe070';
        const O = '#ff9850';
        const R = '#e84838';
        const P = '#c8a8ff';
        const G = '#86e0a0';

        const map = {
            ice_heart: [
                [null, null, B, null, null],
                [null, B, T, B, null],
                [B, T, T, T, B],
                [null, B, T, B, null],
                [null, null, B, null, null],
            ],
            cheese: [
                [Y, Y, Y, Y, null],
                [Y, Y, Y, Y, Y],
                [Y, D, Y, Y, Y],
                [Y, Y, Y, D, Y],
                [Y, Y, Y, Y, Y],
            ],
            lightning: [
                [null, Y, Y, null, null],
                [null, Y, null, null, null],
                [Y, Y, Y, null, null],
                [null, null, Y, null, null],
                [null, Y, Y, Y, null],
            ],
            big_mushroom: [
                [null, R, R, R, null],
                [R, R, R, R, R],
                [R, T, R, T, R],
                [null, T, T, T, null],
                [null, O, O, O, null],
            ],
            crescent: [
                [null, T, T, null, null],
                [T, T, null, null, null],
                [T, null, null, null, null],
                [T, T, null, null, null],
                [null, T, T, null, null],
            ],
            black_hole: [
                [null, P, P, P, null],
                [P, D, D, D, P],
                [P, D, null, D, P],
                [P, D, D, D, P],
                [null, P, P, P, null],
            ],
            blade_whirl: [
                [null, B, T, B, null],
                [B, null, T, null, B],
                [T, T, T, T, T],
                [B, null, T, null, B],
                [null, B, T, B, null],
            ],
            fireball: [
                [null, O, R, null, null],
                [O, R, O, R, null],
                [R, O, Y, O, R],
                [null, R, O, R, null],
                [null, null, R, null, null],
            ],
            shadow_clone: [
                [null, D, D, D, null],
                [D, T, T, T, D],
                [D, D, T, D, D],
                [D, D, D, D, D],
                [null, P, D, P, null],
            ],
        };
        return map[id] || map.shadow_clone;
    }

    _drawUpgradeIcon(ctx, id, centerX, centerY, color, size) {
        const sprite = this._getUpgradeIconSprite(id);
        const rows = sprite.length;
        const cols = sprite[0].length;
        const px = Math.max(2, Math.floor(size / Math.max(rows, cols)));
        const w = cols * px;
        const h = rows * px;
        const ox = Math.floor(centerX - w / 2);
        const oy = Math.floor(centerY - h / 2);

        const bgPad = px;
        ctx.fillStyle = 'rgba(15, 16, 28, 0.78)';
        ctx.fillRect(ox - bgPad, oy - bgPad, w + bgPad * 2, h + bgPad * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.strokeRect(ox - bgPad, oy - bgPad, w + bgPad * 2, h + bgPad * 2);

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                this._drawPx(ctx, ox, oy, c, r, sprite[r][c], px);
            }
        }
    }

    drawUI(ctx, vp, uiScale) {
        if (!this.active) return;

        const s = uiScale || 1;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(vp.x, vp.y, vp.w, vp.h);

        const titleY = vp.y + vp.h * 0.14;
        drawGameText(ctx, '升级！选择一个强化', vp.cx, titleY,
            Math.round(22 * s), '#fff', 'center', 'middle');

        const cardW = vp.w * 0.84;
        const cardH = 118 * s;
        const gap = 10 * s;
        const startY = vp.y + vp.h * 0.21;
        const innerPad = 20 * s;
        const textMaxW = cardW - innerPad * 2;

        this._cardRects = [];

        for (let i = 0; i < this.choices.length; i++) {
            const u = this.choices[i];
            const y = startY + i * (cardH + gap);
            const x = vp.x + (vp.w - cardW) / 2;
            const cardCx = x + cardW / 2;

            this._cardRects.push({ x, y, w: cardW, h: cardH, index: i });

            ctx.fillStyle = 'rgba(30, 30, 60, 0.95)';
            ctx.strokeStyle = u.color;
            ctx.lineWidth = 2;
            if (typeof ctx.roundRect === 'function') {
                ctx.beginPath();
                ctx.roundRect(x, y, cardW, cardH, 8);
                ctx.fill();
                ctx.stroke();
            } else {
                ctx.fillRect(x, y, cardW, cardH);
                ctx.strokeRect(x, y, cardW, cardH);
            }

            const iconSize = Math.round(32 * s);
            const iconY = y + innerPad + iconSize * 0.45;
            this._drawUpgradeIcon(ctx, u.id, cardCx, iconY, u.color, iconSize);

            const nameSize = Math.round(17 * s);
            const nameY = iconY + iconSize * 0.55 + 14 * s;
            ctx.font = `bold ${nameSize}px "Segoe UI", Arial, "Microsoft YaHei", sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = u.color;
            ctx.fillText(u.name, cardCx, nameY);

            const stk = this.stacks[u.id];
            if (stk > 0) {
                const lvSize = Math.round(12 * s);
                ctx.font = `bold ${lvSize}px "Segoe UI", Arial, sans-serif`;
                ctx.textAlign = 'right';
                ctx.textBaseline = 'top';
                ctx.fillStyle = '#aaa';
                ctx.fillText(`Lv.${stk + 1}`, x + cardW - innerPad, y + innerPad * 0.7);
            }

            const descSize = Math.round(13 * s);
            const lineHeight = Math.round(18 * s);
            const descY = nameY + 16 * s;
            this._drawWrappedTextCentered(
                ctx, this.getDesc(u), cardCx, descY,
                textMaxW, descSize, lineHeight, '#ccc'
            );
        }
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
