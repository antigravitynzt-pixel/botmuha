import { Skin, SkinType, Fly, Swatter, Food, Particle, Difficulty, HighScore } from './types';

export const SKINS: Record<SkinType, Skin> = {
  classic: {
    id: 'classic',
    name: 'Муха Обыкновенная',
    description: 'Обычная комнатная муха. Быстрая, жужжащая, легендарная.',
    color: '#2a2d34',
    wingColor: 'rgba(173, 216, 230, 0.5)',
    accessoryColor: '#000000',
    price: 0
  },
  cool: {
    id: 'cool',
    name: 'Крутая Муха',
    description: 'Очки «авиаторы» и дерзкий нрав. Солнце никогда не заходит для стиля.',
    color: '#3f51b5',
    wingColor: 'rgba(255, 110, 196, 0.5)',
    accessoryColor: '#ff1744',
    price: 30
  },
  gentleman: {
    id: 'gentleman',
    name: 'Сэр Жужжала',
    description: 'Цилиндр, монокль и безупречные манеры. Сладкое кушает только вилкой.',
    color: '#1a1a1a',
    wingColor: 'rgba(240, 248, 255, 0.6)',
    accessoryColor: '#ffffff',
    price: 75
  },
  cyber: {
    id: 'cyber',
    name: 'Кибер-Муха 2077',
    description: 'Улучшенные неоновые импланты. Встроенный чип авто-уклонения.',
    color: '#0d1b2a',
    wingColor: 'rgba(0, 255, 242, 0.5)',
    accessoryColor: '#39ff14',
    price: 150
  },
  ninja: {
    id: 'ninja',
    name: 'Синоби-Муха',
    description: 'Мастер маскировки и скрытности. Оставляет после себя лишь тень.',
    color: '#2d3142',
    wingColor: 'rgba(100, 100, 100, 0.4)',
    accessoryColor: '#ff3e3e',
    price: 250
  },
  golden: {
    id: 'golden',
    name: 'Золотая Муха',
    description: 'Из чистого сусального золота. Роскошь, ослепляющая мухобойки.',
    color: '#ffb703',
    wingColor: 'rgba(255, 215, 0, 0.6)',
    accessoryColor: '#fb8500',
    price: 500
  },
  ironman: {
    id: 'ironman',
    name: 'Муха Железный Человек',
    description: 'Высокотехнологичная броня из золото-титанового сплава и реактивный репульсор. Летает со скоростью звука!',
    color: '#b91c1c',
    wingColor: 'rgba(234, 179, 8, 0.7)',
    accessoryColor: '#eab308',
    price: 0 // purchased with real USD
  },
  spider: {
    id: 'spider',
    name: 'Муха-Паук',
    description: 'Легендарные красно-синие трико и плетение паутины. Перемещается ловко и стильно!',
    color: '#0284c7',
    wingColor: 'rgba(239, 68, 68, 0.65)',
    accessoryColor: '#ef4444',
    price: 0 // case exclusive
  },
  hulk: {
    id: 'hulk',
    name: 'Муха-Халк',
    description: 'Невероятная мощь и несокрушимый зелёный гнев. Мухобойки просто ломаются об неё!',
    color: '#22c55e',
    wingColor: 'rgba(147, 51, 234, 0.7)',
    accessoryColor: '#a855f7',
    price: 0 // case exclusive
  },
  zombie: {
    id: 'zombie',
    name: 'Муха-Зомби',
    description: 'Восставшая из варенья! Зеленоватый оттенок и непреодолимая жажда свежего сахара.',
    color: '#84cc16',
    wingColor: 'rgba(100, 116, 139, 0.5)',
    accessoryColor: '#475569',
    price: 0 // case exclusive
  },
  pirate: {
    id: 'pirate',
    name: 'Муха-Пират',
    description: 'Капитан Сахарных Морей. Пиратская треуголка, повязка на глаз и жажда золотых сокровищ!',
    color: '#451a03',
    wingColor: 'rgba(251, 146, 60, 0.6)',
    accessoryColor: '#000000',
    price: 0 // case exclusive
  }
};

