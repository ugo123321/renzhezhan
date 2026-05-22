function getStagesPerChapter() {
    return CONFIG.DEBUG?.STAGES_PER_CHAPTER || 4;
}

function getMaxChapter() {
    const per = getStagesPerChapter();
    return Math.max(1, Math.ceil(CONFIG.STAGES.length / per));
}

function getChapterStageCount(chapter) {
    const per = getStagesPerChapter();
    const start = (chapter - 1) * per;
    return Math.min(per, CONFIG.STAGES.length - start);
}

function chapterStageFromIndex(index) {
    const per = getStagesPerChapter();
    const idx = clamp(index | 0, 0, CONFIG.STAGES.length - 1);
    return {
        chapter: Math.floor(idx / per) + 1,
        stage: (idx % per) + 1,
    };
}

function stageIndexFromChapterStage(chapter, stage) {
    const per = getStagesPerChapter();
    const ch = clamp(chapter | 0, 1, getMaxChapter());
    const maxSt = getChapterStageCount(ch);
    const st = clamp(stage | 0, 1, maxSt);
    const idx = (ch - 1) * per + (st - 1);
    return clamp(idx, 0, CONFIG.STAGES.length - 1);
}

class PauseMenu {
    constructor(game) {
        this.game = game;
        this.active = false;
        this.view = 'pause';
        this.passwordInput = '';
        this.passwordError = '';
        this.debugLevel = 1;
        this.debugStageNum = 1;
        this.debugUpgradeLevels = {};
        this.upgradeScroll = 0;
        this._scrollDrag = null;
        this._listClip = null;
        this._maxUpgradeScroll = 0;
        this._rects = [];
    }

    _getMaxUpgradeLv() {
        return CONFIG.DEBUG?.MAX_UPGRADE_LEVEL || 9;
    }

    _syncDebugUpgradeLevels() {
        this.debugUpgradeLevels = {};
        const p = this.game?.player;
        if (typeof UPGRADE_DEFS === 'undefined') return;
        for (const def of UPGRADE_DEFS) {
            this.debugUpgradeLevels[def.id] = p ? p.getUpgradeLevel(def.id) : 0;
        }
    }

    open() {
        this.active = true;
        this.view = 'pause';
        this.passwordInput = '';
        this.passwordError = '';
        const g = this.game;
        if (g.experience) this.debugLevel = g.experience.level;
        this.debugStageNum = (g.levelManager ? g.levelManager.level : 0) + 1;
        this._syncDebugUpgradeLevels();
        this.upgradeScroll = 0;
    }

    close() {
        this.active = false;
        this.view = 'pause';
        this.passwordInput = '';
        this.passwordError = '';
        this._scrollDrag = null;
        this._listClip = null;
        this._rects = [];
    }

    getPauseButtonRect(vp, s) {
        const size = Math.round(26 * s);
        const pad = Math.round(10 * s);
        const kiY = vp.y + 28 * s;
        const kiH = 40 * s;
        let hudBottom = kiY + kiH;
        const boss = this.game?.spawner?.boss;
        if (boss && boss.phase === 'active') {
            hudBottom += 6 * s + 22 * s;
        }
        return {
            x: vp.x + vp.w - pad - size,
            y: hudBottom + 8 * s,
            w: size,
            h: size,
        };
    }

    hitPauseButton(x, y, vp, s) {
        if (!this.game || this.game.state !== 'PLAYING' || this.active) return false;
        const r = this.getPauseButtonRect(vp, s);
        return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
    }

    drawPauseButton(ctx, vp, s) {
        if (!this.game || this.game.state !== 'PLAYING' || this.active) return;
        const r = this.getPauseButtonRect(vp, s);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        drawPixelPanel(ctx, r.x, r.y, r.w, r.h, '#2a3040', '#c8b888', 2);
        const cx = r.x + r.w / 2;
        const cy = r.y + r.h / 2;
        const barW = Math.max(3, Math.floor(4 * s));
        const barH = Math.max(6, Math.floor(10 * s));
        const gap = Math.max(2, Math.floor(2 * s));
        ctx.fillStyle = '#e8e0c8';
        ctx.fillRect(cx - barW / 2, cy - barH / 2 - gap / 2, barW, barH);
        ctx.fillRect(cx - barW / 2, cy + gap / 2, barW, barH);
        ctx.restore();
    }

