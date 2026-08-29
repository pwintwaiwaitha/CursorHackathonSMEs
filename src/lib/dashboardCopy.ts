import type { PreferredLanguage } from '../types/models'
import { bilingualLine, pickLine, type BilingualText } from './checkInCopy'

export const DASHBOARD_COPY = {
  homeTitle: { en: 'Home', my: 'ပင်မစာမျက်နှာ' },
  homeSubtitle: {
    en: 'See if the shop is safe today, then record today’s cash.',
    my: 'ဆိုင်ယနေ့ အဆင်ပြေမပြေ ကြည့်ပြီး ငွေစာရင်းတင်ပါ။',
  },
  statusSafe: { en: 'Your business is safe today', my: 'သင့်လုပ်ငန်း ယနေ့ အန္တရာယ်မရှိပါ' },
  statusAttention: {
    en: 'Your cash flow needs attention',
    my: 'ငွေလည်ပတ်မှုကို ဂရုစိုက်ရန်လိုသည်',
  },
  statusHighRisk: {
    en: 'High cash-shortage risk',
    my: 'ငွေပြတ်မည့် အန္တရာယ်မြင့်သည်',
  },
  currentCash: { en: 'Current Cash', my: 'လက်ရှိငွေသား' },
  currentCashHint: {
    en: 'Closing cash from your latest check-in',
    my: 'နောက်ဆုံးစာရင်းမှ ပိတ်ငွေ',
  },
  safeToSpend: { en: 'Safe to Spend', my: 'သုံးလို့ရသောငွေ' },
  safeToSpendTip: {
    en: 'Cash on hand minus bills due in 7 days, minus your emergency reserve if you set one. This is not a new forecast.',
    my: 'လက်ရှိငွေမှ ၇ ရက်အတွင်းပေးရန်ဘီလ်နှင့် အရန်ငွေ (သတ်မှတ်ထားလျှင်) နုတ်သည်။ ခန့်မှန်းချက်အသစ်မဟုတ်ပါ။',
  },
  nextShortage: { en: 'Next Shortage Date', my: 'ငွေပြတ်မည့်ရက်' },
  noShortage: { en: 'No shortage seen', my: 'ငွေပြတ်မည့်ရက် မတွေ့ရသေး' },
  upcomingPayment: { en: 'Upcoming Payment', my: 'နောက်ထပ်ပေးရန်' },
  noUpcoming: { en: 'No bill waiting', my: 'စောင့်နေသောဘီလ်မရှိ' },
  addToday: { en: 'Add Today’s Record', my: 'ယနေ့စာရင်းထည့်ရန်' },
  editToday: { en: 'Edit Today’s Record', my: 'ယနေ့စာရင်းပြင်ရန်' },
  speakInstead: { en: 'Speak Instead', my: 'စကားပြော၍ထည့်ရန်' },
  listening: { en: 'Listening… tap to stop', my: 'နားထောင်နေသည်… ရပ်ရန်နှိပ်ပါ' },
  speechUnsupported: {
    en: 'Voice is not available on this phone. Type today’s record instead. Your books still save on this phone.',
    my: 'ဤဖုန်းတွင် အသံသုံး၍မရပါ။ စာရိုက်၍ ထည့်ပါ။ စာရင်းသည် ဤဖုန်းတွင်ပင် သိမ်းသည်။',
  },
  speechHint: {
    en: 'Voice only fills notes. It will not guess amounts.',
    my: 'အသံသည် မှတ်ချက်သာဖြည့်သည်။ ပမာဏကို ခန့်မှန်းမည်မဟုတ်။',
  },
  recommended: { en: 'Do these next', my: 'ယခုလုပ်ရန်' },
  timeline: { en: 'Next 7 days of payments', my: 'လာမည့် ၇ ရက် ပေးချေမှု' },
  advanced: { en: 'More charts', my: 'ပိုမိုသောဇယားများ' },
  savedOnPhone: { en: 'Saved on this phone', my: 'ဤဖုန်းတွင် သိမ်းပြီး' },
  noBooks: {
    en: 'Add today’s cash record to see if the shop is safe.',
    my: 'ဆိုင်အဆင်ပြေမပြေ သိရန် ယနေ့ငွေစာရင်း ထည့်ပါ။',
  },
  none: { en: 'None', my: 'မရှိ' },
  whyAmount: { en: 'Why this amount?', my: 'ဤပမာဏ အဘယ်ကြောင့်နည်း။' },
  whyAmountBody: {
    en: 'Safe to spend is today’s cash, minus bills you must pay in the next 7 days, minus your emergency reserve. If that number is below zero, safe to spend is 0 MMK and the gap is shown.',
    my: 'သုံးရန်လုံခြုံသောငွေ = လက်ရှိငွေသား − ၇ ရက်အတွင်း မဖြစ်မနေပေးရမည့်ဘီလ် − အရေးပေါ်စုငွေ။ အနုတ်ဖြစ်လျှင် သုံးရန်လုံခြုံသောငွေသည် ၀ MMK ဖြစ်ပြီး လိုအပ်ချက်ကို ပြသည်။',
  },
  reservedBills: { en: 'Reserved for essential bills', my: 'မဖြစ်မနေဘီလ်အတွက် ချန်ထားငွေ' },
  emergencyReserve: { en: 'Emergency reserve', my: 'အရေးပေါ်စုငွေ' },
  cashGap: { en: 'Expected cash gap', my: 'မျှော်မှန်းငွေလိုအပ်ချက်' },
  lastUpdated: { en: 'Last updated', my: 'နောက်ဆုံးပြင်ဆင်ချိန်' },
  confidence: { en: 'Forecast confidence', my: 'ခန့်မှန်းချက်ယုံကြည်မှု' },
  hideAmounts: { en: 'Hide amounts', my: 'ပမာဏကို ဖုံးရန်' },
  showAmounts: { en: 'Show amounts', my: 'ပမာဏကို ပြရန်' },
  recordSale: { en: 'Record Sale', my: 'ရောင်းရငွေမှတ်ရန်' },
  receiveQr: { en: 'Receive QR', my: 'QR လက်ခံရန်' },
  paySupplier: { en: 'Pay Supplier', my: 'ကုန်သည်ပေးရန်' },
  addReserve: { en: 'Add to Reserve', my: 'အရန်ငွေတိုးရန်' },
  quickActions: { en: 'Quick actions', my: 'အမြန်လုပ်ဆောင်ချက်' },
  actionCenter: { en: 'Today’s Action Center', my: 'ယနေ့ လုပ်ရန်စာရင်း' },
  markDone: { en: 'Mark as completed', my: 'ပြီးပြီဟု မှတ်ရန်' },
  due: { en: 'Due', my: 'ကျရက်' },
  priority: { en: 'Priority', my: 'ဦးစားပေး' },
  weekTimeline: { en: 'Next 7 days', my: 'လာမည့် ၇ ရက်' },
  lowCashDay: { en: 'Predicted low-cash day', my: 'ငွေအနည်းဆုံးရက်' },
  viewDetails: { en: 'View Financial Details', my: 'ငွေကြေးအသေးစိတ်ကြည့်ရန်' },
  cashCover: { en: 'Cash Cover', my: 'ငွေဖုံးလွှမ်းမှု' },
  cashCoverTip: {
    en: 'Current cash divided by your average daily essential cash out (operating + inventory + supplier + other paid from check-ins). Needs at least 7 days of expense records. If the average is 0, this is not calculated.',
    my: 'လက်ရှိငွေသားကို ပျမ်းမျှ နေ့စဉ် မရှိမဖြစ်ထွက်ငွေ (လုပ်ငန်းသုံး + ကုန် + ကုန်သည် + အခြားပေးငွေ) ဖြင့် စားသည်။ အနည်းဆုံး ၇ ရက် ကုန်ကျစာရင်း လိုသည်။ ပျမ်းမျှ ၀ ဖြစ်လျှင် မတွက်ပါ။',
  },
  notEnoughData: { en: 'Not enough data', my: 'အချက်အလက် မလုံလောက်သေး' },
  moreThanYear: { en: 'More than 12 months', my: '၁၂ လကျော်' },
  lowest14: { en: 'Lowest in 14 Days', my: '၁၄ ရက်အတွင်း အနိမ့်ဆုံး' },
  noMovements: {
    en: 'No scheduled movements yet',
    my: 'စီစဉ်ထားသော ငွေဝင်/ထွက် မရှိသေး',
  },
  addBills: { en: 'Add bills', my: 'ဘီလ်ထည့်ရန်' },
  earlyEstimate: { en: 'Early estimate', my: 'ကနဦးခန့်မှန်း' },
  healthScore: { en: 'Health Score', my: 'ကျန်းမာရေးအမှတ်' },
  howHealth: { en: 'How is this calculated?', my: 'ဤအမှတ်ကို မည်သို့တွက်သနည်း။' },
  howHealthBody: {
    en: 'This uses the existing cash-flow health check. It looks at current cash versus recent daily expenses, then the 14-day forecast risk and any shortage date. It is not a new scoring engine.',
    my: 'ရှိပြီးသား ငွေလည်ပတ်မှု စစ်ဆေးချက်ကို သုံးသည်။ လက်ရှိငွေနှင့် နေ့စဉ်ကုန်ကျ၊ ၁၄ ရက် ခန့်မှန်းချက် အန္တရာယ်နှင့် ငွေပြတ်ရက်ကို ကြည့်သည်။ အမှတ်ပေးစနစ်အသစ် မဟုတ်ပါ။',
  },
  totalReceivables: { en: 'Total receivables', my: 'စုစုပေါင်း ရရန်ရှိငွေ' },
  gapSupplier: {
    en: 'Supplier payment is due before collections arrive.',
    my: 'ကုန်သည်ပေးရန်သည် ဖောက်သည်ငွေမရမီ ကျသည်။',
  },
  gapBills: {
    en: 'Large bills are reserved from cash this week.',
    my: 'ဤအပတ်တွင် ကြီးသောဘီလ်များကို ငွေမှ ချန်ထားသည်။',
  },
  language: { en: 'Language', my: 'ဘာသာစကား' },
  saleAmount: { en: 'Cash sale amount', my: 'ငွေသားရောင်းရငွေ' },
  saveSale: { en: 'Save sale', my: 'ရောင်းရငွေသိမ်းရန်' },
  saleSaved: { en: 'Sale saved in today’s check-in.', my: 'ယနေ့စာရင်းတွင် ရောင်းရငွေသိမ်းပြီး။' },
  supplierName: { en: 'Supplier or bill name', my: 'ကုန်သည် သို့မဟုတ် ဘီလ်အမည်' },
  markPaid: { en: 'Mark bill paid', my: 'ပေးပြီးဟု မှတ်ရန်' },
  addBill: { en: 'Add supplier bill', my: 'ကုန်သည်ဘီလ်ထည့်ရန်' },
  reserveAdd: { en: 'Amount to add to reserve target', my: 'အရန်ပစ်မှတ်သို့ တိုးမည့်ပမာဏ' },
  reserveSave: { en: 'Update reserve target', my: 'အရန်ပစ်မှတ် ပြင်ရန်' },
  reserveHint: {
    en: 'This only updates your emergency reserve target. It does not move money in a bank.',
    my: 'ဤသည် အရေးပေါ်စုငွေ ပစ်မှတ်ကိုသာ ပြင်သည်။ ဘဏ်သို့ ငွေမရွှေ့ပါ။',
  },
  qrTitle: { en: 'Receive payment', my: 'ငွေလက်ခံရန်' },
  qrHint: {
    en: 'Show this code at the counter, or copy the note for Wave / KBZ Pay. Record the sale after money arrives.',
    my: 'ကောင်တာတွင် ဤကုဒ်ကို ပြပါ၊ သို့မဟုတ် Wave / KBZ Pay မှတ်ချက်ကို ကူးပါ။ ငွေရသောအခါ ရောင်းရငွေမှတ်ပါ။',
  },
  amountToCollect: { en: 'Amount to collect', my: 'ကောက်ခံမည့်ပမာဏ' },
  copyNote: { en: 'Copy payment note', my: 'ငွေပေးမှတ်ချက် ကူးရန်' },
  shareNote: { en: 'Share', my: 'မျှဝေရန်' },
  copied: { en: 'Copied', my: 'ကူးပြီး' },
  close: { en: 'Close', my: 'ပိတ်ရန်' },
  alerts: { en: 'Alerts', my: 'သတိပေးချက်' },
  reminders: { en: 'Reminder settings', my: 'သတိပေးအချိန်' },
} as const satisfies Record<string, BilingualText>

export function dashLine(
  key: keyof typeof DASHBOARD_COPY,
  language: PreferredLanguage,
): string {
  return bilingualLine(DASHBOARD_COPY[key], language)
}

export function dashPrimary(
  key: keyof typeof DASHBOARD_COPY,
  language: PreferredLanguage,
): string {
  return pickLine(DASHBOARD_COPY[key], language)
}