// Returns total accumulated sugars from localStorage
export function getSavedSugars(): number {
  if (typeof window === 'undefined') return 0;
  return parseInt(localStorage.getItem('fly_game_sugars') || '0', 10);
}

export function saveSugars(amount: number) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('fly_game_sugars', String(amount));
}

// Returns unlocked skins from localStorage
export function getUnlockedSkins(): SkinType[] {
  if (typeof window === 'undefined') return ['classic'];
  try {
    const data = localStorage.getItem('fly_game_unlocked_skins');
    return data ? JSON.parse(data) : ['classic'];
  } catch (e) {
    return ['classic'];
  }
}

export function unlockSkin(skinId: SkinType) {
  if (typeof window === 'undefined') return;
  const unlocked = getUnlockedSkins();
  if (!unlocked.includes(skinId)) {
    unlocked.push(skinId);
    localStorage.setItem('fly_game_unlocked_skins', JSON.stringify(unlocked));
  }
}

// Draw Fly on canvas
export function drawFly(ctx: CanvasRenderingContext2D, fly: Fly, wingAngle: number) {
  ctx.save();
  ctx.translate(fly.x, fly.y);
  ctx.rotate(fly.angle + Math.PI / 2); // default image orientation is pointing UP

  const skin = SKINS[fly.skin] || SKINS.classic;

  // Invulnerability flashing
  if (fly.invulnerableTime > 0 && Math.floor(fly.invulnerableTime / 4) % 2 === 0) {
    ctx.globalAlpha = 0.3;
  }

  // Draw fly shadows
  ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
  ctx.shadowBlur = fly.dashActiveTime > 0 ? 12 : 6;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 4;

  // 1. Draw Wings (drawn first so they appear behind/under the body)
  const isDashing = fly.dashActiveTime > 0;
  const flapMultiplier = isDashing ? 2.5 : 1.0;
  
  // Left Wing
  ctx.save();
  ctx.translate(-fly.radius * 0.4, -fly.radius * 0.1);
  ctx.rotate(-Math.PI / 4 - wingAngle * flapMultiplier);
  ctx.fillStyle = skin.wingColor;
  ctx.strokeStyle = skin.id === 'cyber' ? '#00fff2' : 'rgba(255, 255, 255, 0.8)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(0, -fly.radius * 0.8, fly.radius * 0.4, fly.radius * 0.9, -Math.PI / 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Wing pattern lines
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -fly.radius * 1.5);
  ctx.moveTo(0, -fly.radius * 0.5);
  ctx.lineTo(-fly.radius * 0.3, -fly.radius * 1.2);
  ctx.moveTo(0, -fly.radius * 0.8);
  ctx.lineTo(fly.radius * 0.2, -fly.radius * 1.4);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.stroke();
  ctx.restore();

  // Right Wing
  ctx.save();
  ctx.translate(fly.radius * 0.4, -fly.radius * 0.1);
  ctx.rotate(Math.PI / 4 + wingAngle * flapMultiplier);
  ctx.fillStyle = skin.wingColor;
  ctx.strokeStyle = skin.id === 'cyber' ? '#00fff2' : 'rgba(255, 255, 255, 0.8)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(0, -fly.radius * 0.8, fly.radius * 0.4, fly.radius * 0.9, Math.PI / 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Wing pattern lines
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -fly.radius * 1.5);
  ctx.moveTo(0, -fly.radius * 0.5);
  ctx.lineTo(fly.radius * 0.3, -fly.radius * 1.2);
  ctx.moveTo(0, -fly.radius * 0.8);
  ctx.lineTo(-fly.radius * 0.2, -fly.radius * 1.4);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.stroke();
  ctx.restore();

  // Reset shadow for body details to look crisp
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';

  // 2. Fly Legs (6 little legs)
  ctx.strokeStyle = skin.color;
  ctx.lineWidth = 2.5;
  const legAngles = [-Math.PI / 3, -Math.PI / 6, 0, Math.PI / 6];
  for (let side of [-1, 1]) {
    legAngles.forEach((ang, idx) => {
      ctx.beginPath();
      ctx.moveTo(side * fly.radius * 0.5, (idx - 1.5) * fly.radius * 0.3);
      ctx.quadraticCurveTo(
        side * fly.radius * 1.4, 
        (idx - 1.5) * fly.radius * 0.4, 
        side * fly.radius * 1.6, 
        (idx - 1.5) * fly.radius * 0.2 + (idx === 0 ? -2 : 2)
      );
      ctx.stroke();
    });
  }

  // 3. Body (Abdomen / Брюшко)
  ctx.fillStyle = skin.color;
  // If golden, use nice golden gradient
  if (skin.id === 'golden') {
    const grad = ctx.createRadialGradient(0, fly.radius * 0.4, 2, 0, fly.radius * 0.4, fly.radius);
    grad.addColorStop(0, '#ffe57f');
    grad.addColorStop(0.5, '#ffb703');
    grad.addColorStop(1, '#d48c00');
    ctx.fillStyle = grad;
  }
  ctx.beginPath();
  ctx.ellipse(0, fly.radius * 0.4, fly.radius * 0.65, fly.radius * 0.85, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Abdomen stripes (полоски на брюшке)
  ctx.strokeStyle = skin.id === 'golden' ? '#fb8500' : skin.id === 'cyber' ? '#39ff14' : '#111';
  ctx.lineWidth = 2;
  for (let i = 0.1; i <= 0.8; i += 0.25) {
    ctx.beginPath();
    ctx.arc(0, fly.radius * (0.1 + i), fly.radius * 0.55 * Math.sin(Math.acos(i - 0.4)), 0.1, Math.PI - 0.1);
    ctx.stroke();
  }

  // 4. Thorax (Грудь)
  ctx.fillStyle = skin.id === 'golden' ? '#ffb703' : skin.id === 'cyber' ? '#1b2a47' : '#333742';
  ctx.beginPath();
  ctx.arc(0, -fly.radius * 0.25, fly.radius * 0.55, 0, Math.PI * 2);
  ctx.fill();

  // 5. Head (Голова)
  ctx.fillStyle = skin.id === 'golden' ? '#fb8500' : skin.color;
  ctx.beginPath();
  ctx.arc(0, -fly.radius * 0.75, fly.radius * 0.45, 0, Math.PI * 2);
  ctx.fill();

  // 6. Huge Fly Eyes
  ctx.fillStyle = skin.id === 'cyber' ? '#ff007f' : skin.id === 'ninja' ? '#ff3e3e' : '#b71c1c';
  // Left eye
  ctx.beginPath();
  ctx.ellipse(-fly.radius * 0.35, -fly.radius * 0.85, fly.radius * 0.22, fly.radius * 0.3, -Math.PI / 6, 0, Math.PI * 2);
  ctx.fill();
  // Left eye glare
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(-fly.radius * 0.4, -fly.radius * 0.95, fly.radius * 0.07, 0, Math.PI * 2);
  ctx.fill();

  // Right eye
  ctx.fillStyle = skin.id === 'cyber' ? '#ff007f' : skin.id === 'ninja' ? '#ff3e3e' : '#b71c1c';
  ctx.beginPath();
  ctx.ellipse(fly.radius * 0.35, -fly.radius * 0.85, fly.radius * 0.22, fly.radius * 0.3, Math.PI / 6, 0, Math.PI * 2);
  ctx.fill();
  // Right eye glare
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(fly.radius * 0.3, -fly.radius * 0.95, fly.radius * 0.07, 0, Math.PI * 2);
  ctx.fill();

  // 7. Cosmetics Accessories
  drawAccessory(ctx, skin.id, fly.radius, skin.accessoryColor);

  ctx.restore();
}