    _pushRect(id, x, y, w, h) {
        this._rects.push({ id, x, y, w, h });
    }

    _hitRect(x, y, id) {
        for (const r of this._rects) {
            if (r.id !== id) continue;
            if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return true;
        }
        return false;
    }

    _hitRectId(x, y) {
        for (const r of this._rects) {
            if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return r.id;
        }
        return null;
    }

    _pointInListClip(x, y) {
        const c = this._listClip;
        if (!c) return false;
        return x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h;
    }

    onPointerDown(x, y) {
        if (this.view !== 'debug_upgrades') return;
        if (this._hitRectId(x, y)) return;
        if (this._pointInListClip(x, y)) {
            this._scrollDrag = { startY: y, startScroll: this.upgradeScroll };
        }
    }

    onPointerMove(x, y) {
        if (!this._scrollDrag) return;
        const dy = this._scrollDrag.startY - y;
        this.upgradeScroll = clamp(this._scrollDrag.startScroll + dy, 0, this._maxUpgradeScroll);
    }

    onPointerUp() {
        this._scrollDrag = null;
    }

    onWheel(deltaY) {
        if (this.view !== 'debug_upgrades') return;
        this.upgradeScroll = clamp(this.upgradeScroll + deltaY * 0.35, 0, this._maxUpgradeScroll);
    }

    _drawOverlay(ctx, vp) {
        ctx.save();
        ctx.fillStyle = 'rgba(8, 12, 20, 0.72)';
        ctx.fillRect(vp.x, vp.y, vp.w, vp.h);
        ctx.restore();
    }

    _drawPanelButton(ctx, x, y, w, h, label, s, id, accent) {
        this._pushRect(id, x, y, w, h);
        drawPixelPanel(ctx, x, y, w, h, accent ? '#3a2830' : '#2a3040', accent ? '#e8a060' : '#a8a0c0', 2);
        drawPixelText(ctx, label, x + w / 2, y + h / 2, Math.round(13 * s), '#f0ece0');
    }

    _drawPauseView(ctx, vp, s) {
        const panelW = vp.w * 0.78;
        const panelH = 200 * s;
        const px = vp.x + (vp.w - panelW) / 2;
        const py = vp.y + vp.h * 0.32;
        drawPixelPanel(ctx, px, py, panelW, panelH, '#1e2430', '#c8b888', 3);
        drawPixelText(ctx, '暂停', vp.cx, py + 28 * s, Math.round(20 * s), '#ffe8c8');

        const btnW = panelW * 0.72;
        const btnH = 40 * s;
        const btnX = vp.cx - btnW / 2;
        const y1 = py + 58 * s;
        const y2 = y1 + btnH + 12 * s;
        this._drawPanelButton(ctx, btnX, y1, btnW, btnH, '继续', s, 'resume', false);
        this._drawPanelButton(ctx, btnX, y2, btnW, btnH, '调试密码', s, 'password', true);
    }

