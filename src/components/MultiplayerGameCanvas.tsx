import React, { useRef, useEffect, useState } from "react";
import { SKINS } from "../utils";
import { soundManager } from "./SoundManager";
import { drawFly, drawSwatter, drawFood, drawParticle } from "../utils";
import { Fly, Swatter, Food, Particle, SkinType } from "../types";

interface MultiplayerGameCanvasProps {
  room: any;
  playerId: string;
  ws: WebSocket | null;
  onGameOver: (winner: string, finalRoomState: any) => void;
  onStatsUpdate: (scores: Record<string, number>, sugars: number) => void;
  onLeave: () => void;
}

export const MultiplayerGameCanvas: React.FC<MultiplayerGameCanvasProps> = ({
  room: initialRoom,
  playerId,
  ws,
  onGameOver,
  onStatsUpdate,
  onLeave,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [roomState, setRoomState] = useState(initialRoom);
  const roomStateRef = useRef(initialRoom);

  // Sync state refs to avoid re-running render loop on state changes
  useEffect(() => {
    roomStateRef.current = roomState;
  }, [roomState]);

  // Game assets and engine ref
  const engineRef = useRef({
    width: 800,
    height: 500,
    pointer: { x: 400, y: 250 },
    
    // Local player state
    localX: 400,
    localY: 300,
    localVx: 0,
    localVy: 0,
    localAngle: 0,
    dashEnergy: 50,
    dashActiveTime: 0,
    invulnerableTime: 0,
    lives: 3,

    // Graphics states
    wingAngle: 0,
    wingDir: 1,
    screenShake: 0,
    particles: [] as Particle[],
    swatters: [] as any[], // local representations for animation smoothly

    // Swatter Weapon Selection for Versus Swatter player
    selectedSwatterType: "standard" as "standard" | "fast" | "giant",
    swatterCooldowns: {
      standard: 0,
      fast: 0,
      giant: 0,
    } as Record<string, number>,
  });

  const localRole = roomState.players[playerId]?.role || "fly";

  // Socket listener
  useEffect(() => {
    if (!ws) return;

    const handleMessage = (e: MessageEvent) => {
      try {
        const msg = JSON.parse(e.data);
        const { type, payload } = msg;

        switch (type) {
          case "position_update": {
            const current = { ...roomStateRef.current };
            if (current.players[payload.playerId]) {
              current.players[payload.playerId].x = payload.x;
              current.players[payload.playerId].y = payload.y;
              current.players[payload.playerId].vx = payload.vx;
              current.players[payload.playerId].vy = payload.vy;
              current.players[payload.playerId].angle = payload.angle;
              current.players[payload.playerId].dashActive = payload.dashActive;
              setRoomState(current);
            }
            break;
          }

          case "food_collected": {
            const current = { ...roomStateRef.current };
            current.foods = current.foods.filter((f: any) => f.id !== payload.foodId);
            current.foods.push(payload.newFood);
            
            if (current.players[payload.collectedBy]) {
              current.players[payload.collectedBy].score = payload.score;
            }
            setRoomState(current);
            soundManager.playEat();

            // Spawn local sparkling effects on food location
            const eng = engineRef.current;
            for (let k = 0; k < 10; k++) {
              eng.particles.push({
                id: Math.random().toString(),
                x: payload.newFood.x,
                y: payload.newFood.y,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5,
                radius: 2 + Math.random() * 3,
                color: "#cbd5e1",
                alpha: 0.8,
                life: 0,
                maxLife: 20,
                type: "spark",
              });
            }
            break;
          }

          case "swatter_spawned": {
            const eng = engineRef.current;
            soundManager.playBeep(220, 0.1, "sawtooth", 0.1);
            
            // Add to locally animated swatters
            eng.swatters.push({
              ...payload,
              startX: payload.x - 300,
              startY: payload.y - 400,
              angle: 0,
            });
            break;
          }

          case "swatter_slam": {
            const eng = engineRef.current;
            const sw = eng.swatters.find((s) => s.id === payload.swatterId);
            if (sw) {
              sw.state = "slamming";
              sw.timer = 0;
            }
            soundManager.playSlam();
            eng.screenShake = 10;
            break;
          }

          case "player_damaged": {
            const current = { ...roomStateRef.current };
            if (current.players[payload.playerId]) {
              current.players[payload.playerId].lives = payload.lives;
            }
            setRoomState(current);
            soundManager.playHit();
            
            if (payload.playerId === playerId) {
              const eng = engineRef.current;
              eng.lives = payload.lives;
              eng.invulnerableTime = 60;
              eng.screenShake = 15;
            }
            break;
          }

          case "game_over": {
            onGameOver(payload.winner, payload.room);
            break;
          }

          case "room_updated": {
            setRoomState(payload);
            break;
          }
        }
      } catch (err) {
        console.error("Multiplayer event parse error", err);
      }
    };

    ws.addEventListener("message", handleMessage);
    return () => {
      ws.removeEventListener("message", handleMessage);
    };
  }, [ws]);

  // Handle Resize
  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const container = containerRef.current;

    const handleResize = (entries: ResizeObserverEntry[]) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        canvas.width = width;
        canvas.height = height;
        engineRef.current.width = width;
        engineRef.current.height = height;
      }
    };

    const observer = new ResizeObserver(handleResize);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Listen to mouse/pointer coordinates
  const handlePointerMove = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const eng = engineRef.current;
    eng.pointer.x = x;
    eng.pointer.y = y;
  };

  // Keyboard dash & swatter change weapon hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        triggerDash();
      }
      if (e.code === "Digit1") {
        engineRef.current.selectedSwatterType = "standard";
        soundManager.playClick();
      }
      if (e.code === "Digit2") {
        engineRef.current.selectedSwatterType = "fast";
        soundManager.playClick();
      }
      if (e.code === "Digit3") {
        engineRef.current.selectedSwatterType = "giant";
        soundManager.playClick();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Handle fly sound
  useEffect(() => {
    soundManager.startBuzz();
    return () => soundManager.stopBuzz();
  }, []);

  // Super dash triggering
  const triggerDash = () => {
    const eng = engineRef.current;
    if (eng.dashEnergy >= 100 && eng.dashActiveTime <= 0 && localRole === "fly") {
      eng.dashEnergy = 0;
      eng.dashActiveTime = 18;
      eng.invulnerableTime = 30;
      soundManager.playDash();

      // Trigger rings
      for (let i = 0; i < 8; i++) {
        eng.particles.push({
          id: Math.random().toString(),
          x: eng.localX,
          y: eng.localY,
          vx: -Math.cos(eng.localAngle) * 4 + (Math.random() - 0.5) * 2,
          vy: -Math.sin(eng.localAngle) * 4 + (Math.random() - 0.5) * 2,
          radius: 3 + Math.random() * 3,
          color: "#A67C52",
          alpha: 0.8,
          life: 0,
          maxLife: 15,
          type: "dash",
        });
      }
    }
  };

  // Click handler: collects sweets (fly) OR strikes swatter (swatter)
  const handlePointerDown = (e: React.PointerEvent) => {
    const eng = engineRef.current;
    const x = eng.pointer.x;
    const y = eng.pointer.y;

    if (localRole === "swatter") {
      // Swatter click - trigger spawn swatter
      const type = eng.selectedSwatterType;
      const cooldown = eng.swatterCooldowns[type];
      
      if (cooldown > 0) {
        soundManager.playHit(); // error buzz
        return;
      }

      // Trigger cooldown
      if (type === "standard") {
        eng.swatterCooldowns.standard = 60; // 1s
      } else if (type === "fast") {
        eng.swatterCooldowns.fast = 150; // 2.5s
      } else if (type === "giant") {
        eng.swatterCooldowns.giant = 300; // 5s
      }

      const radius = type === "giant" ? 110 : type === "fast" ? 45 : 60;
      const warningDuration = type === "giant" ? 90 : type === "fast" ? 35 : 55;

      // Send to server
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: "spawn_swatter",
          payload: { x, y, type, radius, warningDuration }
        }));
      }
    }
  };

  // Engine loop
  useEffect(() => {
    let animId: number;

    const loop = () => {
      updateMultiplayerPhysics();
      renderMultiplayerFrame();
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  const updateMultiplayerPhysics = () => {
    const eng = engineRef.current;
    const room = roomStateRef.current;

    // 1. Cooldown decrement
    Object.keys(eng.swatterCooldowns).forEach((key) => {
      if (eng.swatterCooldowns[key] > 0) {
        eng.swatterCooldowns[key]--;
      }
    });

    // 2. Animate wings flapping
    eng.wingAngle += 0.25 * eng.wingDir;
    if (eng.wingAngle > 0.45) { eng.wingAngle = 0.45; eng.wingDir = -1; }
    if (eng.wingAngle < -0.1) { eng.wingAngle = -0.1; eng.wingDir = 1; }

    // 3. Update local Fly position
    if (localRole === "fly" && eng.lives > 0) {
      const dx = eng.pointer.x - eng.localX;
      const dy = eng.pointer.y - eng.localY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 5) {
        const targetAngle = Math.atan2(dy, dx);
        let angleDiff = targetAngle - eng.localAngle;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        eng.localAngle += angleDiff * 0.18;

        let maxSpeed = eng.dashActiveTime > 0 ? 22 : 8;
        const targetVx = (dx / dist) * Math.min(maxSpeed, dist * 0.08);
        const targetVy = (dy / dist) * Math.min(maxSpeed, dist * 0.08);

        eng.localVx += (targetVx - eng.localVx) * 0.18;
        eng.localVy += (targetVy - eng.localVy) * 0.18;
      } else {
        eng.localVx *= 0.75;
        eng.localVy *= 0.75;
      }

      eng.localX += eng.localVx;
      eng.localY += eng.localVy;

      // Clamping
      const margin = 20;
      if (eng.localX < margin) eng.localX = margin;
      if (eng.localX > eng.width - margin) eng.localX = eng.width - margin;
      if (eng.localY < margin) eng.localY = margin;
      if (eng.localY > eng.height - margin) eng.localY = eng.height - margin;

      if (eng.dashActiveTime > 0) eng.dashActiveTime--;
      if (eng.invulnerableTime > 0) eng.invulnerableTime--;

      // Sync position to other players
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: "player_update",
          payload: {
            x: eng.localX,
            y: eng.localY,
            vx: eng.localVx,
            vy: eng.localVy,
            angle: eng.localAngle,
            dashActive: eng.dashActiveTime > 0
          }
        }));
      }

      // Check client side food collection to alert backend
      room.foods.forEach((food: any) => {
        const fdx = eng.localX - food.x;
        const fdy = eng.localY - food.y;
        const distToFood = Math.sqrt(fdx*fdx + fdy*fdy);
        if (distToFood < 14 + food.radius) {
          // Tell server
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: "collect_food",
              payload: { foodId: food.id, points: food.type === "jam" ? 100 : food.type === "candy" ? 50 : 15 }
            }));
            eng.dashEnergy = Math.min(100, eng.dashEnergy + 15);
          }
        }
      });
    }

    // 4. Update local Swatter animations
    for (let i = eng.swatters.length - 1; i >= 0; i--) {
      const sw = eng.swatters[i];
      sw.timer++;

      if (sw.state === "warning") {
        if (sw.timer >= sw.warningDuration) {
          sw.state = "striking";
          sw.timer = 0;
        }
      } 
      else if (sw.state === "striking") {
        const progress = sw.timer / sw.strikeDuration;
        sw.x = sw.startX + (sw.targetX - sw.startX) * progress;
        sw.y = sw.startY + (sw.targetY - sw.startY) * progress;

        if (sw.timer >= sw.strikeDuration) {
          sw.state = "slamming";
          sw.timer = 0;
          sw.x = sw.targetX;
          sw.y = sw.targetY;
          
          soundManager.playSlam();
          eng.screenShake = 12;

          // Check damage IF local player is fly
          if (localRole === "fly" && eng.lives > 0 && eng.invulnerableTime <= 0 && eng.dashActiveTime <= 0) {
            const dx = eng.localX - sw.x;
            const dy = eng.localY - sw.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < sw.radius) {
              // Notify Server of Damage!
              if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                  type: "player_hit",
                  payload: { hitPlayerId: playerId }
                }));
              }
            }
          }
        }
      } 
      else if (sw.state === "slamming") {
        if (sw.timer >= sw.slamDuration) {
          sw.state = "recovering";
          sw.timer = 0;
        }
      } 
      else if (sw.state === "recovering") {
        if (sw.timer >= sw.recoverDuration) {
          eng.swatters.splice(i, 1);
        }
      }
    }

    // 5. Update Particles
    for (let i = eng.particles.length - 1; i >= 0; i--) {
      const p = eng.particles[i];
      p.life++;
      if (p.life >= p.maxLife) {
        eng.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx;
      p.y += p.vy;
      p.alpha = 1 - p.life / p.maxLife;
    }

    // Screen Shake damping
    if (eng.screenShake > 0) eng.screenShake *= 0.88;

    // Report stats back to top HUD
    const allScores: Record<string, number> = {};
    Object.values(room.players).forEach((p: any) => {
      allScores[p.name] = p.score;
    });
    onStatsUpdate(allScores, eng.dashEnergy);
  };

  const renderMultiplayerFrame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const eng = engineRef.current;
    const room = roomStateRef.current;

    ctx.save();
    if (eng.screenShake > 0.5) {
      ctx.translate((Math.random() - 0.5) * eng.screenShake, (Math.random() - 0.5) * eng.screenShake);
    }

    // Background
    ctx.fillStyle = "#fbfbf9";
    ctx.fillRect(0, 0, eng.width, eng.height);

    ctx.strokeStyle = "rgba(212, 163, 115, 0.08)";
    ctx.lineWidth = 1;
    const gridSize = 35;
    for (let gx = 0; gx < eng.width; gx += gridSize) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, eng.height); ctx.stroke();
    }
    for (let gy = 0; gy < eng.height; gy += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(eng.width, gy); ctx.stroke();
    }

    // Draw Foods
    room.foods.forEach((food: any) => {
      drawFood(ctx, food);
    });

    // Draw Particles
    eng.particles.forEach((p) => {
      drawParticle(ctx, p);
    });

    // Draw target warning rings
    eng.swatters.forEach((sw) => {
      if (sw.state === "warning") {
        drawSwatter(ctx, sw);
      }
    });

    // Draw Flies
    Object.values(room.players).forEach((player: any) => {
      if (player.role !== "fly" || player.lives <= 0) return;
      
      const flyObj: Fly = {
        x: player.x,
        y: player.y,
        vx: player.vx || 0,
        vy: player.vy || 0,
        radius: 14,
        angle: player.angle,
        targetAngle: player.angle,
        skin: player.skin as SkinType,
        dashEnergy: 100,
        dashCooldown: 0,
        dashActiveTime: player.dashActive ? 10 : 0,
        invulnerableTime: 0,
        lives: player.lives,
        maxLives: 3,
      };

      ctx.save();
      drawFly(ctx, flyObj, eng.wingAngle);
      
      // Draw name tags
      ctx.fillStyle = "#5A5A40";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(player.name, player.x, player.y - 25);
      
      // Draw small life dots
      const startLifeX = player.x - (player.lives - 1) * 5;
      for (let l = 0; l < player.lives; l++) {
        ctx.fillStyle = "#A67C52";
        ctx.beginPath();
        ctx.arc(startLifeX + l * 10, player.y - 38, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    });

    // Draw swatters in slam
    eng.swatters.forEach((sw) => {
      if (sw.state !== "warning") {
        drawSwatter(ctx, sw);
      }
    });

    // If local player is Swatter, draw weapon placement pointer helper
    if (localRole === "swatter") {
      ctx.save();
      ctx.translate(eng.pointer.x, eng.pointer.y);
      
      const type = eng.selectedSwatterType;
      const radius = type === "giant" ? 110 : type === "fast" ? 45 : 60;
      
      // Reticle
      ctx.strokeStyle = "rgba(166, 124, 82, 0.4)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.stroke();

      // Hairline cross
      ctx.beginPath();
      ctx.moveTo(-radius - 10, 0); ctx.lineTo(-10, 0);
      ctx.moveTo(10, 0); ctx.lineTo(radius + 10, 0);
      ctx.moveTo(0, -radius - 10); ctx.lineTo(0, -10);
      ctx.moveTo(0, 10); ctx.lineTo(0, radius + 10);
      ctx.stroke();

      // Tooltip name
      ctx.fillStyle = "#5A5A40";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${type === "giant" ? "Огромная" : type === "fast" ? "Быстрая" : "Обычная"} Мухобойка`, 0, radius + 18);

      ctx.restore();
    }

    ctx.restore();
  };

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerDown}
      className={`w-full h-full relative overflow-hidden select-none touch-none ${
        localRole === "swatter" ? "cursor-crosshair" : "cursor-none"
      }`}
    >
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Versus mode HUD instructions */}
      {localRole === "swatter" && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white/95 border border-[#5A5A40]/20 px-4 py-2.5 rounded-full flex gap-4 text-xs font-bold text-[#5A5A40] shadow-md z-10 font-sans">
          <button
            onClick={() => { engineRef.current.selectedSwatterType = "standard"; soundManager.playClick(); }}
            className={`px-3 py-1 rounded-full border transition-all ${
              engineRef.current.selectedSwatterType === "standard" ? "bg-[#5A5A40] text-white" : "hover:bg-[#f5f5f0]"
            }`}
          >
            [1] Стандартная
          </button>
          <button
            onClick={() => { engineRef.current.selectedSwatterType = "fast"; soundManager.playClick(); }}
            className={`px-3 py-1 rounded-full border transition-all ${
              engineRef.current.selectedSwatterType === "fast" ? "bg-[#5A5A40] text-white" : "hover:bg-[#f5f5f0]"
            }`}
          >
            [2] Молния
          </button>
          <button
            onClick={() => { engineRef.current.selectedSwatterType = "giant"; soundManager.playClick(); }}
            className={`px-3 py-1 rounded-full border transition-all ${
              engineRef.current.selectedSwatterType === "giant" ? "bg-[#5A5A40] text-white" : "hover:bg-[#f5f5f0]"
            }`}
          >
            [3] Гигант
          </button>
        </div>
      )}
    </div>
  );
};
