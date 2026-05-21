function _parseHexColor(hex) {
    const h = hex.replace('#', '');
    return [
        parseInt(h.slice(0, 2), 16),
        parseInt(h.slice(2, 4), 16),
        parseInt(h.slice(4, 6), 16),
    ];
}

function lerpHexColor(c1, c2, t) {
    const a = _parseHexColor(c1);
    const b = _parseHexColor(c2);
    const ch = (i) => Math.round(a[i] + (b[i] - a[i]) * t);
    return `#${[0, 1, 2].map((i) => ch(i).toString(16).padStart(2, '0')).join('')}`;
}

class UI {
    _getComboColors(combo) {
        const t = clamp((combo - 2) / 18, 0, 1);
        let main;
        let sub;
        if (t < 0.45) {
            const u = t / 0.45;
            main = lerpHexColor('#fff8c0', '#ffc830', u);
            sub = lerpHexColor('#ffe060', '#ff9838', u);
        } else if (t < 0.8) {
            const u = (t - 0.45) / 0.35;
            main = lerpHexColor('#ffc830', '#ff6020', u);
            sub = lerpHexColor('#ff9838', '#ff4028', u);
        } else {
            const u = (t - 0.8) / 0.2;
            main = lerpHexColor('#ff6020', '#fff8e8', u);
            sub = lerpHexColor('#ff4028', '#ff3020', u);
        }
        const glow = lerpHexColor('#ffb830', '#ff3820', t);
        return { main, sub, glow };
    }

