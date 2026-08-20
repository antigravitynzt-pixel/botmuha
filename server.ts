import express from "express";
import http from "http";
import path from "path";
import { WebSocketServer, WebSocket } from "ws";

const app = express();
const server = http.createServer(app);
const PORT = 3000;

app.use(express.json());

// API: Healthcheck
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date() });
});

// Real-time Multiplayer State
interface Player {
  id: string;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  skin: string;
  lives: number;
  score: number;
  role: "fly" | "swatter";
  isReady: boolean;
  dashActive: boolean;
}

interface Room {
  code: string;
  mode: "coop" | "versus";
  status: "lobby" | "playing" | "gameover";
  players: Record<string, Player>;
  foods: Array<{ id: string; x: number; y: number; type: string; radius: number }>;
  swatters: Array<{
    id: string;
    type: string;
    state: string;
    x: number;
    y: number;
    targetX: number;
    targetY: number;
    timer: number;
    warningDuration: number;
    strikeDuration: number;
    slamDuration: number;
    recoverDuration: number;
    radius: number;
  }>;
}

const rooms: Record<string, Room> = {};

// Helper: Generate Room Code
function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// WebSocket Server attached to the same HTTP server
const wss = new WebSocketServer({ noServer: true });

// Handle WebSocket upgrade
server.on("upgrade", (request, socket, head) => {
  const pathname = new URL(request.url || "", `http://${request.headers.host}`).pathname;
  if (pathname === "/ws" || pathname === "/") {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  } else {
    socket.destroy();
  }
});

const clients: Map<WebSocket, { roomId: string; playerId: string }> = new Map();

