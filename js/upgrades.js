function hexToRgba(hex, alpha) {
    const h = (hex || '#ffffff').replace('#', '');
    const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
    const n = parseInt(full, 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    return `rgba(${r},${g},${b},${alpha})`;
}

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
        id: 'multi_dart',
        rarity: 'white',
        name: '多重飞镖',
        icon: '🎯',
        desc: '普攻飞镖数量+1',
        apply() {},
    },
    {
        id: 'giant_dart',
        rarity: 'blue',
        name: '巨大飞镖',
        icon: '⭕',
        desc: '普攻20%概率发射巨大飞镖',
        apply() {},
    },
    {
        id: 'ice_dart',
        rarity: 'purple',
        name: '寒冰飞镖',
        icon: '❄️',
        desc: '普攻命中5%释放寒冰飞镖',
        apply() {},
    },
    {
        id: 'spirit_bomb',
        rarity: 'orange',
        name: '元气弹',
        icon: '💫',
        desc: '飞镖变元气弹',
        apply() {},
    },
    {
        id: 'shuriken',
        rarity: 'blue',
        name: '手里剑',
        icon: '🎯',
        desc: '每次连击释放2枚手里剑',
        apply() {},
    },
    {
        id: 'multi_combo',
        rarity: 'orange',
        name: '多重连击',
        icon: '🔥',
        desc: '连击次数×1.2倍',
        apply() {},
    },
    {
        id: 'healing_combo',
        rarity: 'orange',
        name: '愈合连击',
        icon: '🌿',
        desc: '连击每+15释放藤蔓，回复5%生命',
        apply() {},
    },
    {
        id: 'holy_shield',
        rarity: 'blue',
        name: '圣盾',
        icon: '🛡️',
        desc: '每5秒获得1层护盾',
        apply(player) {
            player.grantHolyShieldImmediate();
        },
    },
    {
        id: 'vampire_bat',
        rarity: 'purple',
        name: '吸血蝙蝠',
        icon: '🦇',
        desc: '每击杀10敌人，蝙蝠群攻并回复2%生命',
        apply() {},
    },
    {
        id: 'meat_shield',
        rarity: 'white',
        name: '变肉',
        icon: '🛡️',
        desc: '最大生命+10%，体积+15%',
        apply(player) {
            const oldMax = player.maxHp;
            player.maxHp = Math.round(player.maxHp * 1.1);
            player.hp = Math.min(player.maxHp, player.hp + (player.maxHp - oldMax));
            player.sizeScale *= 1.15;
        },
    },
    {
        id: 'super_heal',
        rarity: 'orange',
        name: '超级治疗',
        icon: '✨',
        desc: '所有回血效果+50%',
        apply() {},
    },
    {
        id: 'lightning_chain',
        rarity: 'blue',
        name: '闪电链',
        icon: '⚡',
        desc: '连击每+5释放闪电链',
        apply(player) {
            player.upgradeStacks.lightning_chain = (player.upgradeStacks.lightning_chain || 0) + 1;
        },
    },
    {
        id: 'shadow_clone',
        rarity: 'blue',
        name: '影分身',
        icon: '👤',
        desc: '连击>10召唤影分身',
        apply() {},
    },
    {
        id: 'water_tornado',
        rarity: 'purple',
        name: '水龙卷术',
        icon: '🌊',
        desc: '暴击+5%，连击每+3释放水龙卷',
        apply(player) {
            player.critRate += 0.05;
        },
    },
    {
        id: 'black_hole',
        rarity: 'purple',
        name: '黑洞',
        icon: '🕳️',
        desc: '连击8时生成黑洞',
        apply(player) {
            player.upgradeStacks.black_hole = (player.upgradeStacks.black_hole || 0) + 1;
        },
    },
    {
        id: 'blade_whirl',
        rarity: 'purple',
        name: '刀阵旋风',
        icon: '🌀',
        desc: '连击每+5释放刀阵旋风',
        apply() {},
    },
    {
        id: 'great_fireball',
        rarity: 'orange',
        name: '豪火球术',
        icon: '🔥',
        desc: '连击每+10释放豪火球',
        apply(player) {
            player.upgradeStacks.great_fireball = (player.upgradeStacks.great_fireball || 0) + 1;
        },
    },
    {
        id: 'heavenly_thunder',
        rarity: 'orange',
        name: '天雷',
        icon: '⚡',
        desc: '每秒落雷范围攻击',
        apply() {},
    },
    {
        id: 'wild_wolf',
        rarity: 'white',
        name: '野狼',
        icon: '🐺',
        pet: true,
        desc: '宠物：召唤一只野狼',
        apply() {},
    },
    {
        id: 'wild_bull',
        rarity: 'blue',
        name: '野牛',
        icon: '🐂',
        pet: true,
        desc: '宠物：召唤一只野牛',
        apply() {},
    },
    {
        id: 'divine_god',
        rarity: 'purple',
        name: '天神',
        icon: '✨',
        pet: true,
        desc: '宠物：召唤天神',
        apply() {},
    },
    {
        id: 'nurturing_heart',
        rarity: 'orange',
        name: '养育之心',
        icon: '💗',
        desc: '宠物数量翻倍',
        apply() {},
    },
];

