const UPGRADE_DEFS = [
    {
        id: 'luck',
        rarity: 'white',
        name: '运气',
        icon: '🧘',
        desc: '增加20%气力',
        apply(player) {
            player.baseKi = Math.round(player.baseKi * 1.20);
            player.kiMax = Math.round(player.baseKi * (1 + player.nextTurnKiBonus));
            player.ki = player.kiMax;
        },
    },
    {
        id: 'shuriken',
        rarity: 'blue',
        name: '手里剑',
        icon: '🎯',
        desc: '结算时在路径上释放像素手里剑(10%攻击力)',
        apply(player) {
            player.upgradeStacks.shuriken = (player.upgradeStacks.shuriken || 0) + 1;
        },
    },
    {
        id: 'lightning_chain',
        rarity: 'blue',
        name: '闪电链',
        icon: '⚡',
        desc: '结算连击每+5在命中点释放闪电链(3目标)',
        apply(player) {
            player.upgradeStacks.lightning_chain = (player.upgradeStacks.lightning_chain || 0) + 1;
        },
    },
    {
        id: 'shadow_clone',
        rarity: 'blue',
        name: '影分身',
        icon: '👤',
        desc: '连击>10时永久召唤影分身(20%伤害)',
        apply() {},
    },
    {
        id: 'water_tornado',
        rarity: 'purple',
        name: '水龙卷术',
        icon: '🌊',
        desc: '暴击率+5%，连击每+3对最近敌人释放穿透水龙卷',
        apply(player) {
            player.critRate += 0.05;
        },
    },
    {
        id: 'black_hole',
        rarity: 'purple',
        name: '黑洞',
        icon: '🕳️',
        desc: '连击每+8在攻击点生成黑洞',
        apply(player) {
            player.upgradeStacks.black_hole = (player.upgradeStacks.black_hole || 0) + 1;
        },
    },
    {
        id: 'blade_whirl',
        rarity: 'purple',
        name: '刀阵旋风',
        icon: '🌀',
        desc: '连击每+5在攻击点释放刀阵旋风',
        apply() {},
    },
    {
        id: 'great_fireball',
        rarity: 'orange',
        name: '豪火球术',
        icon: '🔥',
        desc: '结算开始时沿路径发射豪火球(100%攻击力)',
        apply(player) {
            player.upgradeStacks.great_fireball = (player.upgradeStacks.great_fireball || 0) + 1;
        },
    },
];

class UpgradeManager {
    constructor() {
        this.active = false;
        this.choices = [];
        this.onSelect = null;
        this._cardRects = [];
        this.popupTimer = 0;
        this.popupDuration = 0.45;
    }

    _rollRarity() {
        const r = Math.random();
        let acc = 0;
        for (const key of ['white', 'blue', 'purple', 'orange']) {
            acc += CONFIG.UPGRADE_RARITY[key].chance;
            if (r <= acc) return key;
        }
        return 'white';
    }

    _pickByRarity(rarity) {
        const pool = UPGRADE_DEFS.filter(u => u.rarity === rarity);
        if (pool.length === 0) return pickRandom(UPGRADE_DEFS);
        return pickRandom(pool);
    }

    generateChoices() {
        this.active = true;
        this.popupTimer = 0;
        this.choices = [];
        const used = new Set();
        for (let i = 0; i < 3; i++) {
            let pick = null;
            for (let k = 0; k < 12; k++) {
                pick = this._pickByRarity(this._rollRarity());
                if (!used.has(pick.id) || k > 8) break;
            }
            used.add(pick.id);
            this.choices.push(pick);
        }
    }

    update(dt) {
        if (!this.active) return;
        if (this.popupTimer < this.popupDuration) this.popupTimer += dt;
    }

    getPopupT() {
        return clamp(this.popupTimer / this.popupDuration, 0, 1);
    }

    canInteract() {
        return this.active && this.getPopupT() >= 0.55;
    }

