import React, { useState } from "react";
import { Gift, Sparkles, Loader2, RefreshCw, Send, HelpCircle, CheckCircle } from "lucide-react";
import { UserProfile, openCaseCloud, generateNewTelegramLinkCode } from "../lib/firebase";
import { SkinType } from "../types";
import { SKINS } from "../utils";
import { soundManager } from "./SoundManager";

interface CasesTabProps {
  userProfile: UserProfile | null;
  onSignIn: () => void;
  onRefreshProfile: (updated: UserProfile) => void;
}

export const CasesTab: React.FC<CasesTabProps> = ({ userProfile, onSignIn, onRefreshProfile }) => {
  const [status, setStatus] = useState<"idle" | "rolling" | "revealed">("idle");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [wonSkin, setWonSkin] = useState<SkinType | null>(null);
  const [wonSugars, setWonSugars] = useState<number>(0);
  const [carouselSkin, setCarouselSkin] = useState<SkinType>("classic");

  if (!userProfile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center py-6 font-sans">
        <Gift className="w-10 h-10 text-[#A67C52] mb-3 animate-pulse" />
        <h4 className="font-bold text-sm text-[#5A5A40]">Сундуки Удачи Закрыты</h4>
        <p className="text-xs text-[#5A5A40]/60 max-w-xs mt-1 mb-4 leading-relaxed">
          Чтобы получать 3 бесплатных кейса ежедневно и крутить их через Telegram-бота, авторизуйтесь!
        </p>
        <button
          onClick={onSignIn}
          className="px-5 py-2.5 bg-[#5A5A40] text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-[#4a4a32] cursor-pointer transition-all shadow-sm"
        >
          Войти через Google
        </button>
      </div>
    );
  }

  React.useEffect(() => {
    if (userProfile && !userProfile.telegramLinkCode && !userProfile.telegramLinkedId) {
      const run = async () => {
        try {
          const newCode = await generateNewTelegramLinkCode(userProfile.uid);
          onRefreshProfile({
            ...userProfile,
            telegramLinkCode: newCode
          });
        } catch (e) {
          console.warn("Auto-generating link code failed:", e);
        }
      };
      run();
    }
  }, [userProfile?.uid, userProfile?.telegramLinkCode, userProfile?.telegramLinkedId]);

  const dailyCount = userProfile.dailyCasesLeft ?? 0;
  const currentSugars = userProfile.sugars ?? 0;
  const linkCode = userProfile.telegramLinkCode ?? "------";
  const isLinked = !!userProfile.telegramLinkedId;

  // Triggers the randomized drop mechanics
  const handleOpenCase = async (isPaid: boolean) => {
    if (status === "rolling") return;
    setErrorMsg("");
    setLoading(true);
    soundManager.playClick();

    const res = await openCaseCloud(userProfile.uid, isPaid);
    setLoading(false);

    if (!res.success) {
      setErrorMsg(res.error || "Произошла непредвиденная ошибка");
      soundManager.playHit(); // buzz
      return;
    }

    // Begin rolling animation
    setStatus("rolling");
    setWonSkin(res.skinUnlocked);
    setWonSugars(res.sugarsEarned);

    // Carousel simulation sound/tick effects
    let ticks = 0;
    const skinKeys = Object.keys(SKINS) as SkinType[];
    const interval = setInterval(() => {
      const randomSkin = skinKeys[Math.floor(Math.random() * skinKeys.length)];
      setCarouselSkin(randomSkin);
      soundManager.playClick();
      ticks++;

      if (ticks >= 12) {
        clearInterval(interval);
        // Reveal!
        setStatus("revealed");
        soundManager.playEat(); // happy victory chime

        // Update local memory & parent states
        const currentlyUnlocked = [...(userProfile.unlockedSkins || [])];
        if (res.skinUnlocked && !currentlyUnlocked.includes(res.skinUnlocked)) {
          currentlyUnlocked.push(res.skinUnlocked);
        }

        const updatedProfile: UserProfile = {
          ...userProfile,
          dailyCasesLeft: isPaid ? userProfile.dailyCasesLeft : Math.max(0, dailyCount - 1),
          sugars: isPaid ? Math.max(0, currentSugars - 100) : currentSugars + res.sugarsEarned,
          unlockedSkins: currentlyUnlocked,
        };
        onRefreshProfile(updatedProfile);
      }
    }, 120);
  };

  const resetToIdle = () => {
    setStatus("idle");
    setWonSkin(null);
    setWonSugars(0);
  };

  return (
    <div className="flex-1 flex flex-col font-sans text-[#5A5A40] justify-between h-full">
      {status === "idle" && (
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#A67C52] flex items-center gap-1.5">
                <Gift className="w-4 h-4 text-[#A67C52]" /> Кейсы Удачи
              </h4>
              <span className="text-[10px] bg-[#5A5A40]/10 px-2 py-0.5 rounded-full font-bold">
                Бесплатно сегодня: <strong className="text-[#A67C52]">{dailyCount}/3</strong>
              </span>
            </div>

            {/* Main cases layout */}
            <div className="grid grid-cols-2 gap-3 mt-1">
              {/* Daily free box option */}
              <div className="p-3 border border-[#5A5A40]/15 rounded-xl bg-gradient-to-b from-[#f5f5f0]/30 to-white flex flex-col items-center text-center justify-between min-h-[110px]">
                <div className="relative">
                  <span className="text-2xl animate-bounce inline-block">🎁</span>
                  {dailyCount > 0 && (
                    <span className="absolute -top-1 -right-2 bg-red-500 text-white font-extrabold text-[8px] px-1.5 py-0.5 rounded-full">
                      {dailyCount}
                    </span>
                  )}
                </div>
                <div>
                  <h5 className="font-extrabold text-[10px] uppercase">Ежедневный Кейс</h5>
                  <p className="text-[8px] text-[#5A5A40]/60 mt-0.5 leading-tight">Случайный скин или куча сахара каждый день</p>
                </div>
                <button
                  disabled={dailyCount <= 0 || loading}
                  onClick={() => handleOpenCase(false)}
                  className={`mt-2 w-full py-1.5 rounded-lg text-[9px] font-extrabold uppercase transition-all ${
                    dailyCount > 0
                      ? "bg-[#A67C52] text-white hover:bg-[#8b5a2b]"
                      : "bg-[#5A5A40]/15 text-[#5A5A40]/40 cursor-not-allowed"
                  }`}
                >
                  {loading ? "Думаем..." : "Открыть"}
                </button>
              </div>

              {/* Paid sugar box option */}
              <div className="p-3 border border-[#eab308]/30 rounded-xl bg-amber-500/5 flex flex-col items-center text-center justify-between min-h-[110px]">
                <span className="text-2xl filter drop-shadow-[0_2px_4px_rgba(234,179,8,0.2)]">👑</span>
                <div>
                  <h5 className="font-extrabold text-[10px] uppercase text-[#A67C52]">Платный Кейс</h5>
                  <p className="text-[8px] text-[#5A5A40]/60 mt-0.5 leading-tight">Больше шансов на редкие золотые и эксклюзивные скины</p>
                </div>
                <button
                  disabled={currentSugars < 100 || loading}
                  onClick={() => handleOpenCase(true)}
                  className={`mt-2 w-full py-1.5 rounded-lg text-[9px] font-extrabold uppercase transition-all flex items-center justify-center gap-1 ${
                    currentSugars >= 100
                      ? "bg-[#5A5A40] text-white hover:bg-[#4a4a32]"
                      : "bg-[#5A5A40]/10 text-[#5A5A40]/40 cursor-not-allowed"
                  }`}
                >
                  <span>Купить</span>
                  <span className="bg-amber-100 text-[#A67C52] font-black px-1 rounded">100 🍬</span>
                </button>
              </div>
            </div>

            {errorMsg && (
              <p className="text-[9px] text-red-500 font-semibold text-center mt-2 bg-red-50 py-1 rounded border border-red-100">
                ⚠️ {errorMsg}
              </p>
            )}
          </div>

          {/* TELEGRAM BOT LINK PANEL */}
          <div className="mt-2.5 p-2.5 border border-cyan-400/20 bg-cyan-500/5 rounded-xl flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase text-cyan-700 tracking-wider flex items-center gap-1">
                🤖 Интеграция с Telegram
              </span>
              {isLinked ? (
                <span className="text-[8px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                  <CheckCircle className="w-2.5 h-2.5" /> Активен
                </span>
              ) : (
                <span className="text-[8px] bg-cyan-100 text-cyan-800 font-bold px-1.5 py-0.5 rounded">
                  Связать аккаунт
                </span>
              )}
            </div>
            
            <p className="text-[8px] text-[#5A5A40]/75 leading-tight">
              Откройте бота и отправьте код ниже. Выбивайте кейсы прямо в Telegram — они мгновенно перейдут на этот аккаунт!
            </p>

            <div className="flex items-center gap-2 mt-0.5">
              <div className="flex-1 bg-white border border-cyan-400/20 rounded-lg px-2.5 py-1 flex items-center justify-between min-h-[34px]">
                <span className="text-[9px] text-[#5A5A40]/50 uppercase font-bold">Код привязки:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-black text-xs text-cyan-700 tracking-widest">
                    {userProfile.telegramLinkCode || "------"}
                  </span>
                  <button
                    onClick={async () => {
                      soundManager.playClick();
                      try {
                        const newCode = await generateNewTelegramLinkCode(userProfile.uid);
                        onRefreshProfile({
                          ...userProfile,
                          telegramLinkCode: newCode
                        });
                      } catch (e) {
                        console.error("Failed to manual refresh pairing code:", e);
                      }
                    }}
                    title="Создать новый код"
                    className="p-1 text-cyan-600 hover:text-cyan-800 hover:bg-cyan-50 rounded transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 animate-hover-spin" />
                  </button>
                </div>
              </div>
              
              <a
                href="https://t.me/SugarFlyCaseBot"
                target="_blank"
                rel="noreferrer"
                className="bg-cyan-500 hover:bg-cyan-600 text-white font-extrabold text-[9px] uppercase px-3 py-2 rounded-lg flex items-center gap-1 transition-all"
              >
                <span>Бот</span>
                <Send className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}

      {status === "rolling" && (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
          <div className="w-16 h-16 rounded-full border-4 border-dashed border-[#A67C52] flex items-center justify-center animate-spin relative">
            <Gift className="w-8 h-8 text-[#A67C52]" />
          </div>
          
          <h4 className="font-black text-sm uppercase tracking-wider text-[#A67C52] mt-4 animate-pulse">Крутим Кейс...</h4>
          
          {/* Animated skin carousel selector */}
          <div className="mt-3 px-3 py-1 bg-[#5A5A40]/5 rounded-full border border-[#5A5A40]/10 text-[10px] font-bold text-[#5A5A40]">
            ⚡ {SKINS[carouselSkin]?.name || "Поиск..."}
          </div>
        </div>
      )}

      {status === "revealed" && (
        <div className="flex-1 flex flex-col items-center justify-between text-center py-2 animate-scale-up">
          <div className="flex flex-col items-center">
            <span className="text-3xl animate-bounce">✨ Поздравляем! ✨</span>
            
            {wonSkin ? (
              <div className="mt-4 p-4 border border-[#A67C52]/30 rounded-2xl bg-gradient-to-br from-amber-500/5 to-[#A67C52]/5 flex flex-col items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center border-2 shadow-md relative overflow-hidden"
                  style={{ backgroundColor: SKINS[wonSkin]?.color, borderColor: SKINS[wonSkin]?.accessoryColor }}
                >
                  <div className="absolute top-1 left-1.5 w-2.5 h-2.5 bg-red-600 rounded-full" />
                  <div className="absolute top-1 right-1.5 w-2.5 h-2.5 bg-red-600 rounded-full" />
                  <div className="w-7 h-1.5 bg-white/40 transform rotate-45 rounded-full" />
                </div>

                <div>
                  <h4 className="font-black text-xs text-[#A67C52] uppercase tracking-wide">
                    Выпал Скин: {SKINS[wonSkin]?.name}
                  </h4>
                  <p className="text-[9px] text-[#5A5A40]/70 max-w-[200px] mt-1 leading-tight">
                    {SKINS[wonSkin]?.description}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-4 p-4 border border-[#eab308]/30 rounded-2xl bg-yellow-50/50 flex flex-col items-center gap-2">
                <span className="text-3xl">🍬</span>
                <div>
                  <h4 className="font-black text-xs text-amber-600 uppercase tracking-wide">
                    Выпало Сахара: +{wonSugars}
                  </h4>
                  <p className="text-[9px] text-[#5A5A40]/70 max-w-[200px] mt-1">
                    Сладкое золото добавлено прямо на ваш баланс.
                  </p>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={resetToIdle}
            className="mt-4 w-full py-2 bg-[#5A5A40] text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl hover:bg-[#4a4a32] transition-colors"
          >
            Отлично!
          </button>
        </div>
      )}
    </div>
  );
};
