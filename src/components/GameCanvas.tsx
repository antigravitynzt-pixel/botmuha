import React, { useRef, useEffect, useState } from 'react';
import { Fly, Swatter, Food, Particle, Difficulty, SkinType, SwatterState, SwatterType, FoodType } from '../types';
import { drawFly, drawSwatter, drawFood, drawParticle, SKINS } from '../utils';
import { soundManager } from './SoundManager';

interface GameCanvasProps {
  difficulty: Difficulty;
  skin: SkinType;
  isPaused: boolean;
  onGameOver: (score: number, sugars: number, time: number, nearMisses: number) => void;
  // Expose fly state back to parent for HUD overlay
  onFlyStateUpdate: (fly: Fly) => void;
  onStatsUpdate: (score: number, sugars: number, wave: number) => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  difficulty,
  skin,
  isPaused,
  onGameOver,
  onFlyStateUpdate,
  onStatsUpdate,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // References to keep game state across high-frequency render loops without triggering React re-renders
  const stateRef = useRef({
    score: 0,
    sugarsGathered: 0,
    nearMisses: 0,
    wave: 1,
    waveTimer: 0,
    survivalTimer: 0, // in frames
    lastTime: 0,
    isFirstFrame: true,
    
    // Canvas dimensions
    width: 800,
    height: 500,
    
    // Controls
    pointer: { x: 400, y: 250 },
    
    // Entities
    fly: {
      x: 400,
      y: 250,
      vx: 0,
      vy: 0,
      radius: 14,
      angle: 0,
      targetAngle: 0,
      skin: skin,
      dashEnergy: 25, // Start with some dash energy to let players test it early!
      dashCooldown: 0,
      dashActiveTime: 0,
      invulnerableTime: 0,
      lives: difficulty === 'nightmare' ? 1 : 3,
      maxLives: difficulty === 'nightmare' ? 1 : 3,
    } as Fly,
    
    swatters: [] as Swatter[],
    foods: [] as Food[],
    particles: [] as Particle[],
    
    // Animation/Visual states
    wingAngle: 0,
    wingDir: 1,
    screenShake: 0,
    
    // Spawn counters
    nextSwatterTimer: 60, // frames until next swatter
  });

  // Keep skin updated if it changes
  useEffect(() => {
    stateRef.current.fly.skin = skin;
  }, [skin]);

  // Handle Canvas Resize using ResizeObserver
  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;

    const handleResize = (entries: ResizeObserverEntry[]) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        
        // Match drawing buffer to physical CSS sizes for crisp 1:1 pixel rendering
        canvas.width = width;
        canvas.height = height;
        
        stateRef.current.width = width;
        stateRef.current.height = height;