wss.on("connection", (ws: WebSocket) => {
  ws.on("message", (messageStr: string) => {
    try {
      const data = JSON.parse(messageStr);
      const { type, payload } = data;

      switch (type) {
        case "create_room": {
          const code = generateRoomCode();
          const playerId = payload.playerId || Math.random().toString(36).substring(2, 9);
          
          rooms[code] = {
            code,
            mode: payload.mode || "coop",
            status: "lobby",
            players: {
              [playerId]: {
                id: playerId,
                name: payload.name || "Хозяин мух",
                x: 400,
                y: 300,
                vx: 0,
                vy: 0,
                angle: 0,
                skin: payload.skin || "classic",
                lives: payload.mode === "versus" ? 3 : 3,
                score: 0,
                role: payload.mode === "versus" ? "fly" : "fly",
                isReady: true,
                dashActive: false,
              }
            },
            foods: [],
            swatters: [],
          };

          clients.set(ws, { roomId: code, playerId });
          ws.send(JSON.stringify({ type: "room_created", payload: { code, roomId: code, playerId, room: rooms[code] } }));
          break;
        }

        case "join_room": {
          const code = (payload.code || "").toUpperCase().trim();
          const playerId = payload.playerId || Math.random().toString(36).substring(2, 9);
          
          const room = rooms[code];
          if (!room) {
            ws.send(JSON.stringify({ type: "error", payload: "Комната не найдена!" }));
            return;
          }

          if (room.status !== "lobby") {
            ws.send(JSON.stringify({ type: "error", payload: "Игра уже началась!" }));
            return;
          }

          if (Object.keys(room.players).length >= 6) {
            ws.send(JSON.stringify({ type: "error", payload: "Комната заполнена!" }));
            return;
          }

          // If versus mode, the second player becomes the Swatter
          let assignedRole: "fly" | "swatter" = "fly";
          if (room.mode === "versus") {
            const hasSwatter = Object.values(room.players).some(p => p.role === "swatter");
            assignedRole = hasSwatter ? "fly" : "swatter";
          }

          room.players[playerId] = {
            id: playerId,
            name: payload.name || "Гость жужжащий",
            x: 400,
            y: 300,
            vx: 0,
            vy: 0,
            angle: 0,
            skin: payload.skin || "classic",
            lives: 3,
            score: 0,
            role: assignedRole,
            isReady: false,
            dashActive: false,
          };

          clients.set(ws, { roomId: code, playerId });
          
          // Broadcast update to all players in the room
          broadcastToRoom(code, { type: "room_updated", payload: room });
          break;
        }

        case "ready_state": {
          const clientInfo = clients.get(ws);
          if (!clientInfo) return;
          const { roomId, playerId } = clientInfo;
          const room = rooms[roomId];
          if (!room || !room.players[playerId]) return;

          room.players[playerId].isReady = payload.isReady;
          broadcastToRoom(roomId, { type: "room_updated", payload: room });
          break;
        }

        case "start_game": {
          const clientInfo = clients.get(ws);
          if (!clientInfo) return;
          const { roomId } = clientInfo;
          const room = rooms[roomId];
          if (!room) return;

          room.status = "playing";
          
          // Generate initial food items
          room.foods = [];
          for (let i = 0; i < 6; i++) {
            room.foods.push({
              id: Math.random().toString(36).substring(2, 9),
              x: 100 + Math.random() * 800,
              y: 100 + Math.random() * 550,
              type: Math.random() > 0.85 ? "jam" : Math.random() > 0.6 ? "candy" : "sugar",
              radius: 12,
            });
          }

          broadcastToRoom(roomId, { type: "game_started", payload: room });
          break;
        }

        case "player_update": {
          const clientInfo = clients.get(ws);
          if (!clientInfo) return;
          const { roomId, playerId } = clientInfo;
          const room = rooms[roomId];
          if (!room || !room.players[playerId] || room.status !== "playing") return;

          const player = room.players[playerId];
          player.x = payload.x;
          player.y = payload.y;
          player.vx = payload.vx || 0;
          player.vy = payload.vy || 0;
          player.angle = payload.angle;
          player.dashActive = !!payload.dashActive;
          
          // Broadcast fast updates as lightweight positions
          broadcastToRoom(roomId, { 
            type: "position_update", 
            payload: { playerId, x: player.x, y: player.y, vx: player.vx, vy: player.vy, angle: player.angle, dashActive: player.dashActive } 
          }, ws); // exclude self to save downstream bandwidth
          break;
        }

        case "collect_food": {
          const clientInfo = clients.get(ws);
          if (!clientInfo) return;
          const { roomId, playerId } = clientInfo;
          const room = rooms[roomId];
          if (!room || room.status !== "playing") return;

          const { foodId } = payload;
          const initialFoodLen = room.foods.length;
          room.foods = room.foods.filter(f => f.id !== foodId);

          if (room.foods.length < initialFoodLen) {
            // Player successfully collected it
            const p = room.players[playerId];
            if (p) {
              p.score += payload.points || 10;
            }

            // Spawn replacement food
            const newFood = {
              id: Math.random().toString(36).substring(2, 9),
              x: 100 + Math.random() * 800,
              y: 100 + Math.random() * 550,
              type: Math.random() > 0.85 ? "jam" : Math.random() > 0.6 ? "candy" : "sugar",
              radius: 12,
            };
            room.foods.push(newFood);

            broadcastToRoom(roomId, { 
              type: "food_collected", 
              payload: { foodId, collectedBy: playerId, score: p ? p.score : 0, newFood } 
            });
          }
          break;
        }

        case "spawn_swatter": {
          // In Versus mode, Swatter player triggers strike warning at target coordinates
          const clientInfo = clients.get(ws);
          if (!clientInfo) return;
          const { roomId, playerId } = clientInfo;
          const room = rooms[roomId];
          if (!room || room.status !== "playing") return;

          const swatterData = {
            id: Math.random().toString(36).substring(2, 9),
            type: payload.type || "standard",
            state: "warning",
            x: payload.x,
            y: payload.y,
            targetX: payload.x,
            targetY: payload.y,
            timer: 0,
            warningDuration: payload.warningDuration || 45,
            strikeDuration: 10,
            slamDuration: 15,
            recoverDuration: 20,
            radius: payload.radius || 50,
          };

          room.swatters.push(swatterData);
          broadcastToRoom(roomId, { type: "swatter_spawned", payload: swatterData });
          break;
        }

        case "swatter_state_change": {
          // Sync server-side status of swatters
          const clientInfo = clients.get(ws);
          if (!clientInfo) return;
          const { roomId } = clientInfo;
          const room = rooms[roomId];
          if (!room) return;

          const { swatterId, state } = payload;
          const sw = room.swatters.find(s => s.id === swatterId);
          if (sw) {
            sw.state = state;
            if (state === "slamming") {
              // Deal damage or compute hits on server/host
              broadcastToRoom(roomId, { type: "swatter_slam", payload: { swatterId } });
            } else if (state === "recovering") {
              // Done
            }
          }
          break;
        }

        case "swatter_removed": {
          const clientInfo = clients.get(ws);
          if (!clientInfo) return;
          const { roomId } = clientInfo;
          const room = rooms[roomId];
          if (!room) return;

          room.swatters = room.swatters.filter(s => s.id !== payload.swatterId);
          break;
        }

        case "player_hit": {
          const clientInfo = clients.get(ws);
          if (!clientInfo) return;
          const { roomId, playerId } = clientInfo;
          const room = rooms[roomId];
          if (!room || room.status !== "playing") return;

          const hitPlayerId = payload.hitPlayerId || playerId;
          const p = room.players[hitPlayerId];
          if (p && p.lives > 0) {
            p.lives -= 1;
            broadcastToRoom(roomId, { type: "player_damaged", payload: { playerId: hitPlayerId, lives: p.lives } });

            // Check if all flies are dead
            const activeFlies = Object.values(room.players).filter(pl => pl.role === "fly" && pl.lives > 0);
            if (activeFlies.length === 0) {
              room.status = "gameover";
              broadcastToRoom(roomId, { type: "game_over", payload: { winner: room.mode === "versus" ? "swatter" : "none", room } });
            }
          }
          break;
        }

        case "restart_multiplayer": {
          const clientInfo = clients.get(ws);
          if (!clientInfo) return;
          const { roomId } = clientInfo;
          const room = rooms[roomId];
          if (!room) return;

          room.status = "lobby";
          room.foods = [];
          room.swatters = [];
          Object.values(room.players).forEach(p => {
            p.lives = 3;
            p.score = 0;
            p.isReady = p.id === clientInfo.playerId; // host remains ready
          });

          broadcastToRoom(roomId, { type: "room_updated", payload: room });
          break;
        }
      }
    } catch (e) {
      console.error("WS error parsing message:", e);
    }
  });

  ws.on("close", () => {
    const clientInfo = clients.get(ws);
    if (clientInfo) {
      const { roomId, playerId } = clientInfo;
      const room = rooms[roomId];
      if (room) {
        delete room.players[playerId];
        clients.delete(ws);

        if (Object.keys(room.players).length === 0) {
          delete rooms[roomId];
        } else {
          broadcastToRoom(roomId, { type: "room_updated", payload: room });
        }
      }
    }
  });
});

