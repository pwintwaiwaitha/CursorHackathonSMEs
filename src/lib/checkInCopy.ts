import type {
  DailyCashCheckIn,
  ExpenseBreakdownLine,
  PreferredLanguage,
} from '../types/models'

export interface BilingualText {
  en: string
  my: string
}

export const CHECK_IN_COPY = {
  pageTitle: { en: 'Daily Cash Check-in', my: 'နေ့စဉ်ငွေစာရင်း' },
  pageSubtitle: {
    en: 'Fill today’s cash in and cash out. This should take less than one minute.',
    my: 'ယနေ့ ဝင်ငွေ/ထွက်ငွေကို ဖြည့်ပါ။ တစ်မိနစ်အတွင်း ပြီးအောင်လုပ်နိုင်သည်။',
  },
  date: { en: 'Date', my: 'ရက်စွဲ' },
  openingCash: {
    en: 'Opening cash (from yesterday)',
    my: 'စတင်ငွေ (မနေ့ကပိတ်ငွေ)',
  },
  openingHint: {
    en: 'This is yesterday’s closing cash. It is not typed by hand.',
    my: 'မနေ့က ပိတ်ငွေကို အလိုအလျောက်ယူသည်။ ကိုယ်တိုင်မရိုက်ရပါ။',
  },
  cashSales: {
    en: 'Cash sales received today',
    my: 'ယနေ့ရောင်းရငွေ (ငွေသား)',
  },
  customerDebtCollected: {
    en: 'Customer debt collected today',
    my: 'ယနေ့ အကြွေးပြန်ရငွေ',
  },
  creditSales: {
    en: 'Credit sales not yet collected',
    my: 'အကြွေးရောင်းငွေ (မရသေး)',
  },
  creditHint: {
    en: 'This is not cash yet. It will not change closing cash.',
    my: 'ဤငွေသည် ငွေသားမဟုတ်သေးပါ။ ပိတ်ငွေတွင် မထည့်ပါ။',
  },
  operatingExpenses: {
    en: 'Operating expenses',
    my: 'လုပ်ငန်းသုံးစရိတ်',
  },
  inventoryPurchases: {
    en: 'Inventory purchases',
    my: 'ကုန်ပစ္စည်းဝယ်ငွေ',
  },
  supplierPayments: {
    en: 'Supplier payments',
    my: 'ကုန်သည်ပေးငွေ',
  },
  otherCashReceived: {
    en: 'Other cash received',
    my: 'အခြားငွေဝင်',
  },
  otherCashPaid: {
    en: 'Other cash paid',
    my: 'အခြားငွေထွက်',
  },
  notes: { en: 'Notes', my: 'မှတ်ချက်' },
  notesPlaceholder: {
    en: 'Anything unusual today?',
    my: 'ယနေ့ ထူးခြားချက်ရှိပါသလား။',
  },
  breakdownTitle: {
    en: 'Expense breakdown (optional)',
    my: 'စရိတ်ခွဲခြမ်း (လိုအပ်လျှင်)',
  },
  breakdownHint: {
    en: 'If you add lines, operating expenses become the total of these lines.',
    my: 'စာကြောင်းထည့်ပါက လုပ်ငန်းသုံးစရိတ်သည် ဤစုစုပေါင်းဖြစ်သည်။',
  },
  addBreakdown: { en: 'Add expense line', my: 'စရိတ်စာကြောင်းထည့်ရန်' },
  remove: { en: 'Remove', my: 'ဖျက်ရန်' },
  previewTitle: { en: 'Cash calculation', my: 'ငွေတွက်ချက်မှု' },
  closingCash: { en: 'Closing cash', my: 'ပိတ်ငွေ' },
  netCash: { en: 'Net cash today', my: 'ယနေ့ အသားတင်ငွေ' },
  confirmLabel: {
    en: 'I checked the closing cash and want to save.',
    my: 'ပိတ်ငွေကို စစ်ပြီး သိမ်းမည်။',
  },
  save: { en: 'Save check-in', my: 'သိမ်းမည်' },
  savingReplace: {
    en: 'A check-in for this date already exists. Saving will replace it.',
    my: 'ဤရက်အတွက် စာရင်းရှိပြီးသား။ သိမ်းလျှင် အဟောင်းအစားထိုးမည်။',
  },
  saved: {
    en: 'Saved. Dashboard cash is updated.',
    my: 'သိမ်းပြီးပါပြီ။ ဒက်ရှ်ဘုတ်ငွေ ပြင်ဆင်ပြီး။',
  },
  seeDashboard: { en: 'See dashboard', my: 'ဒက်ရှ်ဘုတ်ကြည့်ရန်' },
  historyTitle: { en: 'Saved check-ins', my: 'သိမ်းထားသောစာရင်းများ' },
  edit: { en: 'Edit', my: 'ပြင်ရန်' },
  delete: { en: 'Delete', my: 'ဖျက်ရန်' },
  deleteConfirm: {
    en: 'Delete this day’s check-in?',
    my: 'ဤနေ့စာရင်းကို ဖျက်မလား။',
  },
  negativeWarning: {
    en: 'Negative amounts are not allowed.',
    my: 'အနှုတ်ဂဏန်း မသုံးရပါ။',
  },
  largeWarning: {
    en: 'This amount looks unusually large. Please check.',
    my: 'ဤပမာဏသည် ပုံမှန်ထက်ကြီးနေသည်။ စစ်ပါ။',
  },
  firstDayOpening: {
    en: 'No earlier check-in. Opening cash is your starting balance.',
    my: 'အရင်စာရင်းမရှိသေးပါ။ စတင်ငွေလက်ကျန်ကို သုံးသည်။',
  },
  step1: { en: '1. Money In', my: '၁. ငွေဝင်' },
  step2: { en: '2. Money Out', my: '၂. ငွေထွက်' },
  step3: { en: '3. Review', my: '၃. စစ်ဆေး' },
  next: { en: 'Next', my: 'ရှေ့သို့' },
  back: { en: 'Back', my: 'နောက်သို့' },
  confirm: { en: 'Confirm and save', my: 'အတည်ပြုပြီး သိမ်းမည်' },
  totalReceived: { en: 'Total received', my: 'စုစုပေါင်းရငွေ' },
  totalPaid: { en: 'Total paid', my: 'စုစုပေါင်းထွက်ငွေ' },
  openingAuto: {
    en: 'Opening cash is yesterday’s closing cash. You do not type this.',
    my: 'စတင်ငွေသည် မနေ့က ပိတ်ငွေဖြစ်သည်။ ကိုယ်တိုင်မရိုက်ရပါ။',
  },
  prefilledBills: {
    en: 'Bills due today were filled in. Change any amount if you did not pay yet.',
    my: 'ယနေ့ကျဘီလ်များကို ကြိုဖြည့်ထားသည်။ မပေးရသေးလျှင် ပြင်ပါ။',
  },
  creditTitle: { en: 'Credit sales', my: 'အကြွေးရောင်းငွေ' },
  draftSaved: {
    en: 'Unfinished form saved on this phone',
    my: 'မပြီးသေးသောဖောင်ကို ဤဖုန်းတွင် သိမ်းထားသည်',
  },
  undo: { en: 'Undo last save', my: 'နောက်ဆုံးသိမ်းမှု ပြန်ဖျက်' },
  undone: { en: 'Last save undone.', my: 'နောက်ဆုံးသိမ်းမှု ပြန်ဖျက်ပြီး။' },
  lastSave: { en: 'Last saved', my: 'နောက်ဆုံးသိမ်းချိန်' },
  savedOnPhone: { en: 'Saved on this phone', my: 'ဤဖုန်းတွင် သိမ်းပြီး' },
  largeConfirm: {
    en: 'I checked the unusually large amounts.',
    my: 'ပုံမှန်ထက်ကြီးသောပမာဏကို စစ်ပြီးပါပြီ။',
  },
  remainingCashWarn: {
    en: 'This is more than the cash you have left. Please check.',
    my: 'လက်ကျန်ငွေထက် များနေသည်။ စစ်ပါ။',
  },
  avgWarn: {
    en: 'This is more than 3 times your recent daily average. Please check.',
    my: 'မကြာသေးမီ ပျမ်းမျှ၏ ၃ ဆထက်များသည်။ စစ်ပါ။',
  },
  stepOf: { en: 'Step', my: 'အဆင့်' },
} as const satisfies Record<string, BilingualText>

