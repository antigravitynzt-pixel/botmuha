import React, { useState } from "react";
import { Users, LogIn, Plus, ShieldAlert, Sparkles, Check, HelpCircle } from "lucide-react";
import { soundManager } from "./SoundManager";

interface MultiplayerLobbyProps {
  room: any;
  playerId: string;
  onJoinRoom: (roomCode: string) => void;
  onCreateRoom: (mode: "coop" | "versus") => void;
  onToggleReady: () => void;
  onStartGame: () => void;
  onLeaveRoom: () => void;
}

export const MultiplayerLobby: React.FC<MultiplayerLobbyProps> = ({
  room,
  playerId,
  onJoinRoom,
  onCreateRoom,
  onToggleReady,
  onStartGame,
  onLeaveRoom,
}) => {
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [selectedMode, setSelectedMode] = useState<"coop" | "versus">("coop");

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCodeInput) return;
    soundManager.playClick();
    onJoinRoom(roomCodeInput.toUpperCase().trim());
  };

  if (!room) {
    // Standard Room Creation / Join Lobby Selection screen
    return (
      <div className="flex-1 flex flex-col font-sans text-[#5A5A40]">
        <h3 className="text-lg font-bold text-[#5A5A40] mb-1 flex items-center gap-2">
          <Users className="w-5 h-5 text-[#A67C52]" />
          Многопользовательский Ангар
        </h3>
        <p className="text-xs text-[#5A5A40]/60 mb-4">Жужжите вместе с друзьями в реальном времени!</p>

        <div className="flex-1 flex flex-col gap-4">
          {/* Create Room Box */}
          <div className="p-4 border border-[#5A5A40]/10 rounded-2xl bg-white flex flex-col gap-3 shadow-sm">
            <h4 className="text-xs font-extrabold uppercase text-[#A67C52] tracking-wider">Создать Комнату</h4>
            
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { soundManager.playClick(); setSelectedMode("coop"); }}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex flex-col gap-1 text-left ${
                  selectedMode === "coop"
                    ? "bg-[#A67C52]/10 border-[#A67C52] text-[#5A5A40]"
                    : "border-[#5A5A40]/15 hover:bg-[#f5f5f0]/50"
                }`}
              >
                <span>Совместное Выживание</span>
                <span className="text-[10px] font-normal text-[#5A5A40]/60">Кооператив против ИИ</span>
              </button>
              <button
                onClick={() => { soundManager.playClick(); setSelectedMode("versus"); }}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex flex-col gap-1 text-left ${
                  selectedMode === "versus"
                    ? "bg-[#A67C52]/10 border-[#A67C52] text-[#5A5A40]"
                    : "border-[#5A5A40]/15 hover:bg-[#f5f5f0]/50"
                }`}
              >
                <span>Дуэль 1 на 1 (PvP)</span>
                <span className="text-[10px] font-normal text-[#5A5A40]/60">Один за муху, один сваттер!</span>
              </button>
            </div>

            <button
              onClick={() => { soundManager.playClick(); onCreateRoom(selectedMode); }}
              className="w-full py-2.5 bg-[#5A5A40] text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-[#4a4a32] cursor-pointer transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Создать Лобби
            </button>
          </div>

          {/* Join Room Box */}
          <form onSubmit={handleJoinSubmit} className="p-4 border border-[#5A5A40]/10 rounded-2xl bg-white flex flex-col gap-3 shadow-sm">
            <h4 className="text-xs font-extrabold uppercase text-[#A67C52] tracking-wider">Присоединиться к Команде</h4>
            
            <div className="flex gap-2">
              <input
                type="text"
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value.substring(0, 4))}
                placeholder="КОД"
                className="flex-1 bg-[#f5f5f0]/30 border border-[#5A5A40]/15 rounded-xl px-4 py-2.5 text-sm font-bold tracking-widest text-center uppercase focus:outline-none focus:ring-1 focus:ring-[#A67C52]"
                required
              />
              <button
                type="submit"
                className="px-5 bg-[#A67C52] hover:bg-[#8b5a2b] text-white font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all flex items-center gap-1.5 shadow-sm"
              >
                <LogIn className="w-4 h-4" /> Войти
              </button>
            </div>
          </form>
        </div>

        <div className="mt-4 flex items-center justify-center gap-1 text-[10px] text-[#5A5A40]/55 border-t border-[#5A5A40]/10 pt-3">
          <HelpCircle className="w-3.5 h-3.5" /> Режим дуэли (Versus) дает возможность кликами уничтожать мух!
        </div>
      </div>
    );
  }

  // Active lobby room list
  const currentPlayers = Object.values(room.players || {});
  const isHost = room.hostId === playerId;
  const localPlayerReady = room.players[playerId]?.ready || false;
  const everyoneReady = currentPlayers.length > 0 && currentPlayers.every((p: any) => p.ready);

  return (
    <div className="flex-1 flex flex-col font-sans text-[#5A5A40]">
      {/* Room Header Code */}
      <div className="p-4 bg-[#A67C52]/10 border border-[#A67C52]/20 rounded-2xl flex justify-between items-center mb-4">
        <div>
          <span className="text-[9px] uppercase font-bold tracking-widest text-[#A67C52]">Комната</span>
          <p className="text-xl font-black text-[#5A5A40] tracking-widest leading-none mt-1">{room.id}</p>
        </div>
        <div className="text-right">
          <span className="text-[9px] uppercase font-bold tracking-widest text-[#A67C52]">Режим</span>
          <p className="text-xs font-bold text-[#5A5A40] leading-none mt-1">
            {room.mode === "coop" ? "Совместное выживание" : "Сваттер-Дуэль 1х1"}
          </p>
        </div>
      </div>

      {/* Players List */}
      <div className="flex-1 overflow-y-auto max-h-[180px] flex flex-col gap-2 pr-1 scrollbar-thin">
        {currentPlayers.map((p: any) => (
          <div
            key={p.id}
            className="p-2.5 border border-[#5A5A40]/10 bg-white rounded-xl flex justify-between items-center"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <p className="font-bold text-xs">
                  {p.name} {p.id === playerId && <span className="text-[10px] font-normal text-[#5A5A40]/50">(Вы)</span>}
                </p>
                <p className="text-[10px] text-[#A67C52]/80 uppercase font-bold mt-0.5">
                  Роль: {p.role === "swatter" ? "🔨 МУХОБОЙКА" : "🪰 МУХА"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {p.ready ? (
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Check className="w-3 h-3" /> Готов
                </span>
              ) : (
                <span className="text-[10px] font-medium text-[#5A5A40]/40 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-md">
                  Ожидание
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="mt-4 flex gap-2 border-t border-[#5A5A40]/10 pt-4">
        <button
          onClick={() => { soundManager.playClick(); onLeaveRoom(); }}
          className="px-4 py-2.5 border border-[#5A5A40]/20 hover:bg-[#f5f5f0] text-[#5A5A40] font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all"
        >
          Выйти
        </button>

        <button
          onClick={() => { soundManager.playClick(); onToggleReady(); }}
          className={`flex-1 py-2.5 text-white font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all text-center ${
            localPlayerReady 
              ? "bg-emerald-600 hover:bg-emerald-700" 
              : "bg-[#A67C52] hover:bg-[#8b5a2b]"
          }`}
        >
          {localPlayerReady ? "Снять готовность" : "Я готов!"}
        </button>

        {isHost && (
          <button
            onClick={() => { soundManager.playClick(); onStartGame(); }}
            disabled={!everyoneReady}
            className={`px-4 py-2.5 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all ${
              everyoneReady 
                ? "bg-[#5A5A40] hover:bg-[#4a4a32] shadow-md hover:-translate-y-0.5" 
                : "bg-[#5A5A40]/30 cursor-not-allowed"
            }`}
          >
            Пуск!
          </button>
        )}
      </div>
    </div>
  );
};