function drawAccessory(ctx: CanvasRenderingContext2D, skinId: SkinType, r: number, color: string) {
  if (skinId === 'cool') {
    // Cool sunglasses!
    ctx.fillStyle = '#111';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    
    // Left lens
    ctx.beginPath();
    ctx.moveTo(-r * 0.55, -r * 0.9);
    ctx.lineTo(-r * 0.15, -r * 0.9);
    ctx.lineTo(-r * 0.2, -r * 0.65);
    ctx.lineTo(-r * 0.5, -r * 0.65);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Right lens
    ctx.beginPath();
    ctx.moveTo(r * 0.15, -r * 0.9);
    ctx.lineTo(r * 0.55, -r * 0.9);
    ctx.lineTo(r * 0.5, -r * 0.65);
    ctx.lineTo(r * 0.2, -r * 0.65);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Bridge line
    ctx.beginPath();
    ctx.moveTo(-r * 0.15, -r * 0.85);
    ctx.lineTo(r * 0.15, -r * 0.85);
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 2;
    ctx.stroke();
  } 
  else if (skinId === 'gentleman') {
    // Elegant Black Top Hat
    ctx.fillStyle = '#000000';
    // Hat brim
    ctx.beginPath();
    ctx.ellipse(0, -r * 1.1, r * 0.65, r * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
    // Hat base
    ctx.fillRect(-r * 0.4, -r * 1.7, r * 0.8, r * 0.6);
    // Red ribbon
    ctx.fillStyle = '#ff1744';
    ctx.fillRect(-r * 0.4, -r * 1.25, r * 0.8, r * 0.15);

    // Cute Monocle on right eye
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(r * 0.35, -r * 0.85, r * 0.25, 0, Math.PI * 2);
    ctx.stroke();
    // Monocle chain
    ctx.beginPath();
    ctx.moveTo(r * 0.6, -r * 0.85);
    ctx.quadraticCurveTo(r * 0.8, -r * 0.5, r * 0.7, -r * 0.2);
    ctx.lineWidth = 1;
    ctx.stroke();
  } 
  else if (skinId === 'cyber') {
    // Neon Visor line
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r * 0.6, -r * 0.8);
    ctx.lineTo(r * 0.6, -r * 0.8);
    ctx.stroke();
  } 
  else if (skinId === 'ninja') {
    // Red headband tied behind
    ctx.fillStyle = color; // red
    // Band across forehead
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, -r * 0.95);
    ctx.lineTo(r * 0.5, -r * 0.95);
    ctx.lineTo(r * 0.45, -r * 1.1);
    ctx.lineTo(-r * 0.45, -r * 1.1);
    ctx.closePath();
    ctx.fill();

    // Fluttering tails of the headband at the back (bottom-left)
    ctx.save();
    ctx.translate(0, r * 0.85);
    ctx.rotate(Math.PI / 10);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-r * 0.4, r * 0.4);
    ctx.lineTo(-r * 0.1, r * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-r * 0.6, r * 0.25);
    ctx.lineTo(-r * 0.35, r * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  else if (skinId === 'ironman') {
    // Golden Face Visor Plate (Iron Man style)
    ctx.fillStyle = '#f59e0b';
    ctx.strokeStyle = '#b91c1c';
    ctx.lineWidth = 1.5;
    
    ctx.beginPath();
    ctx.arc(0, -r * 0.4, r * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Stylized glowing eyes slits
    ctx.fillStyle = '#e0f2fe';
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 6;
    
    ctx.beginPath();
    ctx.rect(-r * 0.3, -r * 0.5, r * 0.2, r * 0.1);
    ctx.rect(r * 0.1, -r * 0.5, r * 0.2, r * 0.1);
    ctx.fill();
    
    // Glowing Arc Reactor on back (for awesome thruster visual!)
    ctx.fillStyle = '#06b6d4';
    ctx.beginPath();
    ctx.arc(0, r * 0.3, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.shadowBlur = 0; // reset shadow
  }
  else if (skinId === 'spider') {
    // Spider Web mask pattern
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.75;
    
    // Draw cross hairs
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, -r * 0.5);
    ctx.lineTo(r * 0.5, -r * 0.1);
    ctx.moveTo(r * 0.5, -r * 0.5);
    ctx.lineTo(-r * 0.5, -r * 0.1);
    ctx.stroke();

    // Large glowing white Spider-eyes with dark outline
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.ellipse(-r * 0.25, -r * 0.4, r * 0.2, r * 0.35, Math.PI / 8, 0, Math.PI * 2);
    ctx.ellipse(r * 0.25, -r * 0.4, r * 0.2, r * 0.35, -Math.PI / 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-r * 0.23, -r * 0.4, r * 0.14, r * 0.28, Math.PI / 8, 0, Math.PI * 2);
    ctx.ellipse(r * 0.23, -r * 0.4, r * 0.14, r * 0.28, -Math.PI / 8, 0, Math.PI * 2);
    ctx.fill();
  }
  else if (skinId === 'hulk') {
    // Messy green hair & angry black eyebrows
    ctx.fillStyle = '#0f172a'; // black hair
    ctx.beginPath();
    ctx.arc(0, -r * 0.7, r * 0.5, Math.PI, Math.PI * 2);
    ctx.fill();

    // Draw angry black eyebrows
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, -r * 0.4);
    ctx.lineTo(-r * 0.05, -r * 0.3);
    ctx.moveTo(r * 0.4, -r * 0.4);
    ctx.lineTo(r * 0.05, -r * 0.3);
    ctx.stroke();
  }
  else if (skinId === 'zombie') {
    // Exposed pink brain slice & stitching scar
    ctx.fillStyle = '#f472b6'; // pink brain
    ctx.beginPath();
    ctx.arc(r * 0.2, -r * 0.6, r * 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Stitching scar
    ctx.strokeStyle = '#3f6212';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, -r * 0.2);
    ctx.lineTo(r * 0.2, -r * 0.4);
    ctx.stroke();
  }
  else if (skinId === 'pirate') {
    // Black Tricorn Pirate Hat & Eyepatch
    ctx.fillStyle = '#1e293b'; // dark slate pirate hat
    ctx.beginPath();
    // Tricorn shape
    ctx.moveTo(-r * 0.7, -r * 0.7);
    ctx.lineTo(0, -r * 1.3);
    ctx.lineTo(r * 0.7, -r * 0.7);
    ctx.quadraticCurveTo(0, -r * 0.5, -r * 0.7, -r * 0.7);
    ctx.fill();

    // Golden Skull-and-Crossbones logo on hat
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(0, -r * 0.85, r * 0.12, 0, Math.PI * 2);
    ctx.fill();

    // Pirate Black Eyepatch over one eye
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.ellipse(-r * 0.22, -r * 0.35, r * 0.16, r * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
    // Eyepatch strap
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-r * 0.6, -r * 0.5);
    ctx.lineTo(r * 0.5, -r * 0.2);
    ctx.stroke();
  }
}

