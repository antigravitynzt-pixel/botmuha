export type GameState = 'menu' | 'playing' | 'paused' | 'gameover' | 'cosmetics';

export type Difficulty = 'easy' | 'normal' | 'hard' | 'nightmare';

export type SkinType = 'classic' | 'cool' | 'gentleman' | 'cyber' | 'ninja' | 'golden' | 'ironman' | 'spider' | 'hulk' | 'zombie' | 'pirate';

export interface Skin {
  id: SkinType;
  name: string;
  description: string;
  color: string;
  wingColor: string;
  accessoryColor: string;
  price: number; // cost in sugars
}

export interface Fly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  angle: number;
  targetAngle: number;
  skin: SkinType;
  dashEnergy: number; // 0 to 100
  dashCooldown: number; // in frames or ms
  dashActiveTime: number; // > 0 when currently dashing
  invulnerableTime: number; // > 0 when flashing invulnerable
  lives: number;
  maxLives: number;
}

export type SwatterState = 'warning' | 'striking' | 'slamming' | 'recovering';
export type SwatterType = 'standard' | 'fast' | 'giant' | 'sweep' | 'cross';

export interface Swatter {
  id: string;
  type: SwatterType;
  state: SwatterState;
  
  // Positional properties
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  
  // Sizing & Angle
  radius: number;
  width: number;
  height: number;
  angle: number;
  
  // Animations and timing
  timer: number; // in frames
  warningDuration: number;
  strikeDuration: number;
  slamDuration: number;
  recoverDuration: number;
  
  // Sweep specific
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
}

export type FoodType = 'sugar' | 'candy' | 'jam';

export interface Food {
  id: string;
  x: number;
  y: number;
  type: FoodType;
  radius: number;
  points: number;
  energyGrant: number;
  pulseTimer: number;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  type: 'dust' | 'spark' | 'shatter' | 'text' | 'ring' | 'dash';
  text?: string;
  fontSize?: number;
}

export interface HighScore {
  name: string;
  score: number;
  difficulty: Difficulty;
  date: string;
}
