import React, { useState } from "react";
import { CreditCard, Loader2, Sparkles, CheckCircle2, ShieldCheck, ExternalLink } from "lucide-react";
import { buyPremiumSkinWithUSD, UserProfile } from "../lib/firebase";
import { soundManager } from "./SoundManager";

interface PaymentModalProps {
  userProfile: UserProfile | null;
  onClose: () => void;
  onPurchaseSuccess: (updatedProfile: UserProfile) => void;
  purchaseType: "sugar" | "skin" | "topup";
  itemData: {
    id: string;
    name: string;
    price: number;
    amount?: number;
    stripeUrl?: string;
  };
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  userProfile,
  onClose,
  onPurchaseSuccess,
  purchaseType,
  itemData,
}) => {
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!userProfile) return null;

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").substring(0, 16);
    const formatted = val.replace(/(\d{4})(?=\d)/g, "$1 ");
    setCardNumber(formatted);
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "").substring(0, 4);
    if (val.length >= 2) {
      val = val.substring(0, 2) + "/" + val.substring(2);
    }
    setExpiry(val);
  };

  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").substring(0, 3);
    setCvc(val);
  };

  // Triggers the real Stripe redirect checkout
  const handleStripeCheckout = () => {
    soundManager.playClick();
    const url = itemData.stripeUrl || "https://buy.stripe.com/test_eVqdR2bJjcMW5vi6xDfrW00";
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const executeSuccessfulPurchase = async () => {
    try {
      // Writes to cloud firestore users/{uid}
      await buyPremiumSkinWithUSD(userProfile.uid, "ironman", 0); // free/USD purchased
      
      const updatedProfile: UserProfile = {
        ...userProfile,
        purchasedPremiumSkins: !userProfile.purchasedPremiumSkins.includes("ironman")
          ? [...userProfile.purchasedPremiumSkins, "ironman"]
          : userProfile.purchasedPremiumSkins,
      };

      soundManager.playEat(); // celebratory success beep
      setCompleted(true);
      onPurchaseSuccess(updatedProfile);
    } catch (err) {
      setErrorMsg("Ошибка записи транзакции в базу данных. Попробуйте войти повторно.");
    }
  };

  const handleSimulatedPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardNumber || !expiry || !cvc || !cardholderName) {
      setErrorMsg("Пожалуйста, заполните реквизиты карты для симуляции.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    soundManager.playClick();

    // Simulate network latency for payment gateway
    setTimeout(async () => {
      await executeSuccessfulPurchase();
      setLoading(false);
    }, 1500);
  };

  const handleQuickUnlock = async () => {
    setLoading(true);
    soundManager.playClick();
    await executeSuccessfulPurchase();
    setLoading(false);
  };

  return (
    <div id="payment-modal-backdrop" className="fixed inset-0 bg-[#5A5A40]/40 backdrop-blur-md flex items-center justify-center z-50 p-4 font-sans select-none">
      <div className="bg-white rounded-[32px] border border-[#5A5A40]/15 shadow-2xl max-w-md w-full p-6 md:p-8 relative animate-fade-in flex flex-col gap-5 text-[#5A5A40]">
        
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#A67C52] bg-[#A67C52]/10 px-2.5 py-1 rounded-full flex items-center gap-1.5 w-fit">
              <ShieldCheck className="w-3.5 h-3.5" /> Secure Stripe Gateway
            </span>
            <h3 className="text-xl font-bold font-serif mt-2">Приобрести скин</h3>
          </div>
          <button 
            onClick={onClose} 
            className="text-[#5A5A40]/40 hover:text-[#5A5A40] text-xl font-bold p-1 cursor-pointer"
          >
            &times;
          </button>
        </div>

        {!completed ? (
          <div className="flex flex-col gap-4">
            {/* Purchase Item Card Summary */}
            <div className="p-4 bg-[#f5f5f0]/50 border border-[#5A5A40]/10 rounded-2xl flex justify-between items-center">
              <div>
                <p className="text-[10px] text-[#5A5A40]/60 uppercase tracking-wider">Товар</p>
                <p className="font-extrabold text-sm text-[#b91c1c]">{itemData.name}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-[#5A5A40]/60 uppercase tracking-wider">К оплате</p>
                <p className="font-black text-[#A67C52] text-lg">${itemData.price.toFixed(2)}</p>
              </div>
            </div>

            {/* STRIPE DIRECT CHECKOUT LINK BUTTON */}
            <div className="p-4 bg-amber-500/5 border border-amber-500/15 rounded-2xl flex flex-col gap-2.5">
              <p className="text-xs text-[#5A5A40]/80 leading-snug">
                Оплатите покупку безопасно на официальной странице Stripe Checkout по ссылке ниже:
              </p>
              <button
                onClick={handleStripeCheckout}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl hover:from-indigo-700 hover:to-violet-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <span>Перейти к оплате Stripe 💳</span>
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>

            <div className="relative my-1 text-center">
              <hr className="border-[#5A5A40]/10" />
              <span className="absolute left-1/2 transform -translate-x-1/2 -top-2 px-3 bg-white text-[9px] font-bold text-[#5A5A40]/40 uppercase tracking-widest">ИЛИ СИМУЛЯЦИЯ</span>
            </div>

            {/* Quick Demo unlock button */}
            <button
              onClick={handleQuickUnlock}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm"
            >
              🚀 Активировать Демо-доступ (Без Оплаты)
            </button>

            {/* Simulated Card form for full sandbox testing */}
            <form onSubmit={handleSimulatedPay} className="flex flex-col gap-3 mt-1">
              <p className="text-[9px] text-[#5A5A40]/55 text-center">
                Вы также можете ввести тестовые реквизиты ниже для симуляции транзакции:
              </p>
              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold uppercase text-[#5A5A40]/60">Номер Карты</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={handleCardNumberChange}
                      placeholder="4242 4242 4242 4242"
                      className="w-full bg-[#f5f5f0]/30 border border-[#5A5A40]/15 rounded-xl px-9 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#A67C52] tracking-wider placeholder-[#5A5A40]/25"
                    />
                    <CreditCard className="w-4 h-4 absolute left-3 top-2.5 text-[#5A5A40]/40" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold uppercase text-[#5A5A40]/60">Срок Действия</label>
                    <input
                      type="text"
                      value={expiry}
                      onChange={handleExpiryChange}
                      placeholder="12/28"
                      className="w-full bg-[#f5f5f0]/30 border border-[#5A5A40]/15 rounded-xl px-3 py-2 text-xs font-semibold text-center focus:outline-none focus:ring-1 focus:ring-[#A67C52] placeholder-[#5A5A40]/25"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold uppercase text-[#5A5A40]/60">CVC / CVV</label>
                    <input
                      type="password"
                      value={cvc}
                      onChange={handleCvcChange}
                      placeholder="424"
                      className="w-full bg-[#f5f5f0]/30 border border-[#5A5A40]/15 rounded-xl px-3 py-2 text-xs font-semibold text-center focus:outline-none focus:ring-1 focus:ring-[#A67C52] tracking-widest placeholder-[#5A5A40]/25"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold uppercase text-[#5A5A40]/60">Владелец Карты</label>
                  <input
                    type="text"
                    value={cardholderName}
                    onChange={(e) => setCardholderName(e.target.value.toUpperCase())}
                    placeholder="TONY STARK"
                    className="w-full bg-[#f5f5f0]/30 border border-[#5A5A40]/15 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#A67C52] placeholder-[#5A5A40]/25 uppercase"
                  />
                </div>
              </div>

              {errorMsg && (
                <p className="text-[10px] font-semibold text-red-500 bg-red-50 border border-red-100 p-2 rounded-xl text-center">
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-1 py-2.5 bg-[#5A5A40] text-white font-bold rounded-xl hover:bg-[#4a4a32] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs shadow-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Обработка...
                  </>
                ) : (
                  "Оплатить (Имитация)"
                )}
              </button>
            </form>
          </div>
        ) : (
          <div className="text-center py-6 flex flex-col items-center gap-4 animate-scale-up">
            <CheckCircle2 className="w-14 h-14 text-emerald-500 animate-bounce" />
            <div>
              <h4 className="text-lg font-bold">Облик Разблокирован!</h4>
              <p className="text-xs text-[#5A5A40]/70 mt-1 leading-relaxed">
                Высокотехнологичный костюм Железного Человека успешно добавлен в ваш профиль и сохранен в облаке Firestore.
              </p>
            </div>
            
            <button
              onClick={onClose}
              className="mt-2 px-6 py-2 bg-[#A67C52] text-white font-semibold text-xs uppercase tracking-wider rounded-xl hover:bg-[#8b5a2b] transition-all cursor-pointer shadow-sm"
            >
              Круто, полетели!
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