    _drawPasswordView(ctx, vp, s) {
        const panelW = vp.w * 0.86;
        const panelH = 320 * s;
        const px = vp.x + (vp.w - panelW) / 2;
        const py = vp.y + vp.h * 0.24;
        drawPixelPanel(ctx, px, py, panelW, panelH, '#1e2430', '#c8b888', 3);
        drawPixelText(ctx, '输入调试密码', vp.cx, py + 24 * s, Math.round(16 * s), '#ffe8c8');

        const fieldW = panelW * 0.8;
        const fieldH = 36 * s;
        const fieldX = vp.cx - fieldW / 2;
        const fieldY = py + 48 * s;
        drawPixelPanel(ctx, fieldX, fieldY, fieldW, fieldH, '#141820', '#8898b0', 2);
        const masked = '*'.repeat(this.passwordInput.length) || '····';
        drawPixelText(ctx, masked, vp.cx, fieldY + fieldH / 2, Math.round(14 * s), '#d8e8ff');

        if (this.passwordError) {
            drawPixelText(ctx, this.passwordError, vp.cx, fieldY + fieldH + 14 * s, Math.round(10 * s), '#ff6868');
        }

        const keySize = Math.floor(44 * s);
        const gap = Math.floor(6 * s);
        const gridW = keySize * 3 + gap * 2;
        const gridX = vp.cx - gridW / 2;
        const gridY = fieldY + fieldH + 28 * s;
        const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '清空', '0', '退格'];
        for (let i = 0; i < keys.length; i++) {
            const col = i % 3;
            const row = Math.floor(i / 3);
            const kx = gridX + col * (keySize + gap);
            const ky = gridY + row * (keySize + gap);
            const key = keys[i];
            this._pushRect(`key_${key}`, kx, ky, keySize, keySize);
            drawPixelPanel(ctx, kx, ky, keySize, keySize, '#2a3040', '#98a8c0', 2);
            const fs = key.length > 1 ? Math.round(9 * s) : Math.round(14 * s);
            drawPixelText(ctx, key, kx + keySize / 2, ky + keySize / 2, fs, '#e8f0ff');
        }

        const backW = panelW * 0.35;
        const backH = 34 * s;
        const backX = px + 16 * s;
        const backY = py + panelH - backH - 14 * s;
        this._drawPanelButton(ctx, backX, backY, backW, backH, '返回', s, 'back', false);