// Helper: Broadcast to everyone in room
function broadcastToRoom(roomId: string, message: any, excludeWs?: WebSocket) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client !== excludeWs) {
      const info = clients.get(client);
      if (info && info.roomId === roomId) {
        client.send(JSON.stringify(message));
      }
    }
  });
}

// =============================================================================
// TELEGRAM BOT & CLOUD DATABASE COOPERATION ENGINE
// =============================================================================
import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBixMGgfSOMLscYB9MOTWzaxe6DrPYB1w8",
  authDomain: "gen-lang-client-0036581697.firebaseapp.com",
  projectId: "gen-lang-client-0036581697",
  storageBucket: "gen-lang-client-0036581697.firebasestorage.app",
  messagingSenderId: "174280920444",
  appId: "1:174280920444:web:5fa4c5ef1bea872575e8f9"
};
const databaseId = "ai-studio-015788b1-7d82-4a81-9a69-d048d3d46829";

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, databaseId);

const TELEGRAM_BOT_TOKEN = "8651219160:AAGkSmXYV-Gd07l4xlbA3KtcW5Du1MlDOwk";

const SKINS_INFO: Record<string, { name: string; desc: string }> = {
  classic: { name: "Обычная муха", desc: "Просто муха, любящая сладкое." },
  cool: { name: "Крутая муха", desc: "В шикарных солнцезащитных очках." },
  gentleman: { name: "Джентльмен", desc: "Носит благородный цилиндр и монокль." },
  cyber: { name: "Кибер-муха", desc: "Аугментированная неоновая муха будущего." },
  ninja: { name: "Муха-ниндзя", desc: "Двигается скрытно в тени." },
  golden: { name: "Золотая муха", desc: "Премиальный блеск чистого золота." },
  ironman: { name: "Железный Человек", desc: "Реактивный костюм со светящимся реактором!" },
  spider: { name: "Муха-Паук", desc: "Красно-синий герой в белой маске-паутине!" },
  hulk: { name: "Халк", desc: "Зеленый мускулистый громила с черными яростными бровями!" },
  zombie: { name: "Зомби", desc: "Восставшая из мертвых муха с открытым розовым мозгом!" },
  pirate: { name: "Пират", desc: "Морской разбойник в черной треуголке и пиратской повязке!" }
};

