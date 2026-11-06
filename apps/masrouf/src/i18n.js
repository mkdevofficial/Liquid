/**
 * Masrouf i18n Dictionary & Formatting Helper
 * Supports English (LTR) and Arabic (RTL).
 */

export const translations = {
  en: {
    appTitle: 'Masrouf 🫟',
    appSubtitle: 'Personal Expense Tracker',
    dashboard: 'Dashboard',
    history: 'History',
    addTransaction: 'Add Transaction',
    editTransaction: 'Edit Transaction',
    newTransaction: 'New Transaction',
    settings: 'Settings',
    notFound: 'Page Not Found',
    notFoundDesc: 'The page you are looking for does not exist.',
    backToDashboard: 'Back to Dashboard',
    
    // Stats & Summaries
    balance: 'Total Balance',
    income: 'Income',
    expense: 'Expense',
    expenses: 'Expenses',
    totalIncome: 'Total Income',
    totalExpenses: 'Total Expenses',
    netSavings: 'Net Savings',
    breakdownByCategory: 'Expenses by Category',
    recentTransactions: 'Recent Transactions',
    viewAll: 'View All',
    
    // Form fields
    type: 'Type',
    amount: 'Amount',
    category: 'Category',
    date: 'Date',
    note: 'Note / Description',
    notePlaceholder: 'What was this transaction for?',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    confirm: 'Confirm',
    edit: 'Edit',
    loadMore: 'Load More',
    
    // Validation
    errAmount: 'Amount must be greater than zero.',
    errCategory: 'Please select a category.',
    errDate: 'Please enter a valid date.',
    
    // Filters & Search
    searchPlaceholder: 'Search by note, category...',
    allTypes: 'All Types',
    allCategories: 'All Categories',
    allMonths: 'All Months',
    sortBy: 'Sort by',
    sortNewest: 'Newest First',
    sortOldest: 'Oldest First',
    sortHighest: 'Highest Amount',
    sortLowest: 'Lowest Amount',
    
    // Dialogs & Confirmations
    confirmDeleteTitle: 'Delete Transaction?',
    confirmDeleteMsg: 'Are you sure you want to delete this transaction? This action cannot be undone.',
    confirmDeleteCategoryTitle: 'Delete Category?',
    confirmDeleteCategoryMsg: 'Are you sure you want to delete this category?',
    errCategoryInUse: 'Cannot delete category: it is used in {count} transaction(s).',
    
    // Empty states
    noTransactionsMonth: 'No transactions recorded for this month.',
    noTransactionsFound: 'No transactions match your search/filters.',
    noCategories: 'No categories available.',
    addFirstTransaction: 'Add your first transaction to get started!',
    
    // Settings
    preferences: 'Preferences',
    currency: 'Currency',
    language: 'Language',
    theme: 'Theme',
    lightTheme: 'Light',
    darkTheme: 'Dark',
    manageCategories: 'Manage Categories',
    addCategory: 'Add Category',
    categoryNameEn: 'Name (English)',
    categoryNameAr: 'Name (Arabic)',
    categoryIcon: 'Icon (Emoji)',
    categoryType: 'Category Type',
    dataManagement: 'Data Management',
    exportData: 'Export Backup (JSON)',
    importData: 'Import Backup (JSON)',
    importPlaceholder: 'Paste exported JSON backup here...',
    importSuccess: 'Data imported successfully!',
    importError: 'Invalid JSON format. Please verify the backup file.',
    usageCount: '{count} used'
  },
  ar: {
    appTitle: 'مصروف 🫟',
    appSubtitle: 'مدير المصاريف الشخصية',
    dashboard: 'لوحة التحكم',
    history: 'المعاملات',
    addTransaction: 'إضافة معاملة',
    editTransaction: 'تعديل المعاملة',
    newTransaction: 'معاملة جديدة',
    settings: 'الإعدادات',
    notFound: 'الصفحة غير موجودة',
    notFoundDesc: 'عذراً، الصفحة التي تبحث عنها غير متوفرة.',
    backToDashboard: 'العودة للوحة التحكم',
    
    // Stats & Summaries
    balance: 'الرصيد الإجمالي',
    income: 'دخل',
    expense: 'مصروف',
    expenses: 'المصروفات',
    totalIncome: 'إجمالي الدخل',
    totalExpenses: 'إجمالي المصروفات',
    netSavings: 'صافي التوفير',
    breakdownByCategory: 'توزيع المصروفات حسب التصنيف',
    recentTransactions: 'أحدث المعاملات',
    viewAll: 'عرض الكل',
    
    // Form fields
    type: 'النوع',
    amount: 'المبلغ',
    category: 'التصنيف',
    date: 'التاريخ',
    note: 'ملاحظة / وصف',
    notePlaceholder: 'في ماذا أنفقت أو من أين ورد؟',
    save: 'حفظ',
    cancel: 'إلغاء',
    delete: 'حذف',
    confirm: 'تأكيد',
    edit: 'تعديل',
    loadMore: 'تحميل المزيد',
    
    // Validation
    errAmount: 'يجب أن يكون المبلغ أكبر من صفر.',
    errCategory: 'الرجاء اختيار تصنيف.',
    errDate: 'الرجاء إدخال تاريخ صحيح.',
    
    // Filters & Search
    searchPlaceholder: 'بحث في الملاحظات أو التصنيفات...',
    allTypes: 'جميع الأنواع',
    allCategories: 'جميع التصنيفات',
    allMonths: 'جميع الأشهر',
    sortBy: 'ترتيب حسب',
    sortNewest: 'الأحدث أولاً',
    sortOldest: 'الأقدم أولاً',
    sortHighest: 'الأعلى مبلغاً',
    sortLowest: 'الأقل مبلغاً',
    
    // Dialogs & Confirmations
    confirmDeleteTitle: 'تأكيد حذف المعاملة؟',
    confirmDeleteMsg: 'هل أنت متأكد من رغبتك في حذف هذه المعاملة؟ لا يمكن التراجع عن هذا الإجراء.',
    confirmDeleteCategoryTitle: 'تأكيد حذف التصنيف؟',
    confirmDeleteCategoryMsg: 'هل أنت متأكد من رغبتك في حذف هذا التصنيف؟',
    errCategoryInUse: 'لا يمكن حذف التصنيف: مستخدم في {count} معاملة.',
    
    // Empty states
    noTransactionsMonth: 'لا توجد معاملات مسجلة في هذا الشهر.',
    noTransactionsFound: 'لا توجد معاملات تطابق شروط البحث.',
    noCategories: 'لا توجد تصنيفات متاحة.',
    addFirstTransaction: 'سجل معاملتك الأولى لتبدأ بمتابعة مصاريفك!',
    
    // Settings
    preferences: 'التفضيلات',
    currency: 'العملة',
    language: 'اللغة',
    theme: 'المظهر',
    lightTheme: 'فاتح',
    darkTheme: 'داكن',
    manageCategories: 'إدارة التصنيفات',
    addCategory: 'إضافة تصنيف جديد',
    categoryNameEn: 'الاسم (بالإنجليزية)',
    categoryNameAr: 'الاسم (بالعربية)',
    categoryIcon: 'الرمز (إيموجي)',
    categoryType: 'نوع التصنيف',
    dataManagement: 'إدارة البيانات',
    exportData: 'تصدير نسخة احتياطية (JSON)',
    importData: 'استيراد نسخة احتياطية (JSON)',
    importPlaceholder: 'الصق نص النسخة الاحتياطية JSON هنا...',
    importSuccess: 'تم استيراد البيانات بنجاح!',
    importError: 'صيغة JSON غير صحيحة. يرجى التحقق من النسخة الاحتياطية.',
    usageCount: '{count} معاملة'
  }
};

