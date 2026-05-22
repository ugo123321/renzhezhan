/* Ninja Slash bundle - supports file:// */
(function () {
'use strict';

// ---- utils.js ----
function dist(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
}

function randRange(min, max) {
    return min + Math.random() * (max - min);
}

function randInt(min, max) {
    return Math.floor(randRange(min, max + 1));
}

function normalize(x, y) {
    const len = Math.sqrt(x * x + y * y);
    if (len === 0) return { x: 0, y: 0 };
    return { x: x / len, y: y / len };
}

function angle(x1, y1, x2, y2) {
    return Math.atan2(y2 - y1, x2 - x1);
}

function easeInQuad(t) {
    return t * t;
}

function easeOutQuad(t) {
    return t * (2 - t);
}

function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function circlesCollide(x1, y1, r1, x2, y2, r2) {
    const d = dist(x1, y1, x2, y2);
    return d < r1 + r2;
}

function distPointToSegment(px, py, ax, ay, bx, by) {
    const vx = bx - ax;
    const vy = by - ay;
    const len2 = vx * vx + vy * vy;
    if (len2 < 1e-8) return dist(px, py, ax, ay);
    let t = ((px - ax) * vx + (py - ay) * vy) / len2;
    t = clamp(t, 0, 1);
    return dist(px, py, ax + vx * t, ay + vy * t);
}

function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function getStageStatScale(stageIndex) {
    const cfg = CONFIG.STAGE_STAT_SCALE || {};
    const idx = Math.max(0, stageIndex | 0);
    return {
        hp: Math.pow(cfg.HP_GROWTH || 1.1, idx),
        def: Math.pow(cfg.DEF_GROWTH || 1.08, idx),
    };
}


// ---- config.js ----
const CONFIG = {
    BULLET_TIME_SCALE: 0.14,
    BULLET_TIME_DIM_ALPHA: 0.42,
    STAGE_INTRO_SLIDE_IN: 0.38,
    STAGE_INTRO_LABEL_HOLD: 0.85,
    STAGE_INTRO_SLIDE_OUT: 0.38,
    MONSTER_SPAWN_ANIM: 0.42,
    STAGE_CLEAR_FLASH: 0.55,
    STAGE_FAIL_LABEL_DURATION: 0.85,
    STAGE_FAIL_OVERLAY_FADE: 0.45,
    STAGE_INTRO_SAKURA_EXTRA: 0.8,
    FAIL_DEATH: {
        WINDUP: 0.3,
        SPEAR_STAGGER: 0.065,
        SPEAR_SPEED: 640,
        IMPACT_PAUSE: 0.24,
        DEATH_DURATION: 0.9,
        PLAYBACK_SPEED: 2,
    },
    NORMAL_TIME_SCALE: 1.0,

    COMBAT_RESOLVE: {
        FIRST_HIT_DELAY: 0.04,
        HIT_INTERVAL: 0.012,
        AFTERIMAGE_LIFE: 0.1,
        DEATH_STAGGER: 0.012,
    },

    MONSTER_DEATH_FADE: 0.1,

    DISPLAY: {
        LOGICAL_WIDTH: 390,
        LOGICAL_HEIGHT: 700,
        UNIT_SCALE: 1.3,
        NINJA_SPRITE_SCALE: 3,
        GRID_SIZE: 28,
    },

    PLAYER: {
        BASE_ATTACK: 95,
        BASE_HP: 100,
        BASE_KI: 234,
        BASE_CRIT_RATE: 0.08,
        BASE_CRIT_DAMAGE: 1.6,
        ATTACK_SPEED: 2300,
        HITBOX_RADIUS: 12,
        TRIGGER_RADIUS_RATIO: 0.06,
        TRIGGER_RADIUS_MIN: 30,
        KI_PER_PIXEL: 0.18,
        SIZE_SCALE: 1.0,
        INVINCIBLE_TIME: 0.45,
        DAMAGE_FLASH_TIME: 0.42,
        HEAL_FLASH_TIME: 0.5,
        COMBO_DAMAGE_BONUS: 0.01,
        COMBO_DISPLAY_HOLD: 0.6,
        COMBO_END_FADE: 0.4,
        COMBO_TEXT_BASE: 30,
        COMBO_TEXT_GROW: 1.4,
        COMBO_TEXT_MAX_GROW: 22,
        COMBO_SHAKE_DURATION: 0.24,
        KI_REGEN_RATE: 135,
        AUTO_DART: {
            INTERVAL: 0.5,
            DAMAGE_MULT: 0.20,
            SPEED: 420,
            LIFE: 0.9,
        },
    },

    EXP: {
        BASE_TO_LEVEL: 100,
        GROWTH: 1.22,
        BAR_HEIGHT: 24,
        KILL_REWARD: {
            NORMAL: 2,
            ELITE: 4,
            SHIELD: 3,
            BERSERKER: 4,
            SPLITTER: 3,
            ARCHER: 3,
            FIRE_MAGE: 3,
        },
    },

    // 火柱半径 ≈ 黑洞基础半径(82) 的一半
    FIRE_PILLAR: {
        RADIUS: 60,
        WARNING_TIME: 1.1,
        ACTIVE_TIME: 0.5,
        FADE_TIME: 0.3,
        DAMAGE: 16,
    },

    ARROW: {
        RADIUS: 6,
        SPEED: 85,
    },

    STAGE_MONSTER_SCALE: 1.3,
    STAGE_COUNT_MUL: 2 / 3,
    SHIELD_COUNT_MUL: 1 / 3,

    // 关卡递增：第 1 关系数 1.0，每往后一关 HP/DEF 按幂次增长
    STAGE_STAT_SCALE: {
        HP_GROWTH: 1.3,
        DEF_GROWTH: 1.3,
    },

    SPAWN: {
        MIN_DIST_FROM_PLAYER: 100,
        MIN_MONSTER_SPACING: 20,
        CLUSTER_COUNT_MIN: 5,
        CLUSTER_COUNT_MAX: 9,
        CLUSTER_PICK_CHANCE: 0.74,
        SPARSE_PICK_CHANCE: 0.26,
    },

    STAGES: [
        { normal: 62, elite: 0, shield: 0, berserker: 0, splitter: 0, archer: 0, fireMage: 0 },
        { normal: 60, elite: 12, shield: 0, berserker: 0, splitter: 0, archer: 10, fireMage: 0 },
        { normal: 64, elite: 20, shield: 8, berserker: 0, splitter: 0, archer: 12, fireMage: 6 },
        { normal: 64, elite: 20, shield: 12, berserker: 8, splitter: 0, archer: 14, fireMage: 7 },
        { boss: 'centipede' },
        { normal: 68, elite: 24, shield: 16, berserker: 12, splitter: 0, archer: 18, fireMage: 9 },
        { normal: 72, elite: 28, shield: 20, berserker: 12, splitter: 0, archer: 20, fireMage: 10 },
        { normal: 76, elite: 28, shield: 24, berserker: 16, splitter: 0, archer: 22, fireMage: 11 },
    ],

    MONSTERS: {
        NORMAL: {
            name: '普通怪',
            hp: 80,
            def: 4,
            attack: 10,
            attackInterval: 1.15,
            size: 13,
            speed: 19,
            color: '#526078',
            grade: 'B',
            canMove: true,
        },
        ELITE: {
            name: '高级怪',
            hp: 110,
            def: 6,
            attack: 14,
            attackInterval: 1.05,
            size: 14,
            speed: 21,
            color: '#8a6aa8',
            grade: 'B+',
            canMove: true,
        },
        SHIELD: {
            name: '盾牌怪',
            hp: 120,
            def: 5,
            attack: 12,
            attackInterval: 1.25,
            size: 15,
            speed: 16,
            color: '#5f7a88',
            grade: 'B+',
            canMove: true,
        },
        BERSERKER: {
            name: '狂战士',
            hp: 90,
            def: 2,
            attack: 18,
            attackInterval: 0.85,
            size: 14,
            speed: 26,
            color: '#b85a4a',
            grade: 'C/B',
            canMove: true,
            kiDrainOnHit: 10,
        },
        SPLITTER: {
            name: '分裂怪',
            hp: 70,
            def: 2,
            attack: 8,
            attackInterval: 1.2,
            size: 18,
            speed: 14,
            color: '#7b9f5a',
            grade: 'A+/C/C',
            canMove: true,
            maxSplitTier: 3,
            splitCount: 2,
        },
        ARCHER: {
            name: '射箭怪',
            hp: 75,
            def: 3,
            attack: 12,
            attackInterval: 1.35,
            attackRange: 215,
            arrowSpeed: 85,
            size: 12,
            speed: 17,
            color: '#6a8a5a',
            grade: 'B',
            canMove: true,
            ranged: true,
        },
        FIRE_MAGE: {
            name: '火焰法师',
            hp: 70,
            def: 2,
            attack: 16,
            attackInterval: 2.4,
            attackRange: 250,
            size: 12,
            speed: 15,
            color: '#501818',
            grade: 'B',
            canMove: true,
            ranged: true,
        },
    },

    BUFF_ORB: {
        BASE_TYPES: ['attack', 'ki', 'combo'],
        RADIUS: 13,
        MAX_PER_TYPE: 4,
        SPAWN_CHANCE: {
            attack: 0.55,
            ki: 0.45,
            combo: 0.42,
            ice: 0.28,
        },
        EXTRA_SPAWN_CHANCE: 0.48,
        MIN_KI_PER_STAGE: 2,
    },

    UPGRADE_RARITY: {
        white: { chance: 0.30, color: '#d8d8d8', name: '普通' },
        blue: { chance: 0.30, color: '#58a8ff', name: '稀有' },
        purple: { chance: 0.30, color: '#b070ff', name: '史诗' },
        orange: { chance: 0.10, color: '#ff9830', name: '传奇' },
    },

    SHAKE: {
        NORMAL: { magnitude: 3, duration: 0.1 },
        CRIT: { magnitude: 8, duration: 0.22 },
        COMBO_MAG_PER_HIT: 0.1,
        COMBO_MAG_CAP: 1.5,
    },

    DEBUG: {
        PASSWORD: '1',
        STAGES_PER_CHAPTER: 4,
        MAX_UPGRADE_LEVEL: 9,
    },

    BOSS: {
        CENTIPEDE: {
            name: '千足虫',
            warningTime: 3,
            segmentSpacing: 28,
            lengthScale: 1.3,
            segmentHp: 320,
            hpScale: 3.5,
            segmentDef: 3,
            segmentRadius: 23,
            crawlSpeed: 240,
            crawlGap: 0.55,
            bulletInterval: 0.38,
            bulletsPerShot: 20,
            bulletDamage: 24,
            bulletSpeed: 130,
            bulletLife: 8,
            bulletRadius: 7,
            defeatExp: 140,
            segmentKillExp: 4,
        },
    },
};


// ---- spriteData.js ----
const _ = null;

const SPRITES = {
    ninja: {
        idle: [
            [
                [_, _, _, '#124', '#124', _, _, '#543', '#ccc'],
                [_, _, '#124', '#012', '#012', '#124', _, '#aaa', '#ddd'],
                [_, _, '#124', '#fff', '#fff', '#124', '#543', '#ccc', '#eee'],
                [_, _, _, '#124', '#124', _, _, '#ccc', '#ddd'],
                [_, _, '#369', '#48a', '#48a', '#369', _, '#aaa', '#ccc'],
                [_, '#369', '#48a', '#48a', '#48a', '#48a', '#369', '#ccc', '#ddd'],
                [_, _, '#48a', '#48a', '#48a', '#48a', _, '#eee', _],
                [_, _, '#48a', _, _, '#48a', _, '#ddd', _],
                [_, _, '#124', _, _, '#124', _, _, _],
                [_, _, '#369', _, _, '#369', _, _, _],
            ],
            [
                [_, _, _, '#124', '#124', _, _, '#543', '#ccc'],
                [_, _, '#124', '#012', '#012', '#124', _, '#ccc', '#eee'],
                [_, _, '#124', '#fff', '#fff', '#124', '#543', '#ddd', '#fff'],
                [_, _, _, '#124', '#124', _, _, '#bbb', '#ddd'],
                [_, _, '#369', '#48a', '#48a', '#369', _, '#aaa', '#ccc'],
                [_, '#369', '#48a', '#48a', '#48a', '#48a', '#369', '#ccc', '#eee'],
                [_, _, '#48a', '#48a', '#48a', '#48a', _, _, _],
                [_, _, '#369', _, _, '#369', _, '#ccc', _],
                [_, _, '#124', _, _, '#124', _, _, _],
                [_, _, '#369', _, _, '#124', _, _, _],
            ],
        ],
        attack: [
            [
                [_, _, '#124', '#124', _, _, _, _, '#543', '#aaa'],
                [_, _, '#124', '#012', '#012', '#124', _, '#543', '#ccc'],
                [_, _, '#124', '#fff', '#fff', '#124', '#543', '#ccc', '#eee'],
                [_, _, _, '#124', '#124', _, '#543', '#ddd', '#fff'],
                [_, _, '#48a', '#48a', '#48a', '#48a', '#ccc', '#eee', '#fff'],
                [_, _, '#48a', '#48a', '#48a', '#48a', '#ddd', '#fff', _],
                [_, _, '#48a', '#48a', '#48a', '#48a', _, _, _],
                [_, _, '#48a', _, _, '#48a', _, _, _],
                [_, _, '#124', _, _, '#124', _, _, _],
            ],
            [
                [_, _, _, '#124', '#124', _, _, _, _, '#543', '#ccc', '#ddd', '#eee'],
                [_, _, '#124', '#012', '#012', '#124', _, _, '#aaa', '#ccc', '#ddd', '#fff'],
                [_, _, '#124', '#fff', '#fff', '#124', _, '#543', '#ccc', '#ddd', '#eee'],
                [_, _, _, '#124', '#124', _, _, '#543', '#ccc', '#ddd', '#fff'],
                [_, _, '#48a', '#48a', '#48a', '#48a', '#ccc', '#eee', '#fff', '#fff', _],
                [_, _, '#48a', '#48a', '#48a', '#48a', '#ddd', '#fff', '#cef', _],
                [_, _, '#48a', '#48a', '#48a', '#48a', _, _, _, _],
                [_, _, '#48a', _, _, '#48a', _, _, _],
                [_, _, '#369', _, _, '#369', _, _, _],
            ],
            [
                [_, _, _, '#124', '#124', _, _, _, '#eee', '#fff', '#cef', '#adf'],
                [_, _, '#124', '#012', '#012', '#124', _, _, '#ddd', '#fff', '#cef', _],
                [_, _, '#124', '#fff', '#fff', '#124', _, '#543', '#ccc', '#eee', _],
                [_, _, _, '#124', '#124', _, _, '#ccc', '#ddd', '#fff', _],
                [_, _, '#48a', '#48a', '#48a', '#48a', '#aaa', '#cef', '#fff', _],
                [_, _, '#48a', '#48a', '#48a', '#48a', _, _, _],
                [_, _, '#48a', _, _, '#48a', _, _, _],
                [_, _, '#124', _, _, '#124', _, _, _],
            ],
        ],
        run: [
            [
                [_, _, _, '#124', '#124', _, _, '#543', '#ccc'],
                [_, _, '#124', '#012', '#012', '#124', _, '#ccc', '#eee'],
                [_, _, '#124', '#fff', '#fff', '#124', '#543', '#ddd', '#fff'],
                [_, _, _, '#124', '#124', _, _, '#bbb', '#ddd'],
                [_, _, '#369', '#48a', '#48a', '#369', _, '#aaa', '#ccc'],
                [_, '#369', '#48a', '#48a', '#48a', '#48a', '#369', '#ccc', '#eee'],
                [_, _, '#48a', '#48a', _, '#48a', '#48a', _, _],
                [_, _, '#124', '#48a', '#48a', '#124', _, _, _],
                [_, _, '#369', _, _, '#369', _, _, _],
            ],
            [
                [_, _, _, '#124', '#124', _, _, '#543', '#ccc'],
                [_, _, '#124', '#012', '#012', '#124', _, '#aaa', '#ddd'],
                [_, _, '#124', '#fff', '#fff', '#124', '#543', '#ccc', '#eee'],
                [_, _, _, '#124', '#124', _, _, '#ccc', '#ddd'],
                [_, _, '#369', '#48a', '#48a', '#369', _, '#aaa', '#ccc'],
                [_, '#369', '#48a', '#48a', '#48a', '#48a', '#369', '#ddd', '#fff'],
                [_, _, '#48a', _, '#48a', '#48a', '#48a', _, _],
                [_, _, '#369', _, _, '#369', _, _, _],
                [_, _, '#124', _, _, '#124', _, _, _],
            ],
        ],
    },

    normalMelee: {
        idle: [
            [
                [_, _, '#567', '#567', '#567', '#666', _],
                [_, '#567', '#334', '#334', '#334', '#567', _],
                [_, '#567', '#c33', _, '#c33', '#567', _],
                [_, _, '#334', '#334', '#334', '#321', _],
                [_, '#555', '#444', '#444', '#444', '#555', _],
                [_, _, '#444', '#444', '#444', _, _],
                [_, _, '#444', _, '#444', _, _],
                [_, _, '#333', _, '#333', _, _],
            ],
            [
                [_, _, '#567', '#567', '#567', _, _],
                [_, '#567', '#334', '#334', '#334', '#567', _],
                [_, '#567', '#c33', _, '#c33', '#567', _],
                [_, _, '#334', '#334', '#334', _, _],
                [_, '#555', '#444', '#444', '#444', '#555', _],
                [_, _, '#444', '#444', '#444', _, _],
                [_, _, '#333', _, '#333', _, _],
                [_, _, '#444', _, '#444', '#666', _],
            ],
        ],
        attack: [
            [
                [_, _, '#567', '#567', '#567', '#777', '#888'],
                [_, '#567', '#334', '#334', '#334', '#567', _],
                [_, '#567', '#c33', _, '#c33', '#567', _],
                [_, _, '#334', '#334', '#334', '#666', _],
                [_, '#555', '#444', '#444', '#444', '#555', _],
                [_, _, '#444', '#444', '#444', _, _],
                [_, _, '#444', _, '#444', _, _],
                [_, _, '#333', _, '#333', _, _],
            ],
        ],
    },

    normalRanged: {
        idle: [
            [
                [_, '#96b', '#96b', '#96b', '#654', _],
                ['#96b', '#537', '#537', '#537', '#96b', _],
                ['#96b', '#f0f', _, '#f0f', '#96b', _],
                [_, '#537', '#537', '#537', _, _],
                [_, '#549', '#549', '#549', '#888', _],
                ['#c8f', '#549', '#549', '#549', '#c8f', _],
                [_, '#549', _, '#549', _, _],
                [_, '#437', _, '#437', _, _],
            ],
            [
                [_, '#96b', '#96b', '#96b', _, _],
                ['#96b', '#537', '#537', '#537', '#96b', _],
                ['#96b', '#f0f', _, '#f0f', '#96b', _],
                [_, '#537', '#537', '#537', _, _],
                [_, '#549', '#549', '#549', _, _],
                ['#c8f', '#549', '#549', '#549', '#c8f', _],
                [_, '#437', _, '#437', _, _],
                [_, '#549', _, '#549', _, _],
            ],
        ],
        attack: [
            [
                [_, '#96b', '#96b', '#96b', '#aaa', '#ccc'],
                ['#96b', '#537', '#537', '#537', '#96b', _],
                ['#96b', '#f0f', _, '#f0f', '#96b', _],
                [_, '#537', '#537', '#537', '#888', _],
                [_, '#549', '#549', '#549', _, _],
                ['#c8f', '#549', '#549', '#549', '#c8f', _],
                [_, '#549', _, '#549', _, _],
                [_, '#437', _, '#437', _, _],
            ],
        ],
    },

    strongMelee: {
        idle: [
            [
                [_, '#a22', '#a22', '#a22', '#a22', '#ccc', _, _],
                ['#a22', '#622', '#622', '#622', '#622', '#a22', _, _],
                ['#a22', '#ff0', _, _, '#ff0', '#a22', _, _],
                [_, '#622', '#622', '#622', '#622', '#888', _, _],
                ['#a33', '#733', '#733', '#733', '#733', '#a33', _, _],
                ['#a33', '#733', '#733', '#733', '#733', '#a33', _, _],
                [_, '#733', '#733', '#733', '#733', _, _, _],
                [_, '#733', _, _, '#733', _, _, _],
                [_, '#622', _, _, '#622', '#888', _, _],
            ],
            [
                [_, '#a22', '#a22', '#a22', '#a22', _, _, _],
                ['#a22', '#622', '#622', '#622', '#622', '#a22', _, _],
                ['#a22', '#ff0', _, _, '#ff0', '#a22', _, _],
                [_, '#622', '#622', '#622', '#622', _, _, _],
                ['#a33', '#733', '#733', '#733', '#733', '#a33', _, _],
                ['#a33', '#733', '#733', '#733', '#733', '#a33', _, _],
                [_, '#733', '#733', '#733', '#733', _, _, _],
                [_, '#622', _, _, '#622', _, _, _],
                [_, '#733', _, _, '#733', _, _, _],
            ],
        ],
        attack: [
            [
                [_, '#a22', '#a22', '#a22', '#a22', '#ccc', '#ddd', _],
                ['#a22', '#622', '#622', '#622', '#622', '#a22', _, _],
                ['#a22', '#ff0', _, _, '#ff0', '#a22', _, _],
                [_, '#622', '#622', '#622', '#622', '#aaa', _, _],
                ['#a33', '#733', '#733', '#733', '#733', '#a33', _, _],
                ['#a33', '#733', '#733', '#733', '#733', '#a33', _, _],
                [_, '#733', '#733', '#733', '#733', _, _, _],
                [_, '#733', _, _, '#733', _, _, _],
                [_, '#622', _, _, '#622', _, _, _],
            ],
        ],
    },

    strongRanged: {
        idle: [
            [
                [_, _, '#82d', '#82d', '#82d', _, _, _],
                [_, '#82d', '#41a', '#41a', '#41a', '#82d', _, _],
                [_, '#82d', '#0ff', _, '#0ff', '#82d', _, _],
                [_, _, '#41a', '#41a', '#41a', _, _, _],
                [_, '#639', '#639', '#639', '#639', '#639', _, _],
                ['#a4f', '#639', '#639', '#639', '#639', '#639', '#a4f', _],
                [_, '#639', '#639', '#639', '#639', '#639', _, _],
                [_, _, '#639', _, '#639', _, _, _],
                [_, _, '#41a', _, '#41a', '#888', _, _],
            ],
            [
                [_, _, '#82d', '#82d', '#82d', _, _, _],
                [_, '#82d', '#41a', '#41a', '#41a', '#82d', _, _],
                [_, '#82d', '#0ff', _, '#0ff', '#82d', _, _],
                [_, _, '#41a', '#41a', '#41a', _, _, _],
                [_, '#639', '#639', '#639', '#639', '#639', _, _],
                ['#a4f', '#639', '#639', '#639', '#639', '#639', '#a4f', _],
                [_, '#639', '#639', '#639', '#639', '#639', _, _],
                [_, _, '#41a', _, '#41a', _, _, _],
                [_, _, '#639', _, '#639', _, _, _],
            ],
        ],
        attack: [
            [
                [_, _, '#82d', '#82d', '#82d', '#aaa', '#ccc', _],
                [_, '#82d', '#41a', '#41a', '#41a', '#82d', _, _],
                [_, '#82d', '#0ff', _, '#0ff', '#82d', _, _],
                [_, _, '#41a', '#41a', '#41a', '#888', _, _],
                [_, '#639', '#639', '#639', '#639', '#639', _, _],
                ['#a4f', '#639', '#639', '#639', '#639', '#639', '#a4f', _],
                [_, '#639', '#639', '#639', '#639', '#639', _, _],
                [_, _, '#639', _, '#639', _, _, _],
                [_, _, '#41a', _, '#41a', _, _, _],
            ],
        ],
    },

    heart: {
        full: [
            [_, '#f22', _, '#f22', _],
            ['#f22', '#f66', '#f22', '#f66', '#f22'],
            ['#f22', '#f44', '#f22', '#f44', '#f22'],
            [_, '#f22', '#f22', '#f22', _],
            [_, _, '#c00', _, _],
        ],
        half: [
            [_, '#f22', _, '#888', _],
            ['#f22', '#f66', '#f22', '#666', '#888'],
            ['#f22', '#f44', '#888', '#555', '#888'],
            [_, '#c00', '#888', '#666', _],
            [_, _, '#888', _, _],
        ],
        empty: [
            [_, '#888', _, '#888', _],
            ['#888', '#666', '#888', '#666', '#888'],
            ['#888', '#555', '#888', '#555', '#888'],
            [_, '#888', '#888', '#888', _],
            [_, _, '#666', _, _],
        ],
    },

    xpOrb: [
        [_, '#2563b8', _],
        ['#1a4080', '#6eb0ff', '#1a4080'],
        [_, '#2563b8', _],
    ],

    bullet: [
        ['#f4f', '#f8f'],
        ['#f8f', '#faf'],
    ],

    fireDragon: {
        idle: [
            [
                [_, _, _, _, _, _, _, _, _, _, '#2a0800', '#2a0800', '#2a0800', '#2a0800', '#2a0800', '#2a0800', _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, '#2a0800', '#6a2010', '#8a2810', '#8a2810', '#8a2810', '#8a2810', '#6a2010', '#2a0800', _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, '#2a0800', '#6a2010', '#c83010', '#e84818', '#ff8830', '#ff8830', '#e84818', '#c83010', '#6a2010', '#2a0800', _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, '#2a0800', '#6a2010', '#c83010', '#e84818', '#ff8830', '#ffaa44', '#ffaa44', '#ff8830', '#e84818', '#c83010', '#6a2010', '#2a0800', _, _, _, _, _, _, _],
                [_, _, _, '#ffe8a8', '#fff0c0', '#ffe8a8', '#c83010', '#6a2010', '#c83010', '#e84818', '#ff8830', '#ffaa44', '#ffcc44', '#ffcc44', '#ffaa44', '#ff8830', '#e84818', '#c83010', '#6a2010', '#c83010', '#ffe8a8', '#fff0c0', '#ffe8a8', _, _, _],
                [_, _, '#ffe8a8', '#fff8d0', '#ffe8a8', '#c83010', '#6a2010', '#8a2810', '#c83010', '#e84818', '#ffaa44', '#ffcc44', '#ffee66', '#ffee66', '#ffcc44', '#ffaa44', '#e84818', '#c83010', '#8a2810', '#6a2010', '#c83010', '#ffe8a8', '#fff8d0', '#ffe8a8', _, _],
                [_, _, '#c83010', '#ffe8a8', '#c83010', '#6a2010', '#8a2810', '#c83010', '#e84818', '#ff8830', '#ffaa44', '#ffee66', '#2a0800', '#2a0800', '#ffee66', '#ffaa44', '#ff8830', '#e84818', '#c83010', '#8a2810', '#6a2010', '#c83010', '#ffe8a8', '#c83010', _, _],
                [_, _, '#6a2010', '#c83010', '#6a2010', '#8a2810', '#c83010', '#e84818', '#ff8830', '#ffaa44', '#ffee66', '#2a0800', '#1a0800', '#1a0800', '#2a0800', '#ffee66', '#ffaa44', '#ff8830', '#e84818', '#c83010', '#8a2810', '#6a2010', '#c83010', '#6a2010', _, _],
                [_, _, '#6a2010', '#c83010', '#6a2010', '#8a2810', '#c83010', '#e84818', '#ff8830', '#ffaa44', '#ffee66', '#2a0800', '#1a0800', '#1a0800', '#2a0800', '#ffee66', '#ffaa44', '#ff8830', '#e84818', '#c83010', '#8a2810', '#6a2010', '#c83010', '#6a2010', _, _],
                [_, _, '#c83010', '#ffe8a8', '#c83010', '#6a2010', '#8a2810', '#c83010', '#e84818', '#ff8830', '#ffaa44', '#ffee66', '#2a0800', '#2a0800', '#ffee66', '#ffaa44', '#ff8830', '#e84818', '#c83010', '#8a2810', '#6a2010', '#c83010', '#ffe8a8', '#c83010', _, _],
                [_, _, '#ffe8a8', '#fff8d0', '#ffe8a8', '#c83010', '#6a2010', '#8a2810', '#c83010', '#e84818', '#ffaa44', '#ffcc44', '#ffee66', '#ffee66', '#ffcc44', '#ffaa44', '#e84818', '#c83010', '#8a2810', '#6a2010', '#c83010', '#ffe8a8', '#fff8d0', '#ffe8a8', _, _],
                [_, _, _, '#ffe8a8', '#fff0c0', '#ffe8a8', '#c83010', '#6a2010', '#c83010', '#e84818', '#ff8830', '#ffaa44', '#ffcc44', '#ffcc44', '#ffaa44', '#ff8830', '#e84818', '#c83010', '#6a2010', '#c83010', '#ffe8a8', '#fff0c0', '#ffe8a8', _, _, _],
                [_, _, _, _, _, _, _, '#2a0800', '#6a2010', '#c83010', '#e84818', '#ff8830', '#ffaa44', '#ffaa44', '#ff8830', '#e84818', '#c83010', '#6a2010', '#2a0800', _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, '#2a0800', '#6a2010', '#c83010', '#e84818', '#ff8830', '#ff8830', '#e84818', '#c83010', '#6a2010', '#2a0800', _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, '#2a0800', '#6a2010', '#c83010', '#e84818', '#e84818', '#c83010', '#6a2010', '#2a0800', _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, '#2a0800', '#6a2010', '#8a2810', '#8a2810', '#6a2010', '#2a0800', _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, '#2a0800', '#6a2010', '#6a2010', '#2a0800', _, _, _, _, _, _, _, _, _, _, _],
            ],
            [
                [_, _, _, _, _, _, _, _, _, _, '#2a0800', '#2a0800', '#2a0800', '#2a0800', '#2a0800', '#2a0800', _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, '#2a0800', '#6a2010', '#8a2810', '#8a2810', '#8a2810', '#8a2810', '#6a2010', '#2a0800', _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, '#2a0800', '#6a2010', '#c83010', '#e84818', '#ff8830', '#ff8830', '#e84818', '#c83010', '#6a2010', '#2a0800', _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, '#2a0800', '#6a2010', '#c83010', '#e84818', '#ff8830', '#ffaa44', '#ffaa44', '#ff8830', '#e84818', '#c83010', '#6a2010', '#2a0800', _, _, _, _, _, _, _],
                [_, _, _, '#ffe8a8', '#fff0c0', '#ffe8a8', '#c83010', '#6a2010', '#c83010', '#e84818', '#ff8830', '#ffaa44', '#ffcc44', '#ffcc44', '#ffaa44', '#ff8830', '#e84818', '#c83010', '#6a2010', '#c83010', '#ffe8a8', '#fff0c0', '#ffe8a8', _, _, _],
                [_, _, '#ffe8a8', '#fff8d0', '#ffe8a8', '#c83010', '#6a2010', '#8a2810', '#c83010', '#e84818', '#ffaa44', '#ffcc44', '#ffee66', '#ffee66', '#ffcc44', '#ffaa44', '#e84818', '#c83010', '#8a2810', '#6a2010', '#c83010', '#ffe8a8', '#fff8d0', '#ffe8a8', _, _],
                [_, _, '#c83010', '#ffe8a8', '#c83010', '#6a2010', '#8a2810', '#c83010', '#e84818', '#ff8830', '#ffaa44', '#ffee66', '#2a0800', '#2a0800', '#ffee66', '#ffaa44', '#ff8830', '#e84818', '#c83010', '#8a2810', '#6a2010', '#c83010', '#ffe8a8', '#c83010', _, _],
                [_, _, '#6a2010', '#c83010', '#6a2010', '#8a2810', '#c83010', '#e84818', '#ff8830', '#ffaa44', '#ffee66', '#2a0800', '#1a0800', '#1a0800', '#2a0800', '#ffee66', '#ffaa44', '#ff8830', '#e84818', '#c83010', '#8a2810', '#6a2010', '#c83010', '#6a2010', _, _],
                [_, _, '#6a2010', '#c83010', '#6a2010', '#8a2810', '#c83010', '#e84818', '#ff8830', '#ffaa44', '#ffee66', '#2a0800', '#1a0800', '#1a0800', '#2a0800', '#ffee66', '#ffaa44', '#ff8830', '#e84818', '#c83010', '#8a2810', '#6a2010', '#c83010', '#6a2010', _, _],
                [_, _, '#c83010', '#ffe8a8', '#c83010', '#6a2010', '#8a2810', '#c83010', '#e84818', '#ff8830', '#ffaa44', '#ffee66', '#2a0800', '#2a0800', '#ffee66', '#ffaa44', '#ff8830', '#e84818', '#c83010', '#8a2810', '#6a2010', '#c83010', '#ffe8a8', '#c83010', _, _],
                [_, _, '#ffe8a8', '#fff8d0', '#ffe8a8', '#c83010', '#6a2010', '#8a2810', '#c83010', '#e84818', '#ffaa44', '#ffcc44', '#ffee66', '#ffee66', '#ffcc44', '#ffaa44', '#e84818', '#c83010', '#8a2810', '#6a2010', '#c83010', '#ffe8a8', '#fff8d0', '#ffe8a8', _, _],
                [_, _, _, '#ffe8a8', '#fff0c0', '#ffe8a8', '#c83010', '#6a2010', '#c83010', '#e84818', '#ff8830', '#ffaa44', '#ffcc44', '#ffcc44', '#ffaa44', '#ff8830', '#e84818', '#c83010', '#6a2010', '#c83010', '#ffe8a8', '#fff0c0', '#ffe8a8', _, _, _],
                [_, _, _, _, _, _, _, '#2a0800', '#6a2010', '#c83010', '#e84818', '#ff8830', '#ffaa44', '#ffaa44', '#ff8830', '#e84818', '#c83010', '#6a2010', '#2a0800', _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, '#2a0800', '#6a2010', '#c83010', '#e84818', '#ff8830', '#ff8830', '#e84818', '#c83010', '#6a2010', '#2a0800', _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, '#2a0800', '#6a2010', '#c83010', '#ff6620', '#ff4400', '#c83010', '#6a2010', '#2a0800', _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, '#2a0800', '#6a2010', '#8a2810', '#8a2810', '#6a2010', '#2a0800', _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, '#2a0800', '#6a2010', '#6a2010', '#2a0800', _, _, _, _, _, _, _, _, _, _, _],
            ],
        ],
    },
};

function parseHexColor(hex) {
    if (!hex || hex[0] !== '#') return null;
    const h = hex.slice(1);
    if (h.length === 3) {
        return {
            r: parseInt(h[0] + h[0], 16),
            g: parseInt(h[1] + h[1], 16),
            b: parseInt(h[2] + h[2], 16),
        };
    }
    return {
        r: parseInt(h.slice(0, 2), 16),
        g: parseInt(h.slice(2, 4), 16),
        b: parseInt(h.slice(4, 6), 16),
    };
}

function tintHexColor(hex, tintR, tintG, tintB, amount) {
    const c = parseHexColor(hex);
    if (!c) return hex;
    const t = clamp(amount, 0, 1);
    const r = Math.round(lerp(c.r, tintR, t));
    const g = Math.round(lerp(c.g, tintG, t));
    const b = Math.round(lerp(c.b, tintB, t));
    const toHex = (v) => v.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function drawSprite(ctx, sprite, x, y, scale = 3, alpha = 1, flipX = false, tintAmount = 0, tintR = 255, tintG = 72, tintB = 72) {
    if (!sprite || sprite.length === 0) return;
    const rows = sprite.length;
    const cols = sprite[0].length;
    const w = cols * scale;
    const h = rows * scale;
    const startX = x - w / 2;
    const startY = y - h / 2;

    ctx.globalAlpha = alpha;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const color = sprite[r][flipX ? cols - 1 - c : c];
            if (color) {
                ctx.fillStyle = tintAmount > 0
                    ? tintHexColor(color, tintR, tintG, tintB, tintAmount)
                    : color;
                ctx.fillRect(
                    Math.floor(startX + c * scale),
                    Math.floor(startY + r * scale),
                    scale, scale
                );
            }
        }
    }
    ctx.globalAlpha = 1;
}

function getSpriteSize(sprite, scale = 3) {
    if (!sprite || sprite.length === 0) return { w: 0, h: 0 };
    return {
        w: sprite[0].length * scale,
        h: sprite.length * scale,
    };
}

function drawSlashArc(ctx, x, y, facingRight, frame, scale) {
    const dir = facingRight ? 1 : -1;
    const len = 24 + frame * 10;
    const angles = [-0.55, -0.1, 0.25];
    const colors = ['rgba(255,255,255,0.95)', 'rgba(220,228,238,0.85)', 'rgba(170,180,195,0.5)'];

    ctx.save();
    ctx.translate(x, y);
    if (!facingRight) ctx.scale(-1, 1);

    for (let i = 0; i < angles.length; i++) {
        const a = angles[i] + frame * 0.15;
        const ex = Math.cos(a) * len * dir;
        const ey = Math.sin(a) * len * 0.6;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(ex, ey);
        ctx.strokeStyle = colors[i];
        ctx.lineWidth = (4 - i) * scale * 0.35;
        ctx.lineCap = 'round';
        ctx.shadowColor = 'rgba(200, 210, 225, 0.8)';
        ctx.shadowBlur = 5;
        ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.restore();
}


// ---- audio.js ----
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


// ---- particles.js ----
class Particle {
    constructor() { this.active = false; }

    init(x, y, vx, vy, life, size, color, gravity = 0, shrink = true, glow = false) {
        this.x = x; this.y = y;
        this.vx = vx; this.vy = vy;
        this.life = life; this.maxLife = life;
        this.size = size; this.color = color;
        this.gravity = gravity;
        this.shrink = shrink;
        this.glow = glow;
        this.active = true;
    }

    update(dt) {
        if (!this.active) return;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.vy += this.gravity * dt;
        this.life -= dt;
        if (this.life <= 0) this.active = false;
    }

    draw(ctx) {
        if (!this.active) return;
        const t = this.life / this.maxLife;
        const s = this.shrink ? this.size * t : this.size;
        ctx.globalAlpha = t;
        if (this.glow) {
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 8;
        }
        ctx.fillStyle = this.color;
        ctx.fillRect(Math.floor(this.x - s / 2), Math.floor(this.y - s / 2),
            Math.ceil(s), Math.ceil(s));
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
    }
}

class ParticleSystem {
    constructor(poolSize = 500) {
        this.pool = [];
        this.lightningBolts = [];
        for (let i = 0; i < poolSize; i++) {
            this.pool.push(new Particle());
        }
    }

    clear() {
        for (const p of this.pool) p.active = false;
        this.lightningBolts = [];
    }

    emit(x, y, vx, vy, life, size, color, gravity = 0, shrink = true, glow = false) {
        for (const p of this.pool) {
            if (!p.active) {
                p.init(x, y, vx, vy, life, size, color, gravity, shrink, glow);
                return p;
            }
        }
        return null;
    }

    slashTrail(x, y, angle) {
        const count = 6;
        for (let i = 0; i < count; i++) {
            const along = randRange(-12, 18);
            const perpAngle = angle + Math.PI / 2;
            const spread = randRange(-14, 14);
            const px = x + Math.cos(angle) * along + Math.cos(perpAngle) * spread;
            const py = y + Math.sin(angle) * along + Math.sin(perpAngle) * spread;
            const speed = randRange(80, 200);
            this.emit(px, py,
                Math.cos(angle + randRange(-0.4, 0.4)) * speed,
                Math.sin(angle + randRange(-0.4, 0.4)) * speed,
                randRange(0.12, 0.28), randRange(3, 7),
                ['#fff', '#f8faff', '#e8ecf2', '#d0d8e4', '#b8c4d0'][Math.floor(Math.random() * 5)],
                0, true, true);
        }
        for (let i = 0; i < 2; i++) {
            const len = randRange(16, 28);
            const ex = x + Math.cos(angle) * len;
            const ey = y + Math.sin(angle) * len;
            this.emit(ex, ey,
                Math.cos(angle) * randRange(40, 80),
                Math.sin(angle) * randRange(40, 80),
                randRange(0.08, 0.18), randRange(4, 8),
                '#fff', 0, true, true);
        }
    }

    hitSpark(x, y, isCrit) {
        const count = isCrit ? 20 : 10;
        const colors = isCrit
            ? ['#ff0', '#f80', '#f44', '#fff']
            : ['#fff', '#ff0', '#adf'];
        for (let i = 0; i < count; i++) {
            const a = randRange(0, Math.PI * 2);
            const speed = randRange(60, isCrit ? 250 : 150);
            this.emit(x, y,
                Math.cos(a) * speed, Math.sin(a) * speed,
                randRange(0.2, 0.5), randRange(2, isCrit ? 6 : 4),
                colors[Math.floor(Math.random() * colors.length)],
                100, true, true);
        }
    }

    deathEffect(x, y, color) {
        for (let i = 0; i < 16; i++) {
            const a = randRange(0, Math.PI * 2);
            const speed = randRange(30, 100);
            this.emit(x, y,
                Math.cos(a) * speed, Math.sin(a) * speed,
                randRange(0.3, 0.7), randRange(3, 6),
                color, 60, true, false);
        }
    }

    spawnEffect(x, y, color) {
        for (let i = 0; i < 12; i++) {
            const a = randRange(0, Math.PI * 2);
            const r = randRange(10, 30);
            this.emit(x + Math.cos(a) * r, y + Math.sin(a) * r,
                Math.cos(a) * -20, Math.sin(a) * -20,
                randRange(0.5, 1.0), randRange(2, 4),
                color, 0, true, true);
        }
    }

    bulletShatter(x, y) {
        for (let i = 0; i < 8; i++) {
            const a = randRange(0, Math.PI * 2);
            const speed = randRange(40, 100);
            this.emit(x, y,
                Math.cos(a) * speed, Math.sin(a) * speed,
                randRange(0.15, 0.35), randRange(2, 4),
                ['#f4f', '#f8f', '#faf'][Math.floor(Math.random() * 3)],
                80, true, false);
        }
    }

    xpPickup(x, y) {
        for (let i = 0; i < 5; i++) {
            this.emit(x, y,
                randRange(-30, 30), randRange(-60, -20),
                randRange(0.2, 0.4), randRange(2, 3),
                '#4a90e8', 0, true, true);
        }
    }

    freezeEffect(x, y, intensity = 1) {
        const n = Math.round(10 * intensity);
        for (let i = 0; i < n; i++) {
            const a = randRange(0, Math.PI * 2);
            const speed = randRange(25, 80) * intensity;
            this.emit(x, y,
                Math.cos(a) * speed, Math.sin(a) * speed,
                randRange(0.35, 0.7), randRange(3, 7) * intensity,
                ['#c8f0ff', '#78d8ff', '#a8e8ff', '#e8ffff'][Math.floor(Math.random() * 4)],
                0, true, true);
        }
    }

    iceBurstEffect(x, y, radius) {
        for (let i = 0; i < 28; i++) {
            const a = (i / 28) * Math.PI * 2 + randRange(-0.2, 0.2);
            const speed = randRange(90, 200);
            this.emit(x, y,
                Math.cos(a) * speed, Math.sin(a) * speed,
                randRange(0.25, 0.55), randRange(5, 11),
                ['#c8f0ff', '#58b8f0', '#88e0ff', '#e8ffff'][Math.floor(Math.random() * 4)],
                0, true, true);
        }
        for (let i = 0; i < 16; i++) {
            const a = randRange(0, Math.PI * 2);
            const distR = radius * randRange(0.25, 0.95);
            this.emit(
                x + Math.cos(a) * distR, y + Math.sin(a) * distR,
                Math.cos(a) * randRange(10, 40), Math.sin(a) * randRange(10, 40),
                randRange(0.4, 0.75), randRange(4, 9),
                '#a8e8ff', 0, true, true
            );
        }
    }

    iaiCritEffect(x, y) {
        for (let ring = 0; ring < 3; ring++) {
            const count = 10 + ring * 4;
            for (let i = 0; i < count; i++) {
                const a = (i / count) * Math.PI * 2 + ring * 0.4;
                const spd = randRange(100, 220) * (1 - ring * 0.15);
                this.emit(x, y, Math.cos(a) * spd, Math.sin(a) * spd,
                    randRange(0.35, 0.65), randRange(5, 11),
                    ['#fff', '#cef', '#8ef', '#48f'][Math.floor(Math.random() * 4)],
                    0, true, true);
            }
        }
        for (let i = 0; i < 8; i++) {
            const a = randRange(0, Math.PI * 2);
            const len = randRange(30, 70);
            const ex = x + Math.cos(a) * len;
            const ey = y + Math.sin(a) * len;
            this.lightningBolts.push({
                points: [{ x, y }, { x: ex, y: ey }],
                life: 0.35,
                maxLife: 0.35,
            });
        }
    }

    lightningEffect(x1, y1, x2, y2) {
        const dist = Math.hypot(x2 - x1, y2 - y1);
        const segments = Math.max(18, Math.floor(dist / 14));
        const jitter = Math.max(22, dist * 0.14);
        const life = clamp(0.75 + dist * 0.0022, 0.85, 1.25);
        const points = [{ x: x1, y: y1 }];
        for (let i = 1; i < segments; i++) {
            const t = i / segments;
            points.push({
                x: x1 + (x2 - x1) * t + randRange(-jitter, jitter),
                y: y1 + (y2 - y1) * t + randRange(-jitter, jitter),
            });
        }
        points.push({ x: x2, y: y2 });
        this.lightningBolts.push({ points, life, maxLife: life });

        const sparkCount = Math.max(28, Math.floor(dist / 10));
        for (let i = 0; i <= sparkCount; i++) {
            const t = i / sparkCount;
            const px = x1 + (x2 - x1) * t + randRange(-14, 14);
            const py = y1 + (y2 - y1) * t + randRange(-14, 14);
            this.emit(px, py, randRange(-40, 40), randRange(-40, 40),
                randRange(0.35, 0.65), randRange(5, 11),
                ['#ff0', '#fff', '#8ef', '#cef'][Math.floor(Math.random() * 4)],
                0, true, true);
        }

        for (let i = 0; i < 14; i++) {
            const a = (i / 14) * Math.PI * 2;
            const spd = randRange(80, 180);
            this.emit(x1, y1, Math.cos(a) * spd, Math.sin(a) * spd,
                randRange(0.28, 0.5), randRange(6, 12), '#fff', 0, true, true);
            this.emit(x2, y2, Math.cos(a) * spd, Math.sin(a) * spd,
                randRange(0.28, 0.5), randRange(6, 12), '#ff0', 0, true, true);
        }
    }

    update(dt) {
        for (const p of this.pool) {
            if (p.active) p.update(dt);
        }
        for (const bolt of this.lightningBolts) {
            bolt.life -= dt;
        }
        this.lightningBolts = this.lightningBolts.filter(b => b.life > 0);
    }

    draw(ctx) {
        for (const bolt of this.lightningBolts) {
            const t = bolt.life / bolt.maxLife;
            const pts = bolt.points;
            if (pts.length < 2) continue;

            ctx.save();
            ctx.globalAlpha = t;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            ctx.strokeStyle = 'rgba(100, 200, 255, 0.65)';
            ctx.lineWidth = 16;
            ctx.shadowColor = '#8cf';
            ctx.shadowBlur = 28;
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
            ctx.stroke();

            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 6;
            ctx.shadowBlur = 16;
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
            ctx.stroke();

            ctx.strokeStyle = '#ffe840';
            ctx.lineWidth = 3;
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
            ctx.stroke();

            ctx.restore();
        }

        for (const p of this.pool) {
            if (p.active) p.draw(ctx);
        }
    }
}


// ---- bloodStains.js ----
class BloodStainSystem {
    constructor() {
        this.stains = [];
        this.maxStains = 800;
        this.fadeDuration = 16;
        this.minAlpha = 0.22;
    }

    clear() {
        this.stains = [];
    }

    update(dt) {
        for (const s of this.stains) s.age += dt;
        this._trim();
    }

    _trim() {
        while (this.stains.length > this.maxStains) {
            const idx = this.stains.findIndex(s => s.age >= this.fadeDuration);
            if (idx < 0) break;
            this.stains.splice(idx, 1);
        }
    }

    _alpha(age) {
        if (age >= this.fadeDuration) return this.minAlpha;
        const t = age / this.fadeDuration;
        return this.minAlpha + (1 - this.minAlpha) * (1 - t);
    }

    spawn(x, y, intensity = 1, fromAngle = null) {
        const base = fromAngle !== null ? fromAngle : Math.random() * Math.PI * 2;
        const drops = [];
        const n = Math.floor(8 + 12 * intensity);
        for (let i = 0; i < n; i++) {
            const a = base + randRange(-1.2, 1.2);
            const d = randRange(3, 28 * intensity);
            drops.push({
                x: Math.cos(a) * d,
                y: Math.sin(a) * d * 0.75,
                r: randRange(1.2, 3.8) * intensity,
                c: pickRandom(['#f0a8a8', '#e89090', '#ffc8c8']),
            });
        }
        this.stains.push({ x, y, drops, age: 0 });
        this._trim();
    }

    draw(ctx) {
        for (const s of this.stains) {
            const a = this._alpha(s.age);
            for (const d of s.drops) {
                ctx.globalAlpha = a;
                ctx.fillStyle = d.c;
                ctx.beginPath();
                ctx.arc(s.x + d.x, s.y + d.y, d.r, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1;
    }
}


// ---- renderer.js ----
class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.shakeX = 0;
        this.shakeY = 0;
        this.shakeMag = 0;
        this.shakeDur = 0;
        this.shakeTimer = 0;
        this.resize();
    }

    resize() {
        const logicalW = CONFIG.DISPLAY.LOGICAL_WIDTH;
        const logicalH = CONFIG.DISPLAY.LOGICAL_HEIGHT;
        const vv = window.visualViewport;

        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';

        const layoutW = vv ? vv.width : (window.innerWidth || document.documentElement.clientWidth || logicalW);
        const layoutH = vv ? vv.height : (window.innerHeight || document.documentElement.clientHeight || logicalH);
        const rect = this.canvas.getBoundingClientRect();
        const screenW = Math.max(rect.width || layoutW, logicalW);
        const screenH = Math.max(rect.height || layoutH, logicalH);
        this.dpr = Math.min(window.devicePixelRatio || 1, 2.5);

        this.canvas.width = Math.round(screenW * this.dpr);
        this.canvas.height = Math.round(screenH * this.dpr);

        this.screenW = screenW;
        this.screenH = screenH;
        this.logicalW = logicalW;
        this.logicalH = logicalH;
        this.w = logicalW;
        this.h = logicalH;

        this.scale = Math.min(screenW / logicalW, screenH / logicalH);
        this.offsetX = (screenW - logicalW * this.scale) / 2;
        this.offsetY = (screenH - logicalH * this.scale) / 2;
        this.uiScale = Math.max(1, this.scale * 0.92);
        this.viewportW = logicalW * this.scale;
        this.viewportH = logicalH * this.scale;

        this.ctx.imageSmoothingEnabled = true;
    }

    /** Map pointer (client) coords to canvas layout space (matches viewport / upgrade UI). */
    screenToCanvas(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = rect.width > 0 ? this.screenW / rect.width : 1;
        const scaleY = rect.height > 0 ? this.screenH / rect.height : 1;
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY,
        };
    }

    getViewport() {
        return {
            x: this.offsetX,
            y: this.offsetY,
            w: this.viewportW,
            h: this.viewportH,
            cx: this.offsetX + this.viewportW / 2,
            cy: this.offsetY + this.viewportH / 2,
        };
    }

    isScreenInViewport(sx, sy) {
        const vp = this.getViewport();
        return sx >= vp.x && sx <= vp.x + vp.w &&
            sy >= vp.y && sy <= vp.y + vp.h;
    }

    clipViewport(ctx) {
        const vp = this.getViewport();
        ctx.beginPath();
        ctx.rect(vp.x, vp.y, vp.w, vp.h);
        ctx.clip();
        return vp;
    }

    screenToGame(clientX, clientY) {
        const { x: sx, y: sy } = this.screenToCanvas(clientX, clientY);
        return {
            x: (sx - this.offsetX) / this.scale,
            y: (sy - this.offsetY) / this.scale,
        };
    }

    isGameInBounds(gx, gy) {
        return gx >= 0 && gx <= this.w && gy >= 0 && gy <= this.h;
    }

    /** Layout-space transform: CSS pixels → backing store (call before clip/UI). */
    applyLayoutTransform() {
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }

    beginGameDraw() {
        const d = this.dpr;
        this.ctx.setTransform(
            this.scale * d, 0, 0, this.scale * d,
            (this.offsetX + this.shakeX) * d,
            (this.offsetY + this.shakeY) * d
        );
    }

    resetScreenDraw() {
        this.applyLayoutTransform();
    }

    shake(magnitude, duration) {
        if (!Number.isFinite(magnitude) || magnitude <= 0) return;
        if (!Number.isFinite(duration) || duration <= 0) return;
        if (magnitude >= this.shakeMag) {
            this.shakeMag = magnitude;
            this.shakeDur = duration;
        }
        this.shakeTimer = Math.max(this.shakeTimer, duration);
    }

    shakeAttackHit(isCrit, combo = 1) {
        const base = isCrit ? CONFIG.SHAKE.CRIT : CONFIG.SHAKE.NORMAL;
        const perHit = CONFIG.SHAKE.COMBO_MAG_PER_HIT ?? 0.1;
        const cap = CONFIG.SHAKE.COMBO_MAG_CAP ?? 1.5;
        const bonus = Math.min(cap, Math.max(0, combo - 1) * perHit);
        this.shake(base.magnitude + bonus, base.duration);
    }

    updateShake(dt) {
        if (this.shakeTimer <= 0) return;
        if (dt <= 0) return;
        this.shakeTimer -= dt;
        const intensity = this.shakeTimer / this.shakeDur;
        this.shakeX = (Math.random() - 0.5) * 2 * this.shakeMag * intensity;
        this.shakeY = (Math.random() - 0.5) * 2 * this.shakeMag * intensity;
        if (this.shakeTimer <= 0) {
            this.shakeX = 0;
            this.shakeY = 0;
            this.shakeMag = 0;
        }
    }

    clearShake() {
        this.shakeX = 0;
        this.shakeY = 0;
        this.shakeMag = 0;
        this.shakeDur = 0;
        this.shakeTimer = 0;
    }

    clear() {
        const ctx = this.ctx;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = '#9a8b78';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    beginClippedGameDraw() {
        this.ctx.save();
        this.applyLayoutTransform();
        this.clipViewport(this.ctx);
        this.beginGameDraw();
        this.drawBackground();
    }

    endClippedGameDraw() {
        this.ctx.restore();
    }

    drawBackground() {
        const ctx = this.ctx;
        const base = '#ebe3d3';
        ctx.fillStyle = base;
        ctx.fillRect(0, 0, this.w, this.h);

        const grad = ctx.createRadialGradient(
            this.w * 0.5, this.h * 0.45, this.w * 0.1,
            this.w * 0.5, this.h * 0.5, this.w * 0.85
        );
        grad.addColorStop(0, 'rgba(255, 252, 245, 0.35)');
        grad.addColorStop(1, 'rgba(180, 165, 140, 0.08)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.w, this.h);
    }

    applyBulletTimeEffect(active) {
        if (!active) return;
        this.ctx.fillStyle = 'rgba(38, 30, 24, 0.48)';
        this.ctx.fillRect(-10, -10, this.w + 20, this.h + 20);
        this.ctx.fillStyle = 'rgba(18, 12, 8, 0.15)';
        this.ctx.fillRect(-10, -10, this.w + 20, this.h + 20);
    }
}


// ---- player.js ----
const PlayerState = {
    IDLE: 'idle',
    BULLET_TIME: 'bulletTime',
    ATTACKING: 'attacking',
};

class Player {
    constructor(x, y) {
        this.homeX = x;
        this.homeY = y;
        this.x = x;
        this.y = y;
        this.state = PlayerState.IDLE;

        this.baseAttack = CONFIG.PLAYER.BASE_ATTACK;
        this.attackPowerScale = 1;
        this.critRate = CONFIG.PLAYER.BASE_CRIT_RATE;
        this.critDamage = CONFIG.PLAYER.BASE_CRIT_DAMAGE;
        this.sizeScale = CONFIG.PLAYER.SIZE_SCALE;

        this.baseHp = CONFIG.PLAYER.BASE_HP;
        this.maxHp = this.baseHp;
        this.hp = this.maxHp;
        this.invincibleTimer = 0;

        this.baseKi = CONFIG.PLAYER.BASE_KI;
        this.kiMax = this.baseKi;
        this.ki = this.kiMax;
        this.nextTurnKiBonus = 0;

        this.comboCount = 0;
        this.comboDisplayPeak = 0;
        this.comboDisplayTimer = 0;
        this.comboShakeTimer = 0;
        this.waterTornadoCharge = 0;
        this.whirlCharge = 0;
        this.comboDamageBonus = CONFIG.PLAYER.COMBO_DAMAGE_BONUS;

        this.attackPath = [];
        this.pathIndex = 0;
        this.pathProgress = 0;
        this.hitMonstersInSegment = new Set();
        this.hitProjectilesInSegment = new Set();
        this.invalidPathTimer = 0;
        this.kiAtDrawStart = this.ki;
        this.damageFlashTimer = 0;
        this.healFlashTimer = 0;

        this.turnBuffs = {
            attackMult: 1,
            comboMult: 1,
            iceReady: false,
        };
        this.shadowClones = [];

        this.upgradeStacks = {};
        this.collectedOrbBuffs = [];
        this.drawSessionSnapshot = null;
        this.activeMessage = '';
        this.messageTimer = 0;

        this.holyShieldCharges = 0;
        this.holyShieldTimer = 0;
        this.killCountForVampire = 0;
        this.healingComboMilestone = 0;
        this.comboFireballMilestone = 0;
    }

    get effectiveRadius() {
        const unit = CONFIG.DISPLAY.UNIT_SCALE || 1;
        return CONFIG.PLAYER.HITBOX_RADIUS * this.sizeScale * unit;
    }

    get triggerRadius() {
        const refW = CONFIG.DISPLAY.LOGICAL_WIDTH;
        const unit = CONFIG.DISPLAY.UNIT_SCALE || 1;
        const minR = CONFIG.PLAYER.TRIGGER_RADIUS_MIN || 30;
        const base = Math.max(minR, CONFIG.PLAYER.TRIGGER_RADIUS_RATIO * refW);
        return base * this.sizeScale * unit;
    }

    get spriteScale() {
        const unit = CONFIG.DISPLAY.UNIT_SCALE || 1;
        return CONFIG.DISPLAY.NINJA_SPRITE_SCALE * this.sizeScale * unit;
    }

    isInAttackMode() {
        return this.state === PlayerState.ATTACKING;
    }

    isAttackInvincible() {
        return this.isInAttackMode();
    }

    resetLineBuffs() {
        this.collectedOrbBuffs = [];
        this.turnBuffs.attackMult = 1;
        this.turnBuffs.comboMult = 1;
        this.turnBuffs.iceReady = false;
    }

    beginStage() {
        this.deathAnim = null;
        this.state = PlayerState.IDLE;
        this.attackPath = [];
        this.pathIndex = 0;
        this.pathProgress = 0;
        this.hitMonstersInSegment.clear();
        this.hitProjectilesInSegment.clear();
        this.invalidPathTimer = 0;
        this.comboCount = 0;
        this.comboDisplayPeak = 0;
        this.comboDisplayTimer = 0;
        this.comboShakeTimer = 0;
        this.waterTornadoCharge = 0;
        this.drawSessionSnapshot = null;
        this.invincibleTimer = 0;
        this.damageFlashTimer = 0;
        this.healFlashTimer = 0;
        this.holyShieldCharges = 0;
        this.holyShieldTimer = 0;
        this.killCountForVampire = 0;
        this.healingComboMilestone = 0;
        this.comboFireballMilestone = 0;
        this.hp = this.maxHp;
        if (this.game && this.game.buffOrbs) {
            this.game.buffOrbs.drawSessionEaten = [];
        }
        this.resetLineBuffs();
        this._refreshHolyShieldInterval();
        const turnKiMax = Math.round(this.baseKi * (1 + this.nextTurnKiBonus));
        this.kiMax = Math.max(20, turnKiMax);
        this.ki = this.kiMax;
        this.nextTurnKiBonus = 0;
    }

    finishAttackCycle() {
        this.state = PlayerState.IDLE;
        this.attackPath = [];
        this.pathIndex = 0;
        this.pathProgress = 0;
        this.hitMonstersInSegment.clear();
        this.hitProjectilesInSegment.clear();
        this.invalidPathTimer = 0;
        this.comboCount = 0;
        this.comboDisplayPeak = 0;
        this.comboDisplayTimer = 0;
        this.comboShakeTimer = 0;
        this.waterTornadoCharge = 0;
        this.healingComboMilestone = 0;
        this.comboFireballMilestone = 0;
        this.drawSessionSnapshot = null;
        if (this.game && this.game.buffOrbs) {
            this.game.buffOrbs.drawSessionEaten = [];
        }
        this.resetLineBuffs();
        const turnKiMax = Math.round(this.baseKi * (1 + this.nextTurnKiBonus));
        this.kiMax = Math.max(20, turnKiMax);
        this.ki = Math.min(this.ki, this.kiMax);
        this.nextTurnKiBonus = 0;
    }
    _canRegenKi() {
        if (this.state !== PlayerState.IDLE || this.ki >= this.kiMax) return false;
        if (!this.game || !this.game.combat) return false;
        if (this.game.combat.isResolving()) return false;
        if (!this.game.combat.roundAttackResolved) return false;
        if (this.game.isUpgradeBlocked()) return false;
        return true;
    }

    _updateKiRegen(realDt) {
        if (!this._canRegenKi()) return;
        const rate = CONFIG.PLAYER.KI_REGEN_RATE || 52;
        this.ki = Math.min(this.kiMax, this.ki + rate * realDt);
    }

    getHealMultiplier() {
        const lv = this.getUpgradeLevel('super_heal');
        return 1 + 0.5 * lv;
    }

    heal(amount) {
        if (amount <= 0 || this.hp <= 0) return 0;
        const actual = Math.max(1, Math.round(amount * this.getHealMultiplier()));
        const before = this.hp;
        this.hp = Math.min(this.maxHp, this.hp + actual);
        const gained = this.hp - before;
        if (gained > 0) {
            this.healFlashTimer = CONFIG.PLAYER.HEAL_FLASH_TIME || 0.5;
        }
        return gained;
    }

    getHolyShieldInterval() {
        const lv = this.getUpgradeLevel('holy_shield');
        if (lv <= 0) return 0;
        return Math.max(1.5, 5 - 0.5 * (lv - 1));
    }

    grantHolyShieldImmediate() {
        if (this.getUpgradeLevel('holy_shield') <= 0) return;
        this.holyShieldCharges = 1;
        this.holyShieldTimer = this.getHolyShieldInterval();
    }

    _refreshHolyShieldInterval() {
        if (this.getUpgradeLevel('holy_shield') <= 0) return;
        if (this.holyShieldCharges < 1 && this.holyShieldTimer <= 0) {
            this.holyShieldTimer = this.getHolyShieldInterval();
        }
    }

    _updateHolyShield(dt) {
        if (this.getUpgradeLevel('holy_shield') <= 0) return;
        if (this.holyShieldCharges >= 1) return;
        this.holyShieldTimer -= dt;
        if (this.holyShieldTimer <= 0) {
            this.holyShieldCharges = 1;
            this.holyShieldTimer = this.getHolyShieldInterval();
        }
    }

    onEnemyKilledForUpgrades(killX, killY) {
        const lv = this.getUpgradeLevel('vampire_bat');
        if (lv <= 0) return;
        this.killCountForVampire++;
        const need = 10;
        if (this.killCountForVampire < need) return;
        this.killCountForVampire -= need;
        if (this.game?.abilities) {
            this.game.abilities.spawnVampireBatSwarm(
                killX ?? this.x,
                killY ?? this.y
            );
        }
    }

    takeDamage(rawDamage) {
        if (this.isAttackInvincible() || this.invincibleTimer > 0 || this.hp <= 0) return 0;
        if (this.holyShieldCharges > 0) {
            this.holyShieldCharges = 0;
            this.holyShieldTimer = this.getHolyShieldInterval();
            this.queueMessage('圣盾抵挡');
            return 0;
        }
        const actual = Math.max(1, Math.round(rawDamage));
        this.hp = Math.max(0, this.hp - actual);
        this.invincibleTimer = CONFIG.PLAYER.INVINCIBLE_TIME || 0.45;
        this.damageFlashTimer = CONFIG.PLAYER.DAMAGE_FLASH_TIME || 0.42;
        if (this.game && this.game.renderer) {
            this.game.renderer.shake(4, 0.12);
        }
        if (this.hp <= 0 && this.game) {
            this.game._playerDied();
        }
        return actual;
    }

    invalidatePath() {
        this.invalidPathTimer = 0.3;
        this.state = PlayerState.IDLE;
        if (this.game && this.game.buffOrbs) this.game.buffOrbs.cancelDrawSession();
        this.pathIndex = 0;
        this.pathProgress = 0;
        this.hitMonstersInSegment.clear();
        this.hitProjectilesInSegment.clear();
        this.queueMessage('路径无效');
    }

    consumeKiByDistance(d) {
        const cost = d * CONFIG.PLAYER.KI_PER_PIXEL;
        this.ki = Math.max(0, this.ki - cost);
        return this.ki > 0;
    }

    startBulletTime() {
        this.state = PlayerState.BULLET_TIME;
        if (this.game && this.game.buffOrbs) this.game.buffOrbs.beginDrawSession();
        this.invalidPathTimer = 0;
        this.attackPath = [];
        this.pathIndex = 0;
        this.pathProgress = 0;
        this.hitMonstersInSegment.clear();
        this.hitProjectilesInSegment.clear();
    }

    addPathPoint(x, y) {
        const last = this.attackPath[this.attackPath.length - 1];
        if (!last || dist(last.x, last.y, x, y) > 4) this.attackPath.push({ x, y });
    }

    startAttack() {
        if (this.attackPath.length < 2) {
            this.state = PlayerState.IDLE;
            this.attackPath = [];
            return false;
        }
        this.state = PlayerState.ATTACKING;
        if (this.game && this.game.buffOrbs) this.game.buffOrbs.commitDrawSession();
        this.pathIndex = 0;
        this.pathProgress = 0;
        this.hitMonstersInSegment.clear();
        this.hitProjectilesInSegment.clear();
        this.comboCount = 0;
        this.comboDisplayPeak = 0;
        this.comboDisplayTimer = 0;
        this.comboShakeTimer = 0;
        this.waterTornadoCharge = 0;
        this.whirlCharge = 0;
        this.healingComboMilestone = 0;
        this.comboFireballMilestone = 0;
        return true;
    }

    registerComboHit(source = 'path') {
        // 连击仅由画线冲刺的路径碰撞伤害叠加，技能/黑洞等特效伤害不得调用
        if (source !== 'path') return this.comboCount;
        if (!this.game?.combat?.isResolving()) return this.comboCount;

        const baseInc = 1;
        const multiComboLv = this.getUpgradeLevel('multi_combo');
        const inc = baseInc * this.turnBuffs.comboMult * Math.pow(1.2, multiComboLv);
        this.comboCount += inc;
        this.comboDisplayPeak = Math.max(this.comboDisplayPeak, this.comboCount);
        this.comboDisplayTimer = CONFIG.PLAYER.COMBO_DISPLAY_HOLD;
        return this.comboCount;
    }

    _getShadowCloneAnchor() {
        if (this.state === PlayerState.ATTACKING) {
            return { x: this.x, y: this.y };
        }
        return { x: this.homeX, y: this.homeY };
    }

    _layoutShadowClones() {
        const total = this.shadowClones.length;
        if (total <= 0) return;

        let idx = 0;
        let ring = 0;
        while (idx < total) {
            const onRing = Math.min(4 + ring * 2, total - idx);
            const radius = 24 + ring * 20;
            const ringOffset = ring * 0.38;
            for (let slot = 0; slot < onRing; slot++, idx++) {
                const angle = ringOffset + (slot / onRing) * Math.PI * 2;
                this.shadowClones[idx].ox = Math.cos(angle) * radius;
                this.shadowClones[idx].oy = Math.sin(angle) * radius;
            }
            ring++;
        }
    }

    _syncShadowClones() {
        if (!this.shadowClones.length) return;
        const anchor = this._getShadowCloneAnchor();
        for (const c of this.shadowClones) {
            c.x = anchor.x + c.ox;
            c.y = anchor.y + c.oy;
        }
    }

    addShadowClones(count) {
        if (count <= 0) return;
        for (let i = 0; i < count; i++) {
            this.shadowClones.push({ ox: 0, oy: 0 });
        }
        this._layoutShadowClones();
        this._syncShadowClones();
    }

    endCombo() {
        if (this.getUpgradeLevel('shadow_clone') > 0 && this.comboDisplayPeak > 10) {
            this.addShadowClones(this.getUpgradeLevel('shadow_clone'));
        }
        if (this.comboDisplayPeak >= 2) this.comboDisplayTimer = CONFIG.PLAYER.COMBO_END_FADE;
        this.comboCount = 0;
    }

    getComboBonusPercent(combo) {
        if (combo <= 1) return 0;
        return Math.round((combo - 1) * this.comboDamageBonus * 100);
    }

    getDamage() {
        const crit = Math.random() < this.critRate;
        let dmg = this.baseAttack * this.attackPowerScale;
        dmg *= this.turnBuffs.attackMult;
        dmg *= 1 + Math.max(0, this.comboCount - 1) * this.comboDamageBonus;
        if (crit) dmg *= this.critDamage;
        return { damage: Math.round(dmg), isCrit: crit };
    }

    getAbilityDamage(mult) {
        return Math.max(1, Math.round(this.baseAttack * this.attackPowerScale * mult));
    }

    /** 画线普攻基础伤害（不含暴击随机） */
    getLineAttackDamage() {
        let dmg = this.baseAttack * this.attackPowerScale;
        dmg *= this.turnBuffs.attackMult;
        dmg *= 1 + Math.max(0, this.comboCount - 1) * this.comboDamageBonus;
        return Math.max(1, Math.round(dmg));
    }

    getAutoDartDamage() {
        const mult = CONFIG.PLAYER.AUTO_DART?.DAMAGE_MULT ?? 0.20;
        let dmg = this.getLineAttackDamage() * mult;
        const spiritLv = this.getUpgradeLevel('spirit_bomb');
        if (spiritLv > 0) dmg *= 1 + 0.5 * spiritLv;
        return Math.max(1, Math.round(dmg));
    }

    hasSpiritBomb() {
        return this.getUpgradeLevel('spirit_bomb') > 0;
    }

    queueMessage(text) {
        this.activeMessage = text;
        this.messageTimer = 1.25;
    }

    getUpgradeLevel(id) {
        return this.upgradeStacks[id] || 0;
    }

    applyUpgrade(upgrade) {
        this.upgradeStacks[upgrade.id] = (this.upgradeStacks[upgrade.id] || 0) + 1;
        upgrade.apply(this, this.upgradeStacks[upgrade.id]);
        this.queueMessage(`获得强化: ${upgrade.name}`);
    }

    rebuildUpgradesFromStacks(stacks, silent = false) {
        const hpRatio = clamp(this.hp / Math.max(1, this.maxHp), 0, 1);
        this.baseAttack = CONFIG.PLAYER.BASE_ATTACK;
        this.attackPowerScale = 1;
        this.critRate = CONFIG.PLAYER.BASE_CRIT_RATE;
        this.critDamage = CONFIG.PLAYER.BASE_CRIT_DAMAGE;
        this.sizeScale = CONFIG.PLAYER.SIZE_SCALE;
        this.baseHp = CONFIG.PLAYER.BASE_HP;
        this.maxHp = this.baseHp;
        this.baseKi = CONFIG.PLAYER.BASE_KI;
        this.comboDamageBonus = CONFIG.PLAYER.COMBO_DAMAGE_BONUS;
        this.upgradeStacks = {};
        this.holyShieldCharges = 0;
        this.holyShieldTimer = 0;
        this.killCountForVampire = 0;

        if (typeof UPGRADE_DEFS !== 'undefined') {
            const maxLv = CONFIG.DEBUG?.MAX_UPGRADE_LEVEL || 9;
            for (const def of UPGRADE_DEFS) {
                const lv = clamp(Math.floor(stacks[def.id] || 0), 0, maxLv);
                for (let i = 0; i < lv; i++) {
                    this.upgradeStacks[def.id] = (this.upgradeStacks[def.id] || 0) + 1;
                    def.apply(this, this.upgradeStacks[def.id]);
                }
            }
        }

        this.hp = Math.max(1, Math.round(this.maxHp * hpRatio));
        const turnKiMax = Math.round(this.baseKi * (1 + this.nextTurnKiBonus));
        this.kiMax = Math.max(20, turnKiMax);
        this.ki = Math.min(this.kiMax, this.ki);
        this._refreshHolyShieldInterval();
        if (!silent) this.queueMessage('调试: 强化已更新');
    }

    update(dt, realDt) {
        if (this.invincibleTimer > 0) this.invincibleTimer -= dt;
        if (this.damageFlashTimer > 0) this.damageFlashTimer -= dt;
        if (this.healFlashTimer > 0) this.healFlashTimer -= dt;
        if (this.messageTimer > 0) this.messageTimer -= dt;
        if (this.invalidPathTimer > 0) {
            this.invalidPathTimer -= dt;
            if (this.invalidPathTimer <= 0) {
                this.attackPath = [];
            }
        }

        if (this.comboDisplayTimer > 0) {
            this.comboDisplayTimer -= dt;
            if (this.comboDisplayTimer <= 0) this.comboDisplayPeak = 0;
        }
        if (this.comboShakeTimer > 0) {
            this.comboShakeTimer = Math.max(0, this.comboShakeTimer - dt);
        }

        if (this.state === PlayerState.ATTACKING) this._updateAttack(dt);
        this._updateHolyShield(dt);
        this._updateKiRegen(realDt || dt);
        this._syncShadowClones();
    }

    _finishAttackAtPathEnd() {
        if (this.game && this.game.combat) {
            this.game.combat.recordFinalPathSegment();
        }
        const pathSnapshot = this.attackPath.map(pt => ({ x: pt.x, y: pt.y }));
        this.homeX = this.x;
        this.homeY = this.y;
        this.state = PlayerState.IDLE;
        this.attackPath = [];
        if (this.game) {
            this.game.endBulletTimeDim();
            if (this.game.combat) this.game.combat.beginResolve(pathSnapshot);
        }
    }

    _updateAttack(dt) {
        if (this.pathIndex >= this.attackPath.length - 1) {
            this._finishAttackAtPathEnd();
            return;
        }
        let remaining = CONFIG.PLAYER.ATTACK_SPEED * dt;
        while (remaining > 0 && this.pathIndex < this.attackPath.length - 1) {
            const from = this.attackPath[this.pathIndex];
            const to = this.attackPath[this.pathIndex + 1];
            const segment = dist(from.x, from.y, to.x, to.y);
            if (segment < 0.001) {
                this.pathIndex++;
                this.pathProgress = 0;
                continue;
            }
            const left = segment * (1 - this.pathProgress);
            if (remaining >= left) {
                remaining -= left;
                this.x = to.x;
                this.y = to.y;
                this.pathIndex++;
                this.pathProgress = 0;
                this.hitMonstersInSegment.clear();
        this.hitProjectilesInSegment.clear();
            } else {
                this.pathProgress += remaining / segment;
                this.x = lerp(from.x, to.x, this.pathProgress);
                this.y = lerp(from.y, to.y, this.pathProgress);
                remaining = 0;
            }
        }
        if (this.pathIndex >= this.attackPath.length - 1) {
            this._finishAttackAtPathEnd();
        }
    }

    drawTriggerZone(ctx) {
        if (this.state === PlayerState.BULLET_TIME || this.state === PlayerState.ATTACKING) return;
        ctx.save();
        ctx.strokeStyle = 'rgba(72, 168, 255, 0.88)';
        ctx.setLineDash([7, 5]);
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(this.homeX, this.homeY, this.triggerRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(72, 168, 255, 0.16)';
        ctx.beginPath();
        ctx.arc(this.homeX, this.homeY, this.triggerRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(160, 220, 255, 0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(this.homeX, this.homeY, this.triggerRadius - 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    drawPath(ctx) {
        if (this.attackPath.length < 2) return;

        const invalidFlash = this.invalidPathTimer > 0;
        const redOn = !invalidFlash || Math.floor(this.invalidPathTimer * 16) % 2 === 0;
        const colorOuter = invalidFlash
            ? (redOn ? 'rgba(255, 45, 35, 0.95)' : 'rgba(180, 25, 20, 0.5)')
            : 'rgba(70, 90, 120, 0.45)';
        const colorInner = invalidFlash
            ? (redOn ? 'rgba(255, 200, 190, 1)' : 'rgba(255, 120, 110, 0.45)')
            : 'rgba(220, 230, 255, 0.95)';
        const pathThick = 1.25;
        const drawing = this.state === PlayerState.BULLET_TIME || invalidFlash;
        const flying = this.state === PlayerState.ATTACKING;
        const outerBase = drawing ? 12 : (flying ? 11 : 6);
        const innerBase = drawing ? 5 : (flying ? 4.5 : 3);
        const outerW = outerBase * pathThick;
        const innerW = innerBase * pathThick;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(this.attackPath[0].x, this.attackPath[0].y);
        for (let i = 1; i < this.attackPath.length; i++) ctx.lineTo(this.attackPath[i].x, this.attackPath[i].y);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = colorOuter;
        ctx.lineWidth = outerW;
        ctx.stroke();
        ctx.strokeStyle = colorInner;
        ctx.lineWidth = innerW;
        ctx.stroke();
        ctx.restore();
    }

    _drawHpBar(ctx) {
        if (this.hp >= this.maxHp) return;
        const w = Math.max(28, this.effectiveRadius * 2.4);
        const h = 5;
        const bx = Math.floor(this.x - w / 2);
        const by = Math.floor(this.y - this.effectiveRadius - 22);
        const ratio = clamp(this.hp / this.maxHp, 0, 1);
        ctx.save();
        ctx.fillStyle = '#231a14';
        ctx.fillRect(bx, by, w, h);
        ctx.fillStyle = ratio > 0.5 ? '#68d070' : ratio > 0.25 ? '#f0c850' : '#e05840';
        ctx.fillRect(bx, by, w * ratio, h);
        ctx.restore();
    }

    draw(ctx) {
        const failDeath = this.game && this.game.failDeath;
        if (this.deathAnim && failDeath && failDeath.showFailPose()) {
            const d = failDeath.death;
            const shakeX = d.shake || 0;
            const fallY = (d.fall || 0) * 22;
            const rot = (d.fall || 0) * 1.05;
            const alpha = d.alpha != null ? d.alpha : 1;
            const px = Math.floor(this.x + shakeX);
            const py = Math.floor(this.y + fallY);

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(px, py);
            ctx.rotate(rot);
            const sprite = SPRITES.ninja.idle[0];
            drawSprite(ctx, sprite, 0, 0, this.spriteScale);
            failDeath.drawImpaledSpears(ctx, 0, 0);
            ctx.restore();

            ctx.save();
            ctx.globalAlpha = alpha * 0.55;
            ctx.fillStyle = '#6a1010';
            ctx.fillRect(px - 10, py + 10, 20, 8);
            ctx.restore();
            return;
        }

        const blink = this.invincibleTimer > 0
            && this.damageFlashTimer <= 0
            && Math.floor(this.invincibleTimer * 18) % 2 === 0;
        const damageFlashOn = this.damageFlashTimer > 0
            && Math.floor(this.damageFlashTimer * 22) % 2 === 0;
        const healT = this.healFlashTimer > 0
            ? clamp(this.healFlashTimer / (CONFIG.PLAYER.HEAL_FLASH_TIME || 0.5), 0, 1)
            : 0;
        const px = Math.floor(this.x);
        const py = Math.floor(this.y);

        const sprite = this.state === PlayerState.ATTACKING
            ? SPRITES.ninja.attack[Math.floor(Date.now() / 80) % SPRITES.ninja.attack.length]
            : SPRITES.ninja.idle[Math.floor(Date.now() / 180) % SPRITES.ninja.idle.length];
        const alpha = blink ? 0.55 : 1;
        let tint = 0;
        let tintR = 255;
        let tintG = 72;
        let tintB = 72;
        if (damageFlashOn) {
            tint = 0.72;
        } else if (healT > 0) {
            tint = 0.62 * healT;
            tintR = 80;
            tintG = 230;
            tintB = 130;
        }
        drawSprite(ctx, sprite, px, py, this.spriteScale, alpha, false, tint, tintR, tintG, tintB);

        if (healT > 0) {
            ctx.save();
            ctx.globalAlpha = 0.28 * healT;
            const glow = ctx.createRadialGradient(px, py, 4, px, py, this.effectiveRadius + 18);
            glow.addColorStop(0, 'rgba(140, 255, 180, 0.85)');
            glow.addColorStop(1, 'rgba(80, 200, 120, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(px, py, this.effectiveRadius + 16, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        this._drawHpBar(ctx);

        if (this.holyShieldCharges > 0) {
            ctx.save();
            ctx.strokeStyle = 'rgba(120, 200, 255, 0.85)';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(px, py, this.effectiveRadius + 10, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = 'rgba(90, 170, 255, 0.18)';
            ctx.fill();
            ctx.restore();
        }

        if (this.getUpgradeLevel('luck') > 0) {
            const lv = this.getUpgradeLevel('luck');
            for (let i = 0; i < Math.min(8, lv * 2); i++) {
                const a = Date.now() * 0.002 + i * 0.6;
                const rx = this.x + Math.cos(a) * (6 + i * 1.3);
                const ry = this.y + 12 + Math.sin(a * 0.8) * 4;
                ctx.fillStyle = 'rgba(90,170,255,0.22)';
                ctx.fillRect(Math.floor(rx), Math.floor(ry), 3, 3);
            }
        }

        if (this.shadowClones.length) {
            for (const c of this.shadowClones) {
                ctx.save();
                ctx.globalAlpha = 0.35;
                drawSprite(ctx, SPRITES.ninja.idle[0], Math.floor(c.x), Math.floor(c.y), this.spriteScale * 0.92);
                ctx.restore();
            }
        }
    }
}


// ---- monster.js ----
const MonsterKind = {
    NORMAL: 'NORMAL',
    ELITE: 'ELITE',
    SHIELD: 'SHIELD',
    BERSERKER: 'BERSERKER',
    SPLITTER: 'SPLITTER',
    ARCHER: 'ARCHER',
    FIRE_MAGE: 'FIRE_MAGE',
};

let nextMonsterId = 1;

class Monster {
    constructor(x, y, kind, splitTier = 0, stageStatScale = null) {
        this.game = null;
        this.id = nextMonsterId++;
        this.kind = kind;
        this.splitTier = splitTier;
        this.base = CONFIG.MONSTERS[kind];
        this.stageStatScale = stageStatScale || { hp: 1, def: 1 };

        const splitScale = kind === MonsterKind.SPLITTER ? Math.pow(0.72, splitTier) : 1;
        const hpMul = (kind === MonsterKind.SPLITTER ? Math.pow(0.66, splitTier) : 1) * this.stageStatScale.hp;
        const defMul = (kind === MonsterKind.SPLITTER ? Math.pow(0.86, splitTier) : 1) * this.stageStatScale.def;
        this.maxHp = Math.max(8, Math.round(this.base.hp * hpMul));
        this.hp = this.maxHp;
        this.def = Math.max(0, Math.round(this.base.def * defMul));
        const unitScale = CONFIG.DISPLAY.UNIT_SCALE || 1;
        this.size = Math.max(6, Math.round(this.base.size * splitScale * unitScale));
        this.speed = this.base.speed * (kind === MonsterKind.SPLITTER ? 1 + splitTier * 0.08 : 1);
        this.color = this.base.color;

        this.x = x;
        this.y = y;
        this.facing = randRange(0, Math.PI * 2);
        this.moveDir = randRange(0, Math.PI * 2);
        this.moveTimer = randRange(0.6, 1.4);
        this.walkPhase = randRange(0, Math.PI * 2);
        this.animPulse = randRange(0, Math.PI * 2);

        this.alive = true;
        this.dying = false;
        this.deathDelay = 0;
        this.deathTimer = 0;
        this.deathFade = CONFIG.MONSTER_DEATH_FADE;
        this.spawnedChildren = false;
        this.frozenTimer = 0;
        this.slowTimer = 0;
        this.slowMult = 1;
        this.vulnerableMark = false;
        this.spawning = false;
        this.spawnTimer = 0;
        this.spawnDuration = 0;
        this.failThrowTimer = 0;
        this.pathTargetHighlight = false;
        this.attackDamage = this.base.attack || 10;
        this.attackInterval = this.base.attackInterval || 1.1;
        this.attackCooldown = randRange(0.2, this.attackInterval);
        this.shieldIntact = kind === MonsterKind.SHIELD;
        this.shieldBreakAnim = 0;
    }

    beginSpawn(duration = CONFIG.MONSTER_SPAWN_ANIM) {
        this.spawning = true;
        this.spawnTimer = duration;
        this.spawnDuration = duration;
    }

    getSpawnVisual() {
        if (!this.spawning) return { scale: 1, alpha: 1 };
        const t = 1 - clamp(this.spawnTimer / Math.max(0.001, this.spawnDuration), 0, 1);
        return {
            scale: 0.35 + 0.65 * easeOutQuad(t),
            alpha: clamp(t * 1.15, 0, 1),
        };
    }

    get hitboxRadius() {
        return this.size;
    }

    canSplit() {
        return this.kind === MonsterKind.SPLITTER && this.splitTier < this.base.maxSplitTier;
    }

    freeze(duration) {
        this.frozenTimer = Math.max(this.frozenTimer, duration);
    }

    isFrozen() {
        return this.frozenTimer > 0;
    }

    slow(duration, speedMult = 0.45) {
        this.slowTimer = Math.max(this.slowTimer, duration);
        this.slowMult = Math.min(this.slowMult ?? 1, speedMult);
    }

    _isShieldFacingLocked() {
        if (this.kind !== MonsterKind.SHIELD || !this.game) return false;
        const p = this.game.player;
        const combat = this.game.combat;
        if (!p || !combat) return false;
        if (p.state === PlayerState.BULLET_TIME || p.state === PlayerState.ATTACKING) return true;
        if (!combat.roundAttackResolved || combat.isResolving()) return true;
        return false;
    }

    _move(dt, w, h, playBottom, playerTarget) {
        if (!playerTarget) return;
        this.walkPhase += dt * 7;
        this.animPulse += dt * 3.6;

        const dx = playerTarget.x - this.x;
        const dy = playerTarget.y - this.y;
        const distToPlayer = Math.hypot(dx, dy);
        if (distToPlayer < 0.001) return;

        if (!this._isShieldFacingLocked()) {
            this.moveDir = Math.atan2(dy, dx);
            this.facing = this.moveDir;
        }

        let stopDist;
        if (this._isRangedKind()) {
            stopDist = this.base.attackRange || 165;
            if (distToPlayer <= stopDist) return;
        } else {
            stopDist = this.hitboxRadius + (playerTarget.effectiveRadius || 12) + 2;
        }

        let moveSpeed = this.speed;
        if (this.slowTimer > 0) moveSpeed *= this.slowMult ?? 0.45;
        const step = Math.min(moveSpeed * dt, Math.max(0, distToPlayer - stopDist));
        this.x += Math.cos(this.moveDir) * step;
        this.y += Math.sin(this.moveDir) * step;

        const margin = 24;
        const top = 84;
        const bottom = Math.max(top + 60, playBottom - 20);
        if (this.x < margin || this.x > w - margin) {
            this.x = clamp(this.x, margin, w - margin);
        }
        if (this.y < top || this.y > bottom) {
            this.y = clamp(this.y, top, bottom);
        }
    }

    _isRangedKind() {
        return this.kind === MonsterKind.ARCHER || this.kind === MonsterKind.FIRE_MAGE;
    }

    _canRangedAttack(playerTarget) {
        if (!playerTarget || !playerTarget.player) return false;
        const player = playerTarget.player;
        if (player.hp <= 0 || player.state === PlayerState.BULLET_TIME || player.isAttackInvincible?.()) return false;
        const attackRange = this.base.attackRange || 165;
        return dist(this.x, this.y, playerTarget.x, playerTarget.y) <= attackRange;
    }

    _canArcherShoot(playerTarget) {
        return this._canRangedAttack(playerTarget);
    }

    _shootArrow(playerTarget) {
        if (!this.game || !this.game.projectiles) return;
        const muzzle = this.hitboxRadius + 6;
        this.game.projectiles.spawnArrow({
            x: this.x + Math.cos(this.facing) * muzzle,
            y: this.y + Math.sin(this.facing) * muzzle,
            targetX: playerTarget.x,
            targetY: playerTarget.y,
            speed: this.base.arrowSpeed || CONFIG.ARROW.SPEED || 340,
            damage: this.attackDamage,
        });
        if (this.game.particles) {
            this.game.particles.spawnEffect(
                this.x + Math.cos(this.facing) * muzzle,
                this.y + Math.sin(this.facing) * muzzle,
                '#c8b890'
            );
        }
    }

    _castFirePillar(playerTarget) {
        if (!this.game?.groundEffects) return;
        this.game.groundEffects.spawnFirePillar(playerTarget.x, playerTarget.y, this.attackDamage);
        const handX = this.x + Math.cos(this.facing) * (this.hitboxRadius + 4);
        const handY = this.y + Math.sin(this.facing) * (this.hitboxRadius + 4);
        if (this.game.particles) {
            this.game.particles.spawnEffect(handX, handY, '#c03030');
            this.game.particles.spawnEffect(handX, handY - 4, '#ff5040');
        }
    }

    _canAttackPlayer(playerTarget) {
        if (!playerTarget || !playerTarget.player) return false;
        const player = playerTarget.player;
        if (player.hp <= 0 || player.state === PlayerState.BULLET_TIME || player.isAttackInvincible?.()) return false;
        const reach = this.hitboxRadius + player.effectiveRadius + 4;
        return dist(this.x, this.y, playerTarget.x, playerTarget.y) <= reach;
    }

    _attackPlayer(playerTarget) {
        const player = playerTarget.player;
        const dmg = player.takeDamage(this.attackDamage);
        if (dmg > 0 && this.game) {
            this.game.combat.spawnDamageNumber(player.x, player.y - player.effectiveRadius - 8, dmg, false, '#e05840');
            this.game.particles.hitSpark(player.x, player.y, false);
            this.game.renderer.shake(CONFIG.SHAKE.NORMAL.magnitude * 0.6, CONFIG.SHAKE.NORMAL.duration * 0.8);
        }
    }

    update(dt, w, h, playBottom, playerTarget) {
        if (!this.alive) return;
        if (this.failThrowTimer > 0) {
            this.failThrowTimer -= dt;
            return;
        }
        if (this.spawning) {
            this.spawnTimer -= dt;
            if (this.spawnTimer <= 0) this.spawning = false;
            return;
        }
        if (this.dying) {
            if (this.deathDelay > 0) {
                this.deathDelay -= dt;
                return;
            }
            this.deathTimer -= dt;
            if (this.deathTimer <= 0) this.alive = false;
            return;
        }
        if (this.frozenTimer > 0) {
            this.frozenTimer -= dt;
            return;
        }
        if (this.slowTimer > 0) {
            this.slowTimer -= dt;
            if (this.slowTimer <= 0) this.slowMult = 1;
        }
        if (this.shieldBreakAnim > 0) this.shieldBreakAnim -= dt;
        if (this.base.canMove) this._move(dt, w, h, playBottom, playerTarget);

        if (playerTarget) {
            this.attackCooldown -= dt;
            if (this.attackCooldown <= 0) {
                if (this._isRangedKind()) {
                    if (this._canRangedAttack(playerTarget)) {
                        if (this.kind === MonsterKind.ARCHER) {
                            this._shootArrow(playerTarget);
                        } else if (this.kind === MonsterKind.FIRE_MAGE) {
                            this._castFirePillar(playerTarget);
                        }
                        this.attackCooldown = this.attackInterval;
                    }
                } else if (this._canAttackPlayer(playerTarget)) {
                    this._attackPlayer(playerTarget);
                    this.attackCooldown = this.attackInterval;
                }
            }
        }
    }

    _spawnShieldBreakFx() {
        if (!this.game?.particles) return;
        const px = Math.max(2, Math.round(this.hitboxRadius / 4));
        const fx = Math.cos(this.facing) * (this.hitboxRadius + px * 2);
        const fy = Math.sin(this.facing) * (this.hitboxRadius + px * 2);
        const bx = this.x + fx;
        const by = this.y + fy;
        const colors = ['#8ab0d0', '#c8e0f8', '#e8f4ff', '#5a7898'];
        for (let i = 0; i < 18; i++) {
            const a = this.facing + randRange(-1.1, 1.1);
            const spd = randRange(60, 180);
            this.game.particles.emit(
                bx, by,
                Math.cos(a) * spd, Math.sin(a) * spd,
                randRange(0.2, 0.45), randRange(3, 7),
                colors[Math.floor(Math.random() * colors.length)],
                0, true, false
            );
        }
        this.game.renderer?.shake(3, 0.08);
    }

    _drawShieldBreakDebris(ctx, x, y, r, alpha) {
        const px = Math.max(2, Math.round(r / 4));
        const facing = this.facing;
        const dist = r + px * 2.5;
        const t = this.shieldBreakAnim > 0
            ? clamp(this.shieldBreakAnim / 0.35, 0, 1)
            : 0;
        if (t <= 0) return;

        ctx.save();
        ctx.globalAlpha = alpha * t;
        ctx.translate(x, y);
        ctx.rotate(facing);
        const sx = Math.floor(dist - px);
        const sy = Math.floor(-px * 4);
        const debris = ['#4a6888', '#8ab0d0', '#c8e0f8', '#3a5878'];
        for (let i = 0; i < 10; i++) {
            ctx.fillStyle = debris[i % debris.length];
            ctx.fillRect(
                sx + ((i * 5) % 14) - 4 + (1 - t) * 6,
                sy + (i % 4) * px + (1 - t) * 8,
                px,
                px
            );
        }
        ctx.restore();
    }

    _drawShieldPlate(ctx, x, y, r, alpha) {
        if (!this.shieldIntact) {
            this._drawShieldBreakDebris(ctx, x, y, r, alpha);
            return;
        }

        const px = Math.max(2, Math.round(r / 4));
        const facing = this.facing;
        const dist = r + px * 2.5;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(x, y);
        ctx.rotate(facing);
        ctx.imageSmoothingEnabled = false;

        const pattern = [
            '..OOO..',
            '.OOOOO.',
            'OOOOOOO',
            'OHHHHHO',
            'OHHHHHO',
            'OOOOOOO',
            '.OOOOO.',
            '..O.O..',
            '...O...',
        ];
        const palette = {
            O: ['#4a6888', '#8ab0d0', '#c8e0f8'],
            H: ['#5a7898', '#a8c8e8', '#f0f8ff'],
        };
        const cols = pattern[0].length;
        const rows = pattern.length;
        const w = cols * px;
        const h = rows * px;
        const sx = Math.floor(dist - px);
        const sy = Math.floor(-h / 2);

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const ch = pattern[row][col];
                if (ch === '.') continue;
                const colors = palette[ch] || palette.O;
                const edge = row === 0 || col === 0 || col === cols - 1 || pattern[row][col - 1] === '.' || pattern[row][col + 1] === '.';
                const hi = ch === 'H' && col >= 2 && col <= 4 && row >= 2 && row <= 4;
                ctx.fillStyle = edge ? colors[0] : (hi ? colors[2] : colors[1]);
                ctx.fillRect(sx + col * px, sy + row * px, px, px);
            }
        }

        // 盾心十字
        const cx = sx + Math.floor(w * 0.5) - px;
        const cy = sy + Math.floor(h * 0.42);
        ctx.fillStyle = '#3a5878';
        ctx.fillRect(cx, cy - px * 2, px, px * 5);
        ctx.fillRect(cx - px * 2, cy, px * 5, px);
        ctx.fillStyle = '#e8f4ff';
        ctx.fillRect(cx, cy - px, px, px * 3);
        ctx.fillRect(cx - px, cy, px * 3, px);

        ctx.restore();
    }

    takeDamage(rawDamage, hitAngle = null) {
        if (this.kind === MonsterKind.SHIELD && this.shieldIntact) {
            this.shieldIntact = false;
            this.shieldBreakAnim = 0.35;
            this._spawnShieldBreakFx();
            return { actualDamage: 0, blockedByShield: true, shieldBroken: true };
        }

        const vulnerableMult = this.vulnerableMark ? 2 : 1;
        this.vulnerableMark = false;
        const actualDamage = Math.max(1, Math.round((rawDamage - this.def) * vulnerableMult));
        this.hp -= actualDamage;
        if (this.hp <= 0) {
            this.hp = 0;
            this.dying = true;
            this.deathFade = CONFIG.MONSTER_DEATH_FADE;
            this.deathTimer = this.deathFade;
            this.deathDelay = (this.game && this.game.combat)
                ? this.game.combat.scheduleDeathFade()
                : 0;
        }
        return { actualDamage, blockedByShield: false };
    }

    draw(ctx) {
        if (!this.alive) return;
        const spawnVis = this.getSpawnVisual();
        const fadeDur = this.deathFade || CONFIG.MONSTER_DEATH_FADE;
        const deathAlpha = this.dying
            ? (this.deathDelay > 0 ? 1 : clamp(this.deathTimer / fadeDur, 0, 1))
            : 1;
        const alpha = deathAlpha * spawnVis.alpha;
        const bobY = this.dying || this.spawning ? 0 : Math.sin(this.walkPhase) * 1.6;
        const x = Math.floor(this.x);
        const y = Math.floor(this.y + bobY);
        const r = this.hitboxRadius;
        const spriteSet = this._getSpriteSet();
        const frameIdx = Math.floor(this.walkPhase * 0.22) % 2;
        const sprite = (spriteSet.idle || [])[frameIdx % (spriteSet.idle || [spriteSet]).length] || spriteSet;
        const scale = clamp(Math.round(this.size / 4), 2, 6);
        const flipX = Math.cos(this.facing) < 0;
        let tint = 0;
        let tintR = 255;
        let tintG = 72;
        let tintB = 72;
        const frozen = this.isFrozen();
        if (frozen) {
            tint = 0.82;
            tintR = 72;
            tintG = 168;
            tintB = 255;
        } else if (this.kind === MonsterKind.BERSERKER) {
            tint = 0.16;
        } else if (this.kind === MonsterKind.FIRE_MAGE) {
            tint = 0.52;
            tintR = 90;
            tintG = 12;
            tintB = 18;
        }

        ctx.save();
        if (spawnVis.scale !== 1) {
            ctx.translate(x, y);
            ctx.scale(spawnVis.scale, spawnVis.scale);
            ctx.translate(-x, -y);
        }
        if (this.spawning) {
            const ringR = r * (1.4 - spawnVis.scale * 0.5);
            ctx.strokeStyle = `rgba(255, 220, 140, ${0.35 * spawnVis.alpha})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y, ringR, 0, Math.PI * 2);
            ctx.stroke();
        }
        if (this.pathTargetHighlight) {
            ctx.save();
            ctx.globalAlpha = alpha;
            const startX = x - (sprite[0].length * scale) / 2;
            const startY = y - (sprite.length * scale) / 2;
            for (let row = 0; row < sprite.length; row++) {
                for (let col = 0; col < sprite[0].length; col++) {
                    const color = sprite[row][flipX ? sprite[0].length - 1 - col : col];
                    if (!color) continue;
                    ctx.fillStyle = tintHexColor(color, 210, 210, 218, 0.78);
                    ctx.fillRect(
                        Math.floor(startX + col * scale),
                        Math.floor(startY + row * scale),
                        scale,
                        scale
                    );
                }
            }
            ctx.restore();
        } else {
            drawSprite(ctx, sprite, x, y, scale, alpha, flipX, tint, tintR, tintG, tintB);
        }

        const failDeath = this.game && this.game.failDeath;
        if (failDeath && failDeath.isThrowing() && this.failThrowTimer > 0) {
            failDeath.drawMonsterThrowSpear(ctx, this);
        }

        if (this.kind === MonsterKind.SHIELD) {
            this._drawShieldPlate(ctx, x, y, r, alpha);
        } else if (this.kind === MonsterKind.BERSERKER) {
            ctx.fillStyle = '#ff8a68';
            ctx.fillRect(x - 2, y - r - 4, 4, 4);
        } else if (this.kind === MonsterKind.SPLITTER) {
            ctx.fillStyle = '#d2f6a8';
            ctx.fillRect(x - 2, y - 2, 4, 4);
            ctx.fillRect(x + 3, y - 2, 3, 3);
            if (this.splitTier > 0) {
                ctx.fillStyle = '#4e7c38';
                ctx.fillRect(x - 6, y + r * 0.5, 3, 3);
            }
        } else if (this.kind === MonsterKind.ARCHER) {
            ctx.strokeStyle = '#8a6848';
            ctx.lineWidth = 2;
            const bx = x + Math.cos(this.facing) * (r + 1);
            const by = y + Math.sin(this.facing) * (r + 1);
            ctx.beginPath();
            ctx.arc(bx, by, r * 0.55, this.facing - 1.1, this.facing + 1.1);
            ctx.stroke();
        } else if (this.kind === MonsterKind.FIRE_MAGE) {
            const sx = x + Math.cos(this.facing) * (r + 2);
            const sy = y + Math.sin(this.facing) * (r + 2);
            ctx.fillStyle = '#281010';
            ctx.fillRect(Math.floor(sx - 1), Math.floor(sy - 5), 3, 8);
            ctx.fillStyle = '#a02828';
            ctx.fillRect(Math.floor(sx), Math.floor(sy - 7), 2, 3);
            ctx.fillStyle = '#ff4030';
            ctx.fillRect(Math.floor(sx), Math.floor(sy - 9), 2, 2);
        }

        if (frozen) {
            this._drawIceCover(ctx, x, y, r, scale, alpha);
        }

        if (!this.dying && this.hp < this.maxHp) {
            const w = Math.max(18, r * 1.6);
            const h = 4;
            const bx = x - w / 2;
            const by = y - r - 14;
            const ratio = this.hp / this.maxHp;
            ctx.fillStyle = '#231a14';
            ctx.fillRect(bx, by, w, h);
            ctx.fillStyle = ratio > 0.5 ? '#68d070' : ratio > 0.25 ? '#f0c850' : '#e05840';
            ctx.fillRect(bx, by, w * ratio, h);
        }
        ctx.restore();
    }

    _drawIceCover(ctx, x, y, r, scale, alpha) {
        const pulse = 0.88 + Math.sin(Date.now() * 0.009) * 0.12;
        const iceR = (r + 8) * pulse;

        ctx.save();
        ctx.globalAlpha = alpha;

        const glow = ctx.createRadialGradient(x, y, 1, x, y, iceR);
        glow.addColorStop(0, 'rgba(210, 245, 255, 0.92)');
        glow.addColorStop(0.45, 'rgba(88, 175, 255, 0.72)');
        glow.addColorStop(0.78, 'rgba(48, 120, 220, 0.45)');
        glow.addColorStop(1, 'rgba(24, 72, 160, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, iceR, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = alpha * 0.9;
        ctx.strokeStyle = 'rgba(200, 240, 255, 0.95)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, r + 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(120, 200, 255, 0.55)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.arc(x, y, r + 9, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        const px = Math.max(3, Math.round(scale * 0.9));
        const shardColors = ['#e8ffff', '#b8f0ff', '#78d8ff', '#c8f8ff'];
        const seed = Math.floor(this.id * 17.3);
        for (let i = 0; i < 16; i++) {
            const a = (i / 16) * Math.PI * 2 + seed * 0.1;
            const distR = r * (0.35 + ((i * 7 + seed) % 5) * 0.12);
            const sx = Math.floor(x + Math.cos(a) * distR);
            const sy = Math.floor(y + Math.sin(a) * distR * 0.92);
            ctx.fillStyle = shardColors[i % shardColors.length];
            ctx.fillRect(sx - px, sy - px, px * 2, px * 2);
            if (i % 3 === 0) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(sx, sy - 1, Math.max(2, px - 1), Math.max(2, px - 1));
            }
        }

        ctx.fillStyle = 'rgba(160, 220, 255, 0.35)';
        ctx.fillRect(x - r - 2, y - 2, (r + 2) * 2, 4);
        ctx.fillRect(x - 2, y - r - 2, 4, (r + 2) * 2);

        ctx.restore();
    }

    _getSpriteSet() {
        switch (this.kind) {
            case MonsterKind.NORMAL: return SPRITES.normalMelee;
            case MonsterKind.ELITE: return SPRITES.strongMelee;
            case MonsterKind.SHIELD: return SPRITES.strongRanged;
            case MonsterKind.BERSERKER: return SPRITES.strongMelee;
            case MonsterKind.SPLITTER: return SPRITES.normalRanged;
            case MonsterKind.ARCHER: return SPRITES.normalRanged;
            case MonsterKind.FIRE_MAGE: return SPRITES.strongRanged;
            default: return SPRITES.normalMelee;
        }
    }
}


// ---- bossCentipede.js ----
let nextBossSegmentId = 100000;

class CentipedeSegment {
    constructor(boss, index, radius) {
        this.boss = boss;
        this.id = nextBossSegmentId++;
        this.index = index;
        this.x = 0;
        this.y = 0;
        this.def = 0;
        this.hitboxRadius = radius;
        this.size = radius;
        this.alive = true;
        this.dying = false;
        this._deathHandled = false;
        this.color = '#3d5a48';
        this.frozenTimer = 0;
        this.slowTimer = 0;
        this.slowMult = 1;
        this.vulnerableMark = false;
        this.pathTargetHighlight = false;
        this.isBossSegment = true;
        this.kind = 'BOSS_SEGMENT';
    }

    canSplit() {
        return false;
    }

    freeze(duration) {
        this.frozenTimer = Math.max(this.frozenTimer, duration);
    }

    isFrozen() {
        return this.frozenTimer > 0;
    }

    slow(duration, speedMult = 0.45) {
        this.slowTimer = Math.max(this.slowTimer, duration);
        this.slowMult = Math.min(this.slowMult ?? 1, speedMult);
    }

    takeDamage(rawDamage, hitAngle) {
        return this.boss.applyDamage(rawDamage, this);
    }

    update(dt) {
        if (!this.alive) return;
        if (this.frozenTimer > 0) this.frozenTimer -= dt;
        if (this.slowTimer > 0) {
            this.slowTimer -= dt;
            if (this.slowTimer <= 0) this.slowMult = 1;
        }
    }

    draw(ctx) {
        if (!this.alive) return;
        const alpha = this.boss.getBodyDrawAlpha();
        if (alpha <= 0) return;

        const segAng = this.boss.getSegmentAngle(this.index);
        const r = this.hitboxRadius;
        const w = r * 2.1;
        const h = r * 1.55;
        const frozen = this.isFrozen();

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(this.x, this.y);
        ctx.rotate(segAng);
        if (this.pathTargetHighlight) {
            ctx.shadowColor = '#ffe878';
            ctx.shadowBlur = 10;
        }

        ctx.fillStyle = frozen ? '#5a88b8' : '#2a3830';
        ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.fillStyle = frozen ? '#88c8f0' : '#4a6858';
        ctx.fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 5);
        ctx.fillStyle = frozen ? '#b8e8ff' : '#6a9078';
        ctx.fillRect(-w / 2 + 4, -h / 2 + 3, w - 8, Math.max(2, h * 0.35));

        const legN = 4;
        ctx.fillStyle = '#1a2820';
        for (let i = 0; i < legN; i++) {
            const lx = -w / 2 + (i + 0.5) * (w / legN);
            ctx.fillRect(lx - 1, h / 2 - 1, 2, 4);
            ctx.fillRect(lx - 1, -h / 2 - 3, 2, 4);
        }

        if (frozen) {
            ctx.strokeStyle = 'rgba(200, 240, 255, 0.75)';
            ctx.lineWidth = 2;
            ctx.strokeRect(-w / 2, -h / 2, w, h);
        }

        ctx.restore();
    }
}

class CentipedeBoss {
    constructor(game, w, h, playBottom, safeZone, stageStatScale) {
        this.game = game;
        this.w = w;
        this.h = h;
        this.top = 88;
        this.bottom = playBottom;
        this.cfg = CONFIG.BOSS.CENTIPEDE;
        this.name = this.cfg.name;
        this.stageStatScale = stageStatScale || { hp: 1, def: 1 };

        this.phase = 'warning';
        this.warningTimer = this.cfg.warningTime || 3;
        this.warningPulse = 0;
        this.segments = [];
        this.bullets = [];
        this.crawlProgress = 0;
        this.crawlSpeed = this.cfg.crawlSpeed || 240;
        this.pathStart = { x: 0, y: 0 };
        this.pathEnd = { x: 0, y: 0 };
        this.pathLength = 1;
        this.bodySpan = 0.85;
        this.crawlPause = 0;
        this.shootTimer = 0;
        this.defeated = false;
        this._defeatRewarded = false;
        this.hp = 0;
        this.maxHp = 0;
        this.def = 0;
        this.deathFadeDur = CONFIG.MONSTER_DEATH_FADE;
        this.deathFadeTimer = 0;

        const py = safeZone ? safeZone.y : h * 0.5;
        const px = safeZone ? safeZone.x : w * 0.5;
        this.pathPlayer = { x: px, y: py };

        this._initSegments();
        this._buildCrawlPath();
    }

    _initSegments() {
        const playH = this.bottom - this.top;
        const spacing = this.cfg.segmentSpacing || 28;
        const lengthScale = this.cfg.lengthScale ?? 1;
        const count = Math.max(12, Math.floor((playH / spacing) * lengthScale));
        const hpEach = Math.round((this.cfg.segmentHp || 300) * this.stageStatScale.hp);
        const defEach = Math.max(1, Math.round((this.cfg.segmentDef || 3) * this.stageStatScale.def));
        const radius = this.cfg.segmentRadius || 15;

        const hpScale = this.cfg.hpScale ?? 1;
        this.maxHp = Math.round(count * hpEach * hpScale);
        this.hp = this.maxHp;
        this.def = defEach;

        this.segments = [];
        for (let i = 0; i < count; i++) {
            this.segments.push(new CentipedeSegment(this, i, radius));
        }
        this.bodySpan = count > 1 ? (count - 1) * spacing / Math.max(1, this.pathLength) : 0.5;
    }

    applyDamage(rawDamage, hitSegment) {
        if (this.defeated || this.phase !== 'active') {
            return { actualDamage: 0, blockedByShield: false };
        }
        const vulnerableMult = hitSegment.vulnerableMark ? 2 : 1;
        hitSegment.vulnerableMark = false;
        const actualDamage = Math.max(1, Math.round((rawDamage - this.def) * vulnerableMult));
        this.hp = Math.max(0, this.hp - actualDamage);
        if (this.hp <= 0) this._defeat();
        return { actualDamage, blockedByShield: false };
    }

    getBodyDrawAlpha() {
        if (this.phase === 'active') return 1;
        if (this.phase === 'dead') {
            return clamp(this.deathFadeTimer / this.deathFadeDur, 0, 1);
        }
        return 0;
    }

    _buildCrawlPath() {
        const p = this.game && this.game.player;
        if (p) {
            this.pathPlayer.x = p.homeX;
            this.pathPlayer.y = p.homeY;
        }
        const margin = 58;
        const px = this.pathPlayer.x;
        const py = this.pathPlayer.y;
        const side = randInt(0, 3);
        let ex;
        let ey;

        if (side === 0) {
            ex = randRange(margin, this.w - margin);
            ey = this.top - margin;
        } else if (side === 1) {
            ex = randRange(margin, this.w - margin);
            ey = this.bottom + margin;
        } else if (side === 2) {
            ex = -margin;
            ey = randRange(this.top + margin, this.bottom - margin);
        } else {
            ex = this.w + margin;
            ey = randRange(this.top + margin, this.bottom - margin);
        }

        const ang = Math.atan2(py - ey, px - ex);
        const back = margin + 45;
        const forward = (this.bottom - this.top) + margin * 2 + 100;
        this.pathStart = {
            x: ex - Math.cos(ang) * back,
            y: ey - Math.sin(ang) * back,
        };
        this.pathEnd = {
            x: ex + Math.cos(ang) * forward,
            y: ey + Math.sin(ang) * forward,
        };
        this.pathLength = Math.max(80, dist(
            this.pathStart.x, this.pathStart.y,
            this.pathEnd.x, this.pathEnd.y
        ));
        const spacing = this.cfg.segmentSpacing || 28;
        const count = this.segments.length;
        this.bodySpan = count > 1 ? ((count - 1) * spacing) / this.pathLength : 0.5;
    }

    _posOnPath(t) {
        const tt = clamp(t, 0, 1);
        return {
            x: lerp(this.pathStart.x, this.pathEnd.x, tt),
            y: lerp(this.pathStart.y, this.pathEnd.y, tt),
        };
    }

    getSegmentAngle(index) {
        const t0 = clamp(this.crawlProgress - (index / Math.max(1, this.segments.length - 1)) * this.bodySpan, 0, 1);
        const t1 = clamp(t0 + 0.02, 0, 1);
        const p0 = this._posOnPath(t0);
        const p1 = this._posOnPath(t1);
        return Math.atan2(p1.y - p0.y, p1.x - p0.x);
    }

    _updateSegmentPositions() {
        const n = this.segments.length;
        for (let i = 0; i < n; i++) {
            const seg = this.segments[i];
            const offset = n > 1 ? (i / (n - 1)) * this.bodySpan : 0;
            const t = clamp(this.crawlProgress - offset, 0, 1);
            const pos = this._posOnPath(t);
            seg.x = pos.x;
            seg.y = pos.y;
        }
    }

    get totalHp() {
        return this.hp;
    }

    get maxTotalHp() {
        return this.maxHp;
    }

    get hpRatio() {
        return this.maxHp > 0 ? clamp(this.hp / this.maxHp, 0, 1) : 0;
    }

    isDefeated() {
        return this.defeated;
    }

    getActiveSegments() {
        if (this.phase !== 'active') return [];
        return this.segments;
    }

    activate() {
        this.phase = 'active';
        this.crawlProgress = 0;
        this.crawlPause = 0;
        this._buildCrawlPath();
        this._updateSegmentPositions();
    }

    _shootBullet(playerTarget) {
        if (!playerTarget) return;
        const live = this.getActiveSegments();
        if (!live.length) return;
        const spd = this.cfg.bulletSpeed || 200;
        const count = this.cfg.bulletsPerShot || 1;
        for (let n = 0; n < count; n++) {
            const seg = live[randInt(0, live.length - 1)];
            const dir = normalize(playerTarget.x - seg.x, playerTarget.y - seg.y);
            this.bullets.push({
                x: seg.x,
                y: seg.y,
                vx: dir.x * spd,
                vy: dir.y * spd,
                radius: this.cfg.bulletRadius || 5,
                damage: this.cfg.bulletDamage || 8,
                life: this.cfg.bulletLife ?? 4,
            });
        }
    }

    _updateBullets(dt, playerTarget) {
        const player = playerTarget && playerTarget.player;
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            b.life -= dt;
            if (b.life <= 0
                || b.x < -30 || b.x > this.w + 30
                || b.y < -30 || b.y > this.h + 30) {
                this.bullets.splice(i, 1);
                continue;
            }
            if (!player || player.hp <= 0) continue;
            const pr = player.effectiveRadius || 14;
            if (dist(b.x, b.y, player.x, player.y) <= b.radius + pr * 0.55) {
                const dmg = player.takeDamage(b.damage);
                if (dmg > 0 && this.game) {
                    this.game.combat.spawnDamageNumber(
                        player.x, player.y - pr - 8, dmg, false, '#e05840'
                    );
                    this.game.particles.hitSpark(player.x, player.y, false);
                    this.game.renderer.shake(
                        CONFIG.SHAKE.NORMAL.magnitude * 0.55,
                        CONFIG.SHAKE.NORMAL.duration * 0.7
                    );
                }
                this.bullets.splice(i, 1);
            }
        }
    }

    _defeat() {
        if (this.defeated) return;
        this.hp = 0;
        this.defeated = true;
        this.phase = 'dead';
        this.deathFadeTimer = this.deathFadeDur;
        this.bullets = [];

        let cx = 0;
        let cy = 0;
        for (const seg of this.segments) {
            cx += seg.x;
            cy += seg.y;
        }
        const n = this.segments.length;
        if (n > 0) {
            cx /= n;
            cy /= n;
            const combat = this.game && this.game.combat;
            const player = this.game && this.game.player;
            const hitAngle = player
                ? angle(player.x, player.y, cx, cy)
                : Math.random() * Math.PI * 2;
            if (combat) {
                this.game.bloodStains.spawn(cx, cy, 1.5, hitAngle);
                this.game.particles.deathEffect(cx, cy, '#3d5a48');
            }
        }

        if (!this._defeatRewarded && this.game.experience) {
            this._defeatRewarded = true;
            const bonus = this.cfg.defeatExp || 120;
            this.game.experience.addExp(bonus);
            if (this.game.player) {
                this.game.player.queueMessage(`${this.name} 击破!`);
            }
        }
    }

    update(dt, playerTarget) {
        if (this.phase === 'warning') {
            this.warningTimer -= dt;
            this.warningPulse += dt * 5;
            if (this.warningTimer <= 0) this.activate();
            return;
        }
        if (this.phase === 'dead') {
            this.deathFadeTimer -= dt;
            if (this.deathFadeTimer <= 0) {
                for (const seg of this.segments) seg.alive = false;
            }
            return;
        }

        if (this.crawlPause > 0) {
            this.crawlPause -= dt;
        } else {
            this.crawlProgress += (dt * this.crawlSpeed) / this.pathLength;
            if (this.crawlProgress >= 1 + this.bodySpan) {
                this.crawlProgress = 0;
                this.crawlPause = this.cfg.crawlGap || 0.55;
                this._buildCrawlPath();
            }
        }

        this._updateSegmentPositions();

        for (const seg of this.segments) seg.update(dt);

        this.shootTimer -= dt;
        if (this.shootTimer <= 0 && this.crawlPause <= 0) {
            this._shootBullet(playerTarget);
            this.shootTimer = this.cfg.bulletInterval || 0.4;
        }

        this._updateBullets(dt, playerTarget);
    }

    drawWarningOverlay(ctx) {
        const pulse = 0.45 + Math.sin(this.warningPulse) * 0.35;
        const border = Math.max(6, Math.floor(10 + pulse * 8));
        ctx.save();
        ctx.strokeStyle = `rgba(255, 40, 40, ${0.5 + pulse * 0.45})`;
        ctx.lineWidth = border;
        ctx.strokeRect(border / 2, border / 2, this.w - border, this.h - border);
        ctx.restore();
    }

    drawWarningCountdown(ctx, vp, uiScale) {
        if (this.phase !== 'warning') return;
        const s = uiScale || 1;
        const sec = Math.max(1, Math.ceil(this.warningTimer));
        const pulse = 0.88 + Math.sin(this.warningPulse * 2.2) * 0.12;
        const numY = vp.y + vp.h * 0.46;

        ctx.save();
        ctx.globalAlpha = pulse;
        drawPixelText(ctx, String(sec), vp.cx, numY, Math.round(52 * s), '#ff3030');
        ctx.restore();
    }

    draw(ctx) {
        if (this.phase === 'warning') return;
        if (this.getBodyDrawAlpha() <= 0) return;
        for (const seg of this.segments) seg.draw(ctx);
    }

    drawBullets(ctx) {
        if (this.phase === 'warning' || this.getBodyDrawAlpha() <= 0) return;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        for (const b of this.bullets) {
            const r = b.radius;
            ctx.shadowBlur = 0;
            ctx.shadowColor = 'transparent';
            ctx.fillStyle = '#c03030';
            ctx.beginPath();
            ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ff8080';
            ctx.beginPath();
            ctx.arc(b.x, b.y, Math.max(1.5, r * 0.55), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}


// ---- projectile.js ----
let nextProjectileId = 1;

class ProjectileManager {
    constructor(game) {
        this.game = game;
        this.projectiles = [];
    }

    reset() {
        this.projectiles = [];
    }

    spawnArrow(opts) {
        const unit = CONFIG.DISPLAY.UNIT_SCALE || 1;
        const speed = opts.speed || CONFIG.ARROW.SPEED || 340;
        let vx = opts.vx;
        let vy = opts.vy;
        if (opts.targetX != null && opts.targetY != null) {
            const dx = opts.targetX - opts.x;
            const dy = opts.targetY - opts.y;
            const len = Math.hypot(dx, dy) || 1;
            vx = (dx / len) * speed;
            vy = (dy / len) * speed;
        }
        this.projectiles.push({
            id: nextProjectileId++,
            type: 'arrow',
            x: opts.x,
            y: opts.y,
            vx,
            vy,
            damage: opts.damage || 10,
            radius: opts.radius || (CONFIG.ARROW.RADIUS || 6) * unit,
            angle: Math.atan2(vy, vx),
            alive: true,
            blockable: true,
        });
    }

    update(dt, w, h, playerTarget) {
        const top = 84;
        const playBottom = this.game && this.game.ui
            ? this.game.ui.getPlayAreaBottom(h, this.game.renderer.uiScale)
            : h;
        const bottom = Math.max(top + 60, playBottom - 10);

        for (const p of this.projectiles) {
            if (!p.alive) continue;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.angle = Math.atan2(p.vy, p.vx);

            if (p.x < -24 || p.x > w + 24 || p.y < top - 24 || p.y > bottom + 24) {
                p.alive = false;
                continue;
            }

            if (!playerTarget || !playerTarget.player) continue;
            const pl = playerTarget.player;
            if (pl.hp <= 0 || pl.isAttackInvincible?.() || pl.state === PlayerState.BULLET_TIME) continue;
            if (!circlesCollide(p.x, p.y, p.radius, playerTarget.x, playerTarget.y, playerTarget.effectiveRadius + 2)) continue;

            p.alive = false;
            const dmg = pl.takeDamage(p.damage);
            if (dmg > 0 && this.game) {
                this.game.combat.spawnDamageNumber(
                    pl.x, pl.y - pl.effectiveRadius - 8, dmg, false, '#e05840'
                );
                this.game.particles.hitSpark(pl.x, pl.y, false);
                this.game.renderer.shake(CONFIG.SHAKE.NORMAL.magnitude * 0.55, CONFIG.SHAKE.NORMAL.duration * 0.75);
            }
        }

        this.projectiles = this.projectiles.filter(p => p.alive);
    }

    draw(ctx) {
        for (const p of this.projectiles) {
            if (!p.alive) continue;
            const x = Math.floor(p.x);
            const y = Math.floor(p.y);
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(p.angle + Math.PI);
            const shaftLen = Math.round(18 * (CONFIG.DISPLAY.UNIT_SCALE || 1));
            const headLen = Math.round(8 * (CONFIG.DISPLAY.UNIT_SCALE || 1));
            ctx.fillStyle = '#5a4030';
            ctx.fillRect(-12, -1.5, shaftLen, 3);
            ctx.fillStyle = '#c8a878';
            ctx.beginPath();
            ctx.moveTo(8, 0);
            ctx.lineTo(8 + headLen * 0.75, -3);
            ctx.lineTo(8 + headLen * 0.75, 3);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#e8dcc8';
            ctx.fillRect(-14, -1, 4, 2);
            ctx.restore();
        }
    }
}


// ---- groundEffects.js ----
class GroundEffectManager {
    constructor(game) {
        this.game = game;
        this.effects = [];
    }

    reset() {
        this.effects = [];
    }

    spawnFirePillar(x, y, damage) {
        const cfg = CONFIG.FIRE_PILLAR;
        this.effects.push({
            type: 'fire_pillar',
            x,
            y,
            r: cfg.RADIUS,
            damage: damage || cfg.DAMAGE,
            phase: 'warning',
            timer: cfg.WARNING_TIME,
            flashT: 0,
            hit: false,
            alive: true,
        });
    }

    update(dt, playerTarget) {
        const cfg = CONFIG.FIRE_PILLAR;
        for (const e of this.effects) {
            if (!e.alive) continue;
            e.flashT += dt;
            e.timer -= dt;

            if (e.phase === 'warning') {
                if (e.timer <= 0) {
                    e.phase = 'active';
                    e.timer = cfg.ACTIVE_TIME;
                    this._damagePlayer(e, playerTarget);
                }
            } else if (e.phase === 'active') {
                if (e.timer <= 0) {
                    e.phase = 'fade';
                    e.timer = cfg.FADE_TIME;
                }
            } else if (e.phase === 'fade' && e.timer <= 0) {
                e.alive = false;
            }
        }
        this.effects = this.effects.filter(e => e.alive);
    }

    _damagePlayer(e, playerTarget) {
        if (e.hit) return;
        const pl = playerTarget?.player;
        if (!pl || pl.hp <= 0) return;
        if (pl.state === PlayerState.BULLET_TIME || pl.isAttackInvincible?.()) return;
        if (!circlesCollide(e.x, e.y, e.r, pl.x, pl.y, pl.effectiveRadius + 2)) return;

        e.hit = true;
        const dmg = pl.takeDamage(e.damage);
        if (dmg <= 0 || !this.game) return;

        this.game.combat.spawnDamageNumber(pl.x, pl.y - pl.effectiveRadius - 8, dmg, false, '#ff7040');
        this.game.particles.hitSpark(pl.x, pl.y, false);
        this.game.renderer.shake(CONFIG.SHAKE.NORMAL.magnitude * 0.75, CONFIG.SHAKE.NORMAL.duration);
        for (let i = 0; i < 14; i++) {
            this.game.particles.spawnEffect(
                e.x + randRange(-e.r * 0.45, e.r * 0.45),
                e.y + randRange(-e.r * 0.45, e.r * 0.45),
                i % 2 === 0 ? '#ff6020' : '#ffcc50'
            );
        }
    }

    draw(ctx) {
        const cfg = CONFIG.FIRE_PILLAR;
        for (const e of this.effects) {
            if (e.phase === 'warning') {
                this._drawWarning(ctx, e);
            } else if (e.phase === 'active') {
                this._drawFirePillar(ctx, e, 1);
            } else if (e.phase === 'fade') {
                this._drawFirePillar(ctx, e, clamp(e.timer / cfg.FADE_TIME, 0, 1));
            }
        }
    }

    _drawWarning(ctx, e) {
        const pulse = Math.sin(e.flashT * 14) * 0.5 + 0.5;
        const flash = Math.floor(e.flashT * 10) % 2 === 0;
        const alphaFill = 0.1 + pulse * 0.16;
        const alphaStroke = flash ? 0.9 : 0.42;

        ctx.save();
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 35, 28, ${alphaFill})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(255, ${flash ? 45 : 95}, 35, ${alphaStroke})`;
        ctx.lineWidth = flash ? 3 : 2;
        ctx.stroke();

        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = `rgba(255, 110, 70, ${0.38 + pulse * 0.28})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r * 0.7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    _drawFirePillar(ctx, e, alphaMul) {
        const x = e.x;
        const y = e.y;
        const r = e.r;
        const colH = r * 1.55;

        ctx.save();
        ctx.globalAlpha = alphaMul;

        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(48, 18, 8, 0.6)';
        ctx.fill();

        const cols = 8;
        for (let i = 0; i < cols; i++) {
            const ang = (i / cols) * Math.PI * 2 + e.flashT * 4.2;
            const spread = r * (0.28 + (i % 3) * 0.14);
            const fx = x + Math.cos(ang) * spread;
            const fy = y + Math.sin(ang) * spread * 0.4 - colH * 0.35;
            const fh = colH * (0.55 + (i % 4) * 0.12);
            const fw = 3 + (i % 3) * 2;
            const colors = ['#ff5018', '#ffb038', '#ff2810', '#ff9048'];
            ctx.fillStyle = colors[i % colors.length];
            ctx.fillRect(Math.floor(fx - fw / 2), Math.floor(fy - fh), fw, Math.floor(fh));
        }

        const grad = ctx.createRadialGradient(x, y, 0, x, y - colH * 0.15, r * 0.7);
        grad.addColorStop(0, 'rgba(255, 230, 130, 0.95)');
        grad.addColorStop(0.4, 'rgba(255, 110, 35, 0.75)');
        grad.addColorStop(1, 'rgba(255, 40, 8, 0.08)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(x, y - colH * 0.22, r * 0.58, colH * 0.48, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 190, 70, 0.65)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
}


// ---- upgrades.js ----
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


// ---- buffOrbs.js ----
class BuffOrbManager {
    constructor(game) {
        this.game = game;
        this.orbs = [];
        this.notice = '';
        this.noticeTimer = 0;
        this.pickupFlashes = [];
        this.drawSessionEaten = [];
    }

    reset() {
        this.orbs = [];
        this.notice = '';
        this.noticeTimer = 0;
        this.pickupFlashes = [];
        this.drawSessionEaten = [];
    }

    _pickPos(w, h, playBottom, safeZone) {
        const pad = 28;
        const top = 92;
        const bottom = Math.max(top + 80, playBottom - 30);
        for (let i = 0; i < 80; i++) {
            const x = randRange(pad, w - pad);
            const y = randRange(top, bottom);
            if (!safeZone || dist(x, y, safeZone.x, safeZone.y) > safeZone.r + 30) return { x, y };
        }
        return { x: w * 0.5, y: (top + bottom) * 0.5 };
    }

    _spawn(type, x, y) {
        const unit = CONFIG.DISPLAY.UNIT_SCALE || 1;
        this.orbs.push({
            type,
            x,
            y,
            r: CONFIG.BUFF_ORB.RADIUS * unit,
            pulse: randRange(0, Math.PI * 2),
            alive: true,
        });
    }

    _posClear(pos, minDist) {
        for (const o of this.orbs) {
            if (dist(pos.x, pos.y, o.x, o.y) < minDist) return false;
        }
        return true;
    }

    _pickSpawnPos(w, h, playBottom, safeZone) {
        for (let i = 0; i < 50; i++) {
            const pos = this._pickPos(w, h, playBottom, safeZone);
            if (this._posClear(pos, 34)) return pos;
        }
        return this._pickPos(w, h, playBottom, safeZone);
    }

    spawnForStage(stageIndex, safeZone, enableIce = false) {
        this.orbs = [];
        const w = this.game.renderer.w;
        const h = this.game.renderer.h;
        const playBottom = this.game.ui.getPlayAreaBottom(h, this.game.renderer.uiScale);
        const types = [...CONFIG.BUFF_ORB.BASE_TYPES];
        if (enableIce) types.push('ice');
        const maxPerType = CONFIG.BUFF_ORB.MAX_PER_TYPE || 4;
        const extraChance = CONFIG.BUFF_ORB.EXTRA_SPAWN_CHANCE ?? 0.48;

        for (const type of types) {
            for (let i = 0; i < maxPerType; i++) {
                const chance = i === 0
                    ? (CONFIG.BUFF_ORB.SPAWN_CHANCE[type] || 0)
                    : extraChance;
                if (Math.random() > chance) break;
                const pos = this._pickSpawnPos(w, h, playBottom, safeZone);
                this._spawn(type, pos.x, pos.y);
            }
        }

        const minKi = CONFIG.BUFF_ORB.MIN_KI_PER_STAGE || 0;
        let kiCount = this.orbs.filter(o => o.type === 'ki').length;
        while (kiCount < minKi) {
            const pos = this._pickSpawnPos(w, h, playBottom, safeZone);
            this._spawn('ki', pos.x, pos.y);
            kiCount++;
        }

        this.notice = '';
        this.noticeTimer = 0;
        this.pickupFlashes = [];
        this.drawSessionEaten = [];
    }

    restoreDrawSessionOrbs() {
        for (const snap of this.drawSessionEaten) {
            this.orbs.push({
                type: snap.type,
                x: snap.x,
                y: snap.y,
                r: snap.r,
                pulse: snap.pulse,
                alive: true,
            });
        }
        this.drawSessionEaten = [];
        this.pickupFlashes = [];
    }

    cancelDrawSession() {
        const p = this.game.player;
        if (p && p.drawSessionSnapshot) {
            p.ki = p.drawSessionSnapshot.ki;
            p.turnBuffs.attackMult = p.drawSessionSnapshot.attackMult;
            p.turnBuffs.comboMult = p.drawSessionSnapshot.comboMult;
            p.turnBuffs.iceReady = p.drawSessionSnapshot.iceReady;
            p.drawSessionSnapshot = null;
        }
        if (p) p.collectedOrbBuffs = [];
        this.restoreDrawSessionOrbs();
    }

    beginDrawSession() {
        this.cancelDrawSession();
        const p = this.game.player;
        if (!p) return;
        p.drawSessionSnapshot = {
            ki: p.ki,
            attackMult: p.turnBuffs.attackMult,
            comboMult: p.turnBuffs.comboMult,
            iceReady: p.turnBuffs.iceReady,
        };
        p.collectedOrbBuffs = [];
        p.kiAtDrawStart = p.ki;
    }

    commitDrawSession() {
        const p = this.game.player;
        if (p) p.drawSessionSnapshot = null;
        this.drawSessionEaten = [];
    }

    _applyOrb(type) {
        const p = this.game.player;
        if (!p) return;
        p.collectedOrbBuffs.push(type);
        if (type === 'attack') {
            p.turnBuffs.attackMult *= 1.3;
            this.notice = '攻击+30%';
        } else if (type === 'ki') {
            const bonus = Math.round(p.kiMax * 0.30);
            p.ki = Math.min(p.kiMax, p.ki + bonus);
            this.notice = '气力+30%';
        } else if (type === 'combo') {
            p.turnBuffs.comboMult *= 2;
            this.notice = '连击×2';
        } else if (type === 'ice') {
            p.turnBuffs.iceReady = true;
            this.notice = '冰冻球';
        } else {
            return;
        }
        p.queueMessage(this.notice);
        this.noticeTimer = 1.6;
        this.game.renderer.shake(9, 0.16);
    }

    _emitPickupBurst(o) {
        const pal = this._orbPalette(o.type);
        const colors = [pal.hi, pal.core, '#fff8e8'];
        for (let i = 0; i < 28; i++) {
            const a = (i / 28) * Math.PI * 2 + randRange(-0.2, 0.2);
            const spd = randRange(90, 200);
            this.game.particles.emit(
                o.x, o.y,
                Math.cos(a) * spd,
                Math.sin(a) * spd,
                randRange(0.28, 0.55), randRange(5, 11),
                colors[i % colors.length],
                0, true, true
            );
        }
        this.pickupFlashes.push({
            x: o.x,
            y: o.y,
            type: o.type,
            timer: 0.5,
            maxTimer: 0.5,
        });
    }

    _collectOrb(o) {
        if (!o.alive) return;
        const p = this.game.player;
        const trackSession = p && p.state === PlayerState.BULLET_TIME;
        if (trackSession) {
            this.drawSessionEaten.push({
                type: o.type,
                x: o.x,
                y: o.y,
                r: o.r,
                pulse: o.pulse,
            });
        }
        o.alive = false;
        this._applyOrb(o.type);
        this._emitPickupBurst(o);
    }

    checkPathSegment(from, to) {
        if (!from || !to) return;
        const segLen = dist(from.x, from.y, to.x, to.y);
        const steps = Math.max(1, Math.ceil(segLen / 5));
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const px = lerp(from.x, to.x, t);
            const py = lerp(from.y, to.y, t);
            for (const o of this.orbs) {
                if (!o.alive) continue;
                if (dist(px, py, o.x, o.y) <= o.r + 10) this._collectOrb(o);
            }
        }
    }

    _orbPalette(type) {
        if (type === 'attack') return { core: '#ff9a58', hi: '#ffd8a8', edge: '#7a2c10' };
        if (type === 'ki') return { core: '#58d0ff', hi: '#b8f0ff', edge: '#1e4e70' };
        if (type === 'combo') return { core: '#ffa0f8', hi: '#ffd8ff', edge: '#5a2a6a' };
        if (type === 'ice') return { core: '#80d8ff', hi: '#d8f6ff', edge: '#245a7a' };
        return { core: '#f0d880', hi: '#ffe8a8', edge: '#6a4a18' };
    }

    _drawPixelOrb(ctx, o) {
        const pulse = 0.86 + Math.sin(o.pulse) * 0.14;
        const rPx = Math.max(5, Math.round(o.r * pulse));
        const pal = this._orbPalette(o.type);
        const cx = Math.floor(o.x);
        const cy = Math.floor(o.y);

        ctx.beginPath();
        ctx.arc(cx, cy, rPx + 3, 0, Math.PI * 2);
        ctx.fillStyle = `${pal.hi}33`;
        ctx.fill();

        for (let y = -rPx; y <= rPx; y++) {
            for (let x = -rPx; x <= rPx; x++) {
                const d2 = x * x + y * y;
                if (d2 > rPx * rPx) continue;
                if (d2 >= (rPx - 1) * (rPx - 1)) ctx.fillStyle = pal.edge;
                else if (y < -rPx * 0.2 || x < -rPx * 0.2) ctx.fillStyle = pal.hi;
                else ctx.fillStyle = pal.core;
                ctx.fillRect(cx + x, cy + y, 1, 1);
            }
        }

        const iconPx = Math.max(2, Math.floor(rPx / 3));
        drawPixelIcon(ctx, getBuffOrbIconSprite(o.type), cx, cy, iconPx);
    }

    _drawPickupFlash(ctx, f) {
        const t = 1 - f.timer / f.maxTimer;
        const pal = this._orbPalette(f.type);
        const cx = f.x;
        const cy = f.y;
        const ringR = 14 + t * 42;
        const alpha = 1 - t;

        ctx.save();
        ctx.globalAlpha = alpha * 0.85;
        ctx.strokeStyle = pal.hi;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalAlpha = alpha;
        ctx.fillStyle = `${pal.core}88`;
        ctx.beginPath();
        ctx.arc(cx, cy, ringR * 0.55, 0, Math.PI * 2);
        ctx.fill();

        const iconPx = Math.max(3, Math.floor(4 + (1 - t) * 3));
        drawPixelIcon(ctx, getBuffOrbIconSprite(f.type), cx, cy - t * 18, iconPx);

        const label = getBuffOrbShortLabel(f.type);
        const labelY = cy - 28 - t * 12;
        const labelSize = Math.round(12 + (1 - t) * 2);
        const tw = label.length * labelSize * 0.65 + 12;
        const th = labelSize + 8;
        drawPixelPanel(ctx, cx - tw / 2, labelY - th / 2, tw, th, 'rgba(42,24,16,0.92)', this._orbPalette(f.type).hi, 2);
        drawPixelText(ctx, label, cx, labelY, labelSize, '#fff8d8');
        ctx.restore();
    }

    update(dt) {
        const p = this.game.player;
        if (!p) return;
        for (const o of this.orbs) {
            if (!o.alive) continue;
            o.pulse += dt * 4.2;
            if (p.state === PlayerState.ATTACKING) {
                if (dist(p.x, p.y, o.x, o.y) <= p.effectiveRadius + o.r) {
                    this._collectOrb(o);
                }
            }
        }
        this.orbs = this.orbs.filter(o => o.alive);
        for (let i = this.pickupFlashes.length - 1; i >= 0; i--) {
            this.pickupFlashes[i].timer -= dt;
            if (this.pickupFlashes[i].timer <= 0) this.pickupFlashes.splice(i, 1);
        }
        if (this.noticeTimer > 0) this.noticeTimer -= dt;
    }

    draw(ctx) {
        for (const o of this.orbs) {
            ctx.save();
            this._drawPixelOrb(ctx, o);
            ctx.restore();
        }
    }

    drawPickupEffects(ctx) {
        for (const f of this.pickupFlashes) {
            this._drawPickupFlash(ctx, f);
        }
    }
}


// ---- abilities.js ----
const FIREBALL_PIXEL = 4;
const FIREBALL_RADIUS_BLOCKS = 8;
const SHURIKEN_PIXEL = 4;
const WATER_TORNADO_PIXEL = 5;
const WATER_TORNADO_SIZE_SCALE = 1.92;
const WATER_TORNADO_SPEED = 360;
const WATER_TORNADO_LIFE = 1.85;
const SHURIKEN_SPEED_MIN = 340;
const SHURIKEN_SPEED_MAX = 500;
const SHURIKEN_LIFE_MIN = 0.42;
const SHURIKEN_LIFE_MAX = 0.62;
const WHIRL_SIZE_SCALE = 1.12;

const SHURIKEN_SPRITE = [
    [null, '#7a8aa8', null, '#7a8aa8', null],
    ['#7a8aa8', '#e8f4ff', '#b8cce8', '#e8f4ff', '#7a8aa8'],
    [null, '#b8cce8', '#586878', '#b8cce8', null],
    ['#7a8aa8', '#e8f4ff', '#b8cce8', '#e8f4ff', '#7a8aa8'],
    [null, '#7a8aa8', null, '#7a8aa8', null],
];

class AbilityManager {
    constructor(game) {
        this.game = game;
        this.fireballs = [];
        this.waterTornados = [];
        this.blackHoles = [];
        this.whirls = [];
        this.shurikens = [];
        this.vines = [];
        this.batSwarms = [];
        this.autoDartCooldown = 0;
        this.resolveFxTimer = 0;
        this.lightningChain = null;
        this.blackHoleSpawnedThisResolve = false;
        if (this._initSummonState) this._initSummonState();
    }

    reset() {
        this.fireballs = [];
        this.waterTornados = [];
        this.blackHoles = [];
        this.whirls = [];
        this.shurikens = [];
        this.vines = [];
        this.batSwarms = [];
        this.autoDartCooldown = 0;
        this.resolveFxTimer = 0;
        this.lightningChain = null;
        this.blackHoleSpawnedThisResolve = false;
    }

    hasAutoDarts() {
        return this.shurikens.some(s => s.kind === 'auto' || s.kind === 'ice');
    }

    _hasFlyingProjectiles() {
        return this.fireballs.length > 0 || this.waterTornados.length > 0 || this.blackHoles.length > 0
            || this.whirls.length > 0 || this.shurikens.length > 0 || this.vines.length > 0
            || this.batSwarms.length > 0 || this.lightningChain != null;
    }

    hasActiveFx() {
        return this.resolveFxTimer > 0 || this.game.combat.isResolving() || this._hasFlyingProjectiles();
    }

    _isResolvePhase() {
        return this.game.combat.isResolving() || this.resolveFxTimer > 0 || this._hasFlyingProjectiles();
    }

    _ctxPos(ctx) {
        if (ctx) return { x: ctx.x, y: ctx.y };
        const p = this.game.player;
        return { x: p.x, y: p.y };
    }

    onResolveStarted(attackPath) {
        this.blackHoleSpawnedThisResolve = false;
        const p = this.game.player;
        if (p) {
            p.healingComboMilestone = 0;
            p.comboFireballMilestone = 0;
        }
    }

    onResolveHit(hit, combo) {
        const p = this.game.player;
        if (!p) return;

        const mx = (hit.pathFrom.x + hit.pathTo.x) * 0.5;
        const my = (hit.pathFrom.y + hit.pathTo.y) * 0.5;
        const segAng = angle(hit.pathFrom.x, hit.pathFrom.y, hit.pathTo.x, hit.pathTo.y);
        const ctx = { x: mx, y: my, segAng, hit };

        this.onComboHit(combo, ctx);
    }

    _spawnComboFireballs(x, y, segAng) {
        const p = this.game.player;
        const lv = p.getUpgradeLevel('great_fireball');
        if (lv <= 0) return;
        const cnt = 3 + Math.max(0, lv - 1);
        const baseAng = segAng;
        for (let i = 0; i < cnt; i++) {
            const a = baseAng + randRange(-0.9, 0.9);
            this.fireballs.push({
                x, y,
                vx: Math.cos(a) * 280, vy: Math.sin(a) * 280,
                life: 0.95,
                maxLife: 0.95,
                rot: a,
                hit: new Set(),
                dmgMul: 1.0,
                kind: 'great',
            });
        }
    }

    onComboHit(combo, ctx) {
        const p = this.game.player;
        if (!p || !this.game.combat.isResolving()) return;
        const pos = this._ctxPos(ctx);

        const comboFloor = Math.floor(combo);
        const fireMilestone = Math.floor(comboFloor / 10) * 10;
        if (p.getUpgradeLevel('great_fireball') > 0 && fireMilestone >= 10 && fireMilestone > p.comboFireballMilestone) {
            p.comboFireballMilestone = fireMilestone;
            this._spawnComboFireballs(pos.x, pos.y, ctx?.segAng ?? 0);
        }
        if (p.getUpgradeLevel('shuriken') > 0 && comboFloor > 0) {
            this._spawnComboShurikens(pos.x, pos.y, ctx?.segAng ?? 0);
        }
        const healMilestone = Math.floor(comboFloor / 15) * 15;
        if (p.getUpgradeLevel('healing_combo') > 0 && healMilestone >= 15 && healMilestone > p.healingComboMilestone) {
            p.healingComboMilestone = healMilestone;
            this._emitHealingBurst(pos.x, pos.y, 1.6);
            this._spawnHealingVine(pos.x, pos.y, ctx?.segAng ?? 0);
            const healed = p.heal(p.maxHp * 0.05);
            if (healed > 0) {
                this.game.combat.spawnDamageNumber(
                    p.x, p.y - p.effectiveRadius - 12, healed, false, '#68d878'
                );
            }
        }
        if (p.getUpgradeLevel('lightning_chain') > 0 && comboFloor > 0 && comboFloor % 5 === 0) {
            this._spawnLightningChain(3, pos.x, pos.y);
        }
        if (p.getUpgradeLevel('water_tornado') > 0) {
            p.waterTornadoCharge = (p.waterTornadoCharge || 0) + 1;
            while (p.waterTornadoCharge >= 3) {
                p.waterTornadoCharge -= 3;
                const cnt = p.getUpgradeLevel('water_tornado');
                for (let i = 0; i < cnt; i++) {
                    this._spawnWaterTornado(pos.x, pos.y, ctx?.segAng ?? 0, i, cnt);
                }
            }
        }
        if (p.getUpgradeLevel('black_hole') > 0 && comboFloor === 8 && !this.blackHoleSpawnedThisResolve) {
            this._spawnBlackHole(pos.x, pos.y);
            this.blackHoleSpawnedThisResolve = true;
        }
        if (p.getUpgradeLevel('blade_whirl') > 0) {
            p.whirlCharge = (p.whirlCharge || 0) + 1;
            while (p.whirlCharge >= 5) {
                p.whirlCharge -= 5;
                this._spawnWhirl(pos.x, pos.y);
            }
        }
    }

    _spawnComboShurikens(x, y, segAng) {
        const count = 2;
        for (let i = 0; i < count; i++) {
            const spread = segAng + randRange(-0.55, 0.55);
            const spd = randRange(SHURIKEN_SPEED_MIN, SHURIKEN_SPEED_MAX);
            this.shurikens.push({
                kind: 'skill',
                x: x + randRange(-4, 4),
                y: y + randRange(-4, 4),
                vx: Math.cos(spread) * spd,
                vy: Math.sin(spread) * spd,
                rot: randRange(0, Math.PI * 2),
                spin: randRange(10, 18) * (Math.random() < 0.5 ? 1 : -1),
                life: randRange(SHURIKEN_LIFE_MIN, SHURIKEN_LIFE_MAX),
                hit: new Set(),
                dmgMul: 0.10,
            });
        }
    }

    _emitHealingBurst(x, y, intensity = 1) {
        const count = Math.floor(14 * intensity);
        const colors = ['#88ffb0', '#58e878', '#a8ffd0', '#48c868', '#d8ffe8', '#b8f8c8'];
        for (let i = 0; i < count; i++) {
            const a = randRange(0, Math.PI * 2);
            const spd = randRange(70, 200) * intensity;
            this.game.particles.emit(
                x, y,
                Math.cos(a) * spd,
                Math.sin(a) * spd - randRange(30, 90),
                randRange(0.28, 0.6), randRange(4, 10 * intensity),
                colors[Math.floor(Math.random() * colors.length)],
                -140, true, true
            );
        }
    }

    _spawnHealingVine(x, y, segAng) {
        const p = this.game.player;
        const lv = p.getUpgradeLevel('healing_combo');
        const baseAng = this._nearestMonsterAngle(x, y, segAng);
        const spd = 340;
        const vineCount = 1 + Math.min(2, Math.floor(lv / 3));
        const spreads = vineCount === 1 ? [0] : [-0.32, 0, 0.32];
        for (let i = 0; i < vineCount; i++) {
            const a = baseAng + (spreads[i] ?? 0);
            this.vines.push({
                x, y,
                vx: Math.cos(a) * spd,
                vy: Math.sin(a) * spd,
                rot: a,
                life: 1.25,
                maxLife: 1.25,
                wavePhase: randRange(0, Math.PI * 2),
                leafPhase: randRange(0, Math.PI * 2),
                hit: new Set(),
                hitR: 32 + lv * 4,
                damage: p.getAbilityDamage(0.52 + 0.18 * Math.max(0, lv - 1)),
                slowDur: 3,
            });
        }
        this._emitHealingBurst(x, y, 0.9);
    }

    spawnVampireBatSwarm(fromX, fromY) {
        const p = this.game.player;
        const lv = p.getUpgradeLevel('vampire_bat');
        if (!p || lv <= 0) return;
        const radius = 130 + lv * 12;
        const monsters = this.game.spawner.getActiveMonsters()
            .filter(m => dist(fromX, fromY, m.x, m.y) <= radius + m.hitboxRadius)
            .sort((a, b) => dist(fromX, fromY, a.x, a.y) - dist(fromX, fromY, b.x, b.y));
        const maxTargets = Math.min(monsters.length, 4 + lv * 2);
        this.batSwarms.push({
            ox: fromX,
            oy: fromY,
            targets: monsters.slice(0, maxTargets),
            idx: 0,
            phase: 'orbit',
            timer: 0,
            orbitElapsed: 0,
            orbitDuration: 0.95,
            returnElapsed: 0,
            returnDuration: 0.55,
            stepDelay: 0.06,
            damage: p.getAbilityDamage(0.14),
            healAmount: Math.round(p.maxHp * 0.02 * lv),
            batCount: 10 + lv * 2,
        });
        for (let i = 0; i < 14; i++) {
            const a = randRange(0, Math.PI * 2);
            this.game.particles.emit(
                p.x, p.y,
                Math.cos(a) * randRange(40, 120), Math.sin(a) * randRange(40, 120),
                randRange(0.15, 0.35), randRange(3, 6),
                '#503070', 0, true, false
            );
        }
    }

    _drawBat(ctx, x, y, wingPhase) {
        const bx = Math.floor(x);
        const by = Math.floor(y);
        const flap = Math.sin(wingPhase) > 0;
        ctx.fillStyle = '#281838';
        ctx.fillRect(bx - 4, by, 8, 3);
        ctx.fillStyle = '#6040a0';
        if (flap) {
            ctx.fillRect(bx - 6, by - 4, 4, 3);
            ctx.fillRect(bx + 2, by - 4, 4, 3);
        } else {
            ctx.fillRect(bx - 7, by - 1, 3, 2);
            ctx.fillRect(bx + 4, by - 1, 3, 2);
        }
        ctx.fillStyle = '#c8a8e8';
        ctx.fillRect(bx - 1, by - 1, 2, 2);
    }

    _drawBatsAroundPlayer(ctx, swarm, p) {
        const t = Date.now() * 0.014;
        const count = swarm.batCount || 10;
        const baseR = p.effectiveRadius + 22;
        const cx = p.x;
        const cy = p.y;

        ctx.save();
        ctx.globalAlpha = 0.35;
        const aura = ctx.createRadialGradient(cx, cy, 6, cx, cy, baseR + 14);
        aura.addColorStop(0, 'rgba(120, 60, 160, 0.45)');
        aura.addColorStop(1, 'rgba(60, 30, 90, 0)');
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.arc(cx, cy, baseR + 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        for (let i = 0; i < count; i++) {
            const a = t * 1.35 + (i / count) * Math.PI * 2;
            const wobble = Math.sin(t * 2.2 + i * 0.7) * 8;
            const layer = (i % 3) * 4;
            const r = baseR + wobble + layer;
            const bx = cx + Math.cos(a) * r;
            const by = cy + Math.sin(a) * r * 0.82;
            this._drawBat(ctx, bx, by, t * 3 + i);
        }
    }

    _spawnLightningChain(maxTargets, fromX, fromY) {
        const monsters = this.game.spawner.getActiveMonsters();
        if (monsters.length === 0) return;
        monsters.sort((a, b) => dist(fromX, fromY, a.x, a.y) - dist(fromX, fromY, b.x, b.y));
        this.lightningChain = {
            targets: monsters.slice(0, maxTargets),
            cx: fromX,
            cy: fromY,
            idx: 0,
            timer: 0,
            stepDelay: 0.09,
            dmg: this.game.player.getAbilityDamage(0.45),
        };
    }

    _updateLightningChain(dt) {
        const ch = this.lightningChain;
        if (!ch) return;
        ch.timer -= dt;
        if (ch.timer > 0) return;

        if (ch.idx >= ch.targets.length) {
            this.lightningChain = null;
            return;
        }

        const m = ch.targets[ch.idx];
        if (!m.alive || m.dying) {
            ch.idx++;
            ch.timer = ch.stepDelay * 0.35;
            return;
        }

        this.game.particles.lightningEffect(ch.cx, ch.cy, m.x, m.y);
        const hit = m.takeDamage(ch.dmg, angle(ch.cx, ch.cy, m.x, m.y));
        if (hit.actualDamage > 0) {
            this.game.combat.spawnDamageNumber(m.x, m.y - m.hitboxRadius - 4, hit.actualDamage, false, '#f8d020');
            this.game.particles.hitSpark(m.x, m.y, false);
        }
        if (m.dying) this.game.combat._handleMonsterKilled(m);

        ch.cx = m.x;
        ch.cy = m.y;
        ch.idx++;
        ch.timer = ch.stepDelay;
        if (ch.idx === 1) this.game.renderer.shake(10, 0.28);
    }

    _findNearestMonster(x, y) {
        const monsters = this.game.spawner.getActiveMonsters();
        if (!monsters.length) return null;
        let nearest = monsters[0];
        let best = dist(x, y, nearest.x, nearest.y);
        for (let i = 1; i < monsters.length; i++) {
            const m = monsters[i];
            const d = dist(x, y, m.x, m.y);
            if (d < best) {
                best = d;
                nearest = m;
            }
        }
        return nearest;
    }

    _nearestMonsterAngle(x, y, segAng) {
        const nearest = this._findNearestMonster(x, y);
        if (!nearest) return segAng;
        return angle(x, y, nearest.x, nearest.y);
    }

    _canAutoDart() {
        const g = this.game;
        if (!g || g.state !== 'PLAYING') return false;
        const p = g.player;
        if (!p || p.hp <= 0) return false;
        if (p.state === PlayerState.BULLET_TIME) return false;
        if (g.isUpgradeBlocked()) return false;
        return g.spawner.getActiveMonsters().length > 0;
    }

    _getAutoDartOrigin() {
        const p = this.game.player;
        if (p.state === PlayerState.ATTACKING) return { x: p.x, y: p.y };
        return { x: p.homeX, y: p.homeY };
    }

    _spawnAutoDart() {
        const p = this.game.player;
        const origin = this._getAutoDartOrigin();
        const target = this._findNearestMonster(origin.x, origin.y);
        if (!target) return;

        const cfg = CONFIG.PLAYER.AUTO_DART || {};
        const baseAng = angle(origin.x, origin.y, target.x, target.y);
        const spd = cfg.SPEED || 420;
        const count = 1 + p.getUpgradeLevel('multi_dart');
        const hitR = this._shurikenHitRadius();
        const damage = p.getAutoDartDamage();
        const isSpirit = p.hasSpiritBomb();

        for (let i = 0; i < count; i++) {
            const spread = count > 1
                ? baseAng + (i - (count - 1) * 0.5) * 0.18
                : baseAng;
            this.shurikens.push({
                kind: 'auto',
                x: origin.x,
                y: origin.y,
                vx: Math.cos(spread) * spd,
                vy: Math.sin(spread) * spd,
                rot: spread,
                spin: isSpirit ? 6 : 14,
                life: cfg.LIFE || 0.9,
                hit: new Set(),
                damage,
                hitRadius: hitR,
                visualScale: isSpirit ? 1.35 : 1,
                isSpirit,
            });
        }

        this._trySpawnGiantDarts(origin, baseAng, spd, damage, hitR, cfg);
    }

    _trySpawnGiantDarts(origin, baseAng, spd, normalDamage, baseHitR, cfg) {
        const p = this.game.player;
        const lv = p.getUpgradeLevel('giant_dart');
        if (lv <= 0) return;
        if (Math.random() >= 0.20) return;

        const giantDamage = Math.max(1, Math.round(normalDamage * 2));
        const giantScale = 2;
        const giantHitR = baseHitR * giantScale * 0.85;
        const count = lv;

        for (let i = 0; i < count; i++) {
            const spread = count > 1
                ? baseAng + (i - (count - 1) * 0.5) * 0.14
                : baseAng;
            this.shurikens.push({
                kind: 'auto',
                x: origin.x,
                y: origin.y,
                vx: Math.cos(spread) * spd * 0.92,
                vy: Math.sin(spread) * spd * 0.92,
                rot: spread,
                spin: 10,
                life: cfg.LIFE || 0.9,
                hit: new Set(),
                damage: giantDamage,
                hitRadius: giantHitR,
                visualScale: giantScale,
                isSpirit: false,
                isGiant: true,
            });
        }
    }

    _getIceDartProcChance() {
        const lv = this.game.player.getUpgradeLevel('ice_dart');
        if (lv <= 0) return 0;
        return Math.min(0.95, 0.05 + 0.04 * Math.max(0, lv - 1));
    }

    _getIceDartBonusMult() {
        const lv = this.game.player.getUpgradeLevel('ice_dart');
        if (lv <= 0) return 0;
        return 0.2 + 0.05 * Math.max(0, lv - 1);
    }

    _trySpawnIceDart(x, y, dartDamage, flyAng) {
        if (this.game.player.getUpgradeLevel('ice_dart') <= 0) return;
        if (Math.random() >= this._getIceDartProcChance()) return;

        const a = this._nearestMonsterAngle(x, y, flyAng);
        const spd = 400;
        const bonus = Math.max(1, Math.round(dartDamage * this._getIceDartBonusMult()));
        this.shurikens.push({
            kind: 'ice',
            x,
            y,
            vx: Math.cos(a) * spd,
            vy: Math.sin(a) * spd,
            rot: a,
            spin: 16,
            life: 0.9,
            hit: new Set(),
            damage: bonus,
            freezeDur: 2,
            hitRadius: 9,
        });
        this.game.particles.freezeEffect(x, y, 0.85);
    }

    _updateAutoDartFire(dt) {
        if (!this._canAutoDart()) return;
        const interval = CONFIG.PLAYER.AUTO_DART?.INTERVAL ?? 0.5;
        this.autoDartCooldown -= dt;
        if (this.autoDartCooldown > 0) return;
        this._spawnAutoDart();
        this.autoDartCooldown = interval;
    }

    _spawnWaterTornado(x, y, segAng, idx, total) {
        const p = this.game.player;
        const lv = p.getUpgradeLevel('water_tornado');
        const spread = total > 1 ? (idx - (total - 1) * 0.5) * 0.22 : 0;
        const a = this._nearestMonsterAngle(x, y, segAng) + spread;
        this.waterTornados.push({
            x, y,
            vx: Math.cos(a) * WATER_TORNADO_SPEED,
            vy: Math.sin(a) * WATER_TORNADO_SPEED,
            life: WATER_TORNADO_LIFE,
            maxLife: WATER_TORNADO_LIFE,
            spin: randRange(0, Math.PI * 2),
            spinSpeed: 14 + lv * 1.5,
            hit: new Set(),
            dmgMul: 0.55 + 0.1 * lv,
        });
        const colors = ['#b8f8ff', '#68d0f8', '#38a8e8', '#e8ffff'];
        for (let i = 0; i < 22; i++) {
            const burst = a + randRange(-0.7, 0.7);
            const bspd = randRange(100, 260);
            this.game.particles.emit(
                x, y,
                Math.cos(burst) * bspd, Math.sin(burst) * bspd,
                randRange(0.2, 0.4), randRange(5, 10),
                colors[Math.floor(Math.random() * colors.length)],
                0, true, false
            );
        }
        this.game.renderer.shake(8, 0.18);
    }

    _drawPixelWaterTornado(ctx, t) {
        const px = WATER_TORNADO_PIXEL;
        const s = WATER_TORNADO_SIZE_SCALE;
        const lifeT = t.maxLife ? t.life / t.maxLife : 1;
        const pulse = 0.92 + Math.sin((1 - lifeT) * 10 + t.spin) * 0.08;
        const cx = Math.floor(t.x);
        const cy = Math.floor(t.y);
        const block = Math.ceil(px * s * pulse);

        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.translate(cx, cy);
        ctx.rotate(t.spin);
        ctx.globalAlpha = clamp(0.55 + lifeT * 0.45, 0.45, 1);

        const ringColors = ['#1868a8', '#2890d0', '#48b8f0', '#88e0ff', '#d8ffff'];
        for (let layer = 0; layer < 5; layer++) {
            const r = (7 + layer * 4) * s * pulse;
            const count = 10 + layer * 4;
            for (let i = 0; i < count; i++) {
                const a = (i / count) * Math.PI * 2 + layer * 0.65;
                const bx = Math.cos(a) * r;
                const by = Math.sin(a) * r * 1.28;
                ctx.fillStyle = ringColors[layer];
                ctx.fillRect(
                    Math.floor(bx - block * 0.5),
                    Math.floor(by - block * 0.5),
                    block,
                    block
                );
            }
        }

        for (let j = -5; j <= 5; j++) {
            const w = j === 0 ? block * 2.2 : block * 1.6;
            ctx.fillStyle = j % 2 === 0 ? '#e8ffff' : '#a0e8ff';
            ctx.fillRect(Math.floor(-w * 0.5), Math.floor(j * block * 1.05), Math.ceil(w), block);
        }

        ctx.globalAlpha = clamp(0.35 + lifeT * 0.35, 0.25, 0.7);
        ctx.strokeStyle = '#d8ffff';
        ctx.lineWidth = Math.max(2, block * 0.35);
        ctx.beginPath();
        ctx.ellipse(0, 0, 14 * s * pulse, 20 * s * pulse, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalAlpha = clamp(0.2 + lifeT * 0.25, 0.15, 0.5);
        const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 22 * s);
        glow.addColorStop(0, 'rgba(200, 248, 255, 0.95)');
        glow.addColorStop(0.5, 'rgba(72, 184, 240, 0.55)');
        glow.addColorStop(1, 'rgba(24, 104, 168, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.ellipse(0, 0, 24 * s * pulse, 30 * s * pulse, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    _spawnBlackHole(x, y) {
        const lv = this.game.player.getUpgradeLevel('black_hole');
        const life = 1.75;
        this.blackHoles.push({
            x, y,
            r: 82 + lv * 24,
            life,
            maxLife: life,
            pull: 220 + lv * 65,
            dmgTimer: 0,
        });
    }

    _spawnWhirl(x, y) {
        const p = this.game.player;
        const lv = p.getUpgradeLevel('blade_whirl');
        const baseR = (68 + lv * 8) * WHIRL_SIZE_SCALE;
        this.whirls.push({
            x, y,
            r: baseR * 0.55,
            maxR: baseR,
            life: 0.9,
            maxLife: 0.9,
            spin: Math.random() * Math.PI * 2,
            spinSpeed: 16 + lv * 2.5,
            bladeCount: Math.round((14 + lv * 2) * WHIRL_SIZE_SCALE),
            bladePx: Math.round(4 * WHIRL_SIZE_SCALE),
            hit: new Set(),
            dmgMul: 0.35 + lv * 0.12,
            ringPhase: 0,
        });
        for (let i = 0; i < 48; i++) {
            const a = (i / 48) * Math.PI * 2;
            const spd = randRange(140, 320);
            this.game.particles.emit(
                x, y,
                Math.cos(a) * spd, Math.sin(a) * spd,
                randRange(0.25, 0.5), randRange(6, 12),
                ['#ff9020', '#ffb830', '#ffe060', '#fff0a8'][Math.floor(Math.random() * 4)],
                0, true, false
            );
        }
        this.game.renderer.shake(16, 0.34);
    }

    _drawPixelBlade(ctx, px) {
        const blade = [
            [null, '#6a5048', '#8a7060'],
            ['#a89078', '#d8c8b0', '#f0e8d8'],
            ['#d8c8b0', '#fff8e8', '#fff8e8'],
            ['#e8dcc8', '#fff8e8', '#fff8e8'],
            ['#c8b8a0', '#f0e8d8', '#e8dcc8'],
            ['#a89888', '#d8c8b8', null],
            [null, '#8a7060', null],
        ];
        const rows = blade.length;
        const cols = blade[0].length;
        const ox = -Math.floor((cols * px) / 2);
        const oy = -Math.floor((rows * px) / 2);
        ctx.imageSmoothingEnabled = false;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const color = blade[r][c];
                if (!color) continue;
                ctx.fillStyle = color;
                ctx.fillRect(ox + c * px, oy + r * px, px, px);
            }
        }
    }

    _drawPixelBladeWhirl(ctx, w) {
        const lifeT = w.maxLife ? w.life / w.maxLife : 1;
        const radius = w.r;
        const cx = Math.floor(w.x);
        const cy = Math.floor(w.y);
        const bladePx = w.bladePx || Math.round(4 * WHIRL_SIZE_SCALE);
        const alpha = clamp(0.55 + lifeT * 0.45, 0.5, 1);
        const s = WHIRL_SIZE_SCALE;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.globalAlpha = alpha * 0.62;
        const glow = ctx.createRadialGradient(0, 0, radius * 0.1, 0, 0, radius * 1.2);
        glow.addColorStop(0, 'rgba(255, 220, 120, 0.95)');
        glow.addColorStop(0.45, 'rgba(255, 150, 40, 0.65)');
        glow.addColorStop(1, 'rgba(255, 100, 20, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, radius * 1.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.translate(cx, cy);
        ctx.globalAlpha = alpha;

        for (let ring = 0; ring < 4; ring++) {
            const ringR = radius * (0.68 + ring * 0.12);
            const ringA = 0.42 - ring * 0.07;
            ctx.globalAlpha = alpha * ringA;
            if (ring === 0) ctx.strokeStyle = '#fff8c0';
            else if (ring === 1) ctx.strokeStyle = '#ffc840';
            else ctx.strokeStyle = '#ff9028';
            ctx.lineWidth = (ring === 0 ? 8 : ring === 1 ? 6 : 4) * (s * 0.85);
            ctx.lineCap = 'round';
            ctx.setLineDash(ring === 2 ? [14, 10] : []);
            ctx.lineDashOffset = -w.ringPhase * (36 + ring * 12);
            ctx.beginPath();
            ctx.arc(0, 0, ringR, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.setLineDash([]);

        const count = w.bladeCount || 14;
        for (let i = 0; i < count; i++) {
            const a = w.spin + (i / count) * Math.PI * 2;
            const dist = radius * (0.8 + (i % 3) * 0.07);
            ctx.save();
            ctx.rotate(a);
            ctx.translate(dist, 0);
            ctx.rotate(Math.PI * 0.5);
            ctx.globalAlpha = alpha;
            this._drawPixelBlade(ctx, bladePx);
            ctx.restore();
        }

        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#fff8d0';
        const core = Math.ceil(bladePx * 1.2);
        ctx.fillRect(-core, -core, core * 2, core * 2);
        ctx.fillStyle = '#ff9020';
        ctx.fillRect(-bladePx, -bladePx, bladePx * 2, bladePx * 2);
        ctx.restore();
    }

    onResolveEnded() {
        this.resolveFxTimer = 0.28;
    }

    _fireballBlockColor(distRatio, flicker) {
        if (distRatio > 0.92) return flicker ? '#3a1408' : '#4a1808';
        if (distRatio > 0.78) return flicker ? '#b83818' : '#c83818';
        if (distRatio > 0.55) return flicker ? '#ff8830' : '#ff9c38';
        if (distRatio > 0.32) return flicker ? '#ffb858' : '#ffc868';
        return flicker ? '#fff0c0' : '#ffe8b0';
    }

    _drawPixelFireball(ctx, f) {
        const px = FIREBALL_PIXEL;
        const rb = FIREBALL_RADIUS_BLOCKS;
        const ang = f.rot != null ? f.rot : Math.atan2(f.vy, f.vx);
        const lifeT = f.maxLife ? f.life / f.maxLife : 1;
        const flicker = Math.floor(Date.now() / 50) % 2 === 0;
        const cx = Math.floor(f.x);
        const cy = Math.floor(f.y);

        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.globalAlpha = clamp(0.88 + lifeT * 0.12, 0.75, 1);
        ctx.translate(cx, cy);
        ctx.rotate(ang);

        for (let by = -rb; by <= rb; by++) {
            for (let bx = -rb; bx <= rb; bx++) {
                const d = Math.sqrt(bx * bx + by * by);
                if (d > rb + 0.35) continue;
                const ratio = d / rb;
                ctx.fillStyle = this._fireballBlockColor(ratio, flicker && ratio > 0.45);
                ctx.fillRect(bx * px - px / 2, by * px - px / 2, px, px);
            }
        }

        ctx.fillStyle = flicker ? '#fff8e8' : '#fffaf0';
        ctx.fillRect(-px, -px, px, px);
        ctx.fillRect(px - px, -px, px, px);
        ctx.fillRect(-px, px - px, px, px);
        ctx.fillRect(px - px, px - px, px, px);

        ctx.restore();
    }

    _drawPixelShuriken(ctx, x, y, rot, px) {
        const rows = SHURIKEN_SPRITE.length;
        const cols = SHURIKEN_SPRITE[0].length;
        ctx.save();
        ctx.translate(Math.floor(x), Math.floor(y));
        ctx.rotate(rot);
        const ox = -Math.floor((cols * px) / 2);
        const oy = -Math.floor((rows * px) / 2);
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const color = SHURIKEN_SPRITE[r][c];
                if (!color) continue;
                ctx.fillStyle = color;
                ctx.fillRect(ox + c * px, oy + r * px, px, px);
            }
        }
        ctx.restore();
    }

    _shurikenHitRadius(s) {
        if (s && s.hitRadius != null) return s.hitRadius;
        return 7 * (SHURIKEN_PIXEL / 2);
    }

    _shurikenDamage(s) {
        if (s.damage != null) return s.damage;
        return this.game.player.getAbilityDamage(s.dmgMul);
    }

    _updateShurikens(dt, kindFilter = 'all') {
        const monsters = this.game.spawner.getActiveMonsters();
        const p = this.game.player;
        for (const s of this.shurikens) {
            if (kindFilter === 'auto' && s.kind !== 'auto') continue;
            if (kindFilter === 'skill' && s.kind !== 'skill') continue;
            if (kindFilter === 'passive' && s.kind !== 'auto' && s.kind !== 'ice') continue;
            const hitR = this._shurikenHitRadius(s);
            s.life -= dt;
            s.x += s.vx * dt;
            s.y += s.vy * dt;
            s.rot += s.spin * dt;
            for (const m of monsters) {
                if (s.hit.has(m.id)) continue;
                if (!circlesCollide(s.x, s.y, hitR, m.x, m.y, m.hitboxRadius)) continue;
                s.hit.add(m.id);
                const dmg = this._shurikenDamage(s);
                if (s.kind === 'ice') {
                    m.freeze(s.freezeDur || 2);
                }
                const hit = m.takeDamage(dmg, angle(s.x, s.y, m.x, m.y));
                if (hit.actualDamage > 0) {
                    let color = '#a8c0e8';
                    if (s.isSpirit) color = '#ffe878';
                    else if (s.kind === 'auto') color = '#98b8d8';
                    else if (s.kind === 'ice') color = '#78d8ff';
                    this.game.combat.spawnDamageNumber(m.x, m.y - m.hitboxRadius - 4, hit.actualDamage, false, color);
                    this.game.particles.hitSpark(m.x, m.y, false);
                    if (s.kind === 'ice') {
                        this.game.particles.freezeEffect(m.x, m.y, 1.1);
                    }
                }
                if (s.kind === 'auto') {
                    this._trySpawnIceDart(s.x, s.y, dmg, Math.atan2(s.vy, s.vx));
                }
                if (m.dying) this.game.combat._handleMonsterKilled(m);
            }
        }
        this.shurikens = this.shurikens.filter(s => s.life > 0);
    }

    _fireballHitRadius(f) {
        if (f.kind === 'great') return FIREBALL_RADIUS_BLOCKS * FIREBALL_PIXEL;
        return 10;
    }

    _updateFireballs(dt) {
        const monsters = this.game.spawner.getActiveMonsters();
        for (const f of this.fireballs) {
            f.life -= dt;
            f.x += f.vx * dt;
            f.y += f.vy * dt;
            if (f.kind === 'great' && Math.random() < 0.35) {
                const trailAng = Math.atan2(f.vy, f.vx) + Math.PI + randRange(-0.4, 0.4);
                const spd = randRange(20, 60);
                this.game.particles.emit(
                    f.x, f.y,
                    Math.cos(trailAng) * spd, Math.sin(trailAng) * spd,
                    randRange(0.15, 0.3), randRange(4, 7),
                    ['#ff6020', '#ff9038', '#ffc060'][Math.floor(Math.random() * 3)],
                    0, true, false
                );
            }
            const hitR = this._fireballHitRadius(f);
            for (const m of monsters) {
                if (f.hit.has(m.id)) continue;
                if (!circlesCollide(f.x, f.y, hitR, m.x, m.y, m.hitboxRadius)) continue;
                f.hit.add(m.id);
                const dmg = this.game.player.getAbilityDamage(f.dmgMul);
                const hit = m.takeDamage(dmg, angle(f.x, f.y, m.x, m.y));
                if (hit.actualDamage > 0) {
                    this.game.combat.spawnDamageNumber(m.x, m.y - m.hitboxRadius - 4, hit.actualDamage, false, '#ff8a3a');
                    this.game.particles.hitSpark(m.x, m.y, true);
                }
                if (m.dying) this.game.combat._handleMonsterKilled(m);
            }
        }
        this.fireballs = this.fireballs.filter(f => f.life > 0);
    }

    _updateWaterTornados(dt) {
        const monsters = this.game.spawner.getActiveMonsters();
        const hitR = 14 * WATER_TORNADO_SIZE_SCALE;
        for (const t of this.waterTornados) {
            t.life -= dt;
            t.spin += t.spinSpeed * dt;
            t.x += t.vx * dt;
            t.y += t.vy * dt;
            if (Math.random() < 0.55) {
                const trailAng = Math.atan2(t.vy, t.vx) + Math.PI + randRange(-0.5, 0.5);
                const spd = randRange(25, 70);
                this.game.particles.emit(
                    t.x, t.y,
                    Math.cos(trailAng) * spd, Math.sin(trailAng) * spd,
                    randRange(0.12, 0.24), randRange(4, 8),
                    ['#88e0ff', '#48b8f0', '#d8ffff'][Math.floor(Math.random() * 3)],
                    0, true, false
                );
            }
            for (const m of monsters) {
                if (t.hit.has(m.id)) continue;
                if (!circlesCollide(t.x, t.y, hitR, m.x, m.y, m.hitboxRadius)) continue;
                t.hit.add(m.id);
                const dmg = this.game.player.getAbilityDamage(t.dmgMul);
                const hit = m.takeDamage(dmg, angle(t.x, t.y, m.x, m.y));
                if (hit.actualDamage > 0) {
                    this.game.combat.spawnDamageNumber(m.x, m.y - m.hitboxRadius - 4, hit.actualDamage, false, '#7ad8ff');
                    this.game.particles.hitSpark(m.x, m.y, false);
                }
                if (m.dying) this.game.combat._handleMonsterKilled(m);
            }
        }
        this.waterTornados = this.waterTornados.filter(t => t.life > 0);
    }

    _updateBlackHoles(dt) {
        const monsters = this.game.spawner.getActiveMonsters();
        for (const b of this.blackHoles) {
            b.life -= dt;
            b.dmgTimer += dt;
            const reach = b.r * 2.1;
            for (const m of monsters) {
                const d = dist(b.x, b.y, m.x, m.y);
                if (d > reach || d < 1) continue;
                const n = normalize(b.x - m.x, b.y - m.y);
                const f = b.pull * dt * (1 - d / reach);
                m.x += n.x * f;
                m.y += n.y * f;
                if (b.dmgTimer >= 0.18 && d < b.r * 1.05) {
                    const dmg = this.game.player.getAbilityDamage(0.22);
                    const hit = m.takeDamage(dmg, angle(b.x, b.y, m.x, m.y));
                    if (hit.actualDamage > 0) this.game.combat.spawnDamageNumber(m.x, m.y - m.hitboxRadius - 4, hit.actualDamage, false, '#9c7cff');
                    if (m.dying) this.game.combat._handleMonsterKilled(m);
                }
            }
            if (b.dmgTimer >= 0.18) b.dmgTimer = 0;
        }
        this.blackHoles = this.blackHoles.filter(b => b.life > 0);
    }

    _updateWhirls(dt) {
        const monsters = this.game.spawner.getActiveMonsters();
        for (const w of this.whirls) {
            w.life -= dt;
            w.spin += w.spinSpeed * dt;
            w.ringPhase += dt * 10;
            const expand = w.maxLife ? 1 - w.life / w.maxLife : 0;
            w.r = (w.maxR || w.r) * (0.55 + easeOutQuad(expand) * 0.45);
            if (Math.random() < 0.65) {
                const a = w.spin + randRange(0, Math.PI * 2);
                const distR = w.r * randRange(0.55, 1.05);
                this.game.particles.emit(
                    w.x + Math.cos(a) * distR, w.y + Math.sin(a) * distR,
                    Math.cos(a + Math.PI * 0.5) * randRange(30, 90),
                    Math.sin(a + Math.PI * 0.5) * randRange(30, 90),
                    randRange(0.08, 0.18), randRange(2, 5),
                    ['#ffe8a0', '#ffd060', '#fff8d8'][Math.floor(Math.random() * 3)],
                    0, true, false
                );
            }
            for (const m of monsters) {
                if (w.hit.has(m.id)) continue;
                if (dist(w.x, w.y, m.x, m.y) > w.r + m.hitboxRadius) continue;
                w.hit.add(m.id);
                const dmg = this.game.player.getAbilityDamage(w.dmgMul);
                const hit = m.takeDamage(dmg, angle(w.x, w.y, m.x, m.y));
                if (hit.actualDamage > 0) this.game.combat.spawnDamageNumber(m.x, m.y - m.hitboxRadius - 4, hit.actualDamage, false, '#f0d090');
                if (m.dying) this.game.combat._handleMonsterKilled(m);
            }
        }
        this.whirls = this.whirls.filter(w => w.life > 0);
    }

    _updateVines(dt) {
        const monsters = this.game.spawner.getActiveMonsters();
        const leafColors = ['#68e888', '#88ffb0', '#48c868', '#a8ffd0'];
        for (const v of this.vines) {
            v.life -= dt;
            v.wavePhase = (v.wavePhase || 0) + dt * 16;
            v.x += v.vx * dt;
            v.y += v.vy * dt;
            if (Math.random() < 0.85) {
                const back = 18 + v.hitR * 0.3;
                const px = v.x - Math.cos(v.rot) * back;
                const py = v.y - Math.sin(v.rot) * back;
                const a = v.rot + randRange(-0.6, 0.6);
                this.game.particles.emit(
                    px, py,
                    Math.cos(a) * randRange(20, 70),
                    Math.sin(a) * randRange(20, 70),
                    randRange(0.12, 0.28), randRange(3, 7),
                    leafColors[Math.floor(Math.random() * leafColors.length)],
                    -60, true, true
                );
            }
            for (const m of monsters) {
                if (v.hit.has(m.id)) continue;
                if (!circlesCollide(v.x, v.y, v.hitR, m.x, m.y, m.hitboxRadius)) continue;
                v.hit.add(m.id);
                m.slow(v.slowDur, 0.4);
                const hit = m.takeDamage(v.damage, angle(v.x, v.y, m.x, m.y));
                if (hit.actualDamage > 0) {
                    this.game.combat.spawnDamageNumber(m.x, m.y - m.hitboxRadius - 4, hit.actualDamage, false, '#58c878');
                    this._emitHealingBurst(m.x, m.y, 0.55);
                    this.game.particles.hitSpark(m.x, m.y, false);
                }
                if (m.dying) this.game.combat._handleMonsterKilled(m);
            }
        }
        this.vines = this.vines.filter(v => v.life > 0);
    }

    _updateBatSwarms(dt) {
        const p = this.game.player;
        if (!p) return;
        for (const swarm of this.batSwarms) {
            if (swarm.phase === 'orbit') {
                swarm.orbitElapsed = (swarm.orbitElapsed || 0) + dt;
                if (swarm.orbitElapsed < swarm.orbitDuration) continue;
                if (swarm.targets.length > 0) {
                    swarm.phase = 'attack';
                    swarm.idx = 0;
                    swarm.timer = 0;
                } else {
                    swarm.phase = 'return';
                    swarm.returnElapsed = 0;
                }
                continue;
            }

            if (swarm.phase === 'return') {
                swarm.returnElapsed = (swarm.returnElapsed || 0) + dt;
                if (swarm.returnElapsed < swarm.returnDuration) continue;
                const healed = p.heal(swarm.healAmount);
                if (healed > 0) {
                    this.game.combat.spawnDamageNumber(
                        p.x, p.y - p.effectiveRadius - 12, healed, false, '#68d878'
                    );
                }
                swarm.phase = 'done';
                continue;
            }

            swarm.timer -= dt;
            if (swarm.timer > 0) continue;

            if (swarm.phase === 'attack') {
                if (swarm.idx >= swarm.targets.length) {
                    swarm.phase = 'return';
                    swarm.returnElapsed = 0;
                    continue;
                }
                const m = swarm.targets[swarm.idx];
                if (m.alive && !m.dying) {
                    const fromX = p.x;
                    const fromY = p.y;
                    this.game.particles.emit(
                        fromX, fromY,
                        (m.x - fromX) * 3, (m.y - fromY) * 3,
                        0.1, 4, '#503070', 0, true, false
                    );
                    const hit = m.takeDamage(swarm.damage, angle(fromX, fromY, m.x, m.y));
                    if (hit.actualDamage > 0) {
                        this.game.combat.spawnDamageNumber(m.x, m.y - m.hitboxRadius - 4, hit.actualDamage, false, '#a070c8');
                        this.game.particles.hitSpark(m.x, m.y, false);
                    }
                    if (m.dying) this.game.combat._handleMonsterKilled(m);
                }
                swarm.idx++;
                swarm.timer = swarm.stepDelay;
            }
        }
        this.batSwarms = this.batSwarms.filter(s => s.phase !== 'done');
    }

    _vineWaveY(t, wavePhase, amp) {
        return Math.sin(t * Math.PI * 3.2 + wavePhase) * amp
            + Math.sin(t * Math.PI * 6.5 + wavePhase * 1.4) * amp * 0.35;
    }

    _traceVinePath(ctx, len, wavePhase, amp) {
        const steps = 14;
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = lerp(-len * 0.5, len * 0.5, t);
            const y = this._vineWaveY(t, wavePhase, amp);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
    }

    _drawVine(ctx, v) {
        const lifeT = v.maxLife ? v.life / v.maxLife : 1;
        const cx = Math.floor(v.x);
        const cy = Math.floor(v.y);
        const len = 52 + v.hitR * 1.1;
        const wavePhase = v.wavePhase || 0;
        const leafPhase = v.leafPhase || 0;
        const amp = 10 + v.hitR * 0.12;
        const pulse = 0.88 + Math.sin(Date.now() * 0.014 + wavePhase) * 0.12;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(v.rot);
        ctx.globalAlpha = clamp((0.7 + lifeT * 0.3) * pulse, 0.55, 1);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.shadowColor = '#68ffb0';
        ctx.shadowBlur = 18 + v.hitR * 0.25;
        this._traceVinePath(ctx, len, wavePhase, amp);
        ctx.strokeStyle = 'rgba(56, 200, 96, 0.35)';
        ctx.lineWidth = 22 + v.hitR * 0.2;
        ctx.stroke();

        this._traceVinePath(ctx, len, wavePhase, amp);
        const g = ctx.createLinearGradient(-len * 0.5, 0, len * 0.5, 0);
        g.addColorStop(0, 'rgba(32, 120, 56, 0)');
        g.addColorStop(0.25, 'rgba(72, 200, 104, 0.9)');
        g.addColorStop(0.5, 'rgba(120, 255, 160, 0.95)');
        g.addColorStop(0.75, 'rgba(64, 180, 96, 0.9)');
        g.addColorStop(1, 'rgba(24, 90, 48, 0)');
        ctx.strokeStyle = g;
        ctx.lineWidth = 14 + v.hitR * 0.18;
        ctx.stroke();

        this._traceVinePath(ctx, len, wavePhase + 0.4, amp * 0.55);
        ctx.strokeStyle = 'rgba(200, 255, 220, 0.75)';
        ctx.lineWidth = 5;
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.shadowBlur = 0;

        const leafCount = 8;
        for (let i = 0; i < leafCount; i++) {
            const t = (i + 0.5) / leafCount;
            const lx = lerp(-len * 0.45, len * 0.45, t);
            const ly = this._vineWaveY(t, wavePhase, amp);
            const side = i % 2 === 0 ? 1 : -1;
            const sway = Math.sin(leafPhase + i * 1.1 + Date.now() * 0.01) * 3;
            const sz = 5 + (i % 3);
            ctx.save();
            ctx.translate(lx, ly + side * (7 + sway));
            ctx.rotate(side * 0.55 + Math.sin(leafPhase + i) * 0.2);
            ctx.fillStyle = i % 3 === 0 ? '#a8ffc0' : '#68e888';
            ctx.fillRect(-sz, -sz * 0.5, sz, sz);
            ctx.fillStyle = '#48c868';
            ctx.fillRect(-sz + 1, -sz * 0.5 + 1, Math.max(2, sz - 2), Math.max(2, sz - 2));
            ctx.restore();
        }

        ctx.fillStyle = '#e8fff0';
        ctx.globalAlpha = clamp(lifeT * pulse, 0.5, 1);
        const headX = len * 0.42;
        const headY = this._vineWaveY(0.92, wavePhase, amp);
        ctx.beginPath();
        ctx.arc(headX, headY, 6 + v.hitR * 0.08, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    _drawBatSwarm(ctx, swarm) {
        const p = this.game.player;
        if (!p) return;

        if (swarm.phase === 'orbit' || swarm.phase === 'return') {
            this._drawBatsAroundPlayer(ctx, swarm, p);
            return;
        }

        if (swarm.phase === 'attack') {
            const t = Date.now() * 0.018;
            const count = Math.min(swarm.batCount || 8, 8);
            const target = swarm.targets[swarm.idx] || swarm.targets[swarm.targets.length - 1];
            if (!target) {
                this._drawBatsAroundPlayer(ctx, swarm, p);
                return;
            }
            for (let i = 0; i < count; i++) {
                const prog = (swarm.idx + i * 0.08) / Math.max(1, swarm.targets.length);
                const a = t + (i / count) * Math.PI * 2;
                const cx = lerp(p.x, target.x, 0.35 + prog * 0.5) + Math.cos(a) * 12;
                const cy = lerp(p.y, target.y, 0.35 + prog * 0.5) + Math.sin(a) * 10;
                this._drawBat(ctx, cx, cy, t * 2 + i);
            }
            this._drawBatsAroundPlayer(ctx, swarm, p);
        }
    }

    updatePassive(dt) {
        this._updateAutoDartFire(dt);
        if (this.shurikens.some(s => s.kind === 'auto' || s.kind === 'ice')) {
            this._updateShurikens(dt, 'passive');
        }
        if (this.batSwarms.length > 0) this._updateBatSwarms(dt);
    }

    update(dt) {
        if (this.resolveFxTimer > 0) this.resolveFxTimer -= dt;
        if (!this._isResolvePhase()) return;

        this._updateLightningChain(dt);
        if (this.shurikens.some(s => s.kind === 'skill')) this._updateShurikens(dt, 'skill');
        if (this.vines.length > 0) this._updateVines(dt);
        this._updateFireballs(dt);
        this._updateWaterTornados(dt);
        this._updateBlackHoles(dt);
        this._updateWhirls(dt);
    }

    drawBehind(ctx) {
        if (!this._isResolvePhase()) return;
        for (const b of this.blackHoles) {
            const p = 0.8 + Math.sin(Date.now() * 0.008) * 0.2;
            ctx.save();
            const maxLife = b.maxLife || 1.75;
            ctx.globalAlpha = clamp(b.life / maxLife, 0, 1);
            const g = ctx.createRadialGradient(b.x, b.y, 4, b.x, b.y, b.r * 1.55);
            g.addColorStop(0, 'rgba(70,30,120,0.9)');
            g.addColorStop(1, 'rgba(10,6,18,0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.r * p, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    _drawSpiritBomb(ctx, x, y, rot, scale) {
        const px = Math.floor(x);
        const py = Math.floor(y);
        const r = 10 * scale;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(rot);
        const pulse = 0.9 + Math.sin(Date.now() * 0.012) * 0.1;
        const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, r * 1.6 * pulse);
        glow.addColorStop(0, 'rgba(255, 248, 200, 0.95)');
        glow.addColorStop(0.45, 'rgba(255, 210, 80, 0.75)');
        glow.addColorStop(1, 'rgba(255, 140, 40, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.5 * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff8c8';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.55 * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffb830';
        ctx.beginPath();
        ctx.arc(0, 0, r * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    _drawIceDart(ctx, x, y, rot, px) {
        const rows = SHURIKEN_SPRITE.length;
        const cols = SHURIKEN_SPRITE[0].length;
        const iceColors = {
            '#7a8aa8': '#58b8f0',
            '#e8f4ff': '#e8ffff',
            '#b8cce8': '#a8e8ff',
            '#586878': '#3890d8',
        };
        ctx.save();
        ctx.translate(Math.floor(x), Math.floor(y));
        ctx.rotate(rot);
        const ox = -Math.floor((cols * px) / 2);
        const oy = -Math.floor((rows * px) / 2);
        ctx.shadowColor = '#88e8ff';
        ctx.shadowBlur = 10;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const base = SHURIKEN_SPRITE[r][c];
                if (!base) continue;
                ctx.fillStyle = iceColors[base] || '#a8e8ff';
                ctx.fillRect(ox + c * px, oy + r * px, px, px);
            }
        }
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = '#d8ffff';
        ctx.fillRect(ox - 1, oy - 1, cols * px + 2, rows * px + 2);
        ctx.restore();
    }

    drawAutoDarts(ctx) {
        for (const s of this.shurikens) {
            if (s.kind === 'ice') {
                this._drawIceDart(ctx, s.x, s.y, s.rot, SHURIKEN_PIXEL);
                continue;
            }
            if (s.kind !== 'auto') continue;
            const scale = s.visualScale || 1;
            if (s.isSpirit) {
                this._drawSpiritBomb(ctx, s.x, s.y, s.rot, scale);
            } else if (s.isGiant) {
                const px = SHURIKEN_PIXEL * scale;
                ctx.save();
                ctx.shadowColor = '#ffd060';
                ctx.shadowBlur = 8;
                this._drawPixelShuriken(ctx, s.x, s.y, s.rot, px);
                ctx.restore();
            } else {
                const px = SHURIKEN_PIXEL * scale;
                this._drawPixelShuriken(ctx, s.x, s.y, s.rot, px);
            }
        }
    }

    drawFront(ctx) {
        const showAuto = this.hasAutoDarts();
        if (!this._isResolvePhase() && !showAuto) return;

        for (const s of this.shurikens) {
            if (s.kind === 'auto' || s.kind === 'ice') continue;
            this._drawPixelShuriken(ctx, s.x, s.y, s.rot, SHURIKEN_PIXEL);
        }

        for (const f of this.fireballs) {
            if (f.kind === 'great') {
                this._drawPixelFireball(ctx, f);
            } else {
                ctx.imageSmoothingEnabled = false;
                ctx.fillStyle = '#ff8a38';
                ctx.fillRect(Math.floor(f.x - 4), Math.floor(f.y - 4), 8, 8);
                ctx.fillStyle = '#ffd0a0';
                ctx.fillRect(Math.floor(f.x - 2), Math.floor(f.y - 2), 4, 4);
            }
        }
        for (const t of this.waterTornados) {
            this._drawPixelWaterTornado(ctx, t);
        }
        for (const w of this.whirls) {
            this._drawPixelBladeWhirl(ctx, w);
        }
        for (const v of this.vines) {
            this._drawVine(ctx, v);
        }
    }

    drawBatSwarms(ctx) {
        for (const swarm of this.batSwarms) {
            this._drawBatSwarm(ctx, swarm);
        }
    }
}


// ---- summonAbilities.js ----
/**
 * 天雷 / 野狼 / 野牛 / 天神 — 被动召唤与落雷
 */
(function () {
    const SUMMON_CFG = {
        heavenly_thunder: {
            interval: 1.0,
            radius: 40,
            dmgMult: 0.38,
            warnTime: 0.22,
            boltTime: 0.09,
            explodeTime: 0.32,
            skyY: 0,
        },
        wild_wolf: { speed: 118, aggro: 200, atkRange: 36, atkCd: 0.75, dmgMult: 2 },
        wild_bull: { aggro: 240, chargeSpeed: 420, chargeDmgMult: 2.5, idleCd: 1.1, dmgMult: 3 },
        divine_god: { followSpeed: 52, atkInterval: 0.28, swordSpeed: 540, dmgMult: 2, orbitDist: 14 },
        wild_wolf_orbit: 22,
        wild_bull_orbit: 24,
    };

    function _playBottom(game) {
        const ui = game.ui;
        return ui && ui.getPlayAreaBottom
            ? ui.getPlayAreaBottom(game.renderer.h, game.renderer.uiScale)
            : game.renderer.h;
    }

    Object.assign(AbilityManager.prototype, {
        _initSummonState() {
            this.thunderBolts = [];
            this.thunderTimer = 0;
            this.companions = [];
            this.godSwords = [];
        },

        _summonDealDamage(m, damage, color, fromX, fromY) {
            if (!m || !m.alive || m.dying) return;
            const ang = angle(fromX ?? m.x, fromY ?? m.y, m.x, m.y);
            const hit = m.takeDamage(damage, ang);
            if (hit.actualDamage > 0) {
                this.game.combat.spawnDamageNumber(
                    m.x, m.y - m.hitboxRadius - 4, hit.actualDamage, false, color || '#e8c040'
                );
                this.game.particles.hitSpark(m.x, m.y, false);
            }
            if (m.dying) this.game.combat._handleMonsterKilled(m);
        },

        _summonAoeDamage(x, y, radius, damage, color) {
            const monsters = this.game.spawner.getActiveMonsters();
            for (const m of monsters) {
                if (dist(x, y, m.x, m.y) > radius + m.hitboxRadius) continue;
                this._summonDealDamage(m, damage, color, x, y);
            }
        },

        _anchorNearPlayer(p, index, total, distMul) {
            const base = (index / Math.max(1, total)) * Math.PI * 2;
            const orbit = Date.now() * 0.001 + base;
            const r = p.effectiveRadius + 36 + distMul;
            return {
                x: p.homeX + Math.cos(orbit) * r,
                y: p.homeY + Math.sin(orbit) * r * 0.85,
            };
        },

        _getPetCountMultiplier(p) {
            const heart = p.getUpgradeLevel('nurturing_heart');
            return heart > 0 ? Math.pow(2, heart) : 1;
        },

        _getDesiredPetCount(p, upgradeId) {
            const base = p.getUpgradeLevel(upgradeId);
            if (base <= 0) return 0;
            const def = typeof UPGRADE_DEFS !== 'undefined'
                ? UPGRADE_DEFS.find(u => u.id === upgradeId)
                : null;
            if (!def || !def.pet) return base;
            return base * this._getPetCountMultiplier(p);
        },

        _spawnPetWorldPos(p, index, total, scatterInField = false) {
            const w = this.game.renderer.w;
            const top = 88;
            const bottom = _playBottom(this.game);
            if (scatterInField) {
                return {
                    x: randRange(40, w - 40),
                    y: randRange(top + 30, bottom - 30),
                };
            }
            const spread = (index / Math.max(1, total)) * Math.PI * 2 + randRange(-0.35, 0.35);
            const r = randRange(55, 95 + index * 14);
            return {
                x: clamp(p.homeX + Math.cos(spread) * r, 30, w - 30),
                y: clamp(p.homeY + Math.sin(spread) * r * 0.85, top + 24, bottom - 24),
            };
        },

        _spawnCompanion(type, index, total) {
            const p = this.game.player;
            const isPet = type === 'wolf' || type === 'bull';
            const scatter = isPet && this._playerRepositioning(p);
            const pos = isPet
                ? this._spawnPetWorldPos(p, index, total, scatter)
                : this._anchorNearPlayer(p, index, total, SUMMON_CFG.divine_god.orbitDist);
            const cfg = SUMMON_CFG[type === 'wolf' ? 'wild_wolf' : type === 'bull' ? 'wild_bull' : 'divine_god'];
            const lvKey = type === 'wolf' ? 'wild_wolf' : type === 'bull' ? 'wild_bull' : 'divine_god';
            const lv = p.getUpgradeLevel(lvKey);
            return {
                type,
                isPet,
                x: pos.x,
                y: pos.y,
                slot: index,
                state: 'idle',
                atkTimer: randRange(0, 0.4),
                chargeTimer: 0,
                targetId: null,
                chargeHit: new Set(),
                walkPhase: randRange(0, Math.PI * 2),
                facing: 1,
                lv,
                damage: p.getAbilityDamage(cfg.dmgMult * (1 + (lv - 1) * 0.08)),
            };
        },

        _ensureCompanions() {
            const p = this.game.player;
            if (!p) return;
            const specs = [
                { id: 'wild_wolf', type: 'wolf' },
                { id: 'wild_bull', type: 'bull' },
                { id: 'divine_god', type: 'god' },
            ];
            for (const spec of specs) {
                const need = this._getDesiredPetCount(p, spec.id);
                let list = this.companions.filter(c => c.type === spec.type);
                while (list.length < need) {
                    const c = this._spawnCompanion(spec.type, list.length, need);
                    this.companions.push(c);
                    list.push(c);
                }
                while (list.length > need) {
                    const rem = this.companions.findIndex(c => c.type === spec.type);
                    if (rem >= 0) this.companions.splice(rem, 1);
                    list = this.companions.filter(c => c.type === spec.type);
                }
            }
        },

        _spawnThunderStrikes() {
            const p = this.game.player;
            const lv = p.getUpgradeLevel('heavenly_thunder');
            if (lv <= 0) return;
            const cfg = SUMMON_CFG.heavenly_thunder;
            const monsters = this.game.spawner.getActiveMonsters();
            const count = lv;
            const w = this.game.renderer.w;
            const top = 88;

            for (let i = 0; i < count; i++) {
                let tx;
                let ty;
                if (monsters.length > 0) {
                    const m = monsters[randInt(0, monsters.length - 1)];
                    tx = m.x + randRange(-20, 20);
                    ty = m.y + randRange(-16, 16);
                } else {
                    tx = p.homeX + randRange(-80, 80);
                    ty = p.homeY + randRange(-60, 60);
                }
                tx = clamp(tx, 30, w - 30);
                ty = clamp(ty, top + 20, _playBottom(this.game) - 20);
                this.thunderBolts.push({
                    x: tx,
                    y: ty,
                    phase: 'warn',
                    timer: cfg.warnTime || 0.22,
                    radius: cfg.radius + lv * 3,
                    damage: p.getAbilityDamage(cfg.dmgMult * (1 + (lv - 1) * 0.06)),
                    skyY: cfg.skyY ?? 0,
                    boltPoints: null,
                    explodeMax: cfg.explodeTime || 0.32,
                });
            }
        },

        _generateThunderBoltPath(gx, gy, skyY) {
            const points = [{ x: gx, y: skyY }];
            const steps = 14;
            for (let i = 1; i < steps; i++) {
                const t = i / steps;
                points.push({
                    x: gx + randRange(-22, 22) * (1 - t * 0.45),
                    y: lerp(skyY, gy, t) + randRange(-10, 10),
                });
            }
            points.push({ x: gx, y: gy });
            return points;
        },

        _spawnThunderExplosionFx(x, y, radius) {
            const parts = this.game.particles;
            if (!parts) return;
            for (let i = 0; i < 22; i++) {
                const a = randRange(0, Math.PI * 2);
                const spd = randRange(90, 200);
                parts.emit(
                    x, y,
                    Math.cos(a) * spd, Math.sin(a) * spd,
                    randRange(0.18, 0.42), randRange(5, 12),
                    i % 3 === 0 ? '#fff8d0' : (i % 3 === 1 ? '#ffb040' : '#ff6020'),
                    0, true, true
                );
            }
            for (let i = 0; i < 8; i++) {
                const a = randRange(0, Math.PI * 2);
                parts.emit(
                    x + Math.cos(a) * radius * 0.3,
                    y + Math.sin(a) * radius * 0.2,
                    Math.cos(a) * randRange(30, 70),
                    Math.sin(a) * randRange(20, 50) - 40,
                    randRange(0.35, 0.55), randRange(8, 16),
                    '#888898', 0.15, true, false
                );
            }
        },

        _updateThunder(dt) {
            const p = this.game.player;
            const lv = p ? p.getUpgradeLevel('heavenly_thunder') : 0;
            if (lv <= 0) {
                this.thunderBolts = [];
                return;
            }

            const cfg = SUMMON_CFG.heavenly_thunder;
            this.thunderTimer -= dt;
            if (this.thunderTimer <= 0) {
                this._spawnThunderStrikes();
                this.thunderTimer = cfg.interval;
            }

            for (const t of this.thunderBolts) {
                t.timer -= dt;
                if (t.phase === 'warn' && t.timer <= 0) {
                    t.phase = 'bolt';
                    t.timer = cfg.boltTime || 0.09;
                    t.boltPoints = this._generateThunderBoltPath(t.x, t.y, t.skyY);
                } else if (t.phase === 'bolt' && t.timer <= 0) {
                    t.phase = 'explode';
                    t.timer = t.explodeMax || cfg.explodeTime || 0.32;
                    this._summonAoeDamage(t.x, t.y, t.radius, t.damage, '#ffe878');
                    this._spawnThunderExplosionFx(t.x, t.y, t.radius);
                    this.game.renderer.shake(7 + lv * 0.5, 0.16);
                } else if (t.phase === 'explode' && t.timer <= 0) {
                    t.phase = 'done';
                }
            }
            this.thunderBolts = this.thunderBolts.filter(t => t.phase !== 'done');
        },

        _updateWolf(c, dt, p, cfg) {
            c.walkPhase += dt * 9;
            const monsters = this.game.spawner.getActiveMonsters();
            let target = null;
            let best = cfg.aggro;
            for (const m of monsters) {
                const d = dist(c.x, c.y, m.x, m.y);
                if (d < best) {
                    best = d;
                    target = m;
                }
            }

            if (target) {
                c.facing = target.x >= c.x ? 1 : -1;
                const d = dist(c.x, c.y, target.x, target.y);
                if (d > cfg.atkRange) {
                    const dx = target.x - c.x;
                    const dy = target.y - c.y;
                    const len = Math.hypot(dx, dy) || 1;
                    c.x += (dx / len) * cfg.speed * dt;
                    c.y += (dy / len) * cfg.speed * dt;
                } else {
                    c.atkTimer -= dt;
                    if (c.atkTimer <= 0) {
                        c.atkTimer = cfg.atkCd;
                        this._summonDealDamage(target, c.damage, '#c8d8b0', c.x, c.y);
                    }
                }
            }
        },

        _updateBull(c, dt, p, cfg) {
            const monsters = this.game.spawner.getActiveMonsters();

            if (c.state === 'charging') {
                c.chargeTimer -= dt;
                const tx = c.chargeTx;
                const ty = c.chargeTy;
                const dx = tx - c.x;
                const dy = ty - c.y;
                const len = Math.hypot(dx, dy) || 1;
                c.facing = dx >= 0 ? 1 : -1;
                const step = cfg.chargeSpeed * dt;
                c.x += (dx / len) * step;
                c.y += (dy / len) * step;

                for (const m of monsters) {
                    if (c.chargeHit.has(m.id)) continue;
                    if (!circlesCollide(c.x, c.y, 32, m.x, m.y, m.hitboxRadius)) continue;
                    c.chargeHit.add(m.id);
                    this._summonDealDamage(m, c.damage, '#e8b878', c.x, c.y);
                }

                if (dist(c.x, c.y, tx, ty) < 18 || c.chargeTimer <= 0) {
                    c.state = 'idle';
                    c.atkTimer = cfg.idleCd;
                }
                return;
            }

            c.atkTimer -= dt;
            if (c.atkTimer > 0) return;

            let target = null;
            let best = cfg.aggro;
            for (const m of monsters) {
                const d = dist(c.x, c.y, m.x, m.y);
                if (d < best) {
                    best = d;
                    target = m;
                }
            }

            if (target) {
                c.facing = target.x >= c.x ? 1 : -1;
                c.state = 'charging';
                c.chargeTx = target.x;
                c.chargeTy = target.y;
                c.chargeTimer = 1.4;
                c.chargeHit = new Set();
                c.damage = p.getAbilityDamage(cfg.chargeDmgMult * (1 + (c.lv - 1) * 0.08));
            }
        },

        _fireGodSword(c, p, cfg) {
            const monsters = this.game.spawner.getActiveMonsters();
            if (!monsters.length) return;
            monsters.sort((a, b) => dist(c.x, c.y, a.x, a.y) - dist(c.x, c.y, b.x, b.y));
            const target = monsters[0];
            const a = angle(c.x, c.y, target.x, target.y);
            this.godSwords.push({
                x: c.x,
                y: c.y - 18,
                tx: target.x,
                ty: target.y,
                targetId: target.id,
                vx: Math.cos(a) * cfg.swordSpeed,
                vy: Math.sin(a) * cfg.swordSpeed,
                rot: a,
                damage: c.damage,
                life: 2.5,
            });
        },

        _updateGod(c, dt, p, cfg) {
            const godCount = this._getDesiredPetCount(p, 'divine_god');
            const anchor = this._anchorNearPlayer(p, c.slot, godCount, cfg.orbitDist);
            c.x = lerp(c.x, anchor.x, dt * 2.2);
            c.y = lerp(c.y, anchor.y, dt * 2.2);
            c.atkTimer -= dt;
            if (c.atkTimer <= 0) {
                c.atkTimer = cfg.atkInterval;
                this._fireGodSword(c, p, cfg);
            }
        },

        _updateGodSwords(dt) {
            for (const s of this.godSwords) {
                s.life -= dt;
                s.x += s.vx * dt;
                s.y += s.vy * dt;
                const monsters = this.game.spawner.getActiveMonsters();
                if (!s.hitTarget) {
                    for (const m of monsters) {
                        if (!m.alive || m.dying) continue;
                        if (m.id !== s.targetId) continue;
                        if (!circlesCollide(s.x, s.y, 16, m.x, m.y, m.hitboxRadius)) continue;
                        s.hitTarget = true;
                        this._summonDealDamage(m, s.damage, '#fff8c8', s.x, s.y);
                        this.game.particles.slashTrail(m.x, m.y, s.rot);
                        break;
                    }
                }
                if (!s.hitTarget && dist(s.x, s.y, s.tx, s.ty) < 24) s.life = 0;
            }
            this.godSwords = this.godSwords.filter(s => s.life > 0 && !s.hitTarget);
        },

        _playerRepositioning(p) {
            return p.state === PlayerState.BULLET_TIME || p.state === PlayerState.ATTACKING;
        },

        _updateCompanions(dt) {
            const p = this.game.player;
            if (!p || p.hp <= 0) return;
            this._ensureCompanions();

            const w = this.game.renderer.w;
            const h = _playBottom(this.game);
            const top = 88;
            const freezeWolfBull = this._playerRepositioning(p);

            for (const c of this.companions) {
                c.lv = p.getUpgradeLevel(
                    c.type === 'wolf' ? 'wild_wolf' : c.type === 'bull' ? 'wild_bull' : 'divine_god'
                );
                if (c.lv <= 0) continue;

                c.x = clamp(c.x, 20, w - 20);
                c.y = clamp(c.y, top + 16, h - 16);

                if (freezeWolfBull && (c.type === 'wolf' || c.type === 'bull')) {
                    continue;
                }

                if (c.type === 'wolf') {
                    this._updateWolf(c, dt, p, SUMMON_CFG.wild_wolf);
                } else if (c.type === 'bull') {
                    this._updateBull(c, dt, p, SUMMON_CFG.wild_bull);
                } else if (c.type === 'god') {
                    this._updateGod(c, dt, p, SUMMON_CFG.divine_god);
                }
            }

            this.companions = this.companions.filter(c => {
                const key = c.type === 'wolf' ? 'wild_wolf' : c.type === 'bull' ? 'wild_bull' : 'divine_god';
                return p.getUpgradeLevel(key) > 0;
            });

            if (this.godSwords.length) this._updateGodSwords(dt);
        },

        _updateSummonPassives(dt) {
            const p = this.game.player;
            if (!p || this.game.state !== 'PLAYING') return;
            if (p.getUpgradeLevel('heavenly_thunder') > 0) this._updateThunder(dt);
            if (p.getUpgradeLevel('wild_wolf') > 0
                || p.getUpgradeLevel('wild_bull') > 0
                || p.getUpgradeLevel('divine_god') > 0) {
                this._updateCompanions(dt);
            }
        },

        hasSummonFx() {
            return this.companions.length > 0 || this.thunderBolts.length > 0 || this.godSwords.length > 0;
        },

        _drawThunderBoltPath(ctx, points, alpha, width) {
            if (!points || points.length < 2) return;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = '#e8fcff';
            ctx.lineWidth = width;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.shadowColor = '#68d0ff';
            ctx.shadowBlur = 18;
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i].x, points[i].y);
            }
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = Math.max(1, width * 0.45);
            ctx.stroke();
            ctx.restore();
        },

        _drawThunderExplosion(ctx, t) {
            const cx = t.x;
            const cy = t.y;
            const maxT = t.explodeMax || 0.32;
            const prog = clamp(1 - t.timer / maxT, 0, 1);
            const r = t.radius * (0.25 + prog * 0.85);
            const alpha = 1 - prog * 0.85;

            ctx.save();
            ctx.globalAlpha = alpha;

            const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.55);
            core.addColorStop(0, 'rgba(255, 255, 240, 0.95)');
            core.addColorStop(0.35, 'rgba(255, 210, 80, 0.75)');
            core.addColorStop(1, 'rgba(255, 100, 30, 0)');
            ctx.fillStyle = core;
            ctx.beginPath();
            ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
            ctx.fill();

            const ring = ctx.createRadialGradient(cx, cy, r * 0.4, cx, cy, r);
            ring.addColorStop(0, 'rgba(255, 180, 50, 0.5)');
            ring.addColorStop(0.6, 'rgba(255, 90, 30, 0.35)');
            ring.addColorStop(1, 'rgba(80, 40, 10, 0)');
            ctx.fillStyle = ring;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = `rgba(255, 240, 180, ${alpha * 0.8})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(cx, cy, r * prog, 0, Math.PI * 2);
            ctx.stroke();

            ctx.restore();
        },

        _drawThunder(ctx) {
            const cfg = SUMMON_CFG.heavenly_thunder;
            const boltDur = cfg.boltTime || 0.09;

            for (const t of this.thunderBolts) {
                const cx = t.x;
                const cy = t.y;

                if (t.phase === 'warn') {
                    const pulse = 0.4 + Math.sin(Date.now() * 0.025) * 0.2;
                    ctx.save();
                    ctx.globalAlpha = pulse;
                    ctx.strokeStyle = '#ffe878';
                    ctx.lineWidth = 2;
                    ctx.setLineDash([5, 5]);
                    ctx.beginPath();
                    ctx.ellipse(cx, cy, t.radius * 0.65, t.radius * 0.4, 0, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.setLineDash([]);
                    ctx.fillStyle = 'rgba(255, 230, 120, 0.12)';
                    ctx.beginPath();
                    ctx.ellipse(cx, cy, t.radius * 0.5, t.radius * 0.32, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                    continue;
                }

                if (t.phase === 'bolt' && t.boltPoints) {
                    const boltProg = clamp(1 - t.timer / boltDur, 0, 1);
                    const visCount = Math.max(2, Math.floor(t.boltPoints.length * boltProg));
                    const visPts = t.boltPoints.slice(0, visCount);
                    this._drawThunderBoltPath(ctx, visPts, 0.95, 5);
                    if (boltProg >= 0.95) {
                        ctx.save();
                        ctx.globalAlpha = 0.85;
                        const flash = ctx.createRadialGradient(cx, cy, 0, cx, cy, 18);
                        flash.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
                        flash.addColorStop(1, 'rgba(255, 220, 100, 0)');
                        ctx.fillStyle = flash;
                        ctx.beginPath();
                        ctx.arc(cx, cy, 18, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.restore();
                    }
                }

                if (t.phase === 'bolt' && t.boltPoints && t.timer > 0) {
                    const skyX = t.boltPoints[0].x;
                    const skyY = t.boltPoints[0].y;
                    ctx.save();
                    ctx.globalAlpha = 0.2;
                    const cloud = ctx.createRadialGradient(skyX, skyY, 0, skyX, skyY, 50);
                    cloud.addColorStop(0, 'rgba(200, 230, 255, 0.5)');
                    cloud.addColorStop(1, 'rgba(100, 140, 200, 0)');
                    ctx.fillStyle = cloud;
                    ctx.beginPath();
                    ctx.arc(skyX, skyY, 50, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }

                if (t.phase === 'explode') {
                    if (t.boltPoints) {
                        this._drawThunderBoltPath(ctx, t.boltPoints, 0.35, 3);
                    }
                    this._drawThunderExplosion(ctx, t);
                }
            }
        },

        _fillPx(ctx, ox, oy, col, row, color, px) {
            if (!color) return;
            ctx.fillStyle = color;
            ctx.fillRect(ox + col * px, oy + row * px, px, px);
        },

        _drawWolf(ctx, c) {
            const px = 4;
            const x = Math.floor(c.x);
            const y = Math.floor(c.y);
            const bob = Math.sin(c.walkPhase) * 3;
            const leg = Math.sin(c.walkPhase * 2) > 0;
            const facing = c.facing ?? 1;
            ctx.save();
            ctx.imageSmoothingEnabled = false;
            ctx.translate(x, y + bob);
            if (facing < 0) ctx.scale(-1, 1);

            const ox = -11 * px;
            const oy = -7 * px;
            const B = '#383c48';
            const F = '#687080';
            const L = '#98a8b8';
            const E = '#1a1c22';
            const N = '#2a2a30';

            // 尾
            this._fillPx(ctx, ox, oy, -4, 2, B, px);
            this._fillPx(ctx, ox, oy, -3, 1, F, px);
            this._fillPx(ctx, ox, oy, -3, 2, F, px);
            this._fillPx(ctx, ox, oy, -2, 0, B, px);
            // 后腿
            this._fillPx(ctx, ox, oy, -1, 4, B, px);
            this._fillPx(ctx, ox, oy, 0, 5, E, px);
            this._fillPx(ctx, ox, oy, 1, 4, B, px);
            this._fillPx(ctx, ox, oy, 2, 5, E, px);
            // 身
            for (let col = 0; col <= 5; col++) {
                this._fillPx(ctx, ox, oy, col, 2, F, px);
                this._fillPx(ctx, ox, oy, col, 3, B, px);
            }
            this._fillPx(ctx, ox, oy, 2, 1, L, px);
            this._fillPx(ctx, ox, oy, 3, 1, L, px);
            // 前腿
            this._fillPx(ctx, ox, oy, 4, 4, B, px);
            this._fillPx(ctx, ox, oy, 5, 5, E, px);
            this._fillPx(ctx, ox, oy, 6, 4, B, px);
            if (leg) this._fillPx(ctx, ox, oy, 6, 5, E, px);
            // 头颈
            this._fillPx(ctx, ox, oy, 5, 0, F, px);
            this._fillPx(ctx, ox, oy, 6, 0, F, px);
            this._fillPx(ctx, ox, oy, 7, 1, F, px);
            this._fillPx(ctx, ox, oy, 7, 2, B, px);
            // 耳
            this._fillPx(ctx, ox, oy, 6, -2, B, px);
            this._fillPx(ctx, ox, oy, 7, -2, B, px);
            this._fillPx(ctx, ox, oy, 8, -1, B, px);
            // 吻部
            this._fillPx(ctx, ox, oy, 8, 1, L, px);
            this._fillPx(ctx, ox, oy, 9, 2, L, px);
            this._fillPx(ctx, ox, oy, 10, 2, N, px);
            this._fillPx(ctx, ox, oy, 10, 3, N, px);
            this._fillPx(ctx, ox, oy, 9, 3, F, px);
            // 眼
            this._fillPx(ctx, ox, oy, 8, 0, '#e8e8f0', px);
            this._fillPx(ctx, ox, oy, 8, 0, E, px);
            ctx.fillStyle = E;
            ctx.fillRect(ox + 8 * px + 1, oy + 0 * px + 1, px - 2, px - 2);

            ctx.restore();
        },

        _drawBull(ctx, c) {
            const px = 4;
            const x = Math.floor(c.x);
            const y = Math.floor(c.y);
            const facing = c.facing ?? 1;
            const charge = c.state === 'charging';
            ctx.save();
            ctx.imageSmoothingEnabled = false;
            ctx.translate(x, y);
            if (facing < 0) ctx.scale(-1, 1);

            const ox = -13 * px;
            const oy = -8 * px;
            const D = '#4a3020';
            const M = '#7a5030';
            const H = '#a07040';
            const L = '#c8a060';
            const E = '#1a1008';
            const Horn = '#e8dcc8';

            // 尾
            this._fillPx(ctx, ox, oy, -3, 2, D, px);
            this._fillPx(ctx, ox, oy, -2, 1, M, px);
            // 后腿
            this._fillPx(ctx, ox, oy, 0, 5, D, px);
            this._fillPx(ctx, ox, oy, 0, 6, E, px);
            this._fillPx(ctx, ox, oy, 1, 5, D, px);
            this._fillPx(ctx, ox, oy, 1, 6, E, px);
            // 躯干
            for (let col = -1; col <= 6; col++) {
                this._fillPx(ctx, ox, oy, col, 2, M, px);
                this._fillPx(ctx, ox, oy, col, 3, D, px);
                this._fillPx(ctx, ox, oy, col, 4, D, px);
            }
            this._fillPx(ctx, ox, oy, 2, 1, H, px);
            this._fillPx(ctx, ox, oy, 3, 1, H, px);
            // 前腿
            this._fillPx(ctx, ox, oy, 5, 5, D, px);
            this._fillPx(ctx, ox, oy, 5, 6, E, px);
            this._fillPx(ctx, ox, oy, 6, 5, D, px);
            this._fillPx(ctx, ox, oy, 6, 6, E, px);
            // 头
            this._fillPx(ctx, ox, oy, 6, 0, H, px);
            this._fillPx(ctx, ox, oy, 7, 0, H, px);
            this._fillPx(ctx, ox, oy, 7, 1, M, px);
            this._fillPx(ctx, ox, oy, 8, 1, M, px);
            this._fillPx(ctx, ox, oy, 8, 2, M, px);
            this._fillPx(ctx, ox, oy, 9, 2, L, px);
            this._fillPx(ctx, ox, oy, 10, 3, L, px);
            this._fillPx(ctx, ox, oy, 10, 4, E, px);
            // 鼻环
            this._fillPx(ctx, ox, oy, 10, 3, '#d8b040', px);
            // 角
            this._fillPx(ctx, ox, oy, 6, -2, Horn, px);
            this._fillPx(ctx, ox, oy, 7, -3, Horn, px);
            this._fillPx(ctx, ox, oy, 8, -2, Horn, px);
            this._fillPx(ctx, ox, oy, 9, -3, Horn, px);
            this._fillPx(ctx, ox, oy, 7, -1, D, px);
            // 眼
            this._fillPx(ctx, ox, oy, 8, 0, E, px);

            if (charge) {
                ctx.globalAlpha = 0.35;
                ctx.fillStyle = '#ffe8a0';
                ctx.fillRect(ox - 4 * px, oy + 2 * px, 18 * px, 5 * px);
            }

            ctx.restore();
        },

        _drawGod(ctx, c) {
            const x = Math.floor(c.x);
            const y = Math.floor(c.y);
            const pulse = 0.9 + Math.sin(Date.now() * 0.006 + c.slot) * 0.08;
            ctx.save();
            ctx.translate(x, y);
            const g = ctx.createRadialGradient(0, -16, 4, 0, -8, 28 * pulse);
            g.addColorStop(0, 'rgba(255, 248, 220, 0.9)');
            g.addColorStop(1, 'rgba(255, 200, 80, 0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.ellipse(0, -10, 14 * pulse, 20 * pulse, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffe8c8';
            ctx.fillRect(-5, -22, 10, 10);
            ctx.fillStyle = '#fff8f0';
            ctx.fillRect(-8, -8, 16, 14);
            ctx.fillStyle = '#ffd878';
            ctx.fillRect(-10, 4, 20, 4);
            ctx.restore();
        },

        _drawGodSword(ctx, s) {
            const x = Math.floor(s.x);
            const y = Math.floor(s.y);
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(s.rot + Math.PI / 2);
            ctx.shadowColor = '#fff8c0';
            ctx.shadowBlur = 10;
            ctx.fillStyle = '#fffce8';
            ctx.fillRect(-3, -14, 6, 28);
            ctx.fillStyle = '#ffd860';
            ctx.fillRect(-5, 10, 10, 6);
            ctx.fillStyle = '#c8a040';
            ctx.fillRect(-2, -18, 4, 6);
            ctx.restore();
        },

        drawSummonFx(ctx) {
            if (this.thunderBolts.length) this._drawThunder(ctx);
            for (const c of this.companions) {
                if (c.type === 'wolf') this._drawWolf(ctx, c);
                else if (c.type === 'bull') this._drawBull(ctx, c);
                else if (c.type === 'god') this._drawGod(ctx, c);
            }
            for (const s of this.godSwords) this._drawGodSword(ctx, s);
        },
    });

    const _origReset = AbilityManager.prototype.reset;
    AbilityManager.prototype.reset = function (opts = {}) {
        const keepCompanions = opts.keepCompanions === true;
        const savedCompanions = keepCompanions && this.companions
            ? this.companions.map((c) => ({
                ...c,
                chargeHit: c.chargeHit instanceof Set ? new Set(c.chargeHit) : new Set(),
            }))
            : null;
        const savedThunderTimer = keepCompanions ? this.thunderTimer : 0;
        _origReset.call(this);
        this.companions = savedCompanions || [];
        this.thunderTimer = savedThunderTimer ?? 0;
        this.thunderBolts = [];
        this.godSwords = [];
    };

    const _origUpdatePassive = AbilityManager.prototype.updatePassive;
    AbilityManager.prototype.updatePassive = function (dt) {
        _origUpdatePassive.call(this, dt);
        this._updateSummonPassives(dt);
    };

})();


// ---- sakura.js ----
class SakuraSystem {
    constructor() {
        this.petals = [];
        this.active = false;
        this.timer = 0;
        this.duration = 5.5;
        this.fadeOutDuration = 1.8;
    }

    start(worldW, worldH, duration) {
        this.petals = [];
        this.active = true;
        if (duration != null) this.duration = duration;
        this.timer = this.duration;
        const count = 42;
        for (let i = 0; i < count; i++) {
            this.petals.push({
                x: randRange(0, worldW),
                y: randRange(-worldH * 0.25, worldH * 0.08),
                vx: randRange(-18, 18),
                vy: randRange(28, 62),
                rot: randRange(0, Math.PI * 2),
                spin: randRange(-1.8, 1.8),
                sway: randRange(0.8, 2.2),
                swayPhase: randRange(0, Math.PI * 2),
                size: randRange(3, 7),
                color: ['#ffb7c5', '#ffc8d8', '#f8a0b0', '#ffe8ee', '#f5c6d0'][
                    Math.floor(Math.random() * 5)],
            });
        }
    }

    update(dt, worldW, worldH) {
        if (!this.active) return;
        this.timer -= dt;
        if (this.timer <= 0) {
            this.active = false;
            this.petals = [];
            return;
        }

        const fading = this.timer <= this.fadeOutDuration;

        for (const p of this.petals) {
            p.swayPhase += dt * p.sway;
            p.x += (p.vx + Math.sin(p.swayPhase) * 22) * dt;
            p.y += p.vy * dt;
            p.rot += p.spin * dt;

            if (!fading && p.y > worldH + 20) {
                p.y = randRange(-40, -8);
                p.x = randRange(0, worldW);
            }
            if (p.x < -20) p.x = worldW + 10;
            if (p.x > worldW + 20) p.x = -10;
        }
    }

    _getFadeAlpha() {
        if (this.timer <= this.fadeOutDuration) {
            return clamp(this.timer / this.fadeOutDuration, 0, 1);
        }
        return 1;
    }

    _drawPetal(ctx, p, masterAlpha) {
        const s = p.size;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.82 * masterAlpha;

        for (let i = 0; i < 5; i++) {
            ctx.save();
            ctx.rotate((i / 5) * Math.PI * 2);
            ctx.beginPath();
            ctx.ellipse(0, -s * 0.55, s * 0.38, s * 0.72, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        ctx.fillStyle = '#fff5f8';
        ctx.globalAlpha = 0.55 * masterAlpha;
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.18, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    draw(ctx) {
        if (!this.active || this.petals.length === 0) return;
        const masterAlpha = this._getFadeAlpha();
        if (masterAlpha <= 0) return;

        ctx.save();
        ctx.globalAlpha = (0.4 + masterAlpha * 0.5) * masterAlpha;
        for (const p of this.petals) {
            this._drawPetal(ctx, p, masterAlpha);
        }
        ctx.restore();
    }
}


// ---- failDeath.js ----
class StageFailAnimator {
    constructor(game) {
        this.game = game;
        this.active = false;
        this.phase = 'idle';
        this.timer = 0;
        this.spears = [];
        this.onComplete = null;
        this.frozen = false;
        this.death = { shake: 0, fall: 0, alpha: 1, impaleAngles: [] };
    }

    isFrozen() {
        return this.frozen;
    }

    showFailPose() {
        return this.active || this.frozen;
    }

    freeze() {
        this.frozen = true;
        this.active = false;
        this.phase = 'done';
        this.death.fall = 1;
        this.death.shake = 0;
        this.death.alpha = this.death.alpha != null ? this.death.alpha : 0.65;
        const p = this.game.player;
        if (p) {
            p.deathAnim = { active: true, phase: 'done', frozen: true };
        }
    }

    start(onComplete) {
        this.frozen = false;
        const game = this.game;
        const p = game.player;
        if (!p) {
            if (onComplete) onComplete();
            return;
        }

        const monsters = game.spawner.getActiveMonsters();
        const px = p.x;
        const py = p.y;
        const sources = monsters.length > 0
            ? monsters
            : [{ x: px + randRange(90, 160), y: py - randRange(60, 120), facing: Math.PI + 0.4 }];

        this.active = true;
        this.phase = 'windup';
        this.timer = 0;
        this.onComplete = onComplete;
        this.death = { shake: 0, fall: 0, alpha: 1, impaleAngles: [] };
        this.spears = [];

        for (const m of game.spawner.monsters) m.game = game;

        sources.forEach((m, i) => {
            const mx = m.x;
            const my = m.y;
            const tx = px + randRange(-10, 10);
            const ty = py + randRange(-8, 8);
            const ang = angle(mx, my, tx, ty);
            const d = Math.max(40, dist(mx, my, tx, ty));
            this.spears.push({
                fromX: mx,
                fromY: my,
                x: mx,
                y: my,
                targetX: tx,
                targetY: ty,
                angle: ang,
                delay: i * CONFIG.FAIL_DEATH.SPEAR_STAGGER,
                progress: 0,
                dist: d,
                speed: CONFIG.FAIL_DEATH.SPEAR_SPEED,
                landed: false,
                monster: m,
            });
            m.failThrowTimer = CONFIG.FAIL_DEATH.WINDUP + 0.45;
        });

        p.x = px;
        p.y = py;
        p.state = PlayerState.IDLE;
        p.deathAnim = { active: true, phase: 'windup' };
    }

    isActive() {
        return this.active;
    }

    isThrowing() {
        return this.active && (this.phase === 'windup' || this.phase === 'throw');
    }

    update(dt) {
        if (!this.active) return;
        const cfg = CONFIG.FAIL_DEATH;
        const speed = cfg.PLAYBACK_SPEED || 1;
        const p = this.game.player;
        this.timer += dt * speed;

        if (this.phase === 'windup') {
            if (this.timer >= cfg.WINDUP) {
                this.phase = 'throw';
                this.timer = 0;
                if (p) p.deathAnim.phase = 'throw';
            }
            return;
        }

        if (this.phase === 'throw') {
            let pending = false;
            for (const s of this.spears) {
                if (s.landed) continue;
                pending = true;
                if (this.timer < s.delay) continue;
                const elapsed = this.timer - s.delay;
                s.progress = Math.min(1, (elapsed * s.speed) / s.dist);
                s.x = lerp(s.fromX, s.targetX, easeInQuad(s.progress));
                s.y = lerp(s.fromY, s.targetY, easeInQuad(s.progress));
                if (s.progress >= 1) {
                    s.landed = true;
                    s.x = s.targetX;
                    s.y = s.targetY;
                    this.death.impaleAngles.push(s.angle + Math.PI + randRange(-0.2, 0.2));
                }
            }
            if (!pending) {
                this._beginImpact();
            }
            return;
        }

        if (this.phase === 'impact') {
            this.death.shake = Math.sin(this.timer * 48) * (1 - this.timer / cfg.IMPACT_PAUSE) * 8;
            if (this.timer >= cfg.IMPACT_PAUSE) {
                this.phase = 'death';
                this.timer = 0;
                if (p) p.deathAnim.phase = 'falling';
            }
            return;
        }

        if (this.phase === 'death') {
            const t = clamp(this.timer / cfg.DEATH_DURATION, 0, 1);
            this.death.fall = easeInQuad(t);
            this.death.alpha = 1 - t * 0.35;
            this.death.shake *= 0.9;
            if (this.timer >= cfg.DEATH_DURATION) {
                this.freeze();
                const cb = this.onComplete;
                this.onComplete = null;
                if (cb) cb();
            }
        }
    }

    _beginImpact() {
        const cfg = CONFIG.FAIL_DEATH;
        const p = this.game.player;
        this.phase = 'impact';
        this.timer = 0;
        if (p) {
            p.deathAnim.phase = 'impaled';
            this.game.bloodStains.spawn(p.x, p.y + 8, 1.5, 0);
            this.game.particles.deathEffect(p.x, p.y, '#6a1818');
        }
        this.game.renderer.shake(14, 0.35);
    }

    _drawSpear(ctx, x, y, ang, stuck = false) {
        const len = stuck ? 22 : 18;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(ang);
        ctx.fillStyle = '#5a4030';
        ctx.fillRect(-len * 0.55, -1.5, len * 0.72, 3);
        ctx.fillStyle = '#8a7060';
        ctx.fillRect(len * 0.08, -1, len * 0.28, 2);
        ctx.fillStyle = '#c8ccd4';
        ctx.beginPath();
        ctx.moveTo(len * 0.38, 0);
        ctx.lineTo(len * 0.55, -3);
        ctx.lineTo(len * 0.55, 3);
        ctx.closePath();
        ctx.fill();
        if (stuck) {
            ctx.fillStyle = '#8a1818';
            ctx.fillRect(-len * 0.08, -2.5, 5, 5);
        }
        ctx.restore();
    }

    drawSpears(ctx) {
        if (!this.active) return;
        for (const s of this.spears) {
            if (s.landed) continue;
            if (this.phase === 'windup' || this.timer < s.delay) continue;
            this._drawSpear(ctx, s.x, s.y, s.angle, false);
        }
    }

    drawImpaledSpears(ctx, px, py) {
        for (const ang of this.death.impaleAngles) {
            this._drawSpear(ctx, px, py, ang, true);
        }
    }

    drawMonsterThrowSpear(ctx, m) {
        if (!m.failThrowTimer || m.failThrowTimer <= 0) return;
        const ang = angle(m.x, m.y, this.game.player.x, this.game.player.y);
        const reach = m.hitboxRadius + 10;
        const sx = m.x + Math.cos(ang) * reach;
        const sy = m.y + Math.sin(ang) * reach;
        this._drawSpear(ctx, sx, sy, ang, false);
    }
}


// ---- grass.js ----
const GRASS_PALETTES = [
    ['#3a6838', '#4a8048', '#5a9858'],
    ['#3a6038', '#4a7848', '#5a9050'],
    ['#446840', '#528050', '#609860'],
];

class GrassSystem {
    constructor() {
        this.blades = [];
        this.ready = false;
    }

    init(worldW, worldH, playAreaBottom = worldH, safeZone = null) {
        this.blades = [];
        const count = Math.min(22, Math.floor((worldW * worldH) / 45000));
        const topPad = Math.max(100, worldH * 0.14);
        const grassBottom = Math.max(topPad + 40, playAreaBottom - 16);
        const exclusionPad = 12;
        const maxAttempts = count * 24;
        let created = 0;
        let attempts = 0;

        while (created < count && attempts < maxAttempts) {
            attempts++;
            const x = randRange(16, worldW - 16);
            const y = randRange(topPad, grassBottom);
            if (safeZone) {
                const dx = x - safeZone.x;
                const dy = y - safeZone.y;
                const rr = (safeZone.r || 0) + exclusionPad;
                if (dx * dx + dy * dy <= rr * rr) continue;
            }
            const variant = Math.floor(Math.random() * 3);
            this.blades.push({
                x,
                y,
                variant,
                scale: randRange(2, 3),
                height: Math.floor(randRange(3, 6)),
                phase: randRange(0, Math.PI * 2),
                speed: randRange(1.4, 3.2),
                swayAmp: randRange(0.14, 0.28),
                offset: randRange(-1, 1),
            });
            created++;
        }
        this.ready = true;
    }

    update(dt) {
        if (!this.ready) return;
        for (const b of this.blades) {
            b.phase += dt * b.speed;
        }
    }

    _drawTuft(ctx, b) {
        const palette = GRASS_PALETTES[b.variant];
        const s = b.scale;
        const sway = Math.sin(b.phase) * b.swayAmp;
        const baseX = Math.floor(b.x);
        const baseY = Math.floor(b.y);

        ctx.save();
        ctx.translate(baseX + b.offset * s, baseY);

        for (let blade = -1; blade <= 1; blade++) {
            const lean = sway + blade * 0.08;
            ctx.save();
            ctx.rotate(lean + blade * 0.12);
            for (let i = 0; i < b.height; i++) {
                ctx.fillStyle = palette[Math.min(i, palette.length - 1)];
                const w = s + (i === b.height - 1 ? 0 : 0);
                ctx.fillRect(-w / 2 + blade, -i * s - s, w, s);
            }
            ctx.restore();
        }

        ctx.fillStyle = palette[0];
        ctx.fillRect(-s, 0, s * 2, s);
        ctx.restore();
    }

    draw(ctx) {
        if (!this.ready) return;
        for (const b of this.blades) {
            this._drawTuft(ctx, b);
        }
    }
}


// ---- levelManager.js ----
class LevelManager {
    constructor() {
        this.level = 0;
        this.bannerActive = false;
        this.bannerTimer = 0;
        this.bannerDuration = 0;
        this.bannerTitle = '';
        this.bannerSubtitle = '';
        this.bannerColor = '#fff';

        this.stageIntro = null;
        this.clearFlash = null;
        this.failIntro = null;
    }

    startStageIntro(levelNum, onComplete, bossKey) {
        let bossName = null;
        if (bossKey === 'centipede' && CONFIG.BOSS && CONFIG.BOSS.CENTIPEDE) {
            bossName = CONFIG.BOSS.CENTIPEDE.name;
        }
        this.stageIntro = {
            levelNum,
            bossName,
            phase: 'slideIn',
            slideInDur: CONFIG.STAGE_INTRO_SLIDE_IN,
            holdDur: CONFIG.STAGE_INTRO_LABEL_HOLD,
            slideOutDur: CONFIG.STAGE_INTRO_SLIDE_OUT,
            phaseTimer: CONFIG.STAGE_INTRO_SLIDE_IN,
            onComplete,
        };
    }

    isStageIntroActive() {
        return this.stageIntro !== null;
    }

    updateStageIntro(dt) {
        if (!this.stageIntro) return;
        const intro = this.stageIntro;
        intro.phaseTimer -= dt;
        if (intro.phaseTimer > 0) return;

        if (intro.phase === 'slideIn') {
            intro.phase = 'hold';
            intro.phaseTimer = intro.holdDur;
        } else if (intro.phase === 'hold') {
            intro.phase = 'slideOut';
            intro.phaseTimer = intro.slideOutDur;
        } else {
            const cb = intro.onComplete;
            this.stageIntro = null;
            if (cb) cb();
        }
    }

    _getStageIntroTextX(intro, vp) {
        const centerX = vp.cx;
        const offScreen = vp.w * 0.42;
        if (intro.phase === 'slideIn') {
            const t = 1 - clamp(intro.phaseTimer / intro.slideInDur, 0, 1);
            return lerp(-offScreen, centerX, easeOutQuad(t));
        }
        if (intro.phase === 'hold') return centerX;
        const t = 1 - clamp(intro.phaseTimer / intro.slideOutDur, 0, 1);
        return lerp(centerX, vp.w + offScreen, easeInQuad(t));
    }

    _drawStageIntroText(ctx, text, x, y, fontSize, color) {
        const px = Math.max(8, Math.round(fontSize));
        ctx.font = `bold ${px}px ${GAME_FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = color;
        ctx.fillText(text, Math.floor(x), Math.floor(y));
    }

    drawStageIntro(ctx, vp, uiScale) {
        if (!this.stageIntro) return;
        const s = uiScale || 1;
        const intro = this.stageIntro;
        const labelY = Math.floor(vp.y + vp.h * 0.22);
        const textX = Math.floor(this._getStageIntroTextX(intro, vp));
        const fontSize = Math.round(22 * s);
        const text = `第${intro.levelNum}关`;

        ctx.save();
        ctx.imageSmoothingEnabled = false;
        this._drawStageIntroText(ctx, text, textX, labelY, fontSize, '#000000');
        if (intro.bossName) {
            const subSize = Math.round(11 * s);
            this._drawStageIntroText(ctx, intro.bossName, textX, labelY + Math.round(24 * s), subSize, '#000000');
        }
        ctx.restore();
    }

    showClearFlash(onMid) {
        this.clearFlash = {
            timer: CONFIG.STAGE_CLEAR_FLASH,
            duration: CONFIG.STAGE_CLEAR_FLASH,
            onMid,
            midDone: false,
        };
    }

    updateClearFlash(dt) {
        if (!this.clearFlash) return;
        const f = this.clearFlash;
        f.timer -= dt;
        const elapsed = f.duration - f.timer;
        if (!f.midDone && elapsed >= f.duration * 0.45) {
            f.midDone = true;
            if (f.onMid) f.onMid();
        }
        if (f.timer <= 0) this.clearFlash = null;
    }

    drawClearFlash(ctx, vp, uiScale) {
        if (!this.clearFlash) return;
        const s = uiScale || 1;
        const alpha = clamp(this.clearFlash.timer / this.clearFlash.duration, 0, 1);
        ctx.save();
        ctx.globalAlpha = alpha;
        drawPixelText(ctx, '关卡通过', vp.cx, vp.cy, Math.round(26 * s), '#ffd8a0');
        ctx.restore();
    }

    showFailIntro(onComplete) {
        this.failIntro = {
            labelTimer: CONFIG.STAGE_FAIL_LABEL_DURATION,
            labelDuration: CONFIG.STAGE_FAIL_LABEL_DURATION,
            overlayAlpha: 0,
            onComplete,
            completeCalled: false,
        };
    }

    isFailIntroActive() {
        return this.failIntro !== null;
    }

    updateFailIntro(dt) {
        if (!this.failIntro) return;
        const f = this.failIntro;
        if (f.labelTimer > 0) {
            f.labelTimer -= dt;
            if (f.labelTimer <= 0 && !f.completeCalled) {
                f.completeCalled = true;
                if (f.onComplete) f.onComplete();
            }
            return;
        }
        f.overlayAlpha = Math.min(1, f.overlayAlpha + dt / CONFIG.STAGE_FAIL_OVERLAY_FADE);
        if (f.overlayAlpha >= 1) this.failIntro = null;
    }

    drawFail(ctx, vp, s) {
        const intro = this.failIntro;
        const overlayA = intro ? intro.overlayAlpha : 1;
        const labelA = intro && intro.labelTimer > 0
            ? clamp(intro.labelTimer / intro.labelDuration, 0, 1)
            : 0;
        const labelY = vp.y + vp.h * 0.22;

        if (overlayA > 0) {
            ctx.fillStyle = `rgba(0, 0, 0, ${0.72 * overlayA})`;
            ctx.fillRect(vp.x, vp.y, vp.w, vp.h);
        }

        if (labelA > 0) {
            const text = '挑战失败';
            const size = Math.round(24 * s);
            ctx.save();
            ctx.globalAlpha = labelA;
            ctx.imageSmoothingEnabled = false;
            ctx.font = `bold ${size}px ${GAME_FONT}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = 'rgba(255, 220, 210, 0.9)';
            ctx.fillText(text, Math.floor(vp.cx) + 1, Math.floor(labelY) + 1);
            ctx.fillStyle = '#8a2820';
            ctx.fillText(text, Math.floor(vp.cx), Math.floor(labelY));
            ctx.restore();
        }

        if (overlayA > 0.35) {
            const msgA = easeOutQuad(clamp((overlayA - 0.35) / 0.65, 0, 1));
            const pop = 0.88 + 0.12 * msgA;
            const cy = vp.y + vp.h * 0.44;
            ctx.save();
            ctx.globalAlpha = msgA;
            ctx.translate(vp.cx, cy);
            ctx.scale(pop, pop);
            ctx.translate(-vp.cx, -cy);
            drawPixelText(ctx, '体力耗尽', vp.cx, cy, Math.round(20 * s), '#ff9c84');
            drawPixelText(ctx, '点击屏幕重新挑战', vp.cx, cy + 28 * s, Math.round(13 * s), '#f4e8da');
            ctx.restore();
        }
    }

    showBanner(title, subtitle, duration, color = '#fff') {
        this.bannerActive = true;
        this.bannerTimer = duration;
        this.bannerDuration = duration;
        this.bannerTitle = title;
        this.bannerSubtitle = subtitle || '';
        this.bannerColor = color;
    }

    beginFirstLevel() {}

    showStageBanner() {
        // Replaced by stage intro countdown
    }

    onLevelCleared() {}

    update(dt) {
        this.updateStageIntro(dt);
        this.updateClearFlash(dt);
        this.updateFailIntro(dt);
        if (!this.bannerActive) return false;
        this.bannerTimer -= dt;
        if (this.bannerTimer > 0) return false;
        this.bannerActive = false;
        return true;
    }

    drawBanner(ctx, vp, uiScale) {
        if (!this.bannerActive) return;
        const s = uiScale || 1;
        const alpha = clamp(this.bannerTimer / this.bannerDuration, 0, 1);
        const boxW = Math.min(vp.w - 28 * s, 340 * s);
        const boxH = (this.bannerSubtitle ? 72 : 54) * s;
        const x = vp.x + (vp.w - boxW) / 2;
        const y = vp.y + 86 * s;
        ctx.save();
        ctx.globalAlpha = alpha;
        drawPixelPanel(ctx, x, y, boxW, boxH, 'rgba(44,34,26,0.92)', 'rgba(168,132,96,0.85)', 2);
        drawPixelText(ctx, this.bannerTitle, vp.cx, y + boxH * 0.38, Math.round(18 * s), this.bannerColor);
        if (this.bannerSubtitle) {
            drawPixelText(ctx, this.bannerSubtitle, vp.cx, y + boxH * 0.72, Math.round(12 * s), '#c8b8a6');
        }
        ctx.restore();
    }

    drawComplete(ctx, vp, s) {
        ctx.fillStyle = 'rgba(0,0,0,0.72)';
        ctx.fillRect(vp.x, vp.y, vp.w, vp.h);
        drawPixelText(ctx, '你完成了全部关卡', vp.cx, vp.y + vp.h * 0.44, Math.round(22 * s), '#ffd8a0');
        drawPixelText(ctx, '点击屏幕重新开始', vp.cx, vp.y + vp.h * 0.58, Math.round(14 * s), '#f4e8da');
    }
}


// ---- experience.js ----
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
        if (monster.isBossSegment) return;
        this.addExp(this.getKillReward(monster));
    }

    _countUpgradePicks(player) {
        if (!player || typeof UPGRADE_DEFS === 'undefined') return 0;
        let n = 0;
        for (const def of UPGRADE_DEFS) {
            n += player.getUpgradeLevel(def.id);
        }
        return n;
    }

    setDebugLevel(targetLevel, player) {
        const lv = clamp(Math.floor(targetLevel), 1, 30);
        this.level = lv;
        this.exp = 0;
        this.expToNext = this._calcExpToNext(lv);
        const picks = this._countUpgradePicks(player);
        this.pendingLevelUps = Math.max(0, lv - 1 - picks);
    }

    tryTriggerPendingUpgrade() {
        if (this.pendingLevelUps <= 0) return;
        if (this.game.state !== 'PLAYING') return;
        if (this.game.isUpgradeBlocked()) return;

        this.pendingLevelUps--;
        const game = this.game;
        if (game.input) game.input.cancelActivePointer();
        game.state = 'LEVEL_UP';
        game._pauseForUpgrade();
        game.upgrades.generateChoices();
        game._lockOverlayInput();
        game.audio.playLevelUp();
    }
}


// ---- pixelUi.js ----
function getBuffOrbIconSprite(type) {
    const W = '#f8f8f8';
    const D = '#2a1e16';
    const B = '#9be8ff';
    const G = '#d8ff98';
    const P = '#ffd0ff';
    const O = '#ffb070';
    const map = {
        attack: [
            [null, W, null, null, W, null],
            [null, W, O, O, W, null],
            [null, W, O, O, W, null],
            [null, W, null, null, W, null],
            [null, D, null, null, D, null],
            [null, D, null, null, D, null],
        ],
        ki: [
            [null, B, null, B, null],
            [B, W, B, W, B],
            [null, B, W, B, null],
            [null, B, W, B, null],
            [B, W, B, W, B],
        ],
        combo: [
            [null, P, W, P, null],
            [P, null, W, null, P],
            [W, W, W, W, W],
            [P, null, W, null, P],
            [null, P, W, P, null],
        ],
        ice: [
            [null, null, B, null, null],
            [null, B, W, B, null],
            [B, W, W, W, B],
            [null, B, W, B, null],
            [null, null, B, null, null],
        ],
    };
    return map[type] || map.attack;
}

function drawPixelIcon(ctx, sprite, cx, cy, px) {
    if (!sprite || sprite.length === 0) return;
    const rows = sprite.length;
    const cols = sprite[0].length;
    const ox = Math.floor(cx - (cols * px) / 2);
    const oy = Math.floor(cy - (rows * px) / 2);
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const color = sprite[r][c];
            if (!color) continue;
            ctx.fillStyle = color;
            ctx.fillRect(ox + c * px, oy + r * px, px, px);
        }
    }
}

function drawPixelPanel(ctx, x, y, w, h, fill, border, borderPx = 2) {
    const bx = Math.floor(x);
    const by = Math.floor(y);
    const bw = Math.floor(w);
    const bh = Math.floor(h);
    const bp = Math.max(1, Math.floor(borderPx));
    ctx.fillStyle = border;
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = fill;
    ctx.fillRect(bx + bp, by + bp, bw - bp * 2, bh - bp * 2);
}

function drawPixelText(ctx, text, x, y, sizePx, color, align = 'center', baseline = 'middle') {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    const px = Math.max(8, Math.round(sizePx));
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    ctx.font = `bold ${px}px ${GAME_FONT}`;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    const off = Math.max(1, Math.floor(px / 7));
    ctx.fillStyle = '#1a1008';
    ctx.fillText(text, ix + off, iy + off);
    ctx.fillStyle = color;
    ctx.fillText(text, ix, iy);
    ctx.restore();
}

function getBuffOrbShortLabel(type) {
    if (type === 'attack') return '攻击';
    if (type === 'ki') return '气力';
    if (type === 'combo') return '连击';
    if (type === 'ice') return '冰冻';
    return '强化';
}


// ---- ui.js ----
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

    _getHudLayout(vp, s, player, game) {
        const pad = 12 * s;
        const kiY = vp.y + 28 * s;
        const kiH = 40 * s;
        const boss = game && game.spawner && game.spawner.boss;
        const showBossBar = boss && boss.phase === 'active';
        const bossBarH = showBossBar ? 22 * s : 0;
        const bossBarY = kiY + kiH + 6 * s;
        const buffRowY = showBossBar ? bossBarY + bossBarH + 6 * s : kiY + kiH + 8 * s;
        const hasBuffs = player && player.collectedOrbBuffs && player.collectedOrbBuffs.length > 0;
        const secondRowY = hasBuffs ? buffRowY + 30 * s : buffRowY;
        return {
            pad,
            kiX: vp.x + pad,
            kiY,
            kiW: vp.w - pad * 2,
            kiH,
            bossBarY,
            bossBarH,
            showBossBar,
            buffRowY,
            secondRowY,
            comboY: secondRowY + 8 * s,
        };
    }

    drawBossHpBar(ctx, boss, layout, s) {
        if (!boss || !layout.showBossBar) return;
        const x = layout.kiX;
        const y = layout.bossBarY;
        const w = layout.kiW;
        const h = layout.bossBarH;
        const ratio = boss.hpRatio;
        const border = Math.max(2, Math.floor(2 * s));

        ctx.save();
        ctx.imageSmoothingEnabled = false;
        drawPixelPanel(ctx, x, y, w, h, '#281820', '#c84848', border);

        const innerX = x + border;
        const innerY = y + border;
        const innerW = w - border * 2;
        const innerH = h - border * 2;
        const fillW = Math.floor(innerW * ratio);

        ctx.fillStyle = '#3a1818';
        ctx.fillRect(innerX, innerY, innerW, innerH);
        if (fillW > 0) {
            ctx.fillStyle = '#c83030';
            ctx.fillRect(innerX, innerY, fillW, innerH);
            ctx.fillStyle = '#ff6868';
            ctx.fillRect(innerX, innerY, fillW, Math.max(2, Math.floor(innerH * 0.4)));
        }

        drawPixelText(ctx, boss.name, x + 8 * s, y + h / 2, Math.round(9 * s), '#ffe0c8', 'left', 'middle');
        drawPixelText(
            ctx,
            `${Math.ceil(boss.totalHp)}/${boss.maxTotalHp}`,
            x + w - 8 * s,
            y + h / 2,
            Math.round(8 * s),
            '#ffd0c0',
            'right',
            'middle'
        );
        ctx.restore();
    }

    draw(ctx, game, vp, s) {
        const layout = this._getHudLayout(vp, s, game.player, game);
        this._lastHudLayout = layout;
        this.drawTopKiBar(ctx, game.player, layout, s);
        if (game.spawner && game.spawner.boss) {
            this.drawBossHpBar(ctx, game.spawner.boss, layout, s);
        }
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
        const combo = Math.floor(player.comboDisplayPeak);
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


// ---- combat.js ----
class CombatManager {
    constructor(game) {
        this.game = game;
        this.damageNumbers = [];
        this.roundAttackResolved = true;
        this.pendingHits = [];
        this.resolving = false;
        this.resolveTimer = 0;
        this.afterimages = [];
        this._deathStaggerIndex = 0;
    }

    beginRoundAttack() {
        this.roundAttackResolved = false;
        this.pendingHits = [];
        this.resolving = false;
        this.resolveTimer = 0;
        this.afterimages = [];
        this._deathStaggerIndex = 0;
    }

    scheduleDeathFade() {
        const interval = CONFIG.COMBAT_RESOLVE.DEATH_STAGGER || 0.07;
        const delay = this._deathStaggerIndex * interval;
        this._deathStaggerIndex++;
        return delay;
    }

    consumeRoundAttack() {
        if (this.roundAttackResolved) return false;
        this.roundAttackResolved = true;
        return true;
    }

    isResolving() {
        return this.resolving;
    }

    spawnDamageNumber(x, y, damage, isCrit = false, color = null) {
        this.damageNumbers.push({
            x, y, damage, isCrit, life: 0.85, maxLife: 0.85,
            vy: -68, color: color || (isCrit ? '#f08230' : '#c22a20'),
        });
    }

    _handleMonsterKilled(m) {
        if (m._deathHandled || m.isBossSegment) return;
        m._deathHandled = true;
        const player = this.game.player;
        const hitAngle = player
            ? angle(player.x, player.y, m.x, m.y)
            : Math.random() * Math.PI * 2;
        const intensity = m.size > 13 ? 1.35 : 1;
        this.game.bloodStains.spawn(m.x, m.y + m.hitboxRadius * 0.35, intensity, hitAngle);
        this.game.particles.deathEffect(m.x, m.y, m.color);
        if (m.canSplit() && !m.spawnedChildren && this._shouldSpawnSplitChildren(m)) {
            m.spawnedChildren = true;
            const kids = this.game.spawner.spawnSplitChildren(m);
            for (const k of kids) {
                this.game.particles.spawnEffect(k.x, k.y, k.color);
            }
        }
        if (this.game.experience) this.game.experience.onMonsterKilled(m);
        if (this.game.player) this.game.player.onEnemyKilledForUpgrades(m.x, m.y);
    }

    _shouldSpawnSplitChildren(deadMonster) {
        const others = this.game.spawner.getActiveMonsters().filter(m => m !== deadMonster);
        if (others.length > 0) return true;
        return true;
    }

    recordFinalPathSegment() {
        const p = this.game.player;
        if (!p || p.attackPath.length < 2) return;
        const from = p.attackPath[p.attackPath.length - 2];
        const to = p.attackPath[p.attackPath.length - 1];
        this._recordPathHits(from, to, p.pathIndex);
    }

    beginResolve(attackPath) {
        const p = this.game.player;
        if (!p) return;
        this.resolvePath = attackPath ? attackPath.map(pt => ({ x: pt.x, y: pt.y })) : [];
        if (this.pendingHits.length === 0) {
            this._finishResolve();
            return;
        }
        this.resolving = true;
        this.resolveTimer = CONFIG.COMBAT_RESOLVE.FIRST_HIT_DELAY;
        this.game.abilities.onResolveStarted(this.resolvePath);
    }

    _finishResolve() {
        const p = this.game.player;
        this.resolving = false;
        this.pendingHits = [];
        this.resolvePath = [];
        this._applyCloneHits();
        this.game.abilities.onResolveEnded();
        if (p) p.endCombo();
        if (this.game.experience) this.game.experience.tryTriggerPendingUpgrade();
    }

    _spawnAfterimage(x, y, angle) {
        this.afterimages.push({
            x, y, angle,
            life: CONFIG.COMBAT_RESOLVE.AFTERIMAGE_LIFE,
            maxLife: CONFIG.COMBAT_RESOLVE.AFTERIMAGE_LIFE,
        });
    }

    _recordPathProjectileHits(pathFrom, pathTo, segmentIndex) {
        const p = this.game.player;
        const projs = this.game.projectiles && this.game.projectiles.projectiles;
        if (!p || !projs || !projs.length) return;

        const segLen = dist(pathFrom.x, pathFrom.y, pathTo.x, pathTo.y);
        if (segLen < 0.001) return;

        for (const proj of projs) {
            if (!proj.alive || !proj.blockable) continue;
            const key = `${proj.id}:${segmentIndex}`;
            if (p.hitProjectilesInSegment.has(key)) continue;

            const vx = pathTo.x - pathFrom.x;
            const vy = pathTo.y - pathFrom.y;
            const ux = proj.x - pathFrom.x;
            const uy = proj.y - pathFrom.y;
            const t = clamp((ux * vx + uy * vy) / Math.max(1e-6, segLen * segLen), 0, 1);
            const px = pathFrom.x + vx * t;
            const py = pathFrom.y + vy * t;
            const hitDist = proj.radius + p.effectiveRadius * 0.38;
            if (dist(px, py, proj.x, proj.y) > hitDist) continue;

            p.hitProjectilesInSegment.add(key);
            proj.alive = false;
            this.game.particles.hitSpark(proj.x, proj.y, false);
            this.game.particles.slashTrail(proj.x, proj.y, angle(pathFrom.x, pathFrom.y, pathTo.x, pathTo.y));
        }
    }

    _pathSegmentHitsMonster(pathFrom, pathTo, monster, hitPad) {
        const segLen = dist(pathFrom.x, pathFrom.y, pathTo.x, pathTo.y);
        if (segLen < 0.001) return false;

        const vx = pathTo.x - pathFrom.x;
        const vy = pathTo.y - pathFrom.y;
        const ux = monster.x - pathFrom.x;
        const uy = monster.y - pathFrom.y;
        const t = clamp((ux * vx + uy * vy) / Math.max(1e-6, segLen * segLen), 0, 1);
        const px = pathFrom.x + vx * t;
        const py = pathFrom.y + vy * t;
        return dist(px, py, monster.x, monster.y) <= monster.hitboxRadius + hitPad;
    }

    getPathPreviewTargetIds(path, player) {
        const ids = new Set();
        if (!path || path.length < 2 || !player) return ids;

        const hitPad = player.effectiveRadius * 0.42;
        const monsters = this.game.spawner.getActiveMonsters();
        for (let i = 0; i < path.length - 1; i++) {
            const from = path[i];
            const to = path[i + 1];
            for (const m of monsters) {
                if (this._pathSegmentHitsMonster(from, to, m, hitPad)) ids.add(m.id);
            }
        }
        return ids;
    }

    _recordPathHits(pathFrom, pathTo, segmentIndex) {
        const p = this.game.player;
        const monsters = this.game.spawner.getActiveMonsters();
        const hitPad = p.effectiveRadius * 0.42;
        for (const m of monsters) {
            const key = `${m.id}:${segmentIndex}`;
            if (p.hitMonstersInSegment.has(key)) continue;
            if (!this._pathSegmentHitsMonster(pathFrom, pathTo, m, hitPad)) continue;

            p.hitMonstersInSegment.add(key);
            this.pendingHits.push({
                monsterId: m.id,
                pathFrom: { x: pathFrom.x, y: pathFrom.y },
                pathTo: { x: pathTo.x, y: pathTo.y },
            });
        }
    }

    _getMonsterById(id) {
        return this.game.spawner.getCombatTargetById(id);
    }

    _applyQueuedHit(hit) {
        const p = this.game.player;
        const m = this._getMonsterById(hit.monsterId);
        if (!p || !m) return;

        const hitAngle = angle(hit.pathFrom.x, hit.pathFrom.y, hit.pathTo.x, hit.pathTo.y);
        const dashAngle = angle(p.x, p.y, m.x, m.y);
        this._spawnAfterimage(m.x, m.y, dashAngle);
        this.game.particles.slashTrail(m.x, m.y, hitAngle);
        this.game.particles.slashTrail(p.x, p.y, dashAngle);

        const { damage, isCrit } = p.getDamage();
        const strike = m.takeDamage(damage, hitAngle);

        if (strike.blockedByShield) {
            this.spawnDamageNumber(m.x, m.y - m.hitboxRadius - 4, 0, false, '#9fb8d8');
            return;
        }

        if (strike.actualDamage <= 0) return;

        const combo = p.registerComboHit('path');
        this.game.abilities.onResolveHit(hit, combo);

        this.spawnDamageNumber(m.x, m.y - m.hitboxRadius - 4, strike.actualDamage, isCrit);
        this.game.particles.hitSpark(m.x, m.y, isCrit);
        this.game.renderer.shakeAttackHit(isCrit, combo);

        if (m.kind === MonsterKind.BERSERKER && m.base) {
            const drain = m.base.kiDrainOnHit || 0;
            p.ki = Math.max(0, p.ki - drain);
        }

        if (m.dying) {
            this._applyIceBurst(m.x, m.y);
            this._handleMonsterKilled(m);
        }
    }

    _applyCloneHits() {
        const p = this.game.player;
        if (!p || !p.shadowClones.length) return;
        const monsters = this.game.spawner.getActiveMonsters();
        const cloneDmg = p.getAbilityDamage(0.2);
        for (const c of p.shadowClones) {
            for (const m of monsters) {
                if (!circlesCollide(c.x, c.y, p.effectiveRadius * 0.7, m.x, m.y, m.hitboxRadius)) continue;
                const hit = m.takeDamage(cloneDmg, angle(c.x, c.y, m.x, m.y));
                if (hit.actualDamage > 0) {
                    this.spawnDamageNumber(m.x, m.y - m.hitboxRadius - 4, hit.actualDamage, false, '#a58ad0');
                    this.game.particles.hitSpark(m.x, m.y, false);
                }
                if (m.dying) this._handleMonsterKilled(m);
            }
        }
    }

    _applyIceBurst(centerX, centerY) {
        const p = this.game.player;
        if (!p.turnBuffs.iceReady) return;
        p.turnBuffs.iceReady = false;
        const monsters = this.game.spawner.getActiveMonsters();
        const dmg = p.getAbilityDamage(0.30);
        const radius = 90;
        for (const m of monsters) {
            if (dist(centerX, centerY, m.x, m.y) > radius + m.hitboxRadius) continue;
            m.freeze(1.8);
            m.vulnerableMark = true;
            const hit = m.takeDamage(dmg, angle(centerX, centerY, m.x, m.y));
            if (hit.actualDamage > 0) this.spawnDamageNumber(m.x, m.y - m.hitboxRadius - 4, hit.actualDamage, false, '#78d8ff');
            this.game.particles.freezeEffect(m.x, m.y);
            if (m.dying) this._handleMonsterKilled(m);
        }
        this.game.player.queueMessage('冰冻触发!');
    }

    update(dt) {
        const p = this.game.player;

        if (this.resolving) {
            this.resolveTimer -= dt;
            if (this.resolveTimer <= 0) {
                if (this.pendingHits.length > 0) {
                    this._applyQueuedHit(this.pendingHits.shift());
                    this.resolveTimer = CONFIG.COMBAT_RESOLVE.HIT_INTERVAL;
                } else {
                    this._finishResolve();
                }
            }
        } else if (p && p.state === PlayerState.ATTACKING && p.pathIndex < p.attackPath.length - 1) {
            const from = p.attackPath[p.pathIndex];
            const to = p.attackPath[p.pathIndex + 1];
            this._recordPathHits(from, to, p.pathIndex);
            this._recordPathProjectileHits(from, to, p.pathIndex);
        }

        for (let i = this.afterimages.length - 1; i >= 0; i--) {
            this.afterimages[i].life -= dt;
            if (this.afterimages[i].life <= 0) this.afterimages.splice(i, 1);
        }

        if (this.game.abilities.hasActiveFx()) {
            this.game.abilities.update(dt);
        }
        for (const d of this.damageNumbers) {
            d.life -= dt;
            d.y += d.vy * dt;
            d.vy *= 0.95;
        }
        this.damageNumbers = this.damageNumbers.filter(d => d.life > 0);
    }

    drawAfterimages(ctx) {
        const p = this.game.player;
        if (!p || this.afterimages.length === 0) return;
        const sprite = SPRITES.ninja.attack[0];
        for (const img of this.afterimages) {
            const t = img.life / img.maxLife;
            ctx.save();
            ctx.globalAlpha = t * 0.55;
            ctx.translate(img.x, img.y);
            ctx.rotate(img.angle * 0.15);
            drawSprite(ctx, sprite, 0, 0, p.spriteScale * 0.92);
            ctx.restore();
        }
    }

    drawDamageNumbers(ctx) {
        const s = this.game.renderer.uiScale || 1;
        for (const d of this.damageNumbers) {
            const alpha = d.life / d.maxLife;
            const size = Math.floor((15 + d.damage * 0.24) * s * (d.isCrit ? 1.28 : 1));
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.font = `${size}px ${GAME_FONT}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.lineWidth = Math.max(2, size * 0.14);
            ctx.strokeStyle = 'rgba(255,248,236,0.92)';
            ctx.strokeText(String(d.damage), d.x, d.y);
            ctx.fillStyle = d.color;
            ctx.fillText(String(d.damage), d.x, d.y);
            ctx.restore();
        }
    }
}


// ---- monsterSpawner.js ----
class MonsterSpawner {
    constructor(game) {
        this.game = game;
        this.monsters = [];
        this.spawnClusters = [];
    }

    reset() {
        this.monsters = [];
        this.spawnClusters = [];
        this.boss = null;
    }

    _getSpawnBounds(w, playBottom) {
        const edgePad = 26;
        const top = 88;
        const bottom = Math.max(top + 80, playBottom - 26);
        return { edgePad, top, bottom };
    }

    _minDistFromPlayer(safeZone) {
        const pad = CONFIG.SPAWN.MIN_DIST_FROM_PLAYER || 100;
        return (safeZone?.r || 40) + pad;
    }

    _initSpawnClusters(w, h, playBottom, safeZone) {
        this.spawnClusters = [];
        const { edgePad, top, bottom } = this._getSpawnBounds(w, playBottom);
        const minPlayerDist = this._minDistFromPlayer(safeZone);
        const cfg = CONFIG.SPAWN;
        const clusterCount = Math.floor(randRange(cfg.CLUSTER_COUNT_MIN || 5, (cfg.CLUSTER_COUNT_MAX || 9) + 0.999));

        for (let i = 0; i < clusterCount; i++) {
            for (let attempt = 0; attempt < 80; attempt++) {
                const x = randRange(edgePad, w - edgePad);
                const y = randRange(top, bottom);
                if (safeZone && dist(x, y, safeZone.x, safeZone.y) < minPlayerDist) continue;

                let tooClose = false;
                for (const c of this.spawnClusters) {
                    if (dist(x, y, c.x, c.y) < 72) {
                        tooClose = true;
                        break;
                    }
                }
                if (tooClose) continue;

                const density = randRange(0.3, 1);
                this.spawnClusters.push({
                    x,
                    y,
                    radius: lerp(48, 92, density),
                    weight: 0.25 + density * density * 1.4,
                });
                break;
            }
        }

        if (!this.spawnClusters.length) {
            const fallbackX = safeZone
                ? clamp(safeZone.x + minPlayerDist * 1.1, edgePad, w - edgePad)
                : w * 0.72;
            const fallbackY = clamp(safeZone ? safeZone.y : (top + bottom) * 0.5, top, bottom);
            this.spawnClusters.push({ x: fallbackX, y: fallbackY, radius: 80, weight: 1 });
        }
    }

    _pickWeightedCluster() {
        if (!this.spawnClusters.length) return null;
        const total = this.spawnClusters.reduce((sum, c) => sum + c.weight, 0);
        let roll = Math.random() * total;
        for (const c of this.spawnClusters) {
            roll -= c.weight;
            if (roll <= 0) return c;
        }
        return this.spawnClusters[this.spawnClusters.length - 1];
    }

    _tooCloseToExisting(x, y, minDist) {
        for (const m of this.monsters) {
            if (!m.alive) continue;
            if (dist(x, y, m.x, m.y) < minDist) return true;
        }
        return false;
    }

    _pickSpawnPos(w, h, playBottom, safeZone) {
        const { edgePad, top, bottom } = this._getSpawnBounds(w, playBottom);
        const minPlayerDist = this._minDistFromPlayer(safeZone);
        const minSpacing = CONFIG.SPAWN.MIN_MONSTER_SPACING || 20;
        const clusterChance = CONFIG.SPAWN.CLUSTER_PICK_CHANCE || 0.74;

        for (let i = 0; i < 140; i++) {
            let x;
            let y;
            if (Math.random() < clusterChance && this.spawnClusters.length) {
                const cluster = this._pickWeightedCluster();
                const ang = randRange(0, Math.PI * 2);
                const rad = cluster.radius * Math.sqrt(Math.random());
                x = cluster.x + Math.cos(ang) * rad;
                y = cluster.y + Math.sin(ang) * rad;
            } else {
                x = randRange(edgePad, w - edgePad);
                y = randRange(top, bottom);
            }

            x = clamp(x, edgePad, w - edgePad);
            y = clamp(y, top, bottom);
            if (safeZone && dist(x, y, safeZone.x, safeZone.y) < minPlayerDist) continue;
            if (this._tooCloseToExisting(x, y, minSpacing)) continue;
            return { x, y };
        }

        for (let i = 0; i < 80; i++) {
            const x = randRange(edgePad, w - edgePad);
            const y = randRange(top, bottom);
            if (safeZone && dist(x, y, safeZone.x, safeZone.y) < minPlayerDist * 0.85) continue;
            return { x, y };
        }

        return {
            x: clamp((safeZone?.x || w * 0.5) + minPlayerDist, edgePad, w - edgePad),
            y: clamp(safeZone?.y || (top + bottom) * 0.5, top, bottom),
        };
    }

    _spawnBatch(kind, count, w, h, playBottom, safeZone, splitTier = 0, withSpawnAnim = false, stageStatScale = null) {
        for (let i = 0; i < count; i++) {
            const pos = this._pickSpawnPos(w, h, playBottom, safeZone);
            const m = new Monster(pos.x, pos.y, kind, splitTier, stageStatScale);
            m.game = this.game;
            if (withSpawnAnim) m.beginSpawn(CONFIG.MONSTER_SPAWN_ANIM + randRange(0, 0.12));
            this.monsters.push(m);
        }
    }

    _scaledCount(n) {
        const scale = CONFIG.STAGE_MONSTER_SCALE || 1;
        const mul = CONFIG.STAGE_COUNT_MUL ?? 1;
        return Math.max(0, Math.round((n || 0) * scale * mul));
    }

    _scaledShieldCount(n) {
        const mul = CONFIG.SHIELD_COUNT_MUL ?? 1;
        return Math.max(0, Math.round(this._scaledCount(n) * mul));
    }

    spawnStage(stageIndex, w, h, playBottom, safeZone, withSpawnAnim = false) {
        this.monsters = [];
        this.boss = null;
        const cfg = CONFIG.STAGES[clamp(stageIndex, 0, CONFIG.STAGES.length - 1)];
        if (!cfg) return;
        const stageStatScale = getStageStatScale(stageIndex);

        if (cfg.boss === 'centipede') {
            this.boss = new CentipedeBoss(this.game, w, h, playBottom, safeZone, stageStatScale);
            return;
        }

        this._initSpawnClusters(w, h, playBottom, safeZone);
        this._spawnBatch(MonsterKind.NORMAL, this._scaledCount(cfg.normal), w, h, playBottom, safeZone, 0, withSpawnAnim, stageStatScale);
        this._spawnBatch(MonsterKind.ELITE, this._scaledCount(cfg.elite), w, h, playBottom, safeZone, 0, withSpawnAnim, stageStatScale);
        this._spawnBatch(MonsterKind.SHIELD, this._scaledShieldCount(cfg.shield), w, h, playBottom, safeZone, 0, withSpawnAnim, stageStatScale);
        this._spawnBatch(MonsterKind.BERSERKER, this._scaledCount(cfg.berserker), w, h, playBottom, safeZone, 0, withSpawnAnim, stageStatScale);
        this._spawnBatch(MonsterKind.SPLITTER, this._scaledCount(cfg.splitter), w, h, playBottom, safeZone, 0, withSpawnAnim, stageStatScale);
        if (stageIndex >= 1) {
            this._spawnBatch(MonsterKind.ARCHER, this._scaledCount(cfg.archer || 0), w, h, playBottom, safeZone, 0, withSpawnAnim, stageStatScale);
        }
        if (stageIndex >= 2) {
            this._spawnBatch(MonsterKind.FIRE_MAGE, this._scaledCount(cfg.fireMage || 0), w, h, playBottom, safeZone, 0, withSpawnAnim, stageStatScale);
        }
    }

    spawnSplitChildren(parent) {
        if (!parent || !parent.canSplit()) return [];
        const children = [];
        const cnt = parent.base.splitCount || 2;
        for (let i = 0; i < cnt; i++) {
            const a = (i / cnt) * Math.PI * 2 + randRange(-0.25, 0.25);
            const d = randRange(12, 20);
            const child = new Monster(
                parent.x + Math.cos(a) * d,
                parent.y + Math.sin(a) * d,
                MonsterKind.SPLITTER,
                parent.splitTier + 1,
                parent.stageStatScale
            );
            child.game = this.game;
            child.beginSpawn(CONFIG.MONSTER_SPAWN_ANIM * 0.85);
            children.push(child);
        }
        this.monsters.push(...children);
        return children;
    }

    update(dt, w, h, playBottom, playerTarget) {
        if (this.boss) {
            this.boss.update(dt, playerTarget);
            return;
        }
        const resolving = this.game && this.game.combat && this.game.combat.isResolving();
        for (const m of this.monsters) {
            if (resolving && !m.dying) continue;
            m.update(dt, w, h, playBottom, playerTarget);
        }
        this.monsters = this.monsters.filter(m => m.alive);
    }

    getCombatTargetById(id) {
        if (this.boss) {
            const seg = this.boss.segments.find(s => s.id === id && s.alive);
            if (seg && this.boss.phase === 'active') return seg;
        }
        return this.monsters.find(m => m.id === id && m.alive && !m.dying);
    }

    getActiveMonsters() {
        if (this.boss && this.boss.phase === 'active') {
            return this.boss.getActiveSegments();
        }
        return this.monsters.filter(m => m.alive && !m.dying && !m.spawning);
    }

    allClear() {
        if (this.boss) return this.boss.isDefeated();
        return !this.monsters.some(m => m.alive && !m.dying);
    }
}


// ---- pauseMenu.js ----
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


// ---- input.js ----
class InputManager {
    constructor(canvas, game) {
        this.canvas = canvas;
        this.game = game;
        this.isDrawing = false;

        canvas.addEventListener('touchstart', (e) => this.onStart(e), { passive: false });
        canvas.addEventListener('touchmove', (e) => this.onMove(e), { passive: false });
        canvas.addEventListener('touchend', (e) => this.onEnd(e), { passive: false });
        canvas.addEventListener('touchcancel', (e) => this.onEnd(e), { passive: false });

        canvas.addEventListener('mousedown', (e) => this.onStart(e));
        canvas.addEventListener('mousemove', (e) => this.onMove(e));
        canvas.addEventListener('mouseup', (e) => this.onEnd(e));
    }

    _getClientPos(e) {
        if (e.touches && e.touches.length > 0) return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
        if (e.changedTouches && e.changedTouches.length > 0) return { clientX: e.changedTouches[0].clientX, clientY: e.changedTouches[0].clientY };
        return { clientX: e.clientX, clientY: e.clientY };
    }

    getPos(e) {
        const { clientX, clientY } = this._getClientPos(e);
        return this.game.renderer.screenToGame(clientX, clientY);
    }

    onStart(e) {
        if (this.game.state !== 'PLAYING') return;
        e.preventDefault();
        const player = this.game.player;
        if (!player || player.state !== PlayerState.IDLE) return;

        const pos = this.getPos(e);
        if (!this.game.renderer.isGameInBounds(pos.x, pos.y)) return;
        if (dist(pos.x, pos.y, player.homeX, player.homeY) > player.triggerRadius) return;
        if (player.ki <= 0 || player.hp <= 0) return;

        this.isDrawing = true;
        this.game.enterBulletTime();
        player.startBulletTime();
        player.addPathPoint(player.homeX, player.homeY);
        player.addPathPoint(pos.x, pos.y);
        this._checkPathOrbs(player);
    }

    _checkPathOrbs(player) {
        const path = player.attackPath;
        if (path.length < 2) return;
        const from = path[path.length - 2];
        const to = path[path.length - 1];
        this.game.buffOrbs.checkPathSegment(from, to);
    }

    onMove(e) {
        if (!this.isDrawing) return;
        e.preventDefault();
        const player = this.game.player;
        if (!player || player.state !== PlayerState.BULLET_TIME) return;
        const pos = this.getPos(e);
        if (!this.game.renderer.isGameInBounds(pos.x, pos.y)) return;
        const last = player.attackPath[player.attackPath.length - 1];
        if (!last) return;
        const step = dist(last.x, last.y, pos.x, pos.y);
        if (step < 2) return;

        if (!player.consumeKiByDistance(step)) {
            this.isDrawing = false;
            this.game.exitBulletTime(false);
            return;
        }
        player.addPathPoint(pos.x, pos.y);
        this._checkPathOrbs(player);
    }

    onEnd(e) {
        if (!this.isDrawing) return;
        if (e) e.preventDefault();
        this.isDrawing = false;
        const player = this.game.player;
        if (!player || player.state !== PlayerState.BULLET_TIME) return;
        if (player.attackPath.length < 2) {
            this.game.exitBulletTime(true);
            player.invalidatePath();
            return;
        }
        this.game.exitBulletTime(false);
    }

    cancelActivePointer() {
        this.isDrawing = false;
        const player = this.game.player;
        if (!player || player.state !== PlayerState.BULLET_TIME) return;
        this.game.timeScale = CONFIG.NORMAL_TIME_SCALE;
        this.game.endBulletTimeDim();
        player.invalidatePath();
    }
}


// ---- main.js ----
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.renderer = new Renderer(this.canvas);
        this.ctx = this.renderer.ctx;

        this.state = 'MENU';
        this.timeScale = CONFIG.NORMAL_TIME_SCALE;
        this.bulletTimeDimActive = false;
        this.lastTime = performance.now();

        this.player = null;
        this.spawner = new MonsterSpawner(this);
        this.projectiles = new ProjectileManager(this);
        this.groundEffects = new GroundEffectManager(this);
        this.particles = new ParticleSystem(650);
        this.combat = new CombatManager(this);
        this.upgrades = new UpgradeManager();
        this.experience = new ExperienceManager(this);
        this.levelManager = new LevelManager();
        this.ui = new UI();
        this.pauseMenu = new PauseMenu(this);
        this.pauseReturnState = 'PLAYING';
        this.audio = new AudioHooks();
        this.bloodStains = new BloodStainSystem();
        this.abilities = new AbilityManager(this);
        this.sakura = new SakuraSystem();
        this.failDeath = new StageFailAnimator(this);
        this.grass = new GrassSystem();
        this.buffOrbs = new BuffOrbManager(this);
        this.input = null;

        this.awaitingUpgrade = false;
        this.pendingStageClear = false;

        this._pointerDown = false;
        this._overlayDismissPending = false;
        this._overlayGestureActive = false;

        this._bindEvents();
        this.upgrades.onSelect = () => {
            this.state = 'PLAYING';
            if (this.experience) this.experience.tryTriggerPendingUpgrade();
            this._tryFinishStageClear();
        };

        requestAnimationFrame((t) => this.loop(t));
    }

    _bindEvents() {
        const trackDown = () => { this._pointerDown = true; };
        const trackUp = () => { this._pointerDown = false; };
        this.canvas.addEventListener('touchstart', trackDown, { passive: true });
        this.canvas.addEventListener('mousedown', trackDown);
        this.canvas.addEventListener('touchend', trackUp, { passive: true });
        this.canvas.addEventListener('mouseup', trackUp);
        this.canvas.addEventListener('touchcancel', trackUp, { passive: true });

        const overlayDown = (e) => {
            if (this._isOverlayState()) this._onOverlayPointerDown(e);
        };
        const overlayUp = (e) => {
            if (this._isOverlayState()) this._onOverlayPointerUp(e);
        };
        const overlayMove = (e) => {
            if (this._isOverlayState()) this._onOverlayPointerMove(e);
        };
        this.canvas.addEventListener('touchstart', overlayDown, { passive: false });
        this.canvas.addEventListener('mousedown', overlayDown);
        this.canvas.addEventListener('touchmove', overlayMove, { passive: false });
        this.canvas.addEventListener('mousemove', overlayMove);
        this.canvas.addEventListener('touchend', overlayUp, { passive: false });
        this.canvas.addEventListener('mouseup', overlayUp);
        this.canvas.addEventListener('touchcancel', overlayUp, { passive: false });
        this.canvas.addEventListener('wheel', (e) => {
            if (this.state !== 'PAUSED') return;
            if (this.pauseMenu.view !== 'debug_upgrades') return;
            this.pauseMenu.onWheel(e.deltaY);
            e.preventDefault();
        }, { passive: false });
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        const playingPointerUp = (e) => {
            if (this.state !== 'PLAYING' || this.pauseMenu.active) return;
            const pos = this.getClickPos(e);
            const vp = this.renderer.getViewport();
            const s = this.renderer.uiScale;
            if (this.pauseMenu.hitPauseButton(pos.x, pos.y, vp, s)) {
                if (e.cancelable) e.preventDefault();
                this.openPause();
            }
        };
        this.canvas.addEventListener('touchend', playingPointerUp, { passive: false });
        this.canvas.addEventListener('mouseup', playingPointerUp);

        const onViewport = () => {
            this.renderer.resize();
            const playBottom = this.ui.getPlayAreaBottom
                ? this.ui.getPlayAreaBottom(this.renderer.h, this.renderer.uiScale)
                : this.renderer.h;
            this.grass.init(this.renderer.w, this.renderer.h, playBottom, this._getSafeZone());
        };
        window.addEventListener('resize', onViewport);
        window.addEventListener('orientationchange', onViewport);
        if (window.visualViewport) window.visualViewport.addEventListener('resize', onViewport);
    }

    _isOverlayState() {
        return this.state === 'MENU' || this.state === 'FAIL' || this.state === 'COMPLETE'
            || this.state === 'LEVEL_UP' || this.state === 'STAGE_INTRO' || this.state === 'PAUSED';
    }

    openPause() {
        if (this.state !== 'PLAYING') return;
        if (this.input) this.input.cancelActivePointer();
        if (this.player && this.player.state === PlayerState.BULLET_TIME) {
            this.exitBulletTime(true);
        }
        this.pauseReturnState = this.state;
        this.state = 'PAUSED';
        this.pauseMenu.open();
        this._lockOverlayInput();
    }

    resumeFromPause(triggerUpgrades) {
        this.pauseMenu.close();
        this.state = this.pauseReturnState || 'PLAYING';
        this.pauseReturnState = 'PLAYING';
        if (triggerUpgrades && this.experience) {
            this.experience.tryTriggerPendingUpgrade();
        }
    }

    _lockOverlayInput() {
        this._overlayGestureActive = false;
        this._overlayDismissPending = this._pointerDown;
        if (this.input) this.input.cancelActivePointer();
    }

    _pauseForUpgrade() {
        if (this.renderer) this.renderer.clearShake();
        if (this.player) this.player.comboShakeTimer = 0;
    }

    _onOverlayPointerDown(e) {
        if (this._overlayDismissPending) return;
        this._overlayGestureActive = true;
        if (e.cancelable) e.preventDefault();
        if (this.state === 'PAUSED') {
            const pos = this.getClickPos(e);
            this.pauseMenu.onPointerDown(pos.x, pos.y);
        }
    }

    _onOverlayPointerMove(e) {
        if (this.state !== 'PAUSED') return;
        const pos = this.getClickPos(e);
        this.pauseMenu.onPointerMove(pos.x, pos.y);
        if (e.cancelable) e.preventDefault();
    }

    _onOverlayPointerUp(e) {
        if (e.cancelable) e.preventDefault();
        if (this.state === 'PAUSED') {
            this.pauseMenu.onPointerUp();
        }
        if (this._overlayDismissPending) {
            this._overlayDismissPending = false;
            return;
        }
        if (!this._overlayGestureActive) return;
        this._overlayGestureActive = false;

        const pos = this.getClickPos(e);
        if (this.state === 'PAUSED') {
            const vp = this.renderer.getViewport();
            const s = this.renderer.uiScale;
            this.pauseMenu.handleClick(pos.x, pos.y, vp, s);
            return;
        }
        if (this.state === 'LEVEL_UP') {
            const idx = this.upgrades.handleClick(pos.x, pos.y);
            if (idx >= 0) this.upgrades.selectUpgrade(idx, this.player);
            return;
        }
        if (this.state === 'MENU' || this.state === 'FAIL' || this.state === 'COMPLETE') {
            this.startGame();
        }
    }

    getClickPos(e) {
        let clientX;
        let clientY;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else if (e.changedTouches && e.changedTouches.length > 0) {
            clientX = e.changedTouches[0].clientX;
            clientY = e.changedTouches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        return this.renderer.screenToCanvas(clientX, clientY);
    }

    _isFailBattlefield() {
        return this.state === 'FAIL_DEATH' || this.state === 'STAGE_FAIL' || this.state === 'FAIL';
    }

    isUpgradeBlocked() {
        if (!this.combat || !this.abilities) return false;
        if (this.combat.isResolving()) return true;
        if (this.abilities.lightningChain) return true;
        return false;
    }

    _isBattleScene() {
        return this.state === 'PLAYING' || this.state === 'LEVEL_UP';
    }

    isCombatPresentationActive() {
        if (this.isUpgradeBlocked()) return true;
        if (this.abilities.hasActiveFx()) return true;
        if (this.combat.afterimages.length > 0) return true;
        if (this.combat.damageNumbers.length > 0) return true;
        return false;
    }

    _isWorldFrozen() {
        const p = this.player;
        if (!p) return false;
        if (p.state === PlayerState.BULLET_TIME) return true;
        if (this.combat && !this.combat.roundAttackResolved) return true;
        return false;
    }

    _canAdvanceStage() {
        if (this.state !== 'PLAYING') return false;
        if (!this.spawner.allClear()) return false;
        if (this.combat.isResolving()) return false;
        if (this.isUpgradeBlocked()) return false;
        const p = this.player;
        if (!p || p.state !== PlayerState.IDLE) return false;
        return true;
    }

    _syncPendingStageClear() {
        if (this.pendingStageClear || !this._canAdvanceStage()) return;
        if (!this.combat.roundAttackResolved) {
            this.combat.consumeRoundAttack();
            this.player.finishAttackCycle();
        }
        this.pendingStageClear = true;
    }

    _tryFinishStageClear() {
        if (!this.pendingStageClear || this.state !== 'PLAYING') return;
        if (this.isUpgradeBlocked() || this.combat.isResolving()) return;
        if (!this.spawner.allClear()) return;
        this.pendingStageClear = false;
        this._stageCleared();
    }

    _updateLiveBattle(dt, realDt) {
        this.player.update(dt, realDt);
        const playBottom = this.ui.getPlayAreaBottom
            ? this.ui.getPlayAreaBottom(this.renderer.h, this.renderer.uiScale)
            : this.renderer.h;
        const worldDt = this._isWorldFrozen() ? 0 : dt;
        const playerTarget = this.player ? {
            x: this.player.x,
            y: this.player.y,
            effectiveRadius: this.player.effectiveRadius,
            player: this.player,
        } : null;
        this.spawner.update(worldDt, this.renderer.w, this.renderer.h, playBottom, playerTarget);
        this.projectiles.update(worldDt, this.renderer.w, this.renderer.h, playerTarget);
        this.groundEffects.update(worldDt, playerTarget);
        this.combat.update(dt);
        if (this.abilities) this.abilities.updatePassive(dt);
        this.buffOrbs.update(realDt);
        this.sakura.update(realDt, this.renderer.w, this.renderer.h);
        this.grass.update(realDt);
        this.bloodStains.update(realDt);
        this.particles.update(realDt);
    }

    _getSafeZone() {
        const x = this.player ? this.player.homeX : this.renderer.w / 2;
        const y = this.player ? this.player.homeY : this.renderer.h / 2;
        const r = this.player
            ? this.player.triggerRadius
            : Math.max(CONFIG.PLAYER.TRIGGER_RADIUS_MIN || 30, CONFIG.PLAYER.TRIGGER_RADIUS_RATIO * CONFIG.DISPLAY.LOGICAL_WIDTH);
        return { x, y, r };
    }

    _playerDied() {
        if (this.state !== 'PLAYING') return;
        if (this.input) this.input.cancelActivePointer();
        this._stageFailed();
    }

    _clearCombatResiduals() {
        this.pendingStageClear = false;
        if (this.input) this.input.cancelActivePointer();
        if (this.player) {
            this.player.deathAnim = null;
            this.player.state = PlayerState.IDLE;
            this.player.attackPath = [];
            this.player.pathIndex = 0;
            this.player.pathProgress = 0;
            this.player.hitMonstersInSegment.clear();
            this.player.hitProjectilesInSegment.clear();
            this.player.invalidPathTimer = 0;
            this.player.comboCount = 0;
            this.player.comboDisplayPeak = 0;
            this.player.comboDisplayTimer = 0;
            this.player.comboShakeTimer = 0;
        }
        if (this.combat) {
            this.combat.damageNumbers = [];
            this.combat.finalSegmentHit = false;
        }
        this.bloodStains.clear();
        this.particles.clear();
        this.abilities.reset();
        this.projectiles.reset();
        this.groundEffects.reset();
        if (this.buffOrbs) {
            this.buffOrbs.cancelDrawSession();
            this.buffOrbs.reset();
        }
        this.endBulletTimeDim();
        this.timeScale = CONFIG.NORMAL_TIME_SCALE;
    }

    _prepareStage(levelIndex, withSpawnAnim = false) {
        this.levelManager.level = levelIndex;
        this.player.beginStage();
        const playBottom = this.ui.getPlayAreaBottom ? this.ui.getPlayAreaBottom(this.renderer.h, this.renderer.uiScale) : this.renderer.h;
        const safe = this._getSafeZone();
        this.spawner.spawnStage(levelIndex, this.renderer.w, this.renderer.h, playBottom, safe, withSpawnAnim);
        this.buffOrbs.spawnForStage(levelIndex, safe, false);
        this.combat.roundAttackResolved = true;
    }

    _setupStageBeforeIntro(levelIndex) {
        this._clearCombatResiduals();
        this.levelManager.level = levelIndex;
        this.player.beginStage();
        this.spawner.monsters = [];
        if (this.spawner) this.spawner.boss = null;
        this.combat.roundAttackResolved = true;
    }

    _beginStageIntro(levelIndex) {
        if (this.input) this.input.cancelActivePointer();
        this.state = 'STAGE_INTRO';
        this._setupStageBeforeIntro(levelIndex);
        const stageCfg = CONFIG.STAGES[clamp(levelIndex, 0, CONFIG.STAGES.length - 1)];
        const introDur = CONFIG.STAGE_INTRO_SLIDE_IN + CONFIG.STAGE_INTRO_LABEL_HOLD
            + CONFIG.STAGE_INTRO_SLIDE_OUT;
        const sakuraDur = introDur + (CONFIG.STAGE_INTRO_SAKURA_EXTRA || 0.8);
        this.sakura.start(this.renderer.w, this.renderer.h, sakuraDur);
        this.levelManager.startStageIntro(levelIndex + 1, () => {
            this._prepareStage(levelIndex, true);
            this.state = 'PLAYING';
        }, stageCfg && stageCfg.boss);
    }

    _beginNextLevelTransition() {
        const next = this.levelManager.level + 1;
        if (next >= CONFIG.STAGES.length) {
            this.state = 'COMPLETE';
            this._lockOverlayInput();
            return;
        }
        this._beginStageIntro(next);
    }

    _stageCleared() {
        this.pendingStageClear = false;
        this.state = 'STAGE_CLEAR';
        if (this.input) this.input.cancelActivePointer();
        this.levelManager.showClearFlash(() => {
            this._clearCombatResiduals();
            const next = this.levelManager.level + 1;
            if (next >= CONFIG.STAGES.length) {
                this.state = 'COMPLETE';
                this._lockOverlayInput();
                return;
            }
            this._beginStageIntro(next);
        });
    }

    _stageFailed() {
        if (this.input) this.input.cancelActivePointer();
        if (this.failDeath.isActive()) return;
        this.state = 'FAIL_DEATH';
        this.abilities.reset();
        this.failDeath.start(() => {
            this.state = 'STAGE_FAIL';
            this.levelManager.showFailIntro(() => {
                this.state = 'FAIL';
                this._lockOverlayInput();
            });
        });
    }

    startGame() {
        const cx = this.renderer.w / 2;
        const cy = this.renderer.h / 2;
        this.player = new Player(cx, cy);
        this.player.game = this;
        this.failDeath = new StageFailAnimator(this);
        this.spawner = new MonsterSpawner(this);
        this.projectiles = new ProjectileManager(this);
        this.groundEffects = new GroundEffectManager(this);
        this.particles = new ParticleSystem(650);
        this.combat = new CombatManager(this);
        this.upgrades = new UpgradeManager();
        this.experience = new ExperienceManager(this);
        this.levelManager = new LevelManager();
        this.abilities = new AbilityManager(this);
        this.buffOrbs = new BuffOrbManager(this);
        this.bloodStains = new BloodStainSystem();
        this.sakura.petals = [];
        this.sakura.active = false;
        const playBottom = this.ui.getPlayAreaBottom ? this.ui.getPlayAreaBottom(this.renderer.h, this.renderer.uiScale) : this.renderer.h;
        this.grass.init(this.renderer.w, this.renderer.h, playBottom, this._getSafeZone());

        this.experience.reset();
        this.upgrades.onSelect = () => {
            this.state = 'PLAYING';
            if (this.experience) this.experience.tryTriggerPendingUpgrade();
            this._tryFinishStageClear();
        };
        if (!this.input) this.input = new InputManager(this.canvas, this);
        else this.input.game = this;

        this.pendingStageClear = false;
        this._beginStageIntro(0);
    }

    enterBulletTime() {
        this.bulletTimeDimActive = true;
        this.timeScale = CONFIG.BULLET_TIME_SCALE;
    }

    endBulletTimeDim() {
        this.bulletTimeDimActive = false;
    }

    exitBulletTime(invalid = false) {
        this.timeScale = CONFIG.NORMAL_TIME_SCALE;
        if (invalid) {
            this.endBulletTimeDim();
            return;
        }
        if (!this.player.startAttack()) {
            this.endBulletTimeDim();
            this.buffOrbs.cancelDrawSession();
            return;
        }
        this.combat.beginRoundAttack();
        this.abilities.reset({ keepCompanions: true });
    }

    _onAttackFinished() {
        if (this.combat.consumeRoundAttack()) {
            const cleared = this.spawner.allClear();
            if (cleared) {
                this.pendingStageClear = true;
                return;
            }
            this.player.finishAttackCycle();
        }
    }

    loop(now) {
        const realDt = Math.min((now - this.lastTime) / 1000, 0.05);
        this.lastTime = now;
        const dt = realDt * this.timeScale;
        this.update(dt, realDt);
        this.draw();
        requestAnimationFrame((t) => this.loop(t));
    }

    update(dt, realDt) {
        if (this.state === 'MENU' || this.state === 'COMPLETE') return;
        if (this.state === 'FAIL' && !this.levelManager.isFailIntroActive()) return;
        this.renderer.updateShake(this.state === 'LEVEL_UP' ? 0 : realDt);
        if (this.state === 'LEVEL_UP') this.renderer.clearShake();
        this.levelManager.update(realDt);

        if (this.state === 'STAGE_INTRO' || this.state === 'STAGE_CLEAR') {
            this.sakura.update(realDt, this.renderer.w, this.renderer.h);
            this.grass.update(realDt);
            this.particles.update(realDt);
        }
        if (this.state === 'FAIL_DEATH') {
            this.failDeath.update(realDt);
            this.bloodStains.update(realDt);
            this.particles.update(realDt);
            return;
        }
        if (this.state === 'STAGE_FAIL' || this.state === 'FAIL') {
            return;
        }
        if (this.state === 'STAGE_INTRO') return;
        if (this.state === 'STAGE_CLEAR') return;
        if (this.state === 'PAUSED') return;
        if (this.state === 'LEVEL_UP') {
            this.upgrades.update(realDt);
            return;
        }

        if (this._isBattleScene()) {
            this._updateLiveBattle(dt, realDt);

            if (this.state === 'PLAYING') {
                if (this.experience) this.experience.tryTriggerPendingUpgrade();

                if (this.player.state === PlayerState.IDLE
                    && !this.combat.roundAttackResolved
                    && !this.combat.isResolving()
                    && !this.isUpgradeBlocked()) {
                    this._onAttackFinished();
                }
                this._syncPendingStageClear();
                this._tryFinishStageClear();
            }
        }
    }

    _drawBulletTimeDim(ctx) {
        if (!this.bulletTimeDimActive) return;
        ctx.save();
        ctx.fillStyle = `rgba(0, 0, 0, ${CONFIG.BULLET_TIME_DIM_ALPHA})`;
        ctx.fillRect(0, 0, this.renderer.w, this.renderer.h);
        ctx.restore();
    }

    _drawEnemyProjectiles(ctx) {
        if (this.projectiles) this.projectiles.draw(ctx);
        const boss = this.spawner && this.spawner.boss;
        if (boss && typeof boss.drawBullets === 'function') boss.drawBullets(ctx);
    }

    draw() {
        const ctx = this.ctx;
        this.renderer.clear();
        this.renderer.resetScreenDraw();
        this.renderer.beginClippedGameDraw();

        if (this.state === 'MENU') {
            this.renderer.endClippedGameDraw();
            this.drawMenu();
            return;
        }
        if (this.state === 'COMPLETE') {
            this.renderer.endClippedGameDraw();
            this.renderer.resetScreenDraw();
            this.levelManager.drawComplete(ctx, this.renderer.getViewport(), this.renderer.uiScale);
            return;
        }

        this.grass.draw(ctx);
        this.sakura.draw(ctx);
        this.bloodStains.draw(ctx);
        this._drawBulletTimeDim(ctx);
        const battleScene = this._isBattleScene();
        const showCombatFx = battleScene && this.state !== 'LEVEL_UP';
        const showBattlefield = battleScene || this._isFailBattlefield();
        if (showBattlefield && this.groundEffects) this.groundEffects.draw(ctx);
        if (showBattlefield) {
            if (battleScene) this.buffOrbs.draw(ctx);
            const previewTargets = (battleScene
                && this.player
                && this.player.state === PlayerState.BULLET_TIME
                && this.player.attackPath.length >= 2)
                ? this.combat.getPathPreviewTargetIds(this.player.attackPath, this.player)
                : null;
            for (const m of this.spawner.monsters) {
                m.pathTargetHighlight = previewTargets ? previewTargets.has(m.id) : false;
                m.draw(ctx);
            }
            if (battleScene && this.spawner.boss) {
                const boss = this.spawner.boss;
                if (boss.phase === 'warning') {
                    boss.drawWarningOverlay(ctx);
                } else if (boss.segments) {
                    for (const seg of boss.segments) {
                        seg.pathTargetHighlight = previewTargets ? previewTargets.has(seg.id) : false;
                    }
                    boss.draw(ctx);
                }
            }
        }

        if (showCombatFx) {
            this.abilities.drawBehind(ctx);
        }
        if (showCombatFx && this.abilities.batSwarms.length > 0) {
            this.abilities.drawBatSwarms(ctx);
        }
        if (battleScene && this.abilities.hasSummonFx && this.abilities.hasSummonFx()) {
            this.abilities.drawSummonFx(ctx);
        }
        if (this.player) {
            if (!this._isFailBattlefield()) this.player.drawTriggerZone(ctx);
            if (battleScene || this.player.state === PlayerState.BULLET_TIME) {
                this.player.drawPath(ctx);
            }
            this.player.draw(ctx);
        }
        if (showCombatFx) {
            this.combat.drawAfterimages(ctx);
        }
        if (showCombatFx && (this.abilities.hasActiveFx() || this.abilities.hasAutoDarts() || this.abilities.batSwarms.length > 0)) {
            this.abilities.drawAutoDarts(ctx);
            if (this.abilities.hasActiveFx()) this.abilities.drawFront(ctx);
        }
        if (battleScene) this._drawEnemyProjectiles(ctx);
        if (this.state === 'FAIL_DEATH' && this.failDeath.isActive()) {
            this.failDeath.drawSpears(ctx);
        }
        if (showCombatFx) {
            this.buffOrbs.drawPickupEffects(ctx);
        }
        if (showCombatFx || this.state === 'FAIL_DEATH') {
            this.particles.draw(ctx);
        }
        if (showCombatFx && this.combat.damageNumbers.length > 0) {
            this.combat.drawDamageNumbers(ctx);
        }

        this.renderer.endClippedGameDraw();
        this.renderer.resetScreenDraw();

        const vp = this.renderer.getViewport();
        const s = this.renderer.uiScale;
        ctx.save();
        this.renderer.clipViewport(ctx);
        if (this.player && !this._isFailBattlefield()) {
            this.ui.draw(ctx, this, vp, s);
            if (this.state === 'PLAYING') {
                this.pauseMenu.drawPauseButton(ctx, vp, s);
            }
        }
        this.levelManager.drawBanner(ctx, vp, s);
        if (this.state === 'LEVEL_UP') this.upgrades.drawUI(ctx, vp, s, this.player);
        if (this.state === 'PAUSED') this.pauseMenu.draw(ctx, vp, s);
        this.levelManager.drawStageIntro(ctx, vp, s);
        if (battleScene && this.spawner && this.spawner.boss
            && this.spawner.boss.phase === 'warning'
            && typeof this.spawner.boss.drawWarningCountdown === 'function') {
            this.spawner.boss.drawWarningCountdown(ctx, vp, s);
        }
        this.levelManager.drawClearFlash(ctx, vp, s);
        if (this.state === 'FAIL' || this.state === 'STAGE_FAIL') {
            this.levelManager.drawFail(ctx, vp, s);
        }
        ctx.restore();
    }

    drawMenu() {
        const ctx = this.ctx;
        const vp = this.renderer.getViewport();
        drawGameText(ctx, '忍者斩', vp.cx, vp.y + vp.h * 0.38, Math.round(40 * this.renderer.uiScale), '#3a3028');
        drawGameText(ctx, '新版本', vp.cx, vp.y + vp.h * 0.45, Math.round(18 * this.renderer.uiScale), '#6a5a48');
        drawGameText(ctx, '点击屏幕开始', vp.cx, vp.y + vp.h * 0.58, Math.round(18 * this.renderer.uiScale), '#5a5048');
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new Game();
});

})();