// Draw Swatter on canvas
export function drawSwatter(ctx: CanvasRenderingContext2D, swatter: Swatter) {
  const { x, y, state, timer, radius, type } = swatter;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(swatter.angle);

  // Determine drawing parameters based on state
  let scale = 1.0;
  let opacity = 1.0;
  let shadowBlur = 8;
  let shadowOffset = 5;

  if (state === 'warning') {
    // In warning state, we draw a target reticle or fading indicator ON THE GROUND, not the swatter itself
    // Or we draw the swatter hovering high above (big, transparent, blurry)
    scale = 1.8 - (timer / swatter.warningDuration) * 0.4; // shrinks as it readies
    opacity = 0.25 + (timer / swatter.warningDuration) * 0.45; // gets more solid
    shadowBlur = 25;
    shadowOffset = 25;
  } else if (state === 'striking') {
    const progress = timer / swatter.strikeDuration;
    scale = 1.4 - progress * 0.4; // rapidly plunges down
    opacity = 0.7 + progress * 0.3;
    shadowBlur = 15 * (1 - progress);
    shadowOffset = 15 * (1 - progress);
  } else if (state === 'slamming') {
    scale = 0.96; // squished on impact!
    opacity = 1.0;
    shadowBlur = 1;
    shadowOffset = 1;
  } else if (state === 'recovering') {
    const progress = timer / swatter.recoverDuration;
    scale = 0.96 + progress * 0.34; // lifts up
    opacity = 1.0 - progress * 0.6; // fades out
    shadowBlur = 1 + progress * 10;
    shadowOffset = 1 + progress * 10;
  }

  // Draw Warning Reticle on ground when charging
  if (state === 'warning') {
    ctx.restore(); // Exit swatter transform
    ctx.save();
    ctx.translate(x, y);

    const warnProgress = timer / swatter.warningDuration;
    const pulse = 1 + Math.sin(timer * 0.25) * 0.08;

    // Outer warning ring
    ctx.strokeStyle = type === 'giant' ? 'rgba(239, 68, 68, 0.8)' : 'rgba(249, 115, 22, 0.7)';
    ctx.lineWidth = type === 'giant' ? 4 : 2;
    ctx.beginPath();
    ctx.arc(0, 0, radius * pulse, 0, Math.PI * 2);
    ctx.stroke();

    // Growing fill warning indicator
    ctx.fillStyle = type === 'giant' ? `rgba(239, 68, 68, ${0.1 + warnProgress * 0.25})` : `rgba(249, 115, 22, ${0.08 + warnProgress * 0.22})`;
    ctx.beginPath();
    ctx.arc(0, 0, radius * warnProgress, 0, Math.PI * 2);
    ctx.fill();

    // Flashing target lines
    ctx.strokeStyle = type === 'giant' ? 'rgba(239, 68, 68, 0.9)' : 'rgba(249, 115, 22, 0.8)';
    ctx.lineWidth = 1.5;
    const retLen = radius * 0.4;
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(radius * 0.7, 0);
      ctx.lineTo(radius * 1.1, 0);
      ctx.stroke();
    }

    // "ОПАСНО" or "ВНИМАНИЕ" text for Giant
    if (type === 'giant' && Math.floor(timer / 8) % 2 === 0) {
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ГРУППОВОЙ УДАР!', 0, -radius - 12);
    } else if (type === 'sweep' && Math.floor(timer / 8) % 2 === 0) {
      ctx.fillStyle = '#eab308';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('РАЗМАХ!', 0, -radius - 12);
    }

    ctx.restore();
    
    // Re-enter swatter transform for drawing the floating swatter shadow
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(swatter.angle);
  }

  // Draw Actual Swatter Body
  ctx.globalAlpha = opacity;
  
  // Outer shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = shadowBlur;
  ctx.shadowOffsetX = shadowOffset;
  ctx.shadowOffsetY = shadowOffset + (state === 'warning' ? 10 : 0);

  // Set colors according to swatter type
  let meshColor = '#1e3a8a'; // deep blue
  let borderColor = '#2563eb'; // vibrant blue
  let handleColor = '#475569'; // slate grey
  
  if (type === 'fast') {
    meshColor = '#701a75'; // magenta/purple
    borderColor = '#d946ef';
  } else if (type === 'giant') {
    meshColor = '#7f1d1d'; // dark red
    borderColor = '#ef4444';
  } else if (type === 'sweep') {
    meshColor = '#065f46'; // dark green
    borderColor = '#10b981';
  } else if (type === 'cross') {
    meshColor = '#854d0e'; // golden amber
    borderColor = '#eab308';
  }

  // 1. Draw LONG Handle
  ctx.fillStyle = handleColor;
  const handleWidth = radius * 0.15;
  const handleHeight = radius * 2.8;
  ctx.fillRect(-handleWidth / 2, radius * 0.8, handleWidth, handleHeight);

  // Metal hinge clip connecting handle to grid
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(-handleWidth * 1.3, radius * 0.7, handleWidth * 2.6, radius * 0.2);

  // 2. Swatter Grid/Head (Rectangular frame with rounded corners)
  const swWidth = radius * 1.5;
  const swHeight = radius * 1.8;
  const swY = -swHeight + radius * 0.7; // sits above the pivot

  ctx.lineWidth = radius * 0.1;
  ctx.strokeStyle = borderColor;
  ctx.fillStyle = meshColor;

  // Draw Swatter Head Background
  ctx.beginPath();
  roundRect(ctx, -swWidth / 2, swY, swWidth, swHeight, radius * 0.25);
  ctx.fill();
  ctx.stroke();

  // Draw Grid Lines (Mesh net pattern)
  ctx.save();
  // Clip to the grid head shape so lines don't bleed out
  ctx.beginPath();
  roundRect(ctx, -swWidth / 2, swY, swWidth, swHeight, radius * 0.25);
  ctx.clip();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.lineWidth = 1.5;
  
  // Vertical grid wires
  const gridSpacing = radius * 0.16;
  for (let gx = -swWidth / 2; gx < swWidth / 2; gx += gridSpacing) {
    ctx.beginPath();
    ctx.moveTo(gx, swY);
    ctx.lineTo(gx, swY + swHeight);
    ctx.stroke();
  }
  // Horizontal grid wires
  for (let gy = swY; gy < swY + swHeight; gy += gridSpacing) {
    ctx.beginPath();
    ctx.moveTo(-swWidth / 2, gy);
    ctx.lineTo(swWidth / 2, gy);
    ctx.stroke();
  }

  // Draw reinforced plastic ribs
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = radius * 0.05;
  ctx.beginPath();
  // Diagonal cross supports
  ctx.moveTo(-swWidth / 2, swY);
  ctx.lineTo(swWidth / 2, swY + swHeight);
  ctx.moveTo(swWidth / 2, swY);
  ctx.lineTo(-swWidth / 2, swY + swHeight);
  ctx.stroke();

  ctx.restore();

  // Face elements on the swatter (giving it a menacing or comic feel!)
  // Two angry white eye slots
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  const eyeR = radius * 0.12;
  const eyeY = swY + swHeight * 0.4;
  ctx.beginPath();
  ctx.arc(-swWidth * 0.22, eyeY, eyeR, 0, Math.PI * 2);
  ctx.arc(swWidth * 0.22, eyeY, eyeR, 0, Math.PI * 2);
  ctx.fill();

  // Angry pupil slits
  ctx.fillStyle = borderColor;
  ctx.fillRect(-swWidth * 0.25, eyeY - 2, swWidth * 0.06, 4);
  ctx.fillRect(swWidth * 0.19, eyeY - 2, swWidth * 0.06, 4);

  ctx.restore();
}