const UPGRADE_POPUP_FX = {
    white: {
        overlay: 0.76,
        edgeGlow: 0,
        cardGlow: 0.12,
        shimmer: false,
        pulse: false,
        sparkCount: 0,
    },
    blue: {
        overlay: 0.8,
        edgeGlow: 0.28,
        cardGlow: 0.32,
        shimmer: true,
        pulse: false,
        sparkCount: 6,
    },
    purple: {
        overlay: 0.84,
        edgeGlow: 0.48,
        cardGlow: 0.5,
        shimmer: true,
        pulse: true,
        sparkCount: 12,
    },
    orange: {
        overlay: 0.88,
        edgeGlow: 0.78,
        cardGlow: 0.85,
        shimmer: true,
        pulse: true,
        sparkCount: 22,
        rays: true,
    },
};

class UpgradeManager {
    constructor() {
        this.active = false;
        this.choices = [];
        this.rolledRarity = 'white';
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

    generateChoices() {
        this.active = true;
        this.popupTimer = 0;
        this.choices = [];
        this.rolledRarity = this._rollRarity();
        let pool = UPGRADE_DEFS.filter(u => u.rarity === this.rolledRarity);
        if (pool.length === 0) pool = UPGRADE_DEFS.slice();

        const available = pool.slice();
        for (let i = 0; i < 3; i++) {
            if (available.length > 0) {
                const idx = Math.floor(Math.random() * available.length);
                this.choices.push(available[idx]);
                available.splice(idx, 1);
            } else {
                this.choices.push(pickRandom(pool));
            }
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

    _getPopupFx() {
        return UPGRADE_POPUP_FX[this.rolledRarity] || UPGRADE_POPUP_FX.white;
    }

    _drawRarityBackdrop(ctx, vp, s, popT) {
        const fx = this._getPopupFx();
        const tier = CONFIG.UPGRADE_RARITY[this.rolledRarity] || CONFIG.UPGRADE_RARITY.white;
        const t = popT;

        ctx.save();
        ctx.globalAlpha = t;
        ctx.fillStyle = `rgba(0, 0, 0, ${fx.overlay})`;
        ctx.fillRect(vp.x, vp.y, vp.w, vp.h);

        if (fx.edgeGlow > 0) {
            const pulse = fx.pulse ? (0.85 + Math.sin(Date.now() * 0.008) * 0.15) : 1;
            const g = ctx.createRadialGradient(vp.cx, vp.cy, vp.w * 0.12, vp.cx, vp.cy, vp.w * 0.72);
            g.addColorStop(0, 'rgba(0,0,0,0)');
            g.addColorStop(0.55, hexToRgba(tier.color, fx.edgeGlow * 0.35 * pulse));
            g.addColorStop(1, hexToRgba(tier.color, fx.edgeGlow * pulse));
            ctx.fillStyle = g;
            ctx.fillRect(vp.x, vp.y, vp.w, vp.h);
        }

        if (fx.rays) {
            ctx.save();
            ctx.translate(vp.cx, vp.cy);
            ctx.rotate(Date.now() * 0.0004);
            for (let i = 0; i < 8; i++) {
                ctx.rotate(Math.PI / 4);
                const ray = ctx.createLinearGradient(0, 0, vp.w * 0.5, 0);
                ray.addColorStop(0, hexToRgba(tier.color, 0));
                ray.addColorStop(0.5, hexToRgba(tier.color, 0.12 * t));
                ray.addColorStop(1, hexToRgba(tier.color, 0));
                ctx.fillStyle = ray;
                ctx.fillRect(0, -vp.h * 0.06, vp.w * 0.55, vp.h * 0.12);
            }
            ctx.restore();
        }

        if (fx.sparkCount > 0) {
            const seed = Math.floor(Date.now() / 120);
            for (let i = 0; i < fx.sparkCount; i++) {
                const a = ((i * 47 + seed) % 360) / 360 * Math.PI * 2;
                const dist = ((i * 19 + seed) % 100) / 100;
                const px = vp.cx + Math.cos(a) * vp.w * 0.38 * dist;
                const py = vp.cy + Math.sin(a) * vp.h * 0.32 * dist;
                const sz = 2 + (i % 3);
                ctx.fillStyle = hexToRgba(tier.color, 0.25 + (i % 4) * 0.12);
                ctx.fillRect(Math.floor(px), Math.floor(py), sz, sz);
            }
        }
        ctx.restore();
    }

    _drawCard(ctx, u, x, y, cardW, cardH, cardCx, innerPad, textMaxW, s, player, alpha) {
        const rarity = CONFIG.UPGRADE_RARITY[u.rarity];
        const fx = this._getPopupFx();
        ctx.save();
        ctx.globalAlpha = alpha;

        if (fx.cardGlow > 0) {
            const pulse = fx.pulse ? (0.9 + Math.sin(Date.now() * 0.01 + x * 0.01) * 0.1) : 1;
            ctx.shadowColor = rarity.color;
            ctx.shadowBlur = (8 + fx.cardGlow * 18) * pulse * s;
        }

        drawPixelPanel(ctx, x, y, cardW, cardH, 'rgba(30, 30, 60, 0.96)', rarity.color, 2);
        ctx.shadowBlur = 0;

        if (fx.shimmer && fx.cardGlow > 0.2) {
            const sweep = ((Date.now() * 0.0012 + x * 0.002) % 1);
            const sx = x + cardW * sweep;
            ctx.globalAlpha = alpha * 0.22 * fx.cardGlow;
            const shine = ctx.createLinearGradient(sx - 30, y, sx + 30, y);
            shine.addColorStop(0, 'rgba(255,255,255,0)');
            shine.addColorStop(0.5, 'rgba(255,255,255,0.9)');
            shine.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = shine;
            ctx.fillRect(x, y, cardW, cardH);
            ctx.globalAlpha = alpha;
        }

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
        const tier = CONFIG.UPGRADE_RARITY[this.rolledRarity] || CONFIG.UPGRADE_RARITY.white;
        const fx = this._getPopupFx();

        ctx.save();
        this._drawRarityBackdrop(ctx, vp, s, popT);

        const titleY = vp.y + vp.h * 0.12;
        const titleScale = 0.75 + 0.25 * popT;
        ctx.save();
        ctx.translate(vp.cx, titleY);
        ctx.scale(titleScale, titleScale);
        ctx.translate(-vp.cx, -titleY);
        ctx.globalAlpha = popT;
        if (fx.cardGlow > 0.35) {
            ctx.shadowColor = tier.color;
            ctx.shadowBlur = (6 + fx.cardGlow * 14) * s;
        }
        drawPixelText(ctx, '升级！选择一个强化', vp.cx, titleY, Math.round(20 * s), '#ffe8c8');
        ctx.shadowBlur = 0;
        drawPixelText(ctx, tier.name, vp.cx, titleY + 26 * s, Math.round(14 * s), tier.color);
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
