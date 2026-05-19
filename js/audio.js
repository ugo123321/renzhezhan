class AudioHooks {
    constructor() {
        this.enabled = false;
        this.volume = 0.7;
    }

    setEnabled(enabled) {
        this.enabled = Boolean(enabled);
    }

    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
    }

    playSlash() {
        if (!this.enabled) return;
    }

    playHit(isCrit = false) {
        if (!this.enabled) return;
        void isCrit;
    }

    playMonsterDeath() {
        if (!this.enabled) return;
    }

    playLevelUp() {
        if (!this.enabled) return;
    }

    playPlayerHurt() {
        if (!this.enabled) return;
    }
}