    _drawComboPixelText(ctx, text, x, y, sizePx, colors) {
        ctx.save();
        const px = Math.max(8, Math.round(sizePx));
        ctx.font = `bold ${px}px ${GAME_FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.miterLimit = 2;
        const strokeW = Math.max(3, px * 0.13);
        ctx.lineWidth = strokeW;
        ctx.strokeStyle = '#000000';
        ctx.strokeText(text, x, y);
        ctx.fillStyle = colors.main;
        ctx.fillText(text, x, y);
        ctx.restore();
    }

    getPlayAreaBottom(canvasH, uiScale = 1) {
        const reserve = (CONFIG.EXP.BAR_HEIGHT + 14) * uiScale;
        return canvasH - reserve;
    }

    _getHudLayout(vp, s, player) {
        const pad = 12 * s;
        const kiY = vp.y + 28 * s;
        const kiH = 40 * s;
        const buffRowY = kiY + kiH + 8 * s;
        const hasBuffs = player && player.collectedOrbBuffs && player.collectedOrbBuffs.length > 0;
        const secondRowY = hasBuffs ? buffRowY + 30 * s : buffRowY;
        return {
            pad,
            kiX: vp.x + pad,
            kiY,
            kiW: vp.w - pad * 2,
            kiH,
            buffRowY,
            secondRowY,
            comboY: secondRowY + 8 * s,
        };
    }

    draw(ctx, game, vp, s) {
        const layout = this._getHudLayout(vp, s, game.player);
        this._lastHudLayout = layout;
        this.drawTopKiBar(ctx, game.player, layout, s);
        this.drawTurnBuffIcons(ctx, game.player, layout, s);
        this.drawComboBanner(ctx, game.player, vp, layout, s);
        this.drawMessage(ctx, game.player, vp, s);
        this.drawBuffNotice(ctx, game.buffOrbs, vp, s);
        if (game.experience) this.drawExpBar(ctx, game.experience, vp, s);
    }

    drawExpBar(ctx, exp, vp, s) {
        ctx.save();
        ctx.imageSmoothingEnabled = false;

        const h = Math.floor(CONFIG.EXP.BAR_HEIGHT * s);
        const pad = Math.floor(12 * s);
        const y = Math.floor(vp.y + vp.h - h - 8 * s);
        const w = Math.floor(vp.w - pad * 2);
        const x = Math.floor(vp.x + pad);
        const border = Math.max(2, Math.floor(3 * s));
        const block = Math.max(3, Math.floor(4 * s));
        const innerX = x + border;
        const innerY = y + border;
        const innerW = w - border * 2;
        const innerH = h - border * 2;
        const ratio = clamp(exp.exp / Math.max(1, exp.expToNext), 0, 1);
        const fillBlocks = Math.floor((innerW / block) * ratio);

        drawPixelPanel(ctx, x, y, w, h, '#1a2030', '#c8a040', border);

        for (let col = 0; col * block < innerW; col++) {
            const bx = innerX + col * block;
            const bw = Math.min(block - 1, innerW - col * block);
            if (bw <= 0) continue;
            if (col < fillBlocks) {
                ctx.fillStyle = '#348848';
                ctx.fillRect(bx, innerY, bw, innerH);
                ctx.fillStyle = '#68c878';
                ctx.fillRect(bx, innerY, bw, Math.max(2, Math.floor(innerH * 0.42)));
                ctx.fillStyle = '#98e8a8';
                ctx.fillRect(bx, innerY, bw, Math.max(1, Math.floor(innerH * 0.18)));
            } else {
                ctx.fillStyle = (col % 2 === 0) ? '#242c3a' : '#1e2430';
                ctx.fillRect(bx, innerY, bw, innerH);
            }
        }

        ctx.fillStyle = '#5a4828';
        const rivet = Math.max(2, Math.floor(2 * s));
        ctx.fillRect(x + border, y + border, rivet, rivet);
        ctx.fillRect(x + w - border - rivet, y + border, rivet, rivet);
        ctx.fillRect(x + border, y + h - border - rivet, rivet, rivet);
        ctx.fillRect(x + w - border - rivet, y + h - border - rivet, rivet, rivet);

        drawPixelText(ctx, `Lv${exp.level}`, x + 10 * s, y + h / 2, Math.round(10 * s), '#ffe8a8', 'left', 'middle');
        drawPixelText(
            ctx,
            `${Math.floor(exp.exp)}/${exp.expToNext}`,
            x + w - 10 * s,
            y + h / 2,
            Math.round(9 * s),
            '#e8f4ff',
            'right',
            'middle'
        );
        ctx.restore();
    }

    drawTopKiBar(ctx, player, layout, s) {
        const ratio = clamp(player.ki / Math.max(1, player.kiMax), 0, 1);
        this._drawPixelSwordKiBar(ctx, layout.kiX, layout.kiY, layout.kiW, layout.kiH, ratio);
    }

    drawTurnBuffIcons(ctx, player, layout, s) {
        const buffs = player.collectedOrbBuffs;
        if (!buffs || buffs.length === 0) return;

        const counts = {};
        for (const t of buffs) counts[t] = (counts[t] || 0) + 1;
        const types = ['attack', 'ki', 'combo', 'ice'].filter(t => counts[t]);

        const iconPx = Math.max(3, Math.floor(3 * s));
        const slotW = iconPx * 8 + 10 * s;
        const totalW = types.length * slotW - 4 * s;
        let x = layout.kiX + layout.kiW / 2 - totalW / 2;
        const cy = layout.buffRowY + 12 * s;

        for (const type of types) {
            const count = counts[type];
            const sx = Math.floor(x);
            const sy = Math.floor(cy - 12 * s);
            drawPixelPanel(ctx, sx, sy, slotW - 4 * s, 24 * s, '#2a2838', '#c8b888', 2);
            const pal = this._buffFrameColor(type);
            ctx.fillStyle = pal;
            ctx.fillRect(sx + 3, sy + 3, slotW - 10 * s, 4);
            drawPixelIcon(ctx, getBuffOrbIconSprite(type), x + (slotW - 4 * s) / 2, cy, iconPx);
            const label = count > 1 ? `${getBuffOrbShortLabel(type)}×${count}` : getBuffOrbShortLabel(type);
            drawPixelText(ctx, label, x + (slotW - 4 * s) / 2, cy + 14 * s, Math.round(8 * s), '#fff0d0');
            x += slotW;
        }
    }

    _buffFrameColor(type) {
        if (type === 'attack') return '#ff9050';
        if (type === 'ki') return '#58c8ff';
        if (type === 'combo') return '#f0a0f0';
        if (type === 'ice') return '#88d8ff';
        return '#e8d070';
    }

    _uiPx(ctx, ox, oy, col, row, color, px) {
        if (!color) return;
        ctx.fillStyle = color;
        ctx.fillRect(ox + col * px, oy + row * px, px, px);
    }

    _swordRowSpan(col, rows, pommelCols, gripCols, guardCols, bladeCols, tipCols) {
        const bladeStart = pommelCols + gripCols + guardCols;
        const tipStart = bladeStart + bladeCols;
        if (col < pommelCols) {
            const mid = Math.floor(rows / 2);
            return { rowMin: mid - 1, rowMax: mid + 1 };
        }
        if (col < pommelCols + gripCols) {
            const gripMid = Math.floor(rows / 2);
            return { rowMin: gripMid - 3, rowMax: gripMid + 2 };
        }
        if (col < bladeStart) {
            return { rowMin: 0, rowMax: rows - 1 };
        }
        if (col < tipStart) {
            return { rowMin: 2, rowMax: rows - 3 };
        }
        const tipIdx = col - tipStart;
        const inset = tipIdx + 1;
        const rowMin = inset + 2;
        const rowMax = rows - 3 - inset;
        if (rowMin > rowMax) return null;
        return { rowMin, rowMax };
    }

    _drawPixelSwordKiBar(ctx, x, y, totalW, h, ratio) {
        const rows = 16;
        const px = Math.max(2, Math.floor(h / rows));
        const barH = rows * px;
        const barY = Math.floor(y + (h - barH) / 2);
        const ox = Math.floor(x);

        const pal = {
            outline: '#1a1418',
            pommel: '#4a4048', pommelHi: '#7a7078',
            grip0: '#3a2818', grip1: '#5a4030', grip2: '#8a6848', gripWrap: '#a88868',
            guard: '#5a5a62', guardHi: '#9a9aa8', guardEdge: '#2a2830',
            track: '#2a3038', trackHi: '#3a424c',
            kiLo: '#2a6890', kiMid: '#58b0d8', kiHi: '#9ae8ff', kiEdge: '#d8f8ff',
            steel: '#6a7078', steelHi: '#aab0b8',
            warn: '#e04838',
        };

        const pommelCols = 1;
        const gripCols = 18;
        const guardCols = 4;
        const tipCols = 5;
        const fixedCols = pommelCols + gripCols + guardCols + tipCols;
        const bladeCols = Math.max(10, Math.floor((totalW - fixedCols * px) / px));
        const totalCols = fixedCols + bladeCols;
        const drawW = totalCols * px;
        const dx = ox + Math.floor((totalW - drawW) / 2);
        const bladeStart = pommelCols + gripCols + guardCols;
        const tipStart = bladeStart + bladeCols;
        const kiCols = bladeCols + tipCols;
        const fillCols = Math.floor(kiCols * ratio);
        const lowKi = ratio < 0.25 && Math.floor(Date.now() / 280) % 2 === 0;

        const inSpan = (col, row) => {
            const span = this._swordRowSpan(col, rows, pommelCols, gripCols, guardCols, bladeCols, tipCols);
            if (!span) return false;
            return row >= span.rowMin && row <= span.rowMax;
        };

        const colorAt = (col, row) => {
            const isBlade = col >= bladeStart && col < tipStart;
            const isTip = col >= tipStart;
            const isGuard = col >= pommelCols + gripCols && col < bladeStart;
            const isGrip = col >= pommelCols && col < pommelCols + gripCols;
            const isPommel = col < pommelCols;
            const bladeCol = col - bladeStart;
            const tipCol = col - tipStart;
            const kiCol = isBlade ? bladeCol : isTip ? bladeCols + tipCol : -1;
            const filled = kiCol >= 0 && kiCol < fillCols;
            const edgeRow = row === 0 || row === rows - 1;
            const midRow = row === Math.floor(rows / 2);

            if (isPommel) {
                return midRow ? pal.pommelHi : pal.pommel;
            }
            if (isGrip) {
                if (edgeRow) return pal.outline;
                const g = (col + row) % 3;
                if (g === 0) return pal.grip0;
                if (g === 1) return pal.gripWrap;
                return pal.grip1;
            }
            if (isGuard) {
                if (edgeRow) return pal.guardEdge;
                const guardEdgeBand = row <= 2 || row >= rows - 3;
                return guardEdgeBand ? pal.guardHi : pal.guard;
            }
            if (isBlade) {
                if (!filled) {
                    if (edgeRow) return pal.outline;
                    return row <= 2 ? pal.trackHi : pal.track;
                }
                if (edgeRow) return pal.kiLo;
                if (row <= 2) return pal.kiEdge;
                if (row <= 4) return pal.kiHi;
                return pal.kiMid;
            }
            if (isTip) {
                if (!filled) {
                    if (edgeRow) return pal.outline;
                    return pal.steel;
                }
                if (lowKi && midRow) return pal.warn;
                if (edgeRow) return pal.kiLo;
                if (row <= 3) return pal.kiHi;
                return pal.kiMid;
            }
            return pal.outline;
        };

        ctx.imageSmoothingEnabled = false;
        for (let col = 0; col < totalCols; col++) {
            for (let row = 0; row < rows; row++) {
                if (!inSpan(col, row)) continue;
                this._uiPx(ctx, dx, barY, col, row, colorAt(col, row), px);
            }
        }

        return dx + (pommelCols + gripCols) * px;
    }

    drawComboBanner(ctx, player, vp, layout, s) {
        const combo = player.comboDisplayPeak;
        if (combo < 2 || player.comboDisplayTimer <= 0) return;
        const fading = player.comboCount < 2;
        const fadeDur = fading ? CONFIG.PLAYER.COMBO_END_FADE : CONFIG.PLAYER.COMBO_DISPLAY_HOLD;
        const alpha = fading ? clamp(player.comboDisplayTimer / fadeDur, 0, 1) : 1;
        const y = layout.comboY + 28 * s;

        const cfg = CONFIG.PLAYER;
        const mainSize = Math.round(
            (cfg.COMBO_TEXT_BASE + Math.min(cfg.COMBO_TEXT_MAX_GROW, (combo - 2) * cfg.COMBO_TEXT_GROW)) * s
        );
        const subSize = Math.round(mainSize * 0.5);

        const shakeDur = cfg.COMBO_SHAKE_DURATION;
        let shakeX = 0;
        let shakeY = 0;
        let popScale = 1;
        if (player.comboShakeTimer > 0) {
            const t = clamp(player.comboShakeTimer / shakeDur, 0, 1);
            const mag = 7 * s * t;
            shakeX = Math.sin(player.comboShakeTimer * 48) * mag;
            shakeY = Math.sin(player.comboShakeTimer * 61) * mag * 0.7;
            popScale = 1 + 0.14 * t;
        }

        const colors = this._getComboColors(combo);

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(vp.cx + shakeX, y + shakeY);
        ctx.scale(popScale, popScale);
        this._drawComboPixelText(ctx, `连击×${combo}`, 0, 0, mainSize, colors);
        this._drawComboPixelText(
            ctx,
            `+${player.getComboBonusPercent(combo)}%`,
            0,
            Math.round(mainSize * 0.72),
            subSize,
            { main: colors.sub, glow: colors.glow }
        );
        ctx.restore();
    }

    drawMessage(ctx, player, vp, s) {
        if (player.messageTimer <= 0 || !player.activeMessage) return;
        const alpha = clamp(player.messageTimer / 1.25, 0, 1);
        const text = player.activeMessage;
        const fontSize = Math.round(12 * s);
        const expReserve = (CONFIG.EXP.BAR_HEIGHT + 22) * s;
        const y = vp.y + vp.h - expReserve;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = `bold ${fontSize}px ${GAME_FONT}`;
        const tw = ctx.measureText(text).width;
        const padX = 12 * s;
        const padY = 8 * s;
        const bx = Math.floor(vp.cx - tw / 2 - padX);
        const by = Math.floor(y - fontSize / 2 - padY);
        drawPixelPanel(ctx, bx, by, tw + padX * 2, fontSize + padY * 2, 'rgba(42,36,32,0.94)', '#c8b080', 2);
        drawPixelText(ctx, text, vp.cx, y, fontSize, '#ffe7c8');
        ctx.restore();
    }

    drawBuffNotice(ctx, buffOrbs, vp, s) {
        if (!buffOrbs || buffOrbs.noticeTimer <= 0 || !buffOrbs.notice) return;
        const alpha = clamp(buffOrbs.noticeTimer / 1.6, 0, 1);
        const text = buffOrbs.notice.replace(/^获得强化:\s*/, '');
        const fontSize = Math.round(14 * s);
        const y = vp.y + vp.h * 0.2;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.imageSmoothingEnabled = false;
        ctx.font = `bold ${fontSize}px ${GAME_FONT}`;
        const tw = ctx.measureText(text).width;
        const padX = 14 * s;
        const padY = 10 * s;
        const bw = tw + padX * 2;
        const bh = fontSize + padY * 2;
        const bx = Math.floor(vp.cx - bw / 2);
        const by = Math.floor(y - bh / 2);
        drawPixelPanel(ctx, bx, by, bw, bh, 'rgba(42,32,16,0.94)', '#ffd878', 2);
        drawPixelText(ctx, text, vp.cx, y, fontSize, '#fff6d0');
        ctx.restore();
    }
}