        const okW = panelW * 0.35;
        const okX = px + panelW - okW - 16 * s;
        this._drawPanelButton(ctx, okX, backY, okW, backH, '确认', s, 'confirm', true);
    }

    _drawStepper(ctx, cx, y, label, value, s, ids, minVal, maxVal) {
        const btn = Math.floor(32 * s);
        const gap = 8 * s;
        const valW = 52 * s;
        const totalW = btn * 2 + valW + gap * 2 + 80 * s;
        let x = cx - totalW / 2;

        drawPixelText(ctx, label, x, y + btn / 2, Math.round(11 * s), '#c8c0b0', 'left', 'middle');
        x += 80 * s;

        this._pushRect(ids.minus, x, y, btn, btn);
        drawPixelPanel(ctx, x, y, btn, btn, '#2a3040', '#a8a0c0', 2);
        drawPixelText(ctx, '-', x + btn / 2, y + btn / 2, Math.round(16 * s), '#fff');
        x += btn + gap;

        drawPixelText(ctx, String(value), x + valW / 2, y + btn / 2, Math.round(14 * s), '#ffe8c8');
        x += valW + gap;

        this._pushRect(ids.plus, x, y, btn, btn);
        drawPixelPanel(ctx, x, y, btn, btn, '#2a3040', '#a8a0c0', 2);
        drawPixelText(ctx, '+', x + btn / 2, y + btn / 2, Math.round(16 * s), '#fff');
    }

    _drawDebugView(ctx, vp, s) {
        const panelW = vp.w * 0.92;
        const panelH = 340 * s;
        const px = vp.x + (vp.w - panelW) / 2;
        const py = vp.y + vp.h * 0.16;
        drawPixelPanel(ctx, px, py, panelW, panelH, '#1a2030', '#e8a060', 3);
        drawPixelText(ctx, '调试设置', vp.cx, py + 22 * s, Math.round(18 * s), '#ffd8a0');

        const rowY1 = py + 50 * s;
        const rowY2 = py + 100 * s;
        this._drawStepper(ctx, vp.cx, rowY1, '主角等级', this.debugLevel, s,
            { minus: 'lv_minus', plus: 'lv_plus' }, 1, 30);
        const maxStage = CONFIG.STAGES.length;
        this._drawStepper(ctx, vp.cx, rowY2, '关卡', this.debugStageNum, s,
            { minus: 'st_minus', plus: 'st_plus' }, 1, maxStage);

        const stageCfg = CONFIG.STAGES[clamp(this.debugStageNum - 1, 0, maxStage - 1)];
        const bossTag = stageCfg && stageCfg.boss ? ` · ${CONFIG.BOSS?.CENTIPEDE?.name || 'Boss'}` : '';
        const hint = `跳转 → 第${this.debugStageNum}关${bossTag}`;
        drawPixelText(ctx, hint, vp.cx, py + 148 * s, Math.round(10 * s), '#98a8b8');

        const midW = panelW * 0.88;
        const midH = 40 * s;
        const midX = vp.cx - midW / 2;
        const midY = py + 168 * s;
        this._drawPanelButton(ctx, midX, midY, midW, midH, '升级奖励', s, 'debug_upgrades_open', true);

        const btnW = panelW * 0.42;
        const btnH = 38 * s;
        const yBtn = py + panelH - btnH - 14 * s;
        this._drawPanelButton(ctx, px + 14 * s, yBtn, btnW, btnH, '返回', s, 'debug_back', false);
        this._drawPanelButton(ctx, px + panelW - btnW - 14 * s, yBtn, btnW, btnH, '应用', s, 'debug_apply', true);
    }

    _drawUpgradeRow(ctx, x, y, w, h, def, level, s) {
        const tier = CONFIG.UPGRADE_RARITY[def.rarity] || CONFIG.UPGRADE_RARITY.white;
        const btn = Math.floor(28 * s);
        const gap = 6 * s;
        const valW = 36 * s;
        const nameX = x + 10 * s;
        const ctrlRight = x + w - 10 * s;

        ctx.save();
        drawPixelPanel(ctx, x, y, w, h, '#222c38', tier.color, 2);
        drawPixelText(ctx, def.icon, nameX + 8 * s, y + h / 2, Math.round(12 * s), '#fff', 'center', 'middle');
        drawPixelText(ctx, def.name, nameX + 22 * s, y + h / 2 - 6 * s, Math.round(10 * s), tier.color, 'left', 'middle');
        drawPixelText(ctx, tier.name, nameX + 22 * s, y + h / 2 + 8 * s, Math.round(8 * s), '#8898a8', 'left', 'middle');

        let bx = ctrlRight - btn * 2 - valW - gap * 2;
        const by = y + (h - btn) / 2;
        const minusId = `up:${def.id}:m`;
        const plusId = `up:${def.id}:p`;

        this._pushRect(minusId, bx, by, btn, btn);
        drawPixelPanel(ctx, bx, by, btn, btn, '#2a3040', '#a8a0c0', 2);
        drawPixelText(ctx, '-', bx + btn / 2, by + btn / 2, Math.round(14 * s), '#fff');
        bx += btn + gap;

        drawPixelText(ctx, String(level), bx + valW / 2, y + h / 2, Math.round(13 * s), '#ffe8c8');
        bx += valW + gap;

        this._pushRect(plusId, bx, by, btn, btn);
        drawPixelPanel(ctx, bx, by, btn, btn, '#2a3040', '#a8a0c0', 2);
        drawPixelText(ctx, '+', bx + btn / 2, by + btn / 2, Math.round(14 * s), '#fff');
        ctx.restore();
    }

    _drawDebugUpgradesView(ctx, vp, s) {
        const panelW = vp.w * 0.94;
        const panelH = vp.h * 0.88;
        const px = vp.x + (vp.w - panelW) / 2;
        const py = vp.y + (vp.h - panelH) / 2;
        drawPixelPanel(ctx, px, py, panelW, panelH, '#141c28', '#e8a060', 3);
        drawPixelText(ctx, '升级奖励', vp.cx, py + 20 * s, Math.round(17 * s), '#ffd8a0');
        drawPixelText(ctx, '上下滑动浏览 · 点击 +/- 调整等级', vp.cx, py + 40 * s, Math.round(9 * s), '#8898a8');

        const listX = px + 12 * s;
        const listY = py + 54 * s;
        const listW = panelW - 24 * s;
        const footerH = 52 * s;
        const listH = panelH - 54 * s - footerH;
        const rowH = 46 * s;
        const rowGap = 6 * s;
        const defs = typeof UPGRADE_DEFS !== 'undefined' ? UPGRADE_DEFS : [];
        const contentH = defs.length * (rowH + rowGap);

        this._listClip = { x: listX, y: listY, w: listW, h: listH };
        this._maxUpgradeScroll = Math.max(0, contentH - listH);
        this.upgradeScroll = clamp(this.upgradeScroll, 0, this._maxUpgradeScroll);

        ctx.save();
        ctx.beginPath();
        ctx.rect(listX, listY, listW, listH);
        ctx.clip();

        let ry = listY - this.upgradeScroll;
        for (const def of defs) {
            const lv = this.debugUpgradeLevels[def.id] || 0;
            if (ry + rowH >= listY && ry <= listY + listH) {
                this._drawUpgradeRow(ctx, listX, ry, listW, rowH, def, lv, s);
            }
            ry += rowH + rowGap;
        }
        ctx.restore();

        if (this._maxUpgradeScroll > 0) {
            const barX = listX + listW - 6 * s;
            const barY = listY + 4 * s;
            const barH = listH - 8 * s;
            const thumbH = Math.max(24 * s, barH * (listH / contentH));
            const thumbY = barY + (barH - thumbH) * (this.upgradeScroll / this._maxUpgradeScroll);
            ctx.fillStyle = '#2a3448';
            ctx.fillRect(barX, barY, 4 * s, barH);
            ctx.fillStyle = '#c8a060';
            ctx.fillRect(barX, thumbY, 4 * s, thumbH);
        }

        const btnW = panelW * 0.4;
        const btnH = 38 * s;
        const yBtn = py + panelH - btnH - 12 * s;
        this._drawPanelButton(ctx, px + 14 * s, yBtn, btnW, btnH, '返回', s, 'upgrades_back', false);
        this._drawPanelButton(ctx, px + panelW - btnW - 14 * s, yBtn, btnW, btnH, '应用', s, 'upgrades_apply', true);
    }

    draw(ctx, vp, s) {
        if (!this.active) return;
        this._rects = [];
        this._drawOverlay(ctx, vp);
        if (this.view === 'pause') this._drawPauseView(ctx, vp, s);
        else if (this.view === 'password') this._drawPasswordView(ctx, vp, s);
        else if (this.view === 'debug') this._drawDebugView(ctx, vp, s);
        else if (this.view === 'debug_upgrades') this._drawDebugUpgradesView(ctx, vp, s);
    }

    _onPasswordKey(key) {
        if (key === '清空') {
            this.passwordInput = '';
            this.passwordError = '';
            return;
        }
        if (key === '退格') {
            this.passwordInput = this.passwordInput.slice(0, -1);
            this.passwordError = '';
            return;
        }
        if (this.passwordInput.length >= 8) return;
        this.passwordInput += key;
        this.passwordError = '';
    }

    _confirmPassword() {
        const pwd = CONFIG.DEBUG?.PASSWORD || '1';
        if (this.passwordInput === pwd) {
            this.view = 'debug';
            this.passwordError = '';
            const g = this.game;
            if (g.experience) this.debugLevel = g.experience.level;
            this.debugStageNum = (g.levelManager ? g.levelManager.level : 0) + 1;
            this._syncDebugUpgradeLevels();
            this.upgradeScroll = 0;
            return;
        }
        this.passwordError = '密码错误';
    }

    applyDebugUpgrades() {
        const g = this.game;
        if (!g?.player) return;
        g.player.rebuildUpgradesFromStacks(this.debugUpgradeLevels, true);
    }

    applyDebugSettings() {
        const g = this.game;
        if (!g || !g.experience) return;

        this.applyDebugUpgrades();
        g.experience.setDebugLevel(this.debugLevel, g.player);

        const idx = clamp(this.debugStageNum - 1, 0, CONFIG.STAGES.length - 1);
        g.pendingStageClear = false;
        g._clearCombatResiduals();
        g.levelManager.level = idx;
        g.player.beginStage();
        const playBottom = g.ui.getPlayAreaBottom
            ? g.ui.getPlayAreaBottom(g.renderer.h, g.renderer.uiScale)
            : g.renderer.h;
        const safe = g._getSafeZone();
        g.spawner.spawnStage(idx, g.renderer.w, g.renderer.h, playBottom, safe, false);
        g.buffOrbs.spawnForStage(idx, safe, false);
        g.combat.roundAttackResolved = true;
    }

    handleClick(x, y, vp, s) {
        if (!this.active) return false;

        if (this.view === 'pause') {
            if (this._hitRect(x, y, 'resume')) {
                this.game.resumeFromPause();
                return true;
            }
            if (this._hitRect(x, y, 'password')) {
                this.view = 'password';
                this.passwordInput = '';
                this.passwordError = '';
                return true;
            }
            return true;
        }

        if (this.view === 'password') {
            for (let i = 0; i <= 9; i++) {
                if (this._hitRect(x, y, `key_${i}`)) {
                    this._onPasswordKey(String(i));
                    return true;
                }
            }
            if (this._hitRect(x, y, 'key_清空')) { this._onPasswordKey('清空'); return true; }
            if (this._hitRect(x, y, 'key_退格')) { this._onPasswordKey('退格'); return true; }
            if (this._hitRect(x, y, 'back')) {
                this.view = 'pause';
                return true;
            }
            if (this._hitRect(x, y, 'confirm')) {
                this._confirmPassword();
                return true;
            }
            return true;
        }

        if (this.view === 'debug') {
            if (this._hitRect(x, y, 'lv_minus')) {
                this.debugLevel = Math.max(1, this.debugLevel - 1);
                return true;
            }
            if (this._hitRect(x, y, 'lv_plus')) {
                this.debugLevel = Math.min(30, this.debugLevel + 1);
                return true;
            }
            if (this._hitRect(x, y, 'st_minus')) {
                this.debugStageNum = Math.max(1, this.debugStageNum - 1);
                return true;
            }
            if (this._hitRect(x, y, 'st_plus')) {
                this.debugStageNum = Math.min(CONFIG.STAGES.length, this.debugStageNum + 1);
                return true;
            }
            if (this._hitRect(x, y, 'debug_back')) {
                this.view = 'pause';
                return true;
            }
            if (this._hitRect(x, y, 'debug_upgrades_open')) {
                this._syncDebugUpgradeLevels();
                this.upgradeScroll = 0;
                this.view = 'debug_upgrades';
                return true;
            }
            if (this._hitRect(x, y, 'debug_apply')) {
                this.applyDebugSettings();
                this.game.resumeFromPause(true);
                return true;
            }
            return true;
        }

        if (this.view === 'debug_upgrades') {
            const hitId = this._hitRectId(x, y);
            if (hitId === 'upgrades_back') {
                this.view = 'debug';
                this._scrollDrag = null;
                return true;
            }
            if (hitId === 'upgrades_apply') {
                this.applyDebugUpgrades();
                this.view = 'debug';
                this._scrollDrag = null;
                return true;
            }
            if (hitId && hitId.startsWith('up:')) {
                const parts = hitId.split(':');
                const upgradeId = parts[1];
                const action = parts[2];
                const maxLv = this._getMaxUpgradeLv();
                const cur = this.debugUpgradeLevels[upgradeId] || 0;
                if (action === 'm') {
                    this.debugUpgradeLevels[upgradeId] = Math.max(0, cur - 1);
                } else if (action === 'p') {
                    this.debugUpgradeLevels[upgradeId] = Math.min(maxLv, cur + 1);
                }
                return true;
            }
            if (this._pointInListClip(x, y)) return true;
            return true;
        }

        return false;
    }
}
