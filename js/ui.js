class UI {
    constructor() {
        this.pauseRects = {};
    }

    draw(ctx, player, vp, uiScale, opts = {}) {
        const s = uiScale || 1;
        this.drawBottomPanel(ctx, vp, s);
        this.drawHearts(ctx, player, vp, s);
        this.drawKiBar(ctx, player, vp, s);
        this.drawXpBar(ctx, player, vp, s);
        this.drawComboBanner(ctx, player, vp, s, !!opts.hasBoss);
    }

    getBottomHudLayout(vp, s) {
        const innerPad = Math.round(12 * s);
        const xpBarH = Math.round(12 * s);
        const kiBarH = Math.round(10 * s);
        const heartScale = Math.round(4 * s);
        const heartSpacing = 26 * s;
        const heartBlockH = heartScale * 5;
        const bottomPad = Math.round(14 * s);
        const rowGap = Math.round(12 * s);
        const panelTopPad = Math.round(22 * s);

        const panelX = vp.x;
        const panelW = vp.w;
        const barW = panelW - innerPad * 2;
        const barX = panelX + innerPad;

        const xpY = vp.y + vp.h - bottomPad - xpBarH;
        const kiY = xpY - rowGap - kiBarH;
        const heartsY = kiY - rowGap - heartBlockH / 2;
        const panelY = heartsY - heartBlockH / 2 - panelTopPad;

        return {
            panel: { x: panelX, y: panelY, w: panelW, h: vp.y + vp.h - panelY },
            playAreaBottom: panelY,
            xp: { x: barX, y: xpY, w: barW, h: xpBarH },
            ki: { x: barX, y: kiY, w: barW, h: kiBarH },
            hearts: { y: heartsY, scale: heartScale, spacing: heartSpacing },
        };
    }

    getPlayAreaBottom(canvasH, uiScale) {
        const s = uiScale || 1;
        const vp = { x: 0, y: 0, w: CONFIG.DISPLAY.LOGICAL_WIDTH, h: canvasH };
        return this.getBottomHudLayout(vp, s).playAreaBottom;
    }

    drawBottomPanel(ctx, vp, s) {
        const { panel } = this.getBottomHudLayout(vp, s);
        const r = Math.round(10 * s);
        ctx.save();
        ctx.fillStyle = 'rgba(36, 30, 24, 0.82)';
        if (typeof ctx.roundRect === 'function') {
            ctx.beginPath();
            ctx.roundRect(panel.x, panel.y, panel.w, panel.h, [r, r, 0, 0]);
            ctx.fill();
        } else {
            ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
        }
        ctx.strokeStyle = 'rgba(130, 108, 82, 0.65)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(panel.x, panel.y + 1);
        ctx.lineTo(panel.x + panel.w, panel.y + 1);
        ctx.stroke();
        ctx.restore();
    }

    getTopHudBottom(vp, s, hasBoss = false) {
        const pauseBtn = this.getPauseButtonRect(vp, s);
        let bottom = pauseBtn.y + pauseBtn.h + Math.round(8 * s);
        if (hasBoss) {
            const gap = Math.round(6 * s);
            const barH = Math.round(8 * s);
            const nameSize = Math.round(11 * s);
            bottom += gap + barH + nameSize + Math.round(6 * s);
        }
        return bottom;
    }

    _drawComboLabel(ctx, text, x, y, size, fillColor) {
        const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2.5) : 1;
        const px = Math.round(size * dpr) / dpr;
        ctx.font = `bold ${px}px ${GAME_FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = Math.max(2.5, px * 0.14);
        ctx.strokeStyle = 'rgba(255, 248, 235, 0.92)';
        ctx.lineJoin = 'round';
        ctx.strokeText(text, x, y);
        ctx.fillStyle = fillColor;
        ctx.fillText(text, x, y);
    }

    drawComboBanner(ctx, player, vp, s, hasBoss = false) {
        const combo = player.comboDisplayPeak;
        if (combo < 2 || player.comboDisplayTimer <= 0) return;

        const fading = player.comboCount < 2;
        const fadeDur = fading
            ? CONFIG.PLAYER.COMBO_END_FADE
            : CONFIG.PLAYER.COMBO_DISPLAY_HOLD;
        const alpha = fading
            ? clamp(player.comboDisplayTimer / fadeDur, 0, 1)
            : 1;

        const tier = combo >= 10 ? 2 : combo >= 5 ? 1 : 0;
        const mainColors = ['#4a4038', '#8a5030', '#c04828'];
        const mainColor = mainColors[tier];
        const bonusColor = '#1a4888';

        const mainSize = Math.round((28 + Math.min(combo - 2, 16) * 1.5) * s);
        const bonusSize = Math.round(mainSize * 0.72);
        const y = this.getTopHudBottom(vp, s, hasBoss) + Math.round(32 * s);

        const mainLabel = `连击×${combo}`;
        const bonusLabel = `+${player.getComboBonusPercent(combo)}%`;
        const gap = 10 * s;

        ctx.save();
        ctx.globalAlpha = alpha;

        ctx.font = `bold ${mainSize}px ${GAME_FONT}`;
        const mainW = ctx.measureText(mainLabel).width;
        ctx.font = `bold ${bonusSize}px ${GAME_FONT}`;
        const bonusW = ctx.measureText(bonusLabel).width;
        const totalW = mainW + gap + bonusW;

        const mainX = vp.cx - totalW / 2 + mainW / 2;
        const bonusX = vp.cx - totalW / 2 + mainW + gap + bonusW / 2;

        this._drawComboLabel(ctx, mainLabel, mainX, y, mainSize, mainColor);
        this._drawComboLabel(ctx, bonusLabel, bonusX, y + 1 * s, bonusSize, bonusColor);

        ctx.restore();
    }

    drawHearts(ctx, player, vp, s) {
        const { panel, hearts } = this.getBottomHudLayout(vp, s);
        const heartScale = hearts.scale;
        const spacing = hearts.spacing;
        const y = hearts.y;
        const totalHearts = Math.ceil(player.maxHearts);
        const totalW = totalHearts > 0 ? (totalHearts - 1) * spacing + heartScale * 5 : 0;
        const startX = panel.x + (panel.w - totalW) / 2;
        for (let i = 0; i < totalHearts; i++) {
            const heartVal = player.hearts - i;
            let sprite;
            if (heartVal >= 1) {
                sprite = SPRITES.heart.full;
            } else if (heartVal >= 0.5) {
                sprite = SPRITES.heart.half;
            } else {
                sprite = SPRITES.heart.empty;
            }
            drawSprite(ctx, sprite, startX + i * spacing, y, heartScale);
        }
    }

    _uiPx(ctx, ox, oy, col, row, color, px) {
        if (!color) return;
        ctx.fillStyle = color;
        ctx.fillRect(ox + col * px, oy + row * px, px, px);
    }

    _drawKatanaKiBar(ctx, x, y, totalW, h, ratio, s, deepBreath = false) {
        const px = Math.max(2, Math.floor(h / 5));
        const rows = 5;
        const barH = rows * px;
        const barY = Math.floor(y + (h - barH) / 2);
        const ox = Math.floor(x);

        const pal = deepBreath ? {
            outline: '#1a3848',
            hilt0: '#2a4858', hilt1: '#4a6878', hilt2: '#6a98a8', hiltWrap: '#88c0d0',
            tsuba: '#68b8d8', tsubaHi: '#a8e8ff',
            track: '#2a4858', trackHi: '#3a5868',
            kiLo: '#48c8e8', kiHi: '#b8ffff', kiEdge: '#d8ffff',
            tip: '#4a7888', warn: '#e85848',
        } : {
            outline: '#2a1810',
            hilt0: '#3a2818', hilt1: '#5a4030', hilt2: '#7a5840', hiltWrap: '#9a7860',
            tsuba: '#6a6468', tsubaHi: '#9a9898',
            track: '#3a4048', trackHi: '#4a5058',
            kiLo: '#3a78a0', kiHi: '#8ad4f0', kiEdge: '#c8ecff',
            tip: '#5a6068', warn: '#c45848',
        };

        const hiltCols = 4;
        const tsubaCols = 2;
        const tipCols = 3;
        const bladeCols = Math.max(
            6,
            Math.floor((totalW - (hiltCols + tsubaCols + tipCols) * px) / px)
        );
        const totalPx = hiltCols + tsubaCols + bladeCols + tipCols;
        const drawW = totalPx * px;
        const dx = ox + Math.floor((totalW - drawW) / 2);

        if (deepBreath) {
            const pulse = 0.45 + Math.sin(Date.now() * 0.005) * 0.2;
            ctx.save();
            ctx.globalAlpha = pulse;
            for (let c = 0; c < totalPx; c++) {
                this._uiPx(ctx, dx - px, barY - px, c, 0, '#68e8ff', px);
                this._uiPx(ctx, dx - px, barY + rows, c, 0, '#68e8ff', px);
            }
            ctx.restore();
        }

        const hiltRows = [
            [pal.outline, pal.hilt0, pal.hilt0, pal.outline],
            [pal.hilt1, pal.hilt2, pal.hiltWrap, pal.hilt1],
            [pal.hilt1, pal.hiltWrap, pal.hiltWrap, pal.hilt1],
            [pal.hilt1, pal.hilt2, pal.hiltWrap, pal.hilt1],
            [pal.outline, pal.hilt0, pal.hilt0, pal.outline],
        ];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < hiltCols; c++) {
                this._uiPx(ctx, dx, barY, c, r, hiltRows[r][c], px);
            }
        }

        const tsubaCol = hiltCols;
        const tsubaRows = [
            [pal.outline, pal.outline],
            [pal.tsubaHi, pal.tsuba],
            [pal.tsuba, pal.tsuba],
            [pal.tsuba, pal.tsuba],
            [pal.outline, pal.outline],
        ];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < tsubaCols; c++) {
                this._uiPx(ctx, dx, barY, tsubaCol + c, r, tsubaRows[r][c], px);
            }
        }

        const bladeStart = hiltCols + tsubaCols;
        const fillCols = Math.floor(bladeCols * ratio);
        for (let c = 0; c < bladeCols; c++) {
            const filled = c < fillCols;
            const edge = c === 0 || c === bladeCols - 1;
            const topHi = c < fillCols && c % 2 === 0;
            for (let r = 0; r < rows; r++) {
                const isEdgeRow = r === 0 || r === rows - 1;
                let color;
                if (filled) {
                    if (isEdgeRow && !edge) color = pal.kiLo;
                    else if (r <= 1 && topHi) color = pal.kiEdge;
                    else if (r <= 2) color = pal.kiHi;
                    else color = pal.kiLo;
                } else {
                    if (isEdgeRow || edge) color = pal.outline;
                    else if (r === 1) color = pal.trackHi;
                    else color = pal.track;
                }
                this._uiPx(ctx, dx, barY, bladeStart + c, r, color, px);
            }
        }

        const tipStart = bladeStart + bladeCols;
        const tipPattern = [
            [null, null, pal.outline],
            [null, pal.tip, pal.tip],
            [pal.tip, pal.kiHi, pal.kiLo],
            [null, pal.tip, pal.tip],
            [null, null, pal.outline],
        ];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < tipCols; c++) {
                this._uiPx(ctx, dx, barY, tipStart + c, r, tipPattern[r][c], px);
            }
        }

        if (ratio < 0.25 && Math.floor(Date.now() / 280) % 2 === 0) {
            this._uiPx(ctx, dx, barY, tipStart + 1, 2, pal.warn, px);
            this._uiPx(ctx, dx, barY, tipStart + 2, 2, pal.warn, px);
        }
    }

    getKiBarLayout(vp, s) {
        const { ki } = this.getBottomHudLayout(vp, s);
        return { x: Math.floor(ki.x), y: Math.floor(ki.y), w: ki.w, h: ki.h, pad: 14 * s };
    }

    drawKiBar(ctx, player, vp, s) {
        const { x, y, w, h } = this.getKiBarLayout(vp, s);
        const ratio = clamp(player.ki / player.kiMax, 0, 1);
        this._drawKatanaKiBar(ctx, x, y, w, h, ratio, s, player.bossRewardDeepBreath);
    }

    drawBossBar(ctx, boss, vp, s) {
        if (!boss || (!boss.alive && !boss.dying)) return;

        const pauseBtn = this.getPauseButtonRect(vp, s);
        const gap = Math.round(6 * s);
        const barH = Math.round(8 * s);
        const pad = Math.round(12 * s);
        const x = vp.x + pad;
        const y = pauseBtn.y + pauseBtn.h + gap;
        const barW = vp.w - pad * 2;
        const ratio = clamp(boss.hp / boss.maxHp, 0, 1);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(x - 1, y - 1, barW + 2, barH + 2);
        ctx.fillStyle = '#2a1810';
        ctx.fillRect(x, y, barW, barH);
        ctx.fillStyle = ratio > 0.35 ? '#e84818' : '#c02010';
        ctx.fillRect(x, y, barW * ratio, barH);
        ctx.strokeStyle = '#ffaa66';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, barW, barH);

        const nameSize = Math.round(11 * s);
        drawGameText(ctx, boss.cfg.name, vp.cx, y - 2 * s, nameSize, '#ffe8c0', 'center', 'bottom');
    }

    _drawPixelXpBar(ctx, x, y, totalW, h, ratio) {
        const px = Math.max(2, Math.floor(h / 4));
        const rows = 4;
        const barH = rows * px;
        const barY = Math.floor(y + (h - barH) / 2);
        const ox = Math.floor(x);

        const cols = Math.max(12, Math.floor(totalW / px));
        const drawW = cols * px;
        const dx = ox + Math.floor((totalW - drawW) / 2);

        const pal = {
            outline: '#2a2218',
            track: '#3a4048',
            trackHi: '#4a525c',
            trackLo: '#2e343c',
            fillLo: '#2850a0',
            fillHi: '#4890d8',
            fillEdge: '#68b8f0',
        };

        const innerCols = Math.max(1, cols - 2);
        const fillInner = Math.floor(innerCols * ratio);
        const nearLevel = ratio >= 0.92;
        const pulse = nearLevel && Math.floor(Date.now() / 200) % 2 === 0;

        for (let c = 0; c < cols; c++) {
            for (let r = 0; r < rows; r++) {
                const edgeRow = r === 0 || r === rows - 1;
                const edgeCol = c === 0 || c === cols - 1;
                const filled = c > 0 && c <= fillInner;
                let color;

                if (edgeRow || edgeCol) {
                    color = pal.outline;
                } else if (filled) {
                    if (pulse && c === fillInner) color = pal.fillEdge;
                    else if (r === 1) color = pal.fillEdge;
                    else if (r === 2) color = pal.fillHi;
                    else color = pal.fillLo;
                } else {
                    color = (r + c) % 2 === 0 ? pal.track : pal.trackHi;
                }
                this._uiPx(ctx, dx, barY, c, r, color, px);
            }
        }
    }

    drawXpBar(ctx, player, vp, s) {
        const { xp } = this.getBottomHudLayout(vp, s);
        const { x, y, w: barW, h: barH } = xp;
        const ratio = clamp(player.xp / player.xpToNext, 0, 1);
        const fontSize = Math.round(10 * s);
        const textY = y + barH / 2;

        this._drawPixelXpBar(ctx, x, y, barW, barH, ratio);

        drawGameText(ctx, `Lv.${player.level}`, x + 8 * s, textY,
            fontSize, '#eef2f8', 'left', 'middle');
        drawGameText(ctx, `${player.xp}/${player.xpToNext}`, x + barW - 8 * s, textY,
            fontSize, '#d0dcf0', 'right', 'middle');
    }

    getPauseButtonRect(vp, s) {
        const size = Math.round(28 * s);
        const x = Math.round(vp.x + vp.w - size - 10 * s);
        const y = Math.round(vp.y + 10 * s);
        return { x, y, w: size, h: size };
    }

    isPauseButtonHit(x, y, vp, s) {
        const r = this.getPauseButtonRect(vp, s);
        return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
    }

    drawPauseButton(ctx, vp, s, active) {
        const r = this.getPauseButtonRect(vp, s);
        ctx.save();
        ctx.globalAlpha = active ? 0.95 : 0.8;
        ctx.fillStyle = 'rgba(28, 24, 20, 0.72)';
        ctx.strokeStyle = 'rgba(210, 190, 160, 0.9)';
        ctx.lineWidth = 2;
        if (typeof ctx.roundRect === 'function') {
            ctx.beginPath();
            ctx.roundRect(r.x, r.y, r.w, r.h, Math.round(6 * s));
            ctx.fill();
            ctx.stroke();
        } else {
            ctx.fillRect(r.x, r.y, r.w, r.h);
            ctx.strokeRect(r.x, r.y, r.w, r.h);
        }
        const barW = Math.max(3, Math.round(4 * s));
        const barH = Math.max(12, Math.round(13 * s));
        const gap = Math.max(4, Math.round(5 * s));
        const cx = r.x + r.w / 2;
        const cy = r.y + r.h / 2;
        ctx.fillStyle = '#f2e7d2';
        ctx.fillRect(Math.round(cx - gap / 2 - barW), Math.round(cy - barH / 2), barW, barH);
        ctx.fillRect(Math.round(cx + gap / 2), Math.round(cy - barH / 2), barW, barH);
        ctx.restore();
    }

    _drawPauseButton(ctx, rect, text, s, color) {
        ctx.fillStyle = color || 'rgba(54, 46, 36, 0.9)';
        ctx.strokeStyle = 'rgba(170, 145, 110, 0.95)';
        ctx.lineWidth = 2;
        if (typeof ctx.roundRect === 'function') {
            ctx.beginPath();
            ctx.roundRect(rect.x, rect.y, rect.w, rect.h, Math.round(8 * s));
            ctx.fill();
            ctx.stroke();
        } else {
            ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
            ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
        }
        drawGameText(ctx, text, rect.x + rect.w / 2, rect.y + rect.h / 2,
            Math.round(14 * s), '#f2e7d2', 'center', 'middle');
    }

    _layoutDebugControls(px, panelW, rowY, s, withApply) {
        const smallW = Math.round(30 * s);
        const applyW = Math.round(56 * s);
        const btnH = Math.round(30 * s);
        const gap = Math.round(6 * s);
        const right = px + panelW - 16 * s;
        const plus = {
            x: right - smallW,
            y: rowY - btnH / 2,
            w: smallW,
            h: btnH,
        };
        const minus = {
            x: plus.x - gap - smallW,
            y: rowY - btnH / 2,
            w: smallW,
            h: btnH,
        };
        let apply = null;
        if (withApply) {
            apply = {
                x: minus.x - gap - applyW,
                y: rowY - btnH / 2,
                w: applyW,
                h: btnH,
            };
        }
        return { minus, plus, apply, labelX: px + 16 * s };
    }

    _drawAdjustRow(ctx, label, value, labelX, rectMinus, rectPlus, rectApply, rowY, s) {
        drawGameText(ctx, `${label}: ${value}`, labelX, rowY,
            Math.round(13 * s), '#d7c7ae', 'left', 'middle');
        this._drawPauseButton(ctx, rectMinus, '-', s, 'rgba(48, 40, 32, 0.9)');
        this._drawPauseButton(ctx, rectPlus, '+', s, 'rgba(48, 40, 32, 0.9)');
        if (rectApply) {
            this._drawPauseButton(ctx, rectApply, '应用', s, 'rgba(68, 48, 32, 0.95)');
        }
    }

    drawPauseOverlay(ctx, vp, s, data) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.fillRect(vp.x, vp.y, vp.w, vp.h);
        const panelW = Math.min(vp.w - 26 * s, 330 * s);
        const panelH = Math.min(vp.h - 40 * s, 420 * s);
        const px = vp.x + (vp.w - panelW) / 2;
        const py = vp.y + (vp.h - panelH) / 2;

        ctx.fillStyle = 'rgba(36, 30, 24, 0.96)';
        ctx.strokeStyle = 'rgba(166, 138, 104, 0.95)';
        ctx.lineWidth = 2;
        if (typeof ctx.roundRect === 'function') {
            ctx.beginPath();
            ctx.roundRect(px, py, panelW, panelH, Math.round(10 * s));
            ctx.fill();
            ctx.stroke();
        } else {
            ctx.fillRect(px, py, panelW, panelH);
            ctx.strokeRect(px, py, panelW, panelH);
        }

        drawGameText(ctx, '已暂停', vp.cx, py + 26 * s, Math.round(20 * s), '#f2e7d2');

        const btnW = panelW * 0.72;
        const btnH = 36 * s;
        const btnX = px + (panelW - btnW) / 2;
        const resumeRect = { x: btnX, y: py + 52 * s, w: btnW, h: btnH };
        const passRect = { x: btnX, y: py + 96 * s, w: btnW, h: btnH };
        this.pauseRects.resume = resumeRect;
        this.pauseRects.password = passRect;
        this._drawPauseButton(ctx, resumeRect, '继续', s, 'rgba(56, 74, 52, 0.92)');
        this._drawPauseButton(ctx, passRect, '密码输入', s, 'rgba(76, 56, 38, 0.92)');

        let y = py + 146 * s;
        if (data.passwordMode && !data.debugUnlocked) {
            drawGameText(ctx, `密码: ${data.passwordInput}`, vp.cx, y, Math.round(14 * s), '#e6d8c2');
            y += 10 * s;
            const keyW = Math.round(44 * s);
            const keyH = Math.round(32 * s);
            const keyGap = Math.round(8 * s);
            const startX = vp.cx - (keyW * 3 + keyGap * 2) / 2;
            const rows = [['1', '2', '3'], ['4', 'C', 'OK']];
            this.pauseRects.keys = [];
            for (let r = 0; r < rows.length; r++) {
                for (let c = 0; c < rows[r].length; c++) {
                    const rect = {
                        x: startX + c * (keyW + keyGap),
                        y: y + r * (keyH + keyGap),
                        w: keyW,
                        h: keyH,
                        key: rows[r][c],
                    };
                    this.pauseRects.keys.push(rect);
                    this._drawPauseButton(ctx, rect, rect.key, s, 'rgba(48, 40, 32, 0.92)');
                }
            }
        } else {
            this.pauseRects.keys = [];
        }

        if (data.debugUnlocked) {
            drawGameText(ctx, '调试模式', vp.cx, py + 148 * s, Math.round(16 * s), '#ffd18a');
            const rowY1 = py + 182 * s;
            const rowY2 = py + 228 * s;
            const rowY3 = py + 274 * s;

            const row1 = this._layoutDebugControls(px, panelW, rowY1, s, true);
            this.pauseRects.levelMinus = row1.minus;
            this.pauseRects.levelPlus = row1.plus;
            this.pauseRects.levelApply = row1.apply;
            this._drawAdjustRow(ctx, '主角等级', data.debugLevelInput, row1.labelX,
                row1.minus, row1.plus, row1.apply, rowY1, s);

            const row2 = this._layoutDebugControls(px, panelW, rowY2, s, false);
            this.pauseRects.chapterMinus = row2.minus;
            this.pauseRects.chapterPlus = row2.plus;
            this._drawAdjustRow(ctx, '当前章节', data.debugChapterInput, row2.labelX,
                row2.minus, row2.plus, null, rowY2, s);

            const row3 = this._layoutDebugControls(px, panelW, rowY3, s, true);
            this.pauseRects.stageMinus = row3.minus;
            this.pauseRects.stagePlus = row3.plus;
            this.pauseRects.stageApply = row3.apply;
            this._drawAdjustRow(ctx, '当前关卡', data.debugStageInput, row3.labelX,
                row3.minus, row3.plus, row3.apply, rowY3, s);
        }
    }
}
