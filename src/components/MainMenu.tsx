import React, { useState, useEffect } from "react";
import { GameState, Difficulty, SkinType } from "../types";
import { SKINS, getSavedSugars, getUnlockedSkins, unlockSkin, saveSugars, getHighScores } from "../utils";
import { soundManager } from "./SoundManager";
import { 
  Shield, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Trophy, 
  Play, 
  Info, 
  Palette, 
  Award, 
  HelpCircle, 
  Coins, 
  Users, 
  LogOut, 
  LogIn,
  Gift
} from "lucide-react";
import { UserProfile } from "../lib/firebase";
import { ShopTab } from "./ShopTab";
import { CasesTab } from "./CasesTab";
import { MultiplayerLobby } from "./MultiplayerLobby";

interface MainMenuProps {
  onStartGame: (difficulty: Difficulty, skin: SkinType) => void;
  selectedSkin: SkinType;
  setSelectedSkin: (skin: SkinType) => void;
  userProfile: UserProfile | null;
  onSignIn: () => void;
  onSignOut: () => void;
  onOpenPayment: (type: "sugar" | "skin" | "topup", item: any) => void;
  onRefreshProfile?: (updated: UserProfile) => void;

  // Multiplayer Lobby Props
  room: any;
  playerId: string;
  onJoinRoom: (roomCode: string) => void;
  onCreateRoom: (mode: "coop" | "versus") => void;
  onToggleReady: () => void;
  onStartMultiplayerGame: () => void;
  onLeaveRoom: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onStartGame,
  selectedSkin,
  setSelectedSkin,
  userProfile,
  onSignIn,
  onSignOut,
  onOpenPayment,
  onRefreshProfile,
  room,
  playerId,
  onJoinRoom,
  onCreateRoom,
  onToggleReady,
  onStartMultiplayerGame,
  onLeaveRoom,
}) => {
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [activeTab, setActiveTab] = useState<"play" | "skins" | "scores" | "how-to" | "shop" | "multiplayer" | "cases">("play");
  const [sugars, setSugars] = useState<number>(0);
  const [unlockedSkins, setUnlockedSkins] = useState<SkinType[]>(["classic"]);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [highScores, setHighScores] = useState<any[]>([]);

  // Track and synchronize local or cloud-synced profile statistics
  useEffect(() => {
    if (userProfile) {
      setSugars(userProfile.sugars);
      const cloudUnlocked = userProfile.unlockedSkins || ["classic"];
      const premiumUnlocked = userProfile.purchasedPremiumSkins || [];
      const merged = Array.from(new Set([...getUnlockedSkins(), ...cloudUnlocked, ...premiumUnlocked])) as SkinType[];
      setUnlockedSkins(merged);
    } else {
      setSugars(getSavedSugars());
      setUnlockedSkins(getUnlockedSkins());
    }
    setIsMuted(soundManager.isMuted());
    setHighScores(getHighScores(difficulty));
  }, [difficulty, userProfile]);

  // Keep selected skin valid if we lose/gain permissions
  useEffect(() => {
    if (!unlockedSkins.includes(selectedSkin)) {
      setSelectedSkin("classic");
    }
  }, [unlockedSkins]);

  // If in active room lobby, auto switch tab to multiplayer so players don't lose sight of the lobby!
  useEffect(() => {
    if (room) {
      setActiveTab("multiplayer");
    }
  }, [room]);

  const handleToggleMute = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
    soundManager.playClick();
  };

  const handleSelectSkin = (skinId: SkinType) => {
    soundManager.playClick();
    if (unlockedSkins.includes(skinId)) {
      setSelectedSkin(skinId);
    } else {
      // Try to buy offline skin with Sugars
      const cost = SKINS[skinId].price;
      if (sugars >= cost) {
        const remaining = sugars - cost;
        saveSugars(remaining);
        unlockSkin(skinId);
        setSugars(remaining);
        setUnlockedSkins(getUnlockedSkins());
        setSelectedSkin(skinId);
        soundManager.playEat(); // celebratory chime
      } else {
        soundManager.playHit(); // error buzz
      }
    }
  };

  const handlePlayClick = () => {
    soundManager.playClick();
    onStartGame(difficulty, selectedSkin);
  };

  const difficulties: { id: Difficulty; label: string; desc: string; color: string }[] = [
    { id: "easy", label: "Легко", desc: "Медленные мухобойки, долгие предупреждения. Идеально для разминки крыльев.", color: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" },
    { id: "normal", label: "Нормально", desc: "Стандартная скорость. Баланс опасности и сладостей на экране.", color: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100" },
    { id: "hard", label: "Тяжело", desc: "Быстрые атаки, двойные удары. Мухобойки не знают жалости!", color: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100" },
    { id: "nightmare", label: "Кошмар", desc: "Круглосуточный обстрел на дикой скорости. Выживает лишь 1% мух.", color: "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100" }
  ];

  return (
    <div id="main-menu" className="w-full h-full p-6 md:p-8 bg-white/95 rounded-[32px] border border-[#5A5A40]/15 shadow-xl flex flex-col md:flex-row gap-8 relative overflow-hidden select-none font-serif text-[#5A5A40]">
      
      {/* Decorative Natural Tones background vectors */}
      <div className="absolute top-4 right-1/3 w-16 h-16 bg-[#d4d8b8]/20 rounded-full blur-xl pointer-events-none" />
      <div className="absolute bottom-12 left-10 w-24 h-24 bg-[#A67C52]/10 rounded-full blur-xl pointer-events-none" />

      {/* Left side: Game Title, Auth & Big Play Action */}
      <div className="flex-1 flex flex-col justify-between pr-0 md:pr-4">
        <div>
          {/* Top Control Bar (Sound & Cloud Login Profile) */}
          <div className="flex justify-between items-center w-full mb-4">
            <button 
              id="mute-toggle-btn"
              onClick={handleToggleMute}
              className="p-2 rounded-full bg-white border border-[#5A5A40]/15 text-[#5A5A40] shadow-sm hover:bg-[#f5f5f0]/80 transition-all hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-5 h-5 text-red-500" /> : <Volume2 className="w-5 h-5 text-[#5A5A40]" />}
            </button>

            {/* Google Authentication Status indicator */}
            <div className="flex items-center gap-2">
              {userProfile ? (
                <div className="flex items-center gap-2 bg-white/95 border border-[#5A5A40]/15 py-1 px-2.5 rounded-full shadow-sm text-xs font-sans">
                  {userProfile.photoURL ? (
                    <img 
                      src={userProfile.photoURL} 
                      alt="avatar" 
                      className="w-5 h-5 rounded-full object-cover border border-[#A67C52]/40"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="w-5 h-5 rounded-full bg-[#A67C52]/20 flex items-center justify-center font-bold text-[10px]">
                      🪰
                    </span>
                  )}
                  <span className="max-w-[100px] truncate font-bold">{userProfile.displayName}</span>
                  <button
                    onClick={onSignOut}
                    title="Выйти"
                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full cursor-pointer transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={onSignIn}
                  className="flex items-center gap-1.5 bg-white border border-[#5A5A40]/15 py-1.5 px-3 rounded-full shadow-sm hover:bg-[#f5f5f0] text-[10px] font-bold uppercase tracking-wider font-sans cursor-pointer transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5 text-[#A67C52]" />
                  <span>Google Войти</span>
                </button>
              )}
            </div>
          </div>

          {/* Sugars Counter Display */}
          <div className="absolute top-20 right-6 px-4 py-2 bg-white/90 border border-[#5A5A40]/15 rounded-full flex items-center gap-2 shadow-sm text-xs font-semibold text-[#5A5A40] z-20">
            <span className="w-3.5 h-3.5 bg-[#A67C52] rounded-sm transform rotate-45 inline-block border border-[#A67C52]/30 animate-pulse" />
            <span>Сахар: <span className="text-[#A67C52] font-extrabold">{sugars}</span></span>
          </div>

          {/* Game Brand & Logo */}
          <div className="mt-6 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5A5A40]/10 border border-[#5A5A40]/15 text-[#5A5A40] text-[10px] font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-3 h-3 text-[#A67C52] animate-pulse" />
              Новый аркадный хит!
            </div>
            
            <h1 className="text-3xl md:text-4xl font-black text-[#5A5A40] leading-tight font-serif">
              МУХА <span className="text-[#A67C52] font-extrabold relative">
                против
                <span className="absolute left-0 bottom-1 w-full h-1.5 bg-[#A67C52]/20 -z-10 rounded-full" />
              </span><br />
              МУХОБОЕК
            </h1>
            
            <p className="mt-2 text-[#5A5A40]/80 text-xs md:text-sm max-w-sm leading-relaxed font-sans">
              Вы — назойливая муха. Кружите, собирайте сахар и уворачивайтесь от тяжелых мухобоек!
            </p>
          </div>
        </div>

        {/* Big Action Buttons & Grid Selection */}
        <div className="mt-6 flex flex-col gap-2.5">
          <button 
            id="play-game-btn"
            onClick={handlePlayClick}
            className="w-full py-3 px-5 rounded-2xl bg-[#5A5A40] text-white font-extrabold text-base shadow-md shadow-[#5A5A40]/15 hover:bg-[#4a4a32] active:bg-[#32321c] hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 cursor-pointer group font-sans"
          >
            <Play className="w-5 h-5 fill-white group-hover:scale-110 transition-transform" />
            В ОДИНОЧНЫЙ ПОЛЕТ!
          </button>
          
          <div className="grid grid-cols-3 gap-2 font-sans">
            <button 
              id="menu-tab-skins"
              onClick={() => { soundManager.playClick(); setActiveTab("skins"); }}
              className={`py-2 px-1 rounded-xl text-[10px] font-bold border transition-all flex flex-col items-center justify-center gap-1.5 ${
                activeTab === "skins" 
                  ? "bg-[#5A5A40] text-white border-[#5A5A40] shadow-inner" 
                  : "bg-white text-[#5A5A40] border-[#5A5A40]/10 hover:bg-[#f5f5f0]/50"
              }`}
            >
              <Palette className={`w-4 h-4 ${activeTab === "skins" ? "text-white" : "text-[#A67C52]"}`} />
              Скины
            </button>

            <button 
              id="menu-tab-multiplayer"
              onClick={() => { soundManager.playClick(); setActiveTab("multiplayer"); }}
              className={`py-2 px-1 rounded-xl text-[10px] font-bold border transition-all flex flex-col items-center justify-center gap-1.5 relative ${
                activeTab === "multiplayer" 
                  ? "bg-[#5A5A40] text-white border-[#5A5A40] shadow-inner" 
                  : "bg-white text-[#5A5A40] border-[#5A5A40]/10 hover:bg-[#f5f5f0]/50"
              }`}
            >
              {room && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />}
              <Users className={`w-4 h-4 ${activeTab === "multiplayer" ? "text-white" : "text-[#A67C52]"}`} />
              Мульти
            </button>

            <button 
              id="menu-tab-shop"
              onClick={() => { soundManager.playClick(); setActiveTab("shop"); }}
              className={`py-2 px-1 rounded-xl text-[10px] font-bold border transition-all flex flex-col items-center justify-center gap-1.5 ${
                activeTab === "shop" 
                  ? "bg-[#5A5A40] text-white border-[#5A5A40] shadow-inner" 
                  : "bg-white text-[#5A5A40] border-[#5A5A40]/10 hover:bg-[#f5f5f0]/50"
              }`}
            >
              <Coins className={`w-4 h-4 ${activeTab === "shop" ? "text-white" : "text-[#A67C52]"}`} />
              Магазин
            </button>

            {/* Cases Tab Button */}
            <button 
              id="menu-tab-cases"
              onClick={() => { soundManager.playClick(); setActiveTab("cases"); }}
              className={`py-2 px-1 rounded-xl text-[10px] font-bold border transition-all flex flex-col items-center justify-center gap-1.5 ${
                activeTab === "cases" 
                  ? "bg-[#5A5A40] text-white border-[#5A5A40] shadow-inner" 
                  : "bg-white text-[#5A5A40] border-[#5A5A40]/10 hover:bg-[#f5f5f0]/50"
              }`}
            >
              <Gift className={`w-4 h-4 ${activeTab === "cases" ? "text-white" : "text-[#A67C52]"}`} />
              Кейсы
            </button>

            <button 
              id="menu-tab-scores"
              onClick={() => { soundManager.playClick(); setActiveTab("scores"); }}
              className={`py-2 px-1 rounded-xl text-[10px] font-bold border transition-all flex flex-col items-center justify-center gap-1.5 ${
                activeTab === "scores" 
                  ? "bg-[#5A5A40] text-white border-[#5A5A40] shadow-inner" 
                  : "bg-white text-[#5A5A40] border-[#5A5A40]/10 hover:bg-[#f5f5f0]/50"
              }`}
            >
              <Trophy className={`w-4 h-4 ${activeTab === "scores" ? "text-white" : "text-[#A67C52]"}`} />
              Рекорды
            </button>

            <button 
              id="menu-tab-how-to"
              onClick={() => { soundManager.playClick(); setActiveTab("how-to"); }}
              className={`py-2 px-1 rounded-xl text-[10px] font-bold border transition-all flex flex-col items-center justify-center gap-1.5 ${
                activeTab === "how-to" 
                  ? "bg-[#5A5A40] text-white border-[#5A5A40] shadow-inner" 
                  : "bg-white text-[#5A5A40] border-[#5A5A40]/10 hover:bg-[#f5f5f0]/50"
              }`}
            >
              <HelpCircle className={`w-4 h-4 ${activeTab === "how-to" ? "text-white" : "text-[#A67C52]"}`} />
              Справка
            </button>
          </div>
        </div>
      </div>

      {/* Right side: Dynamic Settings or Sub Tab Panel */}
      <div className="flex-1 bg-white rounded-2xl border border-[#5A5A40]/10 p-5 flex flex-col shadow-sm max-h-[360px] overflow-hidden justify-center relative">
        
        {/* PLAY DIFFICULTY TAB */}
        {activeTab === "play" && (
          <div className="flex-1 flex flex-col font-sans justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-[#5A5A40] uppercase tracking-wider mb-3 flex items-center gap-2">
                <Shield className="w-4.5 h-4.5 text-[#A67C52]" />
                Выберите сложность игры
              </h3>
              
              <div className="flex flex-col gap-2">
                {difficulties.map((diff) => (
                  <button
                    id={`difficulty-${diff.id}`}
                    key={diff.id}
                    onClick={() => {
                      soundManager.playClick();
                      setDifficulty(diff.id);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      difficulty === diff.id 
                        ? "bg-[#A67C52]/10 text-[#5A5A40] border-[#A67C52] ring-2 ring-[#A67C52]/20 font-bold" 
                        : "bg-[#f5f5f0]/30 text-[#5A5A40]/70 border-[#5A5A40]/10 hover:bg-[#f5f5f0]/50"
                    }`}
                  >
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-extrabold">{diff.label}</span>
                      {difficulty === diff.id && <span className="w-2 h-2 rounded-full bg-[#A67C52]" />}
                    </div>
                    <p className="text-[10px] text-[#5A5A40]/60 mt-0.5 line-clamp-1">{diff.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#5A5A40]/10 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-[#5A5A40]/40 uppercase tracking-wider">Выбранный скин:</span>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-[#5A5A40]/10 text-[#5A5A40] rounded-md">
                  {SKINS[selectedSkin]?.name || "Базовый"}
                </span>
              </div>
              <button 
                onClick={() => { soundManager.playClick(); setActiveTab("skins"); }}
                className="text-[10px] font-bold text-[#A67C52] hover:underline cursor-pointer"
              >
                Изменить
              </button>
            </div>
          </div>
        )}

        {/* SKINS WARDROBE TAB */}
        {activeTab === "skins" && (
          <div className="flex-1 flex flex-col font-sans">
            <h3 className="text-sm font-extrabold text-[#5A5A40] uppercase tracking-wider mb-1 flex items-center gap-2">
              <Palette className="w-4.5 h-4.5 text-[#A67C52]" />
              Гардероб Мухи
            </h3>
            <p className="text-[10px] text-[#5A5A40]/60 mb-3">Одевайте ваши заработанные или купленные облики!</p>
            
            <div className="flex-1 overflow-y-auto max-h-[200px] pr-1 flex flex-col gap-2 scrollbar-thin">
              {Object.values(SKINS).map((skin) => {
                const isUnlocked = unlockedSkins.includes(skin.id);
                const isSelected = selectedSkin === skin.id;
                
                return (
                  <button
                    id={`skin-select-${skin.id}`}
                    key={skin.id}
                    onClick={() => handleSelectSkin(skin.id)}
                    className={`p-2.5 rounded-xl border text-left flex items-center justify-between gap-3 transition-all ${
                      isSelected 
                        ? "border-[#A67C52] bg-[#A67C52]/10 ring-2 ring-[#A67C52]/15" 
                        : "border-[#5A5A40]/10 hover:bg-[#f5f5f0]/40 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {/* Colored preview dot representing fly */}
                      <div 
                        className="w-7 h-7 rounded-full flex items-center justify-center border shadow-sm relative overflow-hidden"
                        style={{ backgroundColor: skin.color, borderColor: skin.accessoryColor }}
                      >
                        <div className="absolute top-0.5 left-0.5 w-2 h-2 rounded-full bg-red-600 opacity-80" />
                        <div className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-red-600 opacity-80" />
                        <div className="w-4 h-1 bg-white/40 transform rotate-45 rounded-full" />
                      </div>

                      <div>
                        <h4 className="font-bold text-xs text-[#5A5A40]">{skin.name}</h4>
                        <p className="text-[10px] text-[#5A5A40]/60 line-clamp-1 leading-tight">{skin.description}</p>
                      </div>
                    </div>

                    <div className="shrink-0 text-[10px]">
                      {isSelected ? (
                        <span className="font-bold text-[#5A5A40] bg-[#5A5A40]/10 px-2 py-0.5 rounded-md">Надето</span>
                      ) : isUnlocked ? (
                        <span className="font-semibold text-[#5A5A40]/80 bg-[#5A5A40]/5 px-2 py-0.5 rounded-md">Выбрать</span>
                      ) : (
                        <span className="font-bold text-[#A67C52] bg-[#A67C52]/5 border border-[#A67C52]/15 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-[#A67C52] rounded-sm transform rotate-45 border border-[#A67C52]/30" />
                          {skin.price}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <button 
              onClick={() => { soundManager.playClick(); setActiveTab("play"); }}
              className="mt-3 w-full py-2 bg-[#5A5A40]/10 hover:bg-[#5A5A40]/20 text-[#5A5A40] font-bold rounded-xl text-[10px] uppercase transition-colors"
            >
              Назад
            </button>
          </div>
        )}

        {/* SHOP TAB */}
        {activeTab === "shop" && (
          <ShopTab 
            userProfile={userProfile} 
            onOpenPayment={onOpenPayment} 
            onSignIn={onSignIn} 
          />
        )}

        {/* CASES LOOT TAB */}
        {activeTab === "cases" && (
          <CasesTab 
            userProfile={userProfile} 
            onSignIn={onSignIn} 
            onRefreshProfile={(updated) => {
              if (onRefreshProfile) {
                onRefreshProfile(updated);
              }
            }}
          />
        )}

        {/* MULTIPLAYER TAB */}
        {activeTab === "multiplayer" && (
          <MultiplayerLobby
            room={room}
            playerId={playerId}
            onJoinRoom={onJoinRoom}
            onCreateRoom={onCreateRoom}
            onToggleReady={onToggleReady}
            onStartGame={onStartMultiplayerGame}
            onLeaveRoom={onLeaveRoom}
          />
        )}

        {/* HIGH SCORES TAB */}
        {activeTab === "scores" && (
          <div className="flex-1 flex flex-col font-sans">
            <h3 className="text-sm font-extrabold text-[#5A5A40] uppercase tracking-wider mb-1 flex items-center gap-2">
              <Trophy className="w-4.5 h-4.5 text-[#A67C52]" />
              Таблица Рекордов
            </h3>
            
            <div className="flex gap-1 my-2">
              {(["easy", "normal", "hard", "nightmare"] as Difficulty[]).map((diff) => (
                <button
                  id={`score-tab-diff-${diff}`}
                  key={diff}
                  onClick={() => { soundManager.playClick(); setDifficulty(diff); }}
                  className={`flex-1 py-1 px-1 rounded-md text-[9px] font-bold uppercase transition-all ${
                    difficulty === diff 
                      ? "bg-[#5A5A40] text-white shadow-sm" 
                      : "bg-[#5A5A40]/10 text-[#5A5A40] hover:bg-[#5A5A40]/20"
                  }`}
                >
                  {diff === "easy" ? "Легко" : diff === "normal" ? "Норм" : diff === "hard" ? "Хард" : "Кош"}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto max-h-[160px] pr-1 flex flex-col gap-1.5 scrollbar-thin">
              {highScores.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-4">
                  <Award className="w-7 h-7 text-[#5A5A40]/20 mb-1" />
                  <p className="text-[10px] font-medium text-[#5A5A40]/60">Рекордов для этого режима еще нет.</p>
                </div>
              ) : (
                highScores.map((score, index) => (
                  <div 
                    key={index}
                    className={`p-2 rounded-xl border flex items-center justify-between text-[11px] transition-all ${
                      index === 0 ? "bg-[#A67C52]/10 border-[#A67C52]/20 text-[#A67C52] font-bold" : "bg-white border-[#5A5A40]/10 text-[#5A5A40]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-4 h-4 rounded-md flex items-center justify-center text-[9px] font-extrabold ${
                        index === 0 ? "bg-[#A67C52] text-white shadow-sm" : "bg-[#5A5A40]/10 text-[#5A5A40]"
                      }`}>
                        {index + 1}
                      </span>
                      <span className="font-semibold max-w-[120px] truncate">{score.name}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="font-black text-[#A67C52]">{score.score}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button 
              onClick={() => { soundManager.playClick(); setActiveTab("play"); }}
              className="mt-3 w-full py-2 bg-[#5A5A40]/10 hover:bg-[#5A5A40]/20 text-[#5A5A40] font-bold rounded-xl text-[10px] uppercase transition-colors"
            >
              Назад
            </button>
          </div>
        )}

        {/* HOW TO PLAY HELP TAB */}
        {activeTab === "how-to" && (
          <div className="flex-1 flex flex-col justify-between font-sans">
            <div>
              <h3 className="text-sm font-extrabold text-[#5A5A40] uppercase tracking-wider mb-2.5 flex items-center gap-2">
                <Info className="w-4.5 h-4.5 text-[#A67C52]" />
                Инструкция к полету
              </h3>
              
              <div className="flex flex-col gap-2 text-[10px] text-[#5A5A40]/85 leading-relaxed">
                <div className="flex gap-2">
                  <div className="shrink-0 w-4.5 h-4.5 rounded-full bg-[#5A5A40]/10 text-[#5A5A40] font-bold flex items-center justify-center text-[10px]">1</div>
                  <p>
                    <strong className="text-[#5A5A40]">Полет:</strong> Муха плавно летит за курсором мыши или пальцем. Она имеет инерцию.
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <div className="shrink-0 w-4.5 h-4.5 rounded-full bg-[#5A5A40]/10 text-[#5A5A40] font-bold flex items-center justify-center text-[10px]">2</div>
                  <p>
                    <strong className="text-[#5A5A40]">Супер-рывок:</strong> Кушайте сахар, чтобы заполнить шкалу. Нажмите <kbd className="px-1 py-0.5 bg-[#f5f5f0] border rounded text-[9px] font-semibold text-[#5A5A40]">ПРОБЕЛ</kbd> для ускорения и неуязвимости!
                  </p>
                </div>

                <div className="flex gap-2">
                  <div className="shrink-0 w-4.5 h-4.5 rounded-full bg-[#5A5A40]/10 text-[#5A5A40] font-bold flex items-center justify-center text-[10px]">3</div>
                  <p>
                    <strong className="text-[#5A5A40]">Мультиплеер:</strong> Зовите друзей в лобби, делитесь кодом комнаты, кооперируйтесь или боритесь 1 на 1 в дуэли!
                  </p>
                </div>
              </div>
            </div>

            <button 
              onClick={() => { soundManager.playClick(); setActiveTab("play"); }}
              className="mt-3 w-full py-2 bg-[#5A5A40]/10 hover:bg-[#5A5A40]/20 text-[#5A5A40] font-bold rounded-xl text-[10px] uppercase transition-colors"
            >
              Все понятно, полетели!
            </button>
          </div>
        )}

      </div>

    </div>
  );
};
