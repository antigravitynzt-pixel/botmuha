import React, { useState, useEffect } from 'react';
import { Difficulty, SkinType, HighScore } from '../types';
import { SKINS, getSavedSugars, saveSugars, saveHighScore, getHighScores } from '../utils';
import { soundManager } from './SoundManager';
import { Trophy, RotateCcw, Home, Award, Calendar, Zap, RefreshCw } from 'lucide-react';

interface GameOverProps {
  score: number;
  sugarsGathered: number;
  survivalTime: number; // in seconds
  nearMisses: number;
  difficulty: Difficulty;
  skin: SkinType;
  onRestart: () => void;
  onGoToMenu: () => void;
}

export const GameOver: React.FC<GameOverProps> = ({
  score,
  sugarsGathered,
  survivalTime,
  nearMisses,
  difficulty,
  skin,
  onRestart,
  onGoToMenu,
}) => {
  const [name, setName] = useState<string>('');
  const [highScores, setHighScores] = useState<HighScore[]>([]);
  const [saved, setSaved] = useState<boolean>(false);
  const [totalSugars, setTotalSugars] = useState<number>(0);

  useEffect(() => {
    // Play Game Over tune
    soundManager.playGameOver();

    // Load last saved name and high scores
    const lastName = localStorage.getItem('fly_game_player_name') || 'Безумная Муха';
    setName(lastName);

    // Save sugars gathered to permanent storage
    const currentSugars = getSavedSugars();
    const newTotal = currentSugars + sugarsGathered;
    saveSugars(newTotal);
    setTotalSugars(newTotal);

    // Fetch existing scoreboard
    setHighScores(getHighScores(difficulty));
  }, [difficulty, sugarsGathered]);

  const handleSaveScore = (e: React.FormEvent) => {
    e.preventDefault();
    if (saved) return;

    soundManager.playClick();
    localStorage.setItem('fly_game_player_name', name);
    const updated = saveHighScore(name, score, difficulty);
    setHighScores(updated);
    setSaved(true);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const difficultyLabels: Record<Difficulty, string> = {
    easy: 'Легко',
    normal: 'Нормально',
    hard: 'Тяжело',
    nightmare: 'Кошмар'
  };

  return (
    <div id="game-over-root" className="w-full h-full p-6 md:p-8 bg-white/95 text-[#5A5A40] rounded-[32px] border border-[#5A5A40]/15 shadow-xl flex flex-col md:flex-row gap-8 relative overflow-hidden select-none animate-fade-in font-serif">
      
      {/* Decorative Natural Tones background shapes */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#A67C52]/5 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#5A5A40]/5 rounded-full blur-3xl pointer-events-none animate-pulse" />

      {/* LEFT SIDE: GAME OVER SUMMARY & HIGHLIGHTS */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          {/* Header Banner */}
          <div className="text-center md:text-left">
            <span className="inline-block px-3 py-1 bg-[#A67C52]/10 border border-[#A67C52]/20 text-[#A67C52] text-[10px] font-bold uppercase tracking-widest rounded-full mb-3 animate-pulse font-sans">
              Мухобойка победила!
            </span>
            <h1 className="text-4xl md:text-5xl font-black text-[#5A5A40] leading-none">
              ИГРА<br />
              <span className="text-[#A67C52] font-bold font-serif">ОКОНЧЕНА</span>
            </h1>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-2 gap-3 mt-6 font-sans">
            <div className="p-3.5 bg-[#f5f5f0]/60 border border-[#5A5A40]/10 rounded-2xl flex flex-col justify-center shadow-sm">
              <span className="text-[10px] font-bold text-[#5A5A40]/50 uppercase tracking-wider">Финальный Счет</span>
              <span className="text-2xl font-black text-[#A67C52] font-mono mt-0.5">{score}</span>
            </div>

            <div className="p-3.5 bg-[#f5f5f0]/60 border border-[#5A5A40]/10 rounded-2xl flex flex-col justify-center shadow-sm">
              <span className="text-[10px] font-bold text-[#5A5A40]/50 uppercase tracking-wider">Время Полета</span>
              <span className="text-2xl font-black text-[#5A5A40] font-mono mt-0.5">{formatTime(survivalTime)}</span>
            </div>

            <div className="p-3.5 bg-[#f5f5f0]/60 border border-[#5A5A40]/10 rounded-2xl flex flex-col justify-center shadow-sm">
              <span className="text-[10px] font-bold text-[#5A5A40]/50 uppercase tracking-wider">Собрано Сахара</span>
              <span className="text-2xl font-black text-[#A67C52] font-mono mt-0.5 flex items-center gap-1">
                +{sugarsGathered}
                <span className="text-xs font-semibold text-[#5A5A40]/50">(Всего: {totalSugars})</span>
              </span>
            </div>

            <div className="p-3.5 bg-[#f5f5f0]/60 border border-[#5A5A40]/10 rounded-2xl flex flex-col justify-center shadow-sm">
              <span className="text-[10px] font-bold text-[#5A5A40]/50 uppercase tracking-wider">Опасных Уклонений</span>
              <span className="text-2xl font-black text-[#5A5A40] font-mono mt-0.5 flex items-center gap-1.5">
                {nearMisses}
                <span className="text-[9px] px-1.5 py-0.5 bg-[#5A5A40]/10 text-[#5A5A40] rounded font-bold uppercase tracking-wider scale-90">Бонус</span>
              </span>
            </div>
          </div>

          {/* Save High Score Form */}
          {!saved && score > 0 ? (
            <form onSubmit={handleSaveScore} className="mt-6 p-4 bg-[#f5f5f0]/40 border border-[#5A5A40]/10 rounded-2xl shadow-inner font-sans">
              <label htmlFor="fly-name-input" className="block text-[11px] font-bold text-[#5A5A40]/80 uppercase tracking-wider mb-2">
                Записать ваш результат в таблицу лидеров?
              </label>
              <div className="flex gap-2">
                <input
                  id="fly-name-input"
                  type="text"
                  maxLength={16}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Имя мухи..."
                  className="flex-1 bg-white border border-[#5A5A40]/15 rounded-xl px-3.5 py-2 text-sm text-[#5A5A40] font-bold placeholder-[#5A5A40]/40 focus:outline-none focus:ring-1 focus:ring-[#A67C52]"
                  required
                />
                <button
                  id="save-score-btn"
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#5A5A40] hover:bg-[#4a4a32] text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm font-sans"
                >
                  Записать
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-6 p-4 bg-[#f5f5f0]/20 border border-[#5A5A40]/10 text-center rounded-2xl text-xs font-semibold text-[#5A5A40]/60 font-sans">
              {score === 0 ? 'Жужжите усерднее в следующий раз!' : 'Ваш рекорд успешно сохранен в таблице лидеров!'}
            </div>
          )}
        </div>

        {/* Play Again CTAs */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <button
            id="restart-game-btn"
            onClick={() => { soundManager.playClick(); onRestart(); }}
            className="flex-1 py-3.5 px-6 rounded-2xl bg-[#5A5A40] text-white font-extrabold text-sm shadow-md hover:bg-[#4a4a32] active:bg-[#32321c] hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 cursor-pointer font-sans"
          >
            <RotateCcw className="w-4 h-4" />
            ПОЛЕТЕТЬ ЕЩЕ РАЗ
          </button>
          
          <button
            id="back-to-menu-btn"
            onClick={() => { soundManager.playClick(); onGoToMenu(); }}
            className="flex-1 py-3.5 px-6 rounded-2xl bg-white text-[#5A5A40] font-bold text-sm border border-[#5A5A40]/15 hover:bg-[#f5f5f0]/40 transition-all flex items-center justify-center gap-2 cursor-pointer font-sans shadow-sm"
          >
            <Home className="w-4 h-4 text-[#A67C52]" />
            В ГЛАВНОЕ МЕНЮ
          </button>
        </div>
      </div>

      {/* RIGHT SIDE: LEADERBOARD OF THE CHOSEN DIFFICULTY */}
      <div className="flex-1 bg-white rounded-2xl border border-[#5A5A40]/10 p-5 md:p-6 flex flex-col shadow-sm font-sans">
        <div className="flex items-center justify-between mb-4 border-b border-[#5A5A40]/10 pb-3">
          <h3 className="text-base font-bold text-[#5A5A40] flex items-center gap-2 font-serif">
            <Trophy className="w-4.5 h-4.5 text-[#A67C52]" />
            Рекорды ({difficultyLabels[difficulty]})
          </h3>
          <span className="text-[10px] font-bold text-[#5A5A40]/50 uppercase font-mono tracking-wider">Топ-10</span>
        </div>

        <div className="flex-1 overflow-y-auto max-h-[300px] pr-1 flex flex-col gap-2 scrollbar-thin">
          {highScores.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-10 text-[#5A5A40]/40">
              <Award className="w-8 h-8 mb-2 text-[#5A5A40]/30" />
              <p className="text-xs font-semibold">Рекорды для этого режима отсутствуют.</p>
              <p className="text-[10px] mt-1">Оставьте свой след первым!</p>
            </div>
          ) : (
            highScores.map((score, index) => {
              return (
                <div 
                  key={index}
                  className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
                    index === 0 
                      ? 'bg-[#A67C52]/5 border-[#A67C52]/30 text-[#A67C52] font-bold' 
                      : 'bg-[#f5f5f0]/40 border-[#5A5A40]/10 text-[#5A5A40]/80'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-extrabold ${
                      index === 0 ? 'bg-[#A67C52] text-white font-bold shadow-sm' : 'bg-[#5A5A40]/10 text-[#5A5A40]'
                    }`}>
                      {index + 1}
                    </span>
                    <span className="font-semibold text-[#5A5A40] max-w-[130px] truncate">{score.name}</span>
                  </div>
                  
                  <div className="flex items-center gap-2.5 font-mono text-xs">
                    <span className="font-extrabold text-[#A67C52]">{score.score}</span>
                    <span className="text-[9px] text-[#5A5A40]/40 font-sans">{score.date}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
};
