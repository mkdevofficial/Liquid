--- logic
import { signal } from 'liquid';

const isRtl = signal(true);

function toggleDirection() {
  isRtl.set(!isRtl());
}

--- style
.container {
  display: flex;
  flex-direction: column;
  padding: 16px;
  background-color: #f8fafc;
}
.header {
  background-color: #064e3b;
  padding: 16px 20px;
  border-radius: 12px;
  margin-bottom: 14px;
}
.title {
  font-size: 18px;
  font-weight: 700;
  color: #f8fafc;
}
.card {
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
  padding: 18px;
  border-radius: 10px;
  border-width: 1px;
  border-color: #e2e8f0;
  border-inline-start-width: 4px;
  border-inline-start-color: #059669;
  margin-bottom: 14px;
}
.card-header-row {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.card-title {
  font-size: 16px;
  font-weight: 700;
  color: #065f46;
}
.badge {
  background-color: #ecfdf5;
  color: #059669;
  padding: 4px 10px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 700;
}
.body-text {
  font-size: 14px;
  color: #0f172a;
  line-height: 22px;
}
.btn {
  background-color: #059669;
  color: #ffffff;
  padding: 10px 18px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 14px;
  align-self: flex-start;
  margin-top: 12px;
}

--- ui
div.container dir="{isRtl() ? 'rtl' : 'ltr'}"
  header.header
    span.title {isRtl() ? '🌙 ليكويد ثنائي الاتجاه' : '🌙 Liquid Bidirectional'}

  div.card
    div.card-header-row
      span.card-title {isRtl() ? 'دعم العربية والاتجاه من اليمين لليسار' : 'Full RTL & LTR Logical Mirroring'}
      span.badge {isRtl() ? 'يمين ← يسار' : 'LTR Active'}

    span.body-text {isRtl() ? 'تستخدم هذه البطاقة الخصائص المنطقية border-inline-start لتعكس الحواف والمساحات بدقة متناهية على الويب ونظام أندرويد الأصلي.' : 'This card demonstrates border-inline-start and logical margins that mirror automatically without duplicate CSS.'}

    button.btn @click=toggleDirection {isRtl() ? 'التبديل إلى اليسار (LTR)' : 'Switch to RTL'}