export const EXPENSE_BREAKDOWN_LABELS: Record<
  ExpenseBreakdownLine['category'],
  BilingualText
> = {
  inventory: { en: 'Inventory', my: 'ကုန်ပစ္စည်း' },
  delivery: { en: 'Delivery', my: 'ပို့ဆောင်ခ' },
  rent: { en: 'Rent', my: 'အခန်းခ' },
  salary: { en: 'Salary', my: 'လစာ' },
  electricity: { en: 'Electricity', my: 'မီးခ' },
  marketing: { en: 'Marketing', my: 'ကြော်ငြာ' },
  transport: { en: 'Transport', my: 'သယ်ယူပို့ဆောင်' },
  other: { en: 'Other', my: 'အခြား' },
}

export function pickLine(
  text: BilingualText,
  language: PreferredLanguage,
): string {
  return language === 'my' ? text.my : text.en
}

export function bilingualLine(
  text: BilingualText,
  language: PreferredLanguage,
): string {
  if (language === 'my') {
    return `${text.my} / ${text.en}`
  }
  return `${text.en} / ${text.my}`
}

export function emptyCheckInForm(date: string): Omit<
  DailyCashCheckIn,
  'id' | 'createdAt' | 'updatedAt' | 'openingCashMmk' | 'closingCashMmk'
> {
  return {
    date,
    cashSalesMmk: 0,
    customerDebtCollectedMmk: 0,
    creditSalesMmk: 0,
    operatingExpensesMmk: 0,
    inventoryPurchasesMmk: 0,
    supplierPaymentsMmk: 0,
    otherCashReceivedMmk: 0,
    otherCashPaidMmk: 0,
    expenseBreakdowns: [],
    notes: '',
  }
}