// Canvas roundRect helper for backwards compatibility
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
}

// Draw Food item on canvas
export function drawFood(ctx: CanvasRenderingContext2D, food: Food) {
  const { x, y, type, radius, pulseTimer } = food;
  
  ctx.save();
  ctx.translate(x, y);

  // Pulse scaling
  const scale = 1 + Math.sin(pulseTimer * 0.1) * 0.08;
  ctx.scale(scale, scale);

  // Soft floor shadow
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath();
  ctx.ellipse(0, radius * 0.8, radius * 0.8, radius * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();

  if (type === 'sugar') {
    // Beautiful translucent sugar cube
    ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
    ctx.shadowBlur = 4;

    const size = radius * 1.5;
    ctx.fillStyle = '#f8fafc'; // light white
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;

    // Isometric-looking cube
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.5);
    ctx.lineTo(size * 0.6, -size * 0.2);
    ctx.lineTo(0, size * 0.1);
    ctx.lineTo(-size * 0.6, -size * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Front-Right face
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(0, size * 0.1);
    ctx.lineTo(size * 0.6, -size * 0.2);
    ctx.lineTo(size * 0.6, size * 0.4);
    ctx.lineTo(0, size * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Front-Left face
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(0, size * 0.1);
    ctx.lineTo(-size * 0.6, -size * 0.2);
    ctx.lineTo(-size * 0.6, size * 0.4);
    ctx.lineTo(0, size * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

  } else if (type === 'candy') {
    // Red and White striped wrapped candy
    ctx.fillStyle = '#ef4444'; // red base
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.7, 0, Math.PI * 2);
    ctx.fill();

    // White candy stripes
    ctx.fillStyle = '#ffffff';
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.7, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillRect(-radius * 0.6, -radius, radius * 0.25, radius * 2);
    ctx.fillRect(0, -radius, radius * 0.25, radius * 2);
    ctx.fillRect(radius * 0.4, -radius, radius * 0.25, radius * 2);
    ctx.restore();

    // Wrapper tails
    ctx.fillStyle = '#fca5a5';
    ctx.beginPath();
    // Left tail
    ctx.moveTo(-radius * 0.6, 0);
    ctx.lineTo(-radius * 1.2, -radius * 0.45);
    ctx.lineTo(-radius * 1.1, 0);
    ctx.lineTo(-radius * 1.2, radius * 0.45);
    ctx.closePath();
    ctx.fill();

    // Right tail
    ctx.beginPath();
    ctx.moveTo(radius * 0.6, 0);
    ctx.lineTo(radius * 1.2, -radius * 0.45);
    ctx.lineTo(radius * 1.1, 0);
    ctx.lineTo(radius * 1.2, radius * 0.45);
    ctx.closePath();
    ctx.fill();

  } else if (type === 'jam') {
    // Elegant tiny glass jar of jam with a purple label
    ctx.fillStyle = 'rgba(219, 39, 119, 0.9)'; // magenta raspberry jam
    ctx.fillRect(-radius * 0.65, -radius * 0.6, radius * 1.3, radius * 1.3);
    
    // Glass highlights
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.fillRect(-radius * 0.55, -radius * 0.5, radius * 0.15, radius * 1.0);

    // Lid (golden jar lid)
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(-radius * 0.75, -radius * 0.85, radius * 1.5, radius * 0.25);

    // Label on jar
    ctx.fillStyle = '#6b21a8'; // dark purple
    ctx.fillRect(-radius * 0.45, -radius * 0.2, radius * 0.9, radius * 0.5);
    
    // Label icon (sugar drop)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, radius * 0.1, radius * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// Draw Particle on canvas
export function drawParticle(ctx: CanvasRenderingContext2D, p: Particle) {
  ctx.save();
  ctx.globalAlpha = p.alpha;

  if (p.type === 'text') {
    // Beautiful floating score text with stroke outline
    ctx.fillStyle = p.color;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3;
    ctx.font = `bold ${p.fontSize || 14}px 'Plus Jakarta Sans', system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeText(p.text || '', p.x, p.y);
    ctx.fillText(p.text || '', p.x, p.y);
  } 
  else if (p.type === 'ring') {
    // Expanding warning ring
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 3 * p.alpha;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.stroke();
  } 
  else if (p.type === 'dash') {
    // Glowing dash tail (circles of fading fly skin colors)
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  else {
    // Dust or shattering debris
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// Handles localstorage high scores
export function getHighScores(difficulty: Difficulty): HighScore[] {
  if (typeof window === 'undefined') return [];
  try {
    const scores = localStorage.getItem(`fly_game_high_scores_${difficulty}`);
    return scores ? JSON.parse(scores) : [];
  } catch (e) {
    return [];
  }
}

export function saveHighScore(name: string, score: number, difficulty: Difficulty): HighScore[] {
  if (typeof window === 'undefined') return [];
  const current = getHighScores(difficulty);
  const newScore: HighScore = {
    name: name.trim() || 'Муха-Аноним',
    score,
    difficulty,
    date: new Date().toLocaleDateString('ru-RU')
  };
  
  current.push(newScore);
  // Sort descending
  current.sort((a, b) => b.score - a.score);
  // Keep top 10
  const top10 = current.slice(0, 10);
  localStorage.setItem(`fly_game_high_scores_${difficulty}`, JSON.stringify(top10));
  return top10;
}