const SKIN_EMOJIS: Record<string, string> = {
  classic: "🪰",
  cool: "🕶️",
  gentleman: "🎩",
  cyber: "👽",
  ninja: "🥷",
  golden: "👑",
  ironman: "🤖",
  spider: "🕷️",
  hulk: "🤢",
  zombie: "🧟",
  pirate: "🏴‍☠️"
};

const MAIN_KEYBOARD = {
  keyboard: [
    [
      { text: "🎁 Бесплатный Кейс" },
      { text: "👑 Платный Кейс (100 🍬)" }
    ],
    [
      { text: "👤 Мой Профиль" },
      { text: "❓ Справка" }
    ]
  ],
  resize_keyboard: true,
  one_time_keyboard: false
};

async function sendTelegramMessage(chatId: number, text: string, replyMarkup?: any) {
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const body: any = { chat_id: chatId, text, parse_mode: "HTML" };
    if (replyMarkup) {
      body.reply_markup = replyMarkup;
    }
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
  } catch (e) {
    console.error("Failed to send telegram message:", e);
  }
}

async function sendTelegramMessageWithId(chatId: number, text: string, replyMarkup?: any): Promise<number | null> {
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const body: any = { chat_id: chatId, text, parse_mode: "HTML" };
    if (replyMarkup) {
      body.reply_markup = replyMarkup;
    }
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (res.ok) {
      const data = await res.json() as any;
      return data.result?.message_id || null;
    }
  } catch (e) {
    console.error("Failed to send telegram message with ID:", e);
  }
  return null;
}

