class ExperienceManager {
    constructor(game) {
        this.game = game;
        this.level = 1;
        this.exp = 0;
        this.expToNext = this._calcExpToNext(1);
        this.pendingLevelUps = 0;
    }

    reset() {
        this.level = 1;
        this.exp = 0;
        this.expToNext = this._calcExpToNext(1);
        this.pendingLevelUps = 0;
    }

    _calcExpToNext(level) {
        const cfg = CONFIG.EXP;
        return Math.round(cfg.BASE_TO_LEVEL * Math.pow(cfg.GROWTH, level - 1));
    }

    getKillReward(monster) {
        const rewards = CONFIG.EXP.KILL_REWARD;
        let base = rewards[monster.kind] || rewards.NORMAL || 8;
        if (monster.kind === MonsterKind.SPLITTER && monster.splitTier > 0) {
            base = Math.max(1, Math.round(base * Math.pow(0.55, monster.splitTier)));
        }
        return base;
    }

    addExp(amount) {
        if (amount <= 0) return;
        const game = this.game;
        if (game.state !== 'PLAYING' && game.state !== 'LEVEL_UP') return;

        this.exp += amount;
        while (this.exp >= this.expToNext) {
            this.exp -= this.expToNext;
            this.level++;
            this.expToNext = this._calcExpToNext(this.level);
            this.pendingLevelUps++;
        }
    }

    onMonsterKilled(monster) {
        this.addExp(this.getKillReward(monster));
    }

    tryTriggerPendingUpgrade() {
        if (this.pendingLevelUps <= 0) return;
        if (this.game.state !== 'PLAYING') return;
        if (this.game.isUpgradeBlocked()) return;

        this.pendingLevelUps--;
        const game = this.game;
        if (game.input) game.input.cancelActivePointer();
        game.state = 'LEVEL_UP';
        game.upgrades.generateChoices();
        game._lockOverlayInput();
        game.audio.playLevelUp();
    }
}
