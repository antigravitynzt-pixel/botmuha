import React from 'react';
import { Fly, Difficulty } from '../types';
import { Pause, Play, Zap, Heart } from 'lucide-react';
import { SKINS } from '../utils';

interface GameUIProps {
  fly: Fly;
  score: number;
  sugarsGathered: number;
  wave: number;
  isPaused: boolean;
  difficulty: Difficulty;
  onTogglePause: () => void;
  onTriggerDash: () => void;
}

export const GameUI: React.FC<GameUIProps> = ({
  fly,
  score,
  sugarsGathered,
  wave,
  isPaused,
  difficulty,
  onTogglePause,
  onTriggerDash,
}) => {
  const canDash = fly.dashEnergy >= 100;
  const isNightmare = difficulty === 'nightmare';
  const skinInfo = SKINS[fly.skin];

  // Render Hearts for lives
  const renderHearts = () => {
    const total = isNightmare ? 1 : fly.maxLives;
    const current = isNightmare ? (fly.lives > 0 ? 1 : 0) : fly.lives;
    const hearts = [];

    for (let i = 0; i < total; i++) {
      if (i < current) {
        hearts.push(
          <Heart 
            key={i} 
            className={`w-5 h-5 md:w-6 md:h-6 fill-[#A67C52] text-[#A67C52] filter drop-shadow-[0_2px_4px_rgba(166,124,82,0.2)] transform hover:scale-110 transition-transform ${
              fly.invulnerableTime > 0 ? 'animate-pulse' : ''
            }`} 
          />
        );
      } else {
        hearts.push(
          <Heart 
            key={i} 
            className="w-5 h-5 md:w-6 md:h-6 text-[#5A5A40]/20 fill-[#5A5A40]/5" 
          />
        );
      }
    }
    return hearts;
  };

  return (
    <div id="game-ui-root" className="absolute inset-0 pointer-events-none select-none flex flex-col justify-between p-4 md:p-6 z-10 font-sans">
      
      {/* TOP HEADER HUD */}
      <div className="flex justify-between items-start w-full">
        {/* Left Side: Stats (Score, Sugar, Wave) */}
        <div className="flex flex-col gap-1 md:gap-1.5 pointer-events-auto bg-white/95 border border-[#5A5A40]/15 p-3 md:p-4 rounded-[24px] shadow-sm backdrop-blur-sm text-[#5A5A40]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#5A5A40]/60 uppercase tracking-widest">Счет:</span>
            <span id="score-val" className="text-xl md:text-2xl font-black text-[#5A5A40] font-mono leading-none">
              {score}
            </span>
          </div>
          
          <div className="flex items-center gap-4 mt-1 border-t border-[#5A5A40]/10 pt-1.5">
            <div className="flex items-center gap-1.5 text-xs text-[#5A5A40]/80">
              <span className="w-2.5 h-2.5 bg-[#A67C52] rounded-sm transform rotate-45 inline-block border border-[#A67C52]/30" />
              <span>Сахар: <strong className="text-[#A67C52] font-black">{sugarsGathered}</strong></span>
            </div>
            
            <div className="flex items-center gap-1.5 text-xs text-[#5A5A40]/80">
              <span className="w-2 h-2 rounded-full bg-[#5A5A40] inline-block animate-ping" />
              <span>Волна: <strong className="text-[#5A5A40] font-black">{wave}</strong></span>
            </div>
          </div>
        </div>

        {/* Center Top: Selected Character Info */}
        <div className="hidden sm:flex flex-col items-center p-2.5 bg-white/80 border border-[#5A5A40]/10 rounded-xl shadow-sm backdrop-blur-sm text-[#5A5A40]">
          <span className="text-[10px] font-bold text-[#5A5A40]/50 uppercase tracking-wider">Вы играете за</span>
          <span className="text-xs font-bold">{skinInfo.name}</span>
        </div>

        {/* Right Side: Lives & Pause controls */}
        <div className="flex items-center gap-3">
          {/* Lives Counter Box */}
          <div className="flex items-center gap-1.5 pointer-events-auto bg-white/95 border border-[#5A5A40]/15 px-3 py-2.5 rounded-[24px] shadow-sm backdrop-blur-sm">
            <div className="flex gap-1">
              {renderHearts()}
            </div>
            {isNightmare && (
              <span className="text-[9px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded ml-1 animate-pulse border border-rose-100">
                Кошмар
              </span>
            )}
          </div>

          {/* Pause Button */}
          <button
            id="pause-btn"
            onClick={onTogglePause}
            className="pointer-events-auto p-3 rounded-2xl bg-white border border-[#5A5A40]/15 text-[#5A5A40] shadow-sm hover:bg-[#f5f5f0]/50 transition-all hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer"
          >
            {isPaused ? <Play className="w-5 h-5 fill-[#5A5A40] text-[#5A5A40]" /> : <Pause className="w-5 h-5 fill-[#5A5A40] text-[#5A5A40]" />}
          </button>
        </div>
      </div>

      {/* BOTTOM FOOTER HUD: Super Dash Trigger & Instructions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full mt-auto">
        
        {/* Left Side: Helper info for keyboards */}
        <div className="hidden md:block pointer-events-auto bg-[#5A5A40]/95 text-white/90 text-[10px] px-3.5 py-2 rounded-[20px] backdrop-blur-sm border border-[#5A5A40]/10 max-w-xs shadow-sm">
          <p className="font-medium leading-relaxed">
            💡 <strong className="text-[#A67C52] font-bold">Клавиатура:</strong> Кнопка <kbd className="px-1.5 py-0.5 bg-white/20 border border-white/30 rounded font-mono text-[9px] text-[#f5f5f0] font-bold">ПРОБЕЛ</kbd> или <strong className="text-[#A67C52]">Правый Клик</strong> для супер-рывка.
          </p>
        </div>

        {/* Center Bottom: Energy Bar & Touch-dash Button */}
        <div className="w-full sm:w-auto max-w-sm flex items-center gap-3 pointer-events-auto bg-white/95 border border-[#5A5A40]/15 p-3 md:p-4 rounded-[24px] shadow-sm backdrop-blur-sm flex-1 sm:flex-none">
          
          {/* Big Dash Button */}
          <button
            id="dash-ability-btn"
            onClick={onTriggerDash}
            disabled={!canDash}
            className={`px-4 py-3 rounded-xl font-bold text-xs md:text-sm flex items-center gap-2 transition-all cursor-pointer shadow-sm ${
              canDash 
                ? 'bg-[#A67C52] text-white hover:bg-[#8b5a2b] active:scale-95 ring-2 ring-[#A67C52]/30 animate-bounce' 
                : 'bg-[#5A5A40]/10 text-[#5A5A40]/40 border border-[#5A5A40]/10 cursor-not-allowed'
            }`}
          >
            <Zap className={`w-4 h-4 ${canDash ? 'fill-white text-white animate-pulse' : 'text-[#5A5A40]/40'}`} />
            РЫВОК!
          </button>

          {/* Dash Charge Progress bar */}
          <div className="flex-1 flex flex-col justify-center min-w-[120px] md:min-w-[150px]">
            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider mb-1 text-[#5A5A40]/60">
              <span>Энергия жужжания</span>
              <span className={canDash ? 'text-[#A67C52] font-extrabold animate-pulse' : 'font-semibold text-[#5A5A40]'}>
                {Math.round(fly.dashEnergy)}%
              </span>
            </div>
            
            {/* The bar track */}
            <div className="w-full h-3 bg-[#f5f5f0] border border-[#5A5A40]/10 rounded-full overflow-hidden p-[2px]">
              <div 
                className={`h-full rounded-full transition-all duration-75 relative overflow-hidden ${
                  canDash 
                    ? 'bg-[#5A5A40] shadow-[0_0_8px_rgba(90,90,64,0.4)]' 
                    : 'bg-[#5A5A40]/60'
                }`}
                style={{ width: `${Math.min(100, fly.dashEnergy)}%` }}
              >
                {/* Flashing light trail inside charging bar */}
                {fly.dashEnergy < 100 && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-full h-full transform -translate-x-full animate-[shimmer_1.5s_infinite]" />
                )}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* PAUSE SCREEN OVERLAY */}
      {isPaused && (
        <div id="pause-overlay" className="absolute inset-0 pointer-events-auto bg-[#5A5A40]/30 backdrop-blur-sm flex flex-col items-center justify-center z-20">
          <div className="bg-white p-8 rounded-[32px] border border-[#5A5A40]/10 shadow-2xl text-center max-w-xs w-full flex flex-col gap-5">
            <h2 className="text-2xl font-bold text-[#5A5A40] font-serif">ПОЛЕТ НА ПАУЗЕ</h2>
            <p className="text-xs text-[#5A5A40]/70 leading-relaxed font-sans">Мухобойки застыли в воздухе. Передохните и возвращайтесь к жужжанию!</p>
            
            <button
              id="resume-btn"
              onClick={onTogglePause}
              className="py-3 px-6 rounded-xl bg-[#5A5A40] text-white font-bold text-sm shadow-sm hover:bg-[#4a4a32] transition-all flex items-center justify-center gap-2 cursor-pointer font-sans"
            >
              <Play className="w-4 h-4 fill-white text-white" />
              ПРОДОЛЖИТЬ
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