async function editTelegramMessage(chatId: number, messageId: number, text: string) {
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`;
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, message_id: messageId, text, parse_mode: "HTML" })
    });
  } catch (e) {
    console.error("Failed to edit telegram message:", e);
  }
}

async function handleTelegramUpdate(chatId: number, rawText: string, username: string) {
  const usersRef = collection(db, "users");
  const text = rawText.trim();

  // Handle Command Fallbacks for Reply Keyboard Buttons
  let command = text;
  if (text === "🎁 Бесплатный Кейс") {
    command = "/open_free";
  } else if (text === "👑 Платный Кейс (100 🍬)") {
    command = "/open_paid";
  } else if (text === "👤 Мой Профиль") {
    command = "/profile";
  } else if (text === "❓ Справка") {
    command = "/start";
  }

  if (command.startsWith("/start")) {
    await sendTelegramMessage(
      chatId,
      `👋 <b>Привет, ${username}!</b> Добро пожаловать в Муха Кейс Бот! 🪰\n\n` +
      `Здесь вы можете выбивать кейсы и получать уникальные облики прямо в Telegram, синхронизируя их со своим аккаунтом в игре.\n\n` +
      `🔑 Чтобы связать аккаунт, зайдите в игру, откройте вкладку <b>'Кейсы'</b>, скопируйте свой <b>6-значный код привязки</b> и отправьте его сюда.`
    );
    return;
  }

  // Check if text is a 6-digit code
  if (/^\d{6}$/.test(command)) {
    try {
      const q = query(usersRef, where("telegramLinkCode", "==", command));
      const querySnap = await getDocs(q);
      
      if (querySnap.empty) {
        await sendTelegramMessage(chatId, "❌ <b>Код привязки не найден.</b>\n\nПроверьте код в игре во вкладке 'Кейсы' и отправьте его еще раз.");
        return;
      }

      const userDoc = querySnap.docs[0];
      const userData = userDoc.data();
      const userRef = doc(db, "users", userDoc.id);

      await updateDoc(userRef, {
        telegramLinkedId: String(chatId),
        telegramLinkCode: "" // clear after successful linking
      });

      await sendTelegramMessage(
        chatId,
        `✅ <b>Аккаунт успешно привязан!</b>\n\n` +
        `👤 Игрок: <b>${userData.displayName}</b>\n` +
        `🍬 Сахар: <b>${userData.sugars ?? 0}</b>\n\n` +
        `Теперь вам доступны кнопки меню ниже для управления вашим аккаунтом! Нажмите кнопку, чтобы сыграть!`,
        MAIN_KEYBOARD
      );
    } catch (err) {
      console.error("Error linking telegram account:", err);
      await sendTelegramMessage(chatId, "❌ Произошла ошибка при связывании аккаунта. Попробуйте позже.");
    }
    return;
  }

  // Find linked user
  try {
    const q = query(usersRef, where("telegramLinkedId", "==", String(chatId)));
    const querySnap = await getDocs(q);

    if (querySnap.empty) {
      await sendTelegramMessage(
        chatId,
        `❌ <b>Вы еще не связали свой аккаунт.</b>\n\n` +
        `Чтобы играть и выбивать кейсы, скопируйте 6-значный код привязки из игры (вкладка 'Кейсы') и отправьте его сюда.`
      );
      return;
    }

    const userDoc = querySnap.docs[0];
    const userData = userDoc.data();
    const userRef = doc(db, "users", userDoc.id);

    if (command === "/profile") {
      const unlocked = userData.unlockedSkins || ["classic"];
      const skinNamesList = unlocked.map((s: string) => `${SKIN_EMOJIS[s] || "🪰"} ${SKINS_INFO[s]?.name || s}`).join("\n");

      await sendTelegramMessage(
        chatId,
        `👤 <b>Ваш Профиль:</b>\n\n` +
        `• Игрок: <b>${userData.displayName}</b>\n` +
        `• Баланс: <b>${userData.sugars ?? 0} 🍬 сахара</b>\n` +
        `• Бесплатных кейсов на сегодня: <b>${userData.dailyCasesLeft ?? 0} шт.</b>\n\n` +
        `<b>Ваши скины (${unlocked.length} шт.):</b>\n${skinNamesList}`,
        MAIN_KEYBOARD
      );
    } 
    else if (command === "/open_free") {
      const dailyCases = userData.dailyCasesLeft ?? 0;
      if (dailyCases <= 0) {
        await sendTelegramMessage(
          chatId,
          "❌ <b>У вас больше нет бесплатных кейсов на сегодня!</b>\n\nВы можете купить кейс за 100 сахара с помощью кнопки ниже.",
          MAIN_KEYBOARD
        );
        return;
      }

      const currentlyUnlocked = userData.unlockedSkins || ["classic"];
      const casePool = ["cool", "gentleman", "cyber", "ninja", "golden", "spider", "hulk", "zombie", "pirate"];
      const lockedSkins = casePool.filter(s => !currentlyUnlocked.includes(s));

      let wonSkin: string | null = null;
      let wonSugars = 0;

      const roll = Math.random();
      if (roll < 0.6 && lockedSkins.length > 0) {
        wonSkin = lockedSkins[Math.floor(Math.random() * lockedSkins.length)];
      } else {
        const prizes = [30, 50, 100, 150, 200, 300, 500];
        wonSugars = prizes[Math.floor(Math.random() * prizes.length)];
      }

      const updates: any = {
        dailyCasesLeft: Math.max(0, dailyCases - 1)
      };

      let resultMsg = "";
      if (wonSkin) {
        updates.unlockedSkins = [...currentlyUnlocked, wonSkin];
        resultMsg = `🎉 <b>ВЫПАЛ СУПЕР СКИН!</b>\n\n${SKIN_EMOJIS[wonSkin] || "🪰"} <b>${SKINS_INFO[wonSkin]?.name}</b>\n<i>${SKINS_INFO[wonSkin]?.desc}</i>`;
      } else {
        updates.sugars = (userData.sugars ?? 0) + wonSugars;
        resultMsg = `🎉 <b>ВЫИГРЫШ САХАРА!</b>\n\n🍬 Получено: <b>+${wonSugars} сахара!</b>`;
      }

      await updateDoc(userRef, updates);

      // Start the animated roulette edits!
      const msgId = await sendTelegramMessageWithId(
        chatId,
        `🎰 <b>ЗАПУСК КЕЙСА...</b>\n\n` +
        `[ 🕶️ | 🥷 | 🧟 ]\n\n` +
        `<i>Рулетка начинает разгоняться...</i>`,
        MAIN_KEYBOARD
      );

      if (msgId) {
        await new Promise(resolve => setTimeout(resolve, 550));
        await editTelegramMessage(
          chatId,
          msgId,
          `🎰 <b>КРУТИМ РУЛЕТКУ...</b>\n\n` +
          `[ 🍬 50 | 🏴‍☠️ | 👽 ]\n\n` +
          `<i>Высокая скорость вращения!</i>`
        );

        await new Promise(resolve => setTimeout(resolve, 550));
        await editTelegramMessage(
          chatId,
          msgId,
          `🎰 <b>РУЛЕТКА ЗАМЕДЛЯЕТСЯ...</b>\n\n` +
          `[ 🎩 | 👑 | 🍬 200 ]\n\n` +
          `<i>Снижение скорости, барабаны гудят...</i>`
        );

        await new Promise(resolve => setTimeout(resolve, 550));
        await editTelegramMessage(
          chatId,
          msgId,
          `🎰 <b>ПОЧТИ ОСТАНОВИЛАСЬ...</b>\n\n` +
          `[ 🕷️ | ${wonSkin ? SKIN_EMOJIS[wonSkin] : "🍬"} | 🤖 ]\n\n` +
          `<i>Финальный щелчок... Что же выпадет?</i>`
        );

        await new Promise(resolve => setTimeout(resolve, 600));

        // Now edit to reveal the final reward details!
        await editTelegramMessage(
          chatId,
          msgId,
          `🎰 <b>РУЛЕТКА ОСТАНОВИЛАСЬ!</b>\n\n` +
          `${resultMsg}\n\n` +
          `Осталось бесплатных кейсов: <b>${updates.dailyCasesLeft} шт.</b>\n` +
          `Зайдите в игру, чтобы примерить новинки!`
        );
      } else {
        // Fallback message if msgId failed
        await sendTelegramMessage(
          chatId,
          `🎁 <b>Вы открыли Бесплатный Кейс!</b>\n\n` +
          `${resultMsg}\n\n` +
          `Осталось бесплатных кейсов: <b>${updates.dailyCasesLeft} шт.</b>`,
          MAIN_KEYBOARD
        );
      }
    } 
    else if (command === "/open_paid") {
      const sugars = userData.sugars ?? 0;
      if (sugars < 100) {
        await sendTelegramMessage(
          chatId,
          `❌ <b>Недостаточно сахара!</b>\n\nКейс стоит 100 сахара (у вас: ${sugars} 🍬).\nНакопите сахар в одиночной игре и возвращайтесь!`,
          MAIN_KEYBOARD
        );
        return;
      }

      const currentlyUnlocked = userData.unlockedSkins || ["classic"];
      const casePool = ["cool", "gentleman", "cyber", "ninja", "golden", "spider", "hulk", "zombie", "pirate"];
      const lockedSkins = casePool.filter(s => !currentlyUnlocked.includes(s));

      let wonSkin: string | null = null;
      let wonSugars = 0;

      const roll = Math.random();
      if (roll < 0.6 && lockedSkins.length > 0) {
        wonSkin = lockedSkins[Math.floor(Math.random() * lockedSkins.length)];
      } else {
        const prizes = [30, 50, 100, 150, 200, 300, 500];
        wonSugars = prizes[Math.floor(Math.random() * prizes.length)];
      }

      const updates: any = {
        sugars: sugars - 100
      };

      let resultMsg = "";
      if (wonSkin) {
        updates.unlockedSkins = [...currentlyUnlocked, wonSkin];
        resultMsg = `🎉 <b>ВЫПАЛ СУПЕР СКИН!</b>\n\n${SKIN_EMOJIS[wonSkin] || "🪰"} <b>${SKINS_INFO[wonSkin]?.name}</b>\n<i>${SKINS_INFO[wonSkin]?.desc}</i>`;
      } else {
        updates.sugars = updates.sugars + wonSugars;
        resultMsg = `🎉 <b>ВЫИГРЫШ САХАРА!</b>\n\n🍬 Получено: <b>+${wonSugars} сахара!</b>`;
      }

      await updateDoc(userRef, updates);

      // Start the animated roulette edits!
      const msgId = await sendTelegramMessageWithId(
        chatId,
        `🎰 <b>ЗАПУСК КЕЙСА...</b>\n\n` +
        `[ 🕶️ | 🥷 | 🧟 ]\n\n` +
        `<i>Списание 100 🍬 сахара... Рулетка разгоняется!</i>`,
        MAIN_KEYBOARD
      );

      if (msgId) {
        await new Promise(resolve => setTimeout(resolve, 550));
        await editTelegramMessage(
          chatId,
          msgId,
          `🎰 <b>КРУТИМ РУЛЕТКУ...</b>\n\n` +
          `[ 🍬 50 | 🏴‍☠️ | 👽 ]\n\n` +
          `<i>Высокая скорость вращения!</i>`
        );

        await new Promise(resolve => setTimeout(resolve, 550));
        await editTelegramMessage(
          chatId,
          msgId,
          `🎰 <b>РУЛЕТКА ЗАМЕДЛЯЕТСЯ...</b>\n\n` +
          `[ 🎩 | 👑 | 🍬 200 ]\n\n` +
          `<i>Снижение скорости, барабаны гудят...</i>`
        );

        await new Promise(resolve => setTimeout(resolve, 550));
        await editTelegramMessage(
          chatId,
          msgId,
          `🎰 <b>ПОЧТИ ОСТАНОВИЛАСЬ...</b>\n\n` +
          `[ 🕷️ | ${wonSkin ? SKIN_EMOJIS[wonSkin] : "🍬"} | 🤖 ]\n\n` +
          `<i>Финальный щелчок... Что же выпадет?</i>`
        );

        await new Promise(resolve => setTimeout(resolve, 600));

        // Now edit to reveal the final reward details!
        await editTelegramMessage(
          chatId,
          msgId,
          `🎰 <b>РУЛЕТКА ОСТАНОВИЛАСЬ!</b>\n\n` +
          `${resultMsg}\n\n` +
          `Ваш новый баланс: <b>${updates.sugars} сахара 🍬</b>\n` +
          `Проверьте новый облик в гардеробе игры!`
        );
      } else {
        // Fallback message if msgId failed
        await sendTelegramMessage(
          chatId,
          `🎁 <b>Вы приобрели Кейс за 100 сахара!</b>\n\n` +
          `${resultMsg}\n\n` +
          `Ваш новый баланс: <b>${updates.sugars} сахара 🍬</b>`,
          MAIN_KEYBOARD
        );
      }
    } 
    else {
      await sendTelegramMessage(
        chatId,
        `❓ <b>Неизвестная команда.</b>\n\n` +
        `Используйте удобные кнопки меню ниже!`,
        MAIN_KEYBOARD
      );
    }
  } catch (err) {
    console.error("Error processing telegram command:", err);
    await sendTelegramMessage(chatId, "❌ Произошла ошибка при обработке команды. Попробуйте еще раз.");
  }
}

async function runTelegramBot() {
  let offset = 0;
  console.log("Telegram Bot engine polling started successfully with offset " + offset);

  while (true) {
    try {
      const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${offset}&timeout=30`;
      const res = await fetch(url);
      if (!res.ok) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }
      
      const data = await res.json() as any;
      if (data.ok && data.result) {
        for (const update of data.result) {
          offset = update.update_id + 1;
          
          if (update.message && update.message.text) {
            const chat = update.message.chat;
            const text = update.message.text.trim();
            const username = update.message.from?.first_name || "Игрок";
            
            await handleTelegramUpdate(chat.id, text, username);
          }
        }
      }
    } catch (e) {
      console.error("Error in Telegram Bot loop:", e);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

// Vite middleware for fast development, static delivery in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Fly Fullstack Server running on http://0.0.0.0:${PORT}`);
    // Start polling the Telegram bot
    runTelegramBot();
  });
}

startServer();