export const CURRENCIES = {
  SAR: { code: 'SAR', symbolEn: 'SAR', symbolAr: 'ر.س' },
  USD: { code: 'USD', symbolEn: '$', symbolAr: '$' },
  EUR: { code: 'EUR', symbolEn: '€', symbolAr: '€' },
  EGP: { code: 'EGP', symbolEn: 'EGP', symbolAr: 'ج.م' },
  AED: { code: 'AED', symbolEn: 'AED', symbolAr: 'د.إ' },
  MAD: { code: 'MAD', symbolEn: 'MAD', symbolAr: 'د.م' }
};

/**
 * Format currency amount with symbol according to language and currency.
 */
export function formatCurrency(amount, currencyCode = 'SAR', lang = 'en') {
  const num = Number(amount) || 0;
  const curr = CURRENCIES[currencyCode] || CURRENCIES.SAR;
  const symbol = lang === 'ar' ? curr.symbolAr : curr.symbolEn;
  const formattedNum = num.toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return lang === 'ar' ? `${formattedNum} ${symbol}` : `${symbol}${formattedNum}`;
}

/**
 * Format YYYY-MM-DD date to localized readable string.
 */
export function formatDate(dateStr, lang = 'en') {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return dateStr;

  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

/**
 * Format YYYY-MM month string (e.g. '2026-10' -> 'October 2026' / 'أكتوبر 2026').
 */
export function formatMonth(yearMonthStr, lang = 'en') {
  if (!yearMonthStr) return '';
  const str = typeof yearMonthStr === 'function' ? yearMonthStr() : String(yearMonthStr);
  const [year, month] = str.split('-').map(Number);
  if (!year || !month) return str;

  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', {
    month: 'long',
    year: 'numeric'
  });
}
