import { useState, useEffect, useRef } from "react";
import { GameState, Difficulty, SkinType, Fly } from "./types";
import { MainMenu } from "./components/MainMenu";
import { GameCanvas } from "./components/GameCanvas";
import { GameUI } from "./components/GameUI";
import { GameOver } from "./components/GameOver";
import { MultiplayerGameCanvas } from "./components/MultiplayerGameCanvas";
import { PaymentModal } from "./components/PaymentModal";
import { Sparkles, ArrowUpRight, Cloud, Wifi, Award, Users, AlertCircle, Play } from "lucide-react";
import { soundManager } from "./components/SoundManager";

// Firebase imports
import { auth, db, signInWithGoogle, logOut, checkAndCreateProfile, UserProfile } from "./lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";

export default function App() {
  const [gameState, setGameState] = useState<any>("menu"); // 'menu' | 'playing' | 'gameover' | 'multiplayer_playing' | 'multiplayer_gameover'
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [selectedSkin, setSelectedSkin] = useState<SkinType>("classic");
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Authentication & Firestore Profile States
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Payment checkout states
  const [activePayment, setActivePayment] = useState<{
    type: "sugar" | "skin" | "topup";
    item: any;
  } | null>(null);

  // Multiplayer Room WebSocket states
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [room, setRoom] = useState<any>(null);
  const [playerId, setPlayerId] = useState<string>("");
  const [multiplayerScores, setMultiplayerScores] = useState<Record<string, number>>({});
  const [multiplayerEnergy, setMultiplayerEnergy] = useState<number>(0);
  const [multiplayerWinner, setMultiplayerWinner] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Real-time local singleplayer gameplay states synced from Canvas loops
  const [score, setScore] = useState<number>(0);
  const [sugarsGathered, setSugarsGathered] = useState<number>(0);
  const [wave, setWave] = useState<number>(1);
  const [nearMisses, setNearMisses] = useState<number>(0);
  const [survivalTime, setSurvivalTime] = useState<number>(0);
  const [flyState, setFlyState] = useState<Fly>({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    radius: 14,
    angle: 0,
    targetAngle: 0,
    skin: "classic",
    dashEnergy: 25,
    dashCooldown: 0,
    dashActiveTime: 0,
    invulnerableTime: 0,
    lives: 3,
    maxLives: 3,
  });

  // 1. Google Authentication listener & cloud synchronizer
  useEffect(() => {
    let unsubscribeFirestore: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Authenticated! Check profile exists
        try {
          const profile = await checkAndCreateProfile(user);
          setUserProfile(profile);
          setPlayerId(user.uid);

          // Establish real-time Firestore database listener to keep balances synced instantly
          if (unsubscribeFirestore) unsubscribeFirestore();
          unsubscribeFirestore = onSnapshot(
            doc(db, "users", user.uid),
            (docSnap) => {
              if (docSnap.exists()) {
                setUserProfile(docSnap.data() as UserProfile);
              }
            },
            (error) => {
              console.warn("onSnapshot sync error (possibly offline):", error);
            }
          );
        } catch (e) {
          console.error("Firebase sync error", e);
        }
      } else {
        // Logged out
        if (unsubscribeFirestore) unsubscribeFirestore();
        setUserProfile(null);
        // Create unique guest ID
        setPlayerId("guest_" + Math.random().toString(36).substring(2, 7));
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, []);

  // Handle Google Login triggers
  const handleSignIn = async () => {
    soundManager.playClick();
    await signInWithGoogle();
  };

  const handleSignOut = async () => {
    soundManager.playClick();
    await logOut();
    setRoom(null);
    if (ws) ws.close();
  };

  // Start singleplayer game
  const handleStartGame = (diff: Difficulty, skinId: SkinType) => {
    setDifficulty(diff);
    setSelectedSkin(skinId);
    setScore(0);
    setSugarsGathered(0);
    setWave(1);
    setNearMisses(0);
    setSurvivalTime(0);
    setIsPaused(false);
    setGameState("playing");
  };

  const handleGameOver = (finalScore: number, finalSugars: number, timeSecs: number, totalNearMisses: number) => {
    setScore(finalScore);
    setSugarsGathered(finalSugars);
    setSurvivalTime(timeSecs);
    setNearMisses(totalNearMisses);
    setGameState("gameover");

    // Persist gained sugars to cloud if logged in!
    if (userProfile) {
      const updatedSugars = userProfile.sugars + finalSugars;
      // Sync happens automatically as the shop/menu is reloaded
      import("./lib/firebase").then(({ syncSugarsToCloud }) => {
        syncSugarsToCloud(userProfile.uid, updatedSugars);
      });
    }
  };

  const handleRestart = () => {
    handleStartGame(difficulty, selectedSkin);
  };

  const handleGoToMenu = () => {
    setGameState("menu");
  };

  const handleTogglePause = () => {
    setIsPaused((prev) => !prev);
  };

  const handleTriggerDash = () => {
    if ((window as any).triggerFlyGameDash) {
      (window as any).triggerFlyGameDash();
    }
  };

  // 2. MULTIPLAYER WEBSOCKET MATCHMAKING AND STATE MANAGEMENT
  const connectWebSocket = (): Promise<WebSocket> => {
    return new Promise((resolve, reject) => {
      // Clean up previous socket if open
      if (ws) {
        ws.close();
      }

      // Convert relative browser URL structure to appropriate WS protocol automatically
      const wsUrl = window.location.origin.replace(/^http/, "ws");
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        setWs(socket);
        resolve(socket);
      };

      socket.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          const { type, payload } = msg;

          switch (type) {
            case "room_created":
            case "room_joined":
              setRoom(payload);
              setErrorMsg("");
              break;

            case "room_updated":
              setRoom(payload);
              break;

            case "game_started":
              setRoom(payload);
              setMultiplayerScores({});
              setGameState("multiplayer_playing");
              break;

            case "error":
              setErrorMsg(payload.message || "Ошибка подключения к комнате.");
              soundManager.playHit();
              break;
          }
        } catch (err) {
          console.error("WS parse error", err);
        }
      };

      socket.onclose = () => {
        setWs(null);
        setRoom(null);
      };

      socket.onerror = (err) => {
        reject(err);
      };
    });
  };

  const handleCreateRoom = async (mode: "coop" | "versus") => {
    setErrorMsg("");
    try {
      const socket = await connectWebSocket();
      const name = userProfile?.displayName || "Гость_" + playerId.substring(6, 11);
      
      socket.send(JSON.stringify({
        type: "create_room",
        payload: {
          playerId,
          playerName: name,
          skin: selectedSkin,
          mode,
        }
      }));
    } catch (e) {
      setErrorMsg("Ошибка связи с сервером. Попробуйте еще раз.");
    }
  };

  const handleJoinRoom = async (roomCode: string) => {
    setErrorMsg("");
    try {
      const socket = await connectWebSocket();
      const name = userProfile?.displayName || "Гость_" + playerId.substring(6, 11);

      socket.send(JSON.stringify({
        type: "join_room",
        payload: {
          playerId,
          playerName: name,
          skin: selectedSkin,
          roomCode: roomCode.toUpperCase(),
        }
      }));
    } catch (e) {
      setErrorMsg("Ошибка связи с сервером. Попробуйте еще раз.");
    }
  };

  const handleToggleReady = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: "toggle_ready",
        payload: { playerId }
      }));
    }
  };

  const handleStartMultiplayerGame = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: "start_game"
      }));
    }
  };

  const handleLeaveRoom = () => {
    if (ws) {
      ws.close();
    }
    setRoom(null);
    setGameState("menu");
  };

  const handleMultiplayerGameOver = (winnerName: string, finalRoom: any) => {
    setMultiplayerWinner(winnerName);
    setRoom(finalRoom);
    setGameState("multiplayer_gameover");
  };

  return (
    <div id="app-root" className="min-h-screen w-full bg-[#f5f5f0] text-[#5A5A40] font-serif flex flex-col items-center justify-between p-4 md:p-6 overflow-x-hidden relative" style={{ backgroundImage: "radial-gradient(circle at 50% 120%, #d4d8b8, #f5f5f0)" }}>
      {/* Organic Dotted Grid Overlay */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "radial-gradient(#5A5A40 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
      
      {/* Top minimalistic header */}
      <header className="w-full max-w-5xl flex items-center justify-between border-b border-[#5A5A40]/10 pb-3 mb-4 shrink-0 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#5A5A40] flex items-center justify-center font-black text-[#f5f5f0] text-sm shadow-sm select-none">
            🪰
          </div>
          <span className="font-bold text-sm md:text-base text-[#5A5A40] tracking-tight uppercase">
            Мушиный побег
          </span>
        </div>
        
        {/* Network & Auth Sync state pills */}
        <div className="flex items-center gap-2">
          {userProfile && (
            <div className="flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 text-[10px] md:text-xs font-bold uppercase tracking-wider shadow-sm">
              <Cloud className="w-3.5 h-3.5" />
              <span>Облако Активно</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 px-3 py-1 bg-white/80 rounded-full border border-[#5A5A40]/10 text-[#5A5A40] text-[10px] md:text-xs font-bold uppercase tracking-wider shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-[#A67C52]" />
            <span>Сделано вручную</span>
          </div>
        </div>
      </header>

      {/* Main Core Game Viewstage Container */}
      <main className="w-full max-w-5xl flex-1 flex items-center justify-center relative z-10">
        <div 
          id="main-stage-container"
          className="w-full aspect-[16/10] md:aspect-[16/9.5] bg-white/95 rounded-[32px] border border-[#5A5A40]/10 shadow-xl overflow-hidden relative flex flex-col justify-center"
        >
          {errorMsg && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-50 border border-red-200 text-red-600 px-4 py-2.5 rounded-2xl flex items-center gap-2 text-xs font-bold shadow-md z-40 max-w-sm">
              <AlertCircle className="w-4.5 h-4.5 shrink-0" />
              <span>{errorMsg}</span>
              <button onClick={() => setErrorMsg("")} className="ml-2 font-bold cursor-pointer text-red-800 hover:text-black">&times;</button>
            </div>
          )}

          {/* MENU SCREEN */}
          {gameState === "menu" && (
            <MainMenu 
              onStartGame={handleStartGame}
              selectedSkin={selectedSkin}
              setSelectedSkin={setSelectedSkin}
              userProfile={userProfile}
              onSignIn={handleSignIn}
              onSignOut={handleSignOut}
              onOpenPayment={(type, item) => setActivePayment({ type, item })}
              onRefreshProfile={setUserProfile}
              room={room}
              playerId={playerId}
              onJoinRoom={handleJoinRoom}
              onCreateRoom={handleCreateRoom}
              onToggleReady={handleToggleReady}
              onStartMultiplayerGame={handleStartMultiplayerGame}
              onLeaveRoom={handleLeaveRoom}
            />
          )}

          {/* SINGLE PLAYER GAME CANVAS */}
          {gameState === "playing" && (
            <div className="w-full h-full relative">
              <GameCanvas 
                difficulty={difficulty}
                skin={selectedSkin}
                isPaused={isPaused}
                onGameOver={handleGameOver}
                onFlyStateUpdate={setFlyState}
                onStatsUpdate={(currScore, currSugars, currWave) => {
                  setScore(currScore);
                  setSugarsGathered(currSugars);
                  setWave(currWave);
                }}
              />
              
              <GameUI 
                fly={flyState}
                score={score}
                sugarsGathered={sugarsGathered}
                wave={wave}
                isPaused={isPaused}
                difficulty={difficulty}
                onTogglePause={handleTogglePause}
                onTriggerDash={handleTriggerDash}
              />
            </div>
          )}

          {/* SINGLE PLAYER GAME OVER */}
          {gameState === "gameover" && (
            <GameOver 
              score={score}
              sugarsGathered={sugarsGathered}
              survivalTime={survivalTime}
              nearMisses={nearMisses}
              difficulty={difficulty}
              skin={selectedSkin}
              onRestart={handleRestart}
              onGoToMenu={handleGoToMenu}
            />
          )}

          {/* MULTIPLAYER GAMEPLAY CANVAS */}
          {gameState === "multiplayer_playing" && room && (
            <div className="w-full h-full relative">
              <MultiplayerGameCanvas
                room={room}
                playerId={playerId}
                ws={ws}
                onGameOver={handleMultiplayerGameOver}
                onStatsUpdate={(scores, energy) => {
                  setMultiplayerScores(scores);
                  setMultiplayerEnergy(energy);
                }}
                onLeave={handleLeaveRoom}
              />

              {/* Multiplayer HUD Overlay */}
              <div className="absolute inset-x-0 top-0 p-5 flex justify-between items-start pointer-events-none select-none font-sans z-10">
                {/* Dash energy bar (if flying fly) */}
                <div className="flex flex-col gap-1 w-44">
                  {room.players[playerId]?.role === "fly" && (
                    <>
                      <div className="flex justify-between items-center text-[10px] font-bold uppercase text-[#5A5A40]">
                        <span>Запас Рывка</span>
                        <span>{multiplayerEnergy}%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden border border-white">
                        <div 
                          className="h-full bg-[#A67C52] transition-all duration-150" 
                          style={{ width: `${multiplayerEnergy}%` }}
                        />
                      </div>
                      {multiplayerEnergy >= 100 && (
                        <button
                          onClick={handleTriggerDash}
                          className="mt-1 pointer-events-auto py-1 px-3 bg-[#A67C52] text-white text-[9px] font-black uppercase tracking-wider rounded-lg shadow-sm hover:bg-[#8b5a2b] transition-all"
                        >
                          [ПРОБЕЛ] Рывок!
                        </button>
                      )}
                    </>
                  )}
                </div>

                {/* Score listing for all participants */}
                <div className="bg-white/95 border border-[#5A5A40]/15 p-3 rounded-2xl shadow-md min-w-[150px] flex flex-col gap-1.5 pointer-events-auto">
                  <div className="flex items-center gap-1.5 border-b border-[#5A5A40]/10 pb-1 mb-1">
                    <Users className="w-3.5 h-3.5 text-[#A67C52]" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#5A5A40]">Счет игроков</span>
                  </div>
                  {Object.entries(multiplayerScores).map(([name, pScore]) => (
                    <div key={name} className="flex justify-between items-center text-xs font-semibold text-[#5A5A40]">
                      <span className="max-w-[100px] truncate">{name}</span>
                      <span className="font-mono font-black text-[#A67C52]">{pScore}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Leave room during match */}
              <button
                onClick={handleLeaveRoom}
                className="absolute bottom-4 left-4 py-1.5 px-3 bg-white/90 border border-[#5A5A40]/15 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50 cursor-pointer shadow-sm z-10 font-sans"
              >
                Сдаться
              </button>
            </div>
          )}

          {/* MULTIPLAYER GAME OVER SCREEN */}
          {gameState === "multiplayer_gameover" && room && (
            <div className="w-full h-full p-6 md:p-8 flex flex-col justify-center items-center text-center font-sans relative">
              <Award className="w-16 h-16 text-[#A67C52] animate-bounce mb-3" />
              <h2 className="text-2xl font-black font-serif text-[#5A5A40]">Матч Завершен!</h2>
              
              {multiplayerWinner ? (
                <p className="text-sm font-semibold text-[#A67C52] mt-1 bg-[#A67C52]/10 px-4 py-1.5 rounded-full border border-[#A67C52]/15">
                  Победитель: {multiplayerWinner} 🎉
                </p>
              ) : (
                <p className="text-sm font-semibold text-emerald-600 mt-1 bg-emerald-50 px-4 py-1.5 rounded-full border border-emerald-100">
                  Совместное выживание окончено! Команда выдержала удар!
                </p>
              )}

              {/* Scores summary list */}
              <div className="my-6 max-w-sm w-full bg-[#f5f5f0]/50 border border-[#5A5A40]/10 p-4 rounded-2xl flex flex-col gap-2">
                <h4 className="text-xs font-extrabold uppercase text-[#5A5A40]/55 tracking-wider mb-1">Итоговые Рекорды</h4>
                {Object.values(room.players || {}).map((p: any) => (
                  <div key={p.id} className="flex justify-between items-center text-xs font-semibold">
                    <span>{p.name}</span>
                    <span className="font-mono font-black text-[#A67C52] text-sm">{p.score} очков</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { soundManager.playClick(); setGameState("menu"); }}
                  className="px-6 py-2.5 bg-[#5A5A40] text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-[#4a4a32] cursor-pointer transition-all shadow-sm"
                >
                  Вернуться в Лобби
                </button>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Payment checkout modal overlay */}
      {activePayment && (
        <PaymentModal
          userProfile={userProfile}
          onClose={() => setActivePayment(null)}
          onPurchaseSuccess={(updated) => {
            setUserProfile(updated);
            setActivePayment(null);
          }}
          purchaseType={activePayment.type}
          itemData={{
            id: activePayment.item.id,
            name: activePayment.item.name,
            price: activePayment.item.priceUSD || activePayment.item.price || 0,
            amount: activePayment.item.amount,
          }}
        />
      )}

      {/* Minimalistic footer branding */}
      <footer className="w-full max-w-5xl flex flex-col sm:flex-row items-center justify-between mt-5 pt-3 border-t border-[#5A5A40]/10 text-[10px] md:text-xs text-[#5A5A40]/60 font-medium shrink-0 relative z-10">
        <p>© 2026 Муха против Мухобоек. Все крылья защищены.</p>
        <div className="flex gap-4 mt-1.5 sm:mt-0 font-bold text-[#5A5A40]/80">
          <a href="#how-to" className="hover:text-[#5A5A40] hover:underline transition-colors flex items-center gap-0.5">
            Управление <ArrowUpRight className="w-3 h-3 text-[#A67C52]" />
          </a>
          <span className="text-[#5A5A40]/20">|</span>
          <span className="text-[#5A5A40]/50 select-none">Версия 1.2.0</span>
        </div>
      </footer>

    </div>
  );
}