    selectUpgrade(index, player) {
        if (!this.canInteract()) return;
        if (index < 0 || index >= this.choices.length) return;
        const u = this.choices[index];
        player.applyUpgrade(u);
        this.active = false;
        this.choices = [];
        if (this.onSelect) this.onSelect(u);
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
        ctx.font = `${fontSize}px ${GAME_FONT}`;
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const lines = this._wrapLines(ctx, text, maxW);
        let lineY = y;
        for (const ln of lines) {
            ctx.fillText(ln, centerX, lineY);
            lineY += lineHeight;
        }
    }

    _drawCard(ctx, u, x, y, cardW, cardH, cardCx, innerPad, textMaxW, s, player, alpha) {
        const rarity = CONFIG.UPGRADE_RARITY[u.rarity];
        ctx.save();
        ctx.globalAlpha = alpha;

        drawPixelPanel(ctx, x, y, cardW, cardH, 'rgba(30, 30, 60, 0.96)', rarity.color, 2);

        const iconSize = Math.round(32 * s);
        const iconY = y + innerPad + iconSize * 0.45;
        ctx.font = `${iconSize}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';
        ctx.fillText(u.icon, cardCx, iconY);

        const nameY = iconY + iconSize * 0.55 + 14 * s;
        drawPixelText(ctx, u.name, cardCx, nameY, Math.round(16 * s), rarity.color);

        const stack = player.getUpgradeLevel(u.id);
        if (stack > 0) {
            drawPixelText(ctx, `Lv.${stack + 1}`, x + cardW - innerPad, y + innerPad * 0.6,
                Math.round(11 * s), '#aaa', 'right', 'top');
        }

        const descY = nameY + 28 * s;
        this._drawWrappedTextCentered(
            ctx, u.desc, cardCx, descY,
            textMaxW, Math.round(12 * s), Math.round(17 * s), '#ccc'
        );
        ctx.restore();
    }

    drawUI(ctx, vp, uiScale, player) {
        if (!this.active) return;
        const s = uiScale || 1;
        const popT = easeOutQuad(this.getPopupT());

        ctx.save();
        ctx.fillStyle = `rgba(0, 0, 0, ${0.78 * popT})`;
        ctx.fillRect(vp.x, vp.y, vp.w, vp.h);

        const titleY = vp.y + vp.h * 0.14;
        const titleScale = 0.75 + 0.25 * popT;
        ctx.save();
        ctx.translate(vp.cx, titleY);
        ctx.scale(titleScale, titleScale);
        ctx.translate(-vp.cx, -titleY);
        ctx.globalAlpha = popT;
        drawPixelText(ctx, '升级！选择一个强化', vp.cx, titleY, Math.round(20 * s), '#ffe8c8');
        ctx.restore();

        const cardW = vp.w * 0.84;
        const cardH = 118 * s;
        const gap = 10 * s;
        const startY = vp.y + vp.h * 0.21;
        const innerPad = 20 * s;
        const textMaxW = cardW - innerPad * 2;
        this._cardRects = [];

        for (let i = 0; i < this.choices.length; i++) {
            const u = this.choices[i];
            const baseY = startY + i * (cardH + gap);
            const x = vp.x + (vp.w - cardW) / 2;
            const cardCx = x + cardW / 2;
            const cardDelay = i * 0.1;
            const cardT = clamp((popT - cardDelay) / (1 - cardDelay * 0.6), 0, 1);
            const cardEase = easeOutQuad(cardT);
            const scale = 0.72 + 0.28 * cardEase;
            const offsetY = (1 - cardEase) * 36 * s;
            const y = baseY + offsetY;

            this._cardRects.push({ x, y, w: cardW, h: cardH, index: i });

            ctx.save();
            ctx.translate(cardCx, y + cardH / 2);
            ctx.scale(scale, scale);
            ctx.translate(-cardCx, -(y + cardH / 2));
            this._drawCard(ctx, u, x, y, cardW, cardH, cardCx, innerPad, textMaxW, s, player, cardEase);
            ctx.restore();
        }
        ctx.restore();
    }

    handleClick(x, y) {
        if (!this.canInteract()) return -1;
        if (!this.active) return -1;
        for (const r of this._cardRects) {
            if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return r.index;
        }
        return -1;
    }
}
