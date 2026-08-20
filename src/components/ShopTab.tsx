import React from "react";
import { Sparkles, Gem, ShieldCheck, Zap, ExternalLink } from "lucide-react";
import { UserProfile } from "../lib/firebase";

interface ShopTabProps {
  userProfile: UserProfile | null;
  onOpenPayment: (type: "sugar" | "skin" | "topup", item: any) => void;
  onSignIn: () => void;
}

export const ShopTab: React.FC<ShopTabProps> = ({ userProfile, onOpenPayment, onSignIn }) => {
  if (!userProfile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center py-10 font-sans">
        <Gem className="w-10 h-10 text-[#A67C52] mb-3 animate-pulse" />
        <h4 className="font-bold text-sm text-[#5A5A40]">Премиум Магазин Закрыт</h4>
        <p className="text-xs text-[#5A5A40]/60 max-w-xs mt-1 mb-4 leading-relaxed">
          Чтобы приобрести уникальный платный скин «Железный Человек» через Stripe, войдите в свой профиль!
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

  const ironManSkin = {
    id: "ironman",
    name: "Муха Железный Человек",
    description: "Броня из золото-титанового сплава, встроенные репульсоры и реактивные крылья. Летает на сверхзвуковых скоростях!",
    color: "#b91c1c",
    wingColor: "rgba(234, 179, 8, 0.7)",
    accessoryColor: "#eab308",
    priceUSD: 4.99,
    stripeUrl: "https://buy.stripe.com/test_eVqdR2bJjcMW5vi6xDfrW00"
  };

  const isPurchased = userProfile.purchasedPremiumSkins?.includes("ironman");

  const handleBuyClick = () => {
    // Open the secure payment selection screen
    onOpenPayment("skin", ironManSkin);
  };

  return (
    <div className="flex-1 flex flex-col font-sans text-[#5A5A40] justify-between">
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#A67C52] mb-3 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-[#eab308]" /> Эксклюзивное Предложение
        </h4>

        {/* Featured Product Card */}
        <div className="p-4 border-2 border-[#eab308]/30 rounded-2xl bg-gradient-to-br from-amber-500/5 to-red-500/5 relative overflow-hidden flex flex-col gap-3">
          {/* Visual fly representation badge */}
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center border-2 border-[#eab308] shadow-md relative overflow-hidden shrink-0 bg-[#b91c1c]"
            >
              {/* Golden reactor core / armor face plates design */}
              <div className="absolute top-1 left-1.5 w-2.5 h-2.5 rounded-full bg-cyan-300 opacity-95 shadow-[0_0_4px_#22d3ee]" />
              <div className="absolute top-1 right-1.5 w-2.5 h-2.5 rounded-full bg-cyan-300 opacity-95 shadow-[0_0_4px_#22d3ee]" />
              <div className="w-6 h-2 bg-[#eab308] transform rotate-45 rounded-full opacity-60" />
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <h5 className="font-extrabold text-xs text-[#b91c1c] uppercase tracking-wide">
                  {ironManSkin.name}
                </h5>
                <span className="text-[8px] bg-red-100 text-red-700 font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                  Премиум
                </span>
              </div>
              <p className="text-[10px] text-[#5A5A40]/75 leading-tight mt-1">
                {ironManSkin.description}
              </p>
            </div>
          </div>

          {/* High-tech bullet points */}
          <div className="bg-white/80 border border-[#5A5A40]/5 p-2 rounded-xl text-[9px] flex flex-col gap-1 text-[#5A5A40]/80">
            <div className="flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-[#eab308] shrink-0" />
              <span>Яркие золотисто-энергетические искрящиеся крылья</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-[#eab308] shrink-0" />
              <span>Собственный светящийся миниатюрный реактор на спине</span>
            </div>
          </div>
        </div>
      </div>

      {/* Buying Action Button Area */}
      <div className="mt-4 pt-3 border-t border-[#5A5A40]/10 flex flex-col gap-2">
        {isPurchased ? (
          <div className="w-full py-2.5 bg-emerald-50 text-emerald-700 font-extrabold text-xs uppercase tracking-wider rounded-xl text-center border border-emerald-200">
            ✓ Облик успешно разблокирован!
          </div>
        ) : (
          <button
            onClick={handleBuyClick}
            className="w-full py-2.5 bg-gradient-to-r from-[#b91c1c] to-[#eab308] hover:from-[#991b1b] hover:to-[#d97706] text-white font-extrabold text-xs uppercase tracking-widest rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
          >
            Приобрести за $4.99
          </button>
        )}

        <div className="flex items-center justify-center gap-1.5 text-[9px] text-[#5A5A40]/55">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Официальный защищенный шлюз Stripe Checkout.
        </div>
      </div>
    </div>
  );
};
