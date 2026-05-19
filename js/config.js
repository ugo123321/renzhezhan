const CONFIG = {
    BULLET_TIME_SCALE: 0.12,
    NORMAL_TIME_SCALE: 1.0,

    DISPLAY: {
        LOGICAL_WIDTH: 390,
        LOGICAL_HEIGHT: 700,
        NINJA_SPRITE_SCALE: 3,
        MONSTER_SPRITE_SCALE: 3,
        MONSTER_SPRITE_SCALE_STRONG: 4,
        GRID_SIZE: 28,
    },

    PLAYER: {
        MAX_HEARTS: 3,
        DAMAGE_PER_HIT: 0.5,
        BASE_ATTACK: 18,
        CRIT_RATE: 0.10,
        CRIT_MULTIPLIER: 1.5,
        KI_MAX: 100,
        KI_DRAIN_RATE: 30,
        KI_REGEN_RATE: 30,
        ATTACK_SPEED: 2400,
        RETURN_SPEED_INSTANT: 200,
        RETURN_SPEED_SLOW: 48,
        HITBOX_RADIUS: 12,
        TRIGGER_RADIUS_RATIO: 0.11,
        MAGNET_RADIUS: 72,
        SIZE_SCALE: 1.0,
        INVINCIBLE_AFTER_HIT: 1.0,
        HIT_FLASH_DURATION: 0.28,
    },

    MONSTERS: {
        NORMAL_MELEE: {
            name: 'Skeleton',
            hp: 30, def: 3, range: 42, size: 11, speed: 45,
            atkSpeed: 1.0, atkDamage: 1, type: 'melee',
            color: '#8b9dc3', xp: 10,
        },
        NORMAL_RANGED: {
            name: 'Dark Mage',
            hp: 20, def: 3, range: 140, size: 11, speed: 35,
            atkSpeed: 1.8, atkDamage: 1, type: 'ranged',
            color: '#9b59b6', xp: 15,
        },
        STRONG_MELEE: {
            name: 'Oni',
            hp: 50, def: 5, range: 48, size: 15, speed: 38,
            atkSpeed: 1.2, atkDamage: 1, type: 'melee',
            color: '#e74c3c', xp: 25,
        },
        STRONG_RANGED: {
            name: 'Warlock',
            hp: 35, def: 3, range: 180, size: 15, speed: 32,
            atkSpeed: 2.0, atkDamage: 1, type: 'ranged',
            color: '#8e44ad', xp: 30,
        },
    },

    PROJECTILE: {
        SPEED: 120,
        RADIUS: 6,
    },

    SPAWN_FADE_DURATION: 1.0,

    XP: {
        BASE_REQUIRED: 30,
        SCALE_FACTOR: 1.35,
        ORB_SPEED: 180,
        ORB_RADIUS: 5,
        PICKUP_DELAY: 0.3,
    },

    SHAKE: {
        NORMAL: { magnitude: 3, duration: 0.1 },
        CRIT: { magnitude: 8, duration: 0.22 },
    },

    LEVELS: [
        {
            types: ['NORMAL_MELEE'],
            count: 20, waves: 3,
        },
        {
            types: ['NORMAL_MELEE'],
            count: 32, waves: 4,
        },
        {
            types: ['NORMAL_MELEE', 'NORMAL_RANGED'],
            count: 43, waves: 4,
        },
        {
            types: ['NORMAL_MELEE', 'NORMAL_RANGED'],
            count: 55, waves: 5,
        },
        {
            types: ['NORMAL_MELEE', 'NORMAL_RANGED', 'STRONG_MELEE'],
            count: 68, waves: 5,
        },
        {
            types: ['NORMAL_MELEE', 'NORMAL_RANGED', 'STRONG_MELEE'],
            count: 81, waves: 6,
        },
        {
            types: ['NORMAL_MELEE', 'NORMAL_RANGED', 'STRONG_MELEE', 'STRONG_RANGED'],
            count: 97, waves: 6,
        },
        {
            types: ['NORMAL_MELEE', 'NORMAL_RANGED', 'STRONG_MELEE', 'STRONG_RANGED'],
            count: 115, waves: 8,
        },
    ],
};