        // On first frame, place fly in center
        if (stateRef.current.isFirstFrame) {
          stateRef.current.fly.x = width / 2;
          stateRef.current.fly.y = height / 2;
          stateRef.current.pointer.x = width / 2;
          stateRef.current.pointer.y = height / 2;
          stateRef.current.isFirstFrame = false;
        }
      }
    };

    const observer = new ResizeObserver(handleResize);
    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, []);

  // Listen to keyboard & click input for dashing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isPaused) return;
      if (e.code === 'Space') {
        e.preventDefault(); // prevent scrolling
        triggerDash();
      }
    };

    // Right click triggers Dash
    const handleContextMenu = (e: MouseEvent) => {
      if (isPaused) return;
      e.preventDefault(); // suppress right click menu
      triggerDash();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [isPaused]);

  // Handle game start/stop buzz sound
  useEffect(() => {
    if (!isPaused) {
      soundManager.startBuzz();
    } else {
      soundManager.stopBuzz();
    }
    return () => {
      soundManager.stopBuzz();
    };
  }, [isPaused]);

  // Super Dash trigger function
  const triggerDash = () => {
    const s = stateRef.current;
    if (s.fly.dashEnergy >= 100 && s.fly.dashActiveTime <= 0) {
      s.fly.dashEnergy = 0;
      s.fly.dashActiveTime = 18; // 18 frames of dash speed (~0.3s)
      s.fly.invulnerableTime = 30; // 30 frames of protection (~0.5s)
      soundManager.playDash();

      // Spawn wind particles in opposite direction
      const angle = s.fly.angle;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      
      // Spawn several neat ring/dash dust particles
      for (let i = 0; i < 8; i++) {
        const speed = 2 + Math.random() * 4;
        const pColor = SKINS[s.fly.skin]?.accessoryColor || '#38bdf8';
        s.particles.push({
          id: Math.random().toString(),
          x: s.fly.x - cos * s.fly.radius,
          y: s.fly.y - sin * s.fly.radius,
          vx: -cos * speed + (Math.random() - 0.5) * 2,
          vy: -sin * speed + (Math.random() - 0.5) * 2,
          radius: 3 + Math.random() * 4,
          color: pColor,
          alpha: 0.8,
          life: 0,
          maxLife: 20 + Math.random() * 15,
          type: 'dash',
        });
      }
    }
  };

  // Exposed callback for parent UI HUD trigger
  // Since parent passes function pointers, we can expose it via global window or local ref
  // Here we just let parent pass a callback, or we can listen to it. But we can trigger dash inside
  // this canvas component via click handlers!
  useEffect(() => {
    (window as any).triggerFlyGameDash = triggerDash;
    return () => {
      delete (window as any).triggerFlyGameDash;
    };
  }, []);

  // Track Mouse / Pointer coordinates
  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPaused) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    stateRef.current.pointer.x = e.clientX - rect.left;
    stateRef.current.pointer.y = e.clientY - rect.top;
  };

  // Main Physics & Drawing game loop
  useEffect(() => {
    let animId: number;

    const loop = (timestamp: number) => {
      if (isPaused) {
        animId = requestAnimationFrame(loop);
        return;
      }

      const s = stateRef.current;
      
      // Calculate delta time or run consistent 60hz frames
      updateGamePhysics();
      renderGameFrame();

      animId = requestAnimationFrame(loop);
    };

    // Spawn initial candies/sugars
    spawnInitialFood();

    animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isPaused]);

  // Spawn initial foods scattered on screen
  const spawnInitialFood = () => {
    const s = stateRef.current;
    s.foods = [];
    for (let i = 0; i < 3; i++) {
      spawnFoodItem();
    }
  };

  // Helper to spawn a single food item safely away from the fly
  const spawnFoodItem = () => {
    const s = stateRef.current;
    if (s.foods.length >= 5) return; // Cap maximum active foods

    let rx = 0;
    let ry = 0;
    let attempts = 0;
    let safe = false;

    // Keep finding spot away from fly
    while (!safe && attempts < 20) {
      rx = 50 + Math.random() * (s.width - 100);
      ry = 50 + Math.random() * (s.height - 100);
      attempts++;

      const dx = rx - s.fly.x;
      const dy = ry - s.fly.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist > 150) {
        safe = true;
      }
    }

    // Determine type: Sugar cube (common 70%), Wrapped Candy (rare 20%), Jam jar (epic 10%)
    const roll = Math.random();
    let type: FoodType = 'sugar';
    let pts = 100;
    let grant = 15; // dash energy
    let rad = 10;

    if (roll > 0.90) {
      type = 'jam';
      pts = 500;
      grant = 75;
      rad = 14;
    } else if (roll > 0.70) {
      type = 'candy';
      pts = 250;
      grant = 35;
      rad = 12;
    }

    s.foods.push({
      id: Math.random().toString(),
      x: rx,
      y: ry,
      type,
      radius: rad,
      points: pts,
      energyGrant: grant,
      pulseTimer: Math.random() * 100,
    });
  };

  // Core Game State and Physics Updates
  const updateGamePhysics = () => {
    const s = stateRef.current;
    s.survivalTimer++;

    // Translate score to Wave
    // Wave increases every 25 seconds (1500 frames) or every 1000 points
    const calculatedWave = Math.floor(s.score / 1500) + Math.floor(s.survivalTimer / 1200) + 1;
    if (calculatedWave > s.wave) {
      s.wave = calculatedWave;
      // Spawn neat text warning
      spawnTextParticle(s.width / 2, s.height / 3, `ВОЛНА ${s.wave}!`, '#f97316', 24);
      soundManager.playBeep(350, 0.15, 'sawtooth', 0.15);
      setTimeout(() => soundManager.playBeep(450, 0.25, 'sawtooth', 0.15), 100);
    }

    // 1. UPDATE FLY POSITION & ANGLE
    const dx = s.pointer.x - s.fly.x;
    const dy = s.pointer.y - s.fly.y;
    const dist = Math.sqrt(dx*dx + dy*dy);

    if (dist > 5) {
      // Calculate rotation toward target pointer
      s.fly.targetAngle = Math.atan2(dy, dx);
      let angleDiff = s.fly.targetAngle - s.fly.angle;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      s.fly.angle += angleDiff * 0.15; // Smooth rotational inertia

      // Physics movement
      let speedFactor = 0.08;
      let maxSpeed = 8;

      if (s.fly.dashActiveTime > 0) {
        speedFactor = 0.4;
        maxSpeed = 22; // Extreme speed during dash!
        s.fly.dashActiveTime--;
        
        // Spawn dash echo particles
        if (s.survivalTimer % 2 === 0) {
          s.particles.push({
            id: Math.random().toString(),
            x: s.fly.x,
            y: s.fly.y,
            vx: -s.fly.vx * 0.2,
            vy: -s.fly.vy * 0.2,
            radius: s.fly.radius * 0.8,
            color: SKINS[s.fly.skin].color,
            alpha: 0.5,
            life: 0,
            maxLife: 15,
            type: 'dash',
          });
        }
      }

      // Fly fly physics with custom drag/acceleration
      const targetVx = (dx / dist) * Math.min(maxSpeed, dist * speedFactor);
      const targetVy = (dy / dist) * Math.min(maxSpeed, dist * speedFactor);
      
      s.fly.vx += (targetVx - s.fly.vx) * 0.18;
      s.fly.vy += (targetVy - s.fly.vy) * 0.18;
    } else {
      // Slow down to a stop if cursor is on top of fly
      s.fly.vx *= 0.75;
      s.fly.vy *= 0.75;
    }

    s.fly.x += s.fly.vx;
    s.fly.y += s.fly.vy;

    // Clamp fly inside canvas boundaries
    const margin = s.fly.radius + 10;
    if (s.fly.x < margin) { s.fly.x = margin; s.fly.vx = 0; }
    if (s.fly.x > s.width - margin) { s.fly.x = s.width - margin; s.fly.vx = 0; }
    if (s.fly.y < margin) { s.fly.y = margin; s.fly.vy = 0; }
    if (s.fly.y > s.height - margin) { s.fly.y = s.height - margin; s.fly.vy = 0; }

    // Update timers
    if (s.fly.invulnerableTime > 0) s.fly.invulnerableTime--;

    // 2. ANIMATE WINGS (rapid flapping based on velocity)
    const currentSpeed = Math.sqrt(s.fly.vx * s.fly.vx + s.fly.vy * s.fly.vy);
    const flapSpeed = 0.15 + (currentSpeed / 8) * 0.45;
    s.wingAngle += flapSpeed * s.wingDir;
    if (s.wingAngle > 0.45) { s.wingAngle = 0.45; s.wingDir = -1; }
    if (s.wingAngle < -0.1) { s.wingAngle = -0.1; s.wingDir = 1; }

    // Update Procedural Buzz Oscillator frequency based on speed & swatter proximity
    let speedRatio = Math.min(1.0, currentSpeed / 12);
    let dangerRatio = 0;

    // Check if near warning zones
    s.swatters.forEach(sw => {
      if (sw.state === 'warning') {
        const swDx = s.fly.x - sw.x;
        const swDy = s.fly.y - sw.y;
        const swDist = Math.sqrt(swDx*swDx + swDy*swDy);
        if (swDist < sw.radius * 1.8) {
          // Increase fear buzz as fly gets closer to center of target
          dangerRatio = Math.max(dangerRatio, 1.0 - (swDist / (sw.radius * 1.8)));
        }
      }
    });
    soundManager.updateBuzz(speedRatio, dangerRatio);

    // 3. COLLISION WITH SWEETS (Food)
    for (let i = s.foods.length - 1; i >= 0; i--) {
      const f = s.foods[i];
      f.pulseTimer++;

      const fDx = s.fly.x - f.x;
      const fDy = s.fly.y - f.y;
      const fDist = Math.sqrt(fDx*fDx + fDy*fDy);

      if (fDist < s.fly.radius + f.radius) {
        // Collect sugar!
        soundManager.playEat();
        s.score += f.points;
        s.sugarsGathered += (f.type === 'sugar' ? 1 : f.type === 'candy' ? 3 : 10);
        s.fly.dashEnergy = Math.min(100, s.fly.dashEnergy + f.energyGrant);

        // Spawn sparkle particles
        for (let k = 0; k < 12; k++) {
          s.particles.push({
            id: Math.random().toString(),
            x: f.x,
            y: f.y,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
            radius: 2 + Math.random() * 3,
            color: f.type === 'sugar' ? '#cbd5e1' : f.type === 'candy' ? '#fca5a5' : '#c084fc',
            alpha: 0.9,
            life: 0,
            maxLife: 20 + Math.random() * 20,
            type: 'spark',
          });
        }

        // Float points text
        spawnTextParticle(f.x, f.y - 10, `+${f.points}`, '#38bdf8', 14);

        // Remove item and queue new item spawn
        s.foods.splice(i, 1);
        setTimeout(() => spawnFoodItem(), 1500 + Math.random() * 2000);
      }
    }

    // 4. SWATTER SCHEDULER (WAVES AI)
    s.nextSwatterTimer--;
    if (s.nextSwatterTimer <= 0) {
      spawnSwatterByDifficulty();
      
      // Calculate delay based on wave & difficulty
      let spawnDelay = 220; // Easy
      if (difficulty === 'normal') spawnDelay = 160;
      if (difficulty === 'hard') spawnDelay = 110;
      if (difficulty === 'nightmare') spawnDelay = 65;

      // Make wave scaling slightly reduce spawn intervals
      const scaleFactor = Math.max(0.4, 1 - (s.wave * 0.05));
      s.nextSwatterTimer = Math.round(spawnDelay * scaleFactor);
    }

    // 5. UPDATE SWATTERS
    for (let i = s.swatters.length - 1; i >= 0; i--) {
      const sw = s.swatters[i];
      sw.timer++;

      if (sw.state === 'warning') {
        if (sw.timer >= sw.warningDuration) {
          // Transition: warning -> striking
          sw.state = 'striking';
          sw.timer = 0;
          
          // Focus angle on the target
          sw.angle = Math.atan2(sw.targetY - sw.y, sw.targetX - sw.x) + Math.PI / 2;
        }
      } 
      else if (sw.state === 'striking') {
        // Linearly move swatter toward target position
        const progress = sw.timer / sw.strikeDuration;
        sw.x = sw.startX! + (sw.targetX - sw.startX!) * progress;
        sw.y = sw.startY! + (sw.targetY - sw.startY!) * progress;

        if (sw.timer >= sw.strikeDuration) {
          // CRITICAL MOMENT OF SLAM!
          sw.state = 'slamming';
          sw.timer = 0;
          sw.x = sw.targetX;
          sw.y = sw.targetY;
          
          // Trigger impact
          soundManager.playSlam();
          s.screenShake = sw.type === 'giant' ? 14 : 7;

          // Spawn slam dust circle
          for (let k = 0; k < (sw.type === 'giant' ? 30 : 15); k++) {
            const ang = (Math.PI * 2 / (sw.type === 'giant' ? 30 : 15)) * k;
            const pSpeed = sw.type === 'giant' ? 5 : 3;
            s.particles.push({
              id: Math.random().toString(),
              x: sw.x,
              y: sw.y,
              vx: Math.cos(ang) * pSpeed + (Math.random() - 0.5),
              vy: Math.sin(ang) * pSpeed + (Math.random() - 0.5),
              radius: 4 + Math.random() * 5,
              color: 'rgba(203, 213, 225, 0.65)',
              alpha: 0.8,
              life: 0,
              maxLife: 30 + Math.random() * 20,
              type: 'dust',
            });
          }

          // Check hit vs fly
          const slamDx = s.fly.x - sw.x;
          const slamDy = s.fly.y - sw.y;
          const slamDist = Math.sqrt(slamDx*slamDx + slamDy*slamDy);

          if (slamDist < sw.radius) {
            // Check invulnerability / dashing
            if (s.fly.invulnerableTime <= 0 && s.fly.dashActiveTime <= 0) {
              // FLY TAKES HIT!
              s.fly.lives--;
              soundManager.playHit();
              s.fly.invulnerableTime = 60; // 1 second of invul frames
              s.screenShake = 22; // Extreme screen shake

              // Spawn injury debris/dust
              for (let k = 0; k < 20; k++) {
                s.particles.push({
                  id: Math.random().toString(),
                  x: s.fly.x,
                  y: s.fly.y,
                  vx: (Math.random() - 0.5) * 8,
                  vy: (Math.random() - 0.5) * 8,
                  radius: 3 + Math.random() * 3,
                  color: '#ef4444', // red splats
                  alpha: 0.95,
                  life: 0,
                  maxLife: 25 + Math.random() * 25,
                  type: 'shatter',
                });
              }

              // Float OUCH text
              spawnTextParticle(s.fly.x, s.fly.y - 20, 'ОЙ!', '#f87171', 18);

              // CHECK GAME OVER
              if (s.fly.lives <= 0) {
                setTimeout(() => {
                  onGameOver(s.score, s.sugarsGathered, Math.floor(s.survivalTimer / 60), s.nearMisses);
                }, 400);
              }
            } else if (s.fly.dashActiveTime > 0) {
              // Dash dodging inside radius awards super bonuses!
              s.score += 300;
              s.nearMisses++;
              spawnTextParticle(sw.x, sw.y - sw.radius - 10, '+300 ИДЕАЛЬНО!', '#eab308', 15);
              soundManager.playBeep(880, 0.12, 'triangle', 0.2);
              
              // Spawn ring spark particle
              s.particles.push({
                id: Math.random().toString(),
                x: sw.x,
                y: sw.y,
                vx: 0,
                vy: 0,
                radius: sw.radius,
                color: '#eab308',
                alpha: 0.8,
                life: 0,
                maxLife: 20,
                type: 'ring',
              });
            }
          } 
          else if (slamDist < sw.radius * 1.55) {
            // NEAR MISS! Player dodged just outside the slam perimeter
            s.score += 150;
            s.nearMisses++;
            spawnTextParticle(s.fly.x, s.fly.y - 25, '+150 ВПРИТИРКУ!', '#10b981', 13);
            soundManager.playBeep(523, 0.08, 'sine', 0.15);
            setTimeout(() => soundManager.playBeep(659, 0.12, 'sine', 0.15), 50);

            // Ring particle on near miss
            s.particles.push({
              id: Math.random().toString(),
              x: sw.x,
              y: sw.y,
              vx: 0,
              vy: 0,
              radius: sw.radius,
              color: 'rgba(16, 185, 129, 0.5)',
              alpha: 0.7,
              life: 0,
              maxLife: 25,
              type: 'ring',
            });
          }
        }
      } 
      else if (sw.state === 'slamming') {
        if (sw.timer >= sw.slamDuration) {
          // Transition: slamming -> recovering
          sw.state = 'recovering';
          sw.timer = 0;
        }
      } 
      else if (sw.state === 'recovering') {
        if (sw.timer >= sw.recoverDuration) {
          // Recover finished, delete swatter
          s.swatters.splice(i, 1);
        }
      }
    }

    // 6. UPDATE PARTICLES
    for (let i = s.particles.length - 1; i >= 0; i--) {
      const p = s.particles[i];
      p.life++;
      
      if (p.life >= p.maxLife) {
        s.particles.splice(i, 1);
        continue;
      }

      // Physics/fading
      p.x += p.vx;
      p.y += p.vy;
      
      // Decelerate dust/sparks
      p.vx *= 0.95;
      p.vy *= 0.95;

      // Text floats upwards
      if (p.type === 'text') {
        p.vy = -1.2;
      }
      // Rings expand
      if (p.type === 'ring') {
        p.radius += 4;
      }

      p.alpha = 1 - (p.life / p.maxLife);
    }

    // Camera shake dampening
    if (s.screenShake > 0) s.screenShake *= 0.88;

    // Send fly state and stats up to parent HUD
    onFlyStateUpdate({ ...s.fly });
    onStatsUpdate(s.score, s.sugarsGathered, s.wave);
  };

  // Triggers spawning of a swatter according to game difficulty
  const spawnSwatterByDifficulty = () => {
    const s = stateRef.current;
    
    // Choose swatter type based on difficulty and wave
    let types: SwatterType[] = ['standard'];
    if (difficulty === 'normal') {
      types = ['standard', 'standard', 'fast'];
    } else if (difficulty === 'hard') {
      types = ['standard', 'fast', 'giant', 'sweep'];
    } else if (difficulty === 'nightmare') {
      types = ['fast', 'fast', 'giant', 'sweep', 'cross'];
    }

    // Higher waves unlock extra danger!
    if (s.wave >= 2 && !types.includes('fast')) types.push('fast');
    if (s.wave >= 3 && !types.includes('giant')) types.push('giant');
    if (s.wave >= 4 && !types.includes('sweep')) types.push('sweep');

    const chosenType = types[Math.floor(Math.random() * types.length)];

    if (chosenType === 'sweep') {
      // Sweeping attack across a horizontal or vertical axis
      const sweepDir = Math.random() > 0.5 ? 'horizontal' : 'vertical';
      let r = 70;
      let startX = 0, startY = 0;
      let targetX = 0, targetY = 0;

      if (sweepDir === 'horizontal') {
        // Sweeps left to right or right to left
        const fromLeft = Math.random() > 0.5;
        startY = 100 + Math.random() * (s.height - 200);
        targetY = startY;
        startX = fromLeft ? -100 : s.width + 100;
        targetX = fromLeft ? s.width + 50 : -50;
      } else {
        // Sweeps top to bottom or bottom to top
        const fromTop = Math.random() > 0.5;
        startX = 100 + Math.random() * (s.width - 200);
        targetX = startX;
        startY = fromTop ? -100 : s.height + 100;
        targetY = fromTop ? s.height + 50 : -50;
      }

      s.swatters.push({
        id: Math.random().toString(),
        type: 'sweep',
        state: 'warning',
        x: startX,
        y: startY,
        startX,
        startY,
        targetX,
        targetY,
        radius: r,
        width: r * 1.5,
        height: r * 1.8,
        angle: 0,
        timer: 0,
        warningDuration: Math.max(40, 70 - s.wave * 2), // warns on the path center
        strikeDuration: 30, // speed of slide
        slamDuration: 5,
        recoverDuration: 30,
      });

    } else if (chosenType === 'cross') {
      // Spawn cross pattern of 2 fast swatters simultaneously
      const centerX = 150 + Math.random() * (s.width - 300);
      const centerY = 100 + Math.random() * (s.height - 200);
      const swRadius = 60;

      for (let i = 0; i < 2; i++) {
        const isHoriz = i === 0;
        const sX = centerX + (isHoriz ? -250 : 0);
        const sY = centerY + (isHoriz ? 0 : -200);

        s.swatters.push({
          id: Math.random().toString(),
          type: 'cross',
          state: 'warning',
          x: sX,
          y: sY,
          startX: sX,
          startY: sY,
          targetX: centerX,
          targetY: centerY,
          radius: swRadius,
          width: swRadius * 1.5,
          height: swRadius * 1.8,
          angle: isHoriz ? Math.PI/2 : 0,
          timer: 0,
          warningDuration: Math.max(45, 65 - s.wave * 2),
          strikeDuration: 20,
          slamDuration: 6,
          recoverDuration: 25,
        });
      }
    } else {
      // Target based attacks targeting directly under the fly!
      let r = 60; // Standard
      let warnDur = Math.max(50, 90 - s.wave * 3);
      let strikeDur = 18;
      
      if (chosenType === 'fast') {
        r = 50;
        warnDur = Math.max(30, 60 - s.wave * 3);
        strikeDur = 12;
      } else if (chosenType === 'giant') {
        r = 110; // Massive coverage
        warnDur = Math.max(75, 115 - s.wave * 4);
        strikeDur = 25;
      }

      // Target fly's current position + small prediction offsets
      const tX = Math.max(r, Math.min(s.width - r, s.fly.x + s.fly.vx * 1.5));
      const tY = Math.max(r, Math.min(s.height - r, s.fly.y + s.fly.vy * 1.5));

      // Spawn floating swatter from a high border of the screen
      const fromLeft = Math.random() > 0.5;
      const sX = fromLeft ? -100 : s.width + 100;
      const sY = -120; // drop down from top outer space

      s.swatters.push({
        id: Math.random().toString(),
        type: chosenType,
        state: 'warning',
        x: sX,
        y: sY,
        startX: sX,
        startY: sY,
        targetX: tX,
        targetY: tY,
        radius: r,
        width: r * 1.5,
        height: r * 1.8,
        angle: 0,
        timer: 0,
        warningDuration: warnDur,
        strikeDuration: strikeDur,
        slamDuration: 8,
        recoverDuration: 30,
      });

      // Nightmare mode can chain immediate double triggers!
      if (difficulty === 'nightmare' && Math.random() > 0.6) {
        // Chain a fast secondary strike at the predicted flight path
        setTimeout(() => {
          if (isPaused) return;
          const chainX = Math.max(50, Math.min(s.width - 50, s.fly.x + s.fly.vx * 8));
          const chainY = Math.max(50, Math.min(s.height - 50, s.fly.y + s.fly.vy * 8));
          
          s.swatters.push({
            id: Math.random().toString(),
            type: 'fast',
            state: 'warning',
            x: sX,
            y: sY,
            startX: sX,
            startY: sY,
            targetX: chainX,
            targetY: chainY,
            radius: 45,
            width: 45 * 1.5,
            height: 45 * 1.8,
            angle: 0,
            timer: 0,
            warningDuration: 40,
            strikeDuration: 10,
            slamDuration: 6,
            recoverDuration: 20,
          });
        }, 350);
      }
    }
  };

  // Triggers floating scores, alerts, or miss particles
  const spawnTextParticle = (x: number, y: number, text: string, color: string, fontSize: number = 14) => {
    stateRef.current.particles.push({
      id: Math.random().toString(),
      x,
      y,
      vx: 0,
      vy: -1.2,
      radius: 0,
      color,
      alpha: 1.0,
      life: 0,
      maxLife: 45,
      type: 'text',
      text,
      fontSize,
    });
  };

  // Rendering pass on HTML5 canvas Context2D
  const renderGameFrame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const s = stateRef.current;

    ctx.save();
    
    // Apply Camera Shake offset
    if (s.screenShake > 0.2) {
      const shakeX = (Math.random() - 0.5) * s.screenShake;
      const shakeY = (Math.random() - 0.5) * s.screenShake;
      ctx.translate(shakeX, shakeY);
    }

    // 1. Draw Field Background (Warm, high contrast, clean retro wood or grid paper pattern)
    // We will draw elegant graph grid paper background
    ctx.fillStyle = '#fbfbf9'; // light cream background
    ctx.fillRect(0, 0, s.width, s.height);

    ctx.strokeStyle = 'rgba(212, 163, 115, 0.08)'; // faint warm orange grid lines
    ctx.lineWidth = 1;
    const size = 30;
    for (let gx = 0; gx < s.width; gx += size) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, s.height);
      ctx.stroke();
    }
    for (let gy = 0; gy < s.height; gy += size) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(s.width, gy);
      ctx.stroke();
    }

    // Outer warm border accent
    ctx.strokeStyle = 'rgba(249, 115, 22, 0.12)';
    ctx.lineWidth = 8;
    ctx.strokeRect(0, 0, s.width, s.height);

    // 2. Draw Food Items
    s.foods.forEach(food => {
      drawFood(ctx, food);
    });

    // 3. Draw Particles (drawn under fly)
    s.particles.forEach(p => {
      drawParticle(ctx, p);
    });

    // 4. Draw Warning Target zones of swatters on the floor
    s.swatters.forEach(swatter => {
      if (swatter.state === 'warning') {
        drawSwatter(ctx, swatter); // swatter draws warning overlay when state is 'warning'
      }
    });

    // 5. Draw Player Fly Character
    drawFly(ctx, s.fly, s.wingAngle);

    // 6. Draw Actual Hanging Swatters (striking from above)
    s.swatters.forEach(swatter => {
      if (swatter.state !== 'warning') {
        drawSwatter(ctx, swatter);
      }
    });

    ctx.restore();
  };

  return (
    <div 
      ref={containerRef} 
      id="game-canvas-container"
      className="w-full h-full relative cursor-none select-none overflow-hidden touch-none"
    >
      <canvas
        id="game-canvas"
        ref={canvasRef}
        onPointerMove={handlePointerMove}
        className="w-full h-full block"
      />
    </div>
  );
};
