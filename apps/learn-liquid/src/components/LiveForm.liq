--- logic
import { signal, computed } from 'liquid';

const username = signal('');
const email = signal('');
const role = signal('developer');
const submitted = signal(false);

const isUsernameValid = computed(() => username.value.trim().length >= 3);
const isEmailValid = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim()));
const isFormValid = computed(() => isUsernameValid() && isEmailValid());

function handleSubmit() {
  if (isFormValid()) {
    submitted.value = true;
  }
}

function handleReset() {
  username.value = '';
  email.value = '';
  role.value = 'developer';
  submitted.value = false;
}

--- style
.form-box {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  padding: 1.5rem;
  box-shadow: var(--shadow-sm);
  max-width: 480px;
  margin: 0 auto;
}

.form-header {
  margin-bottom: 1.25rem;
}

.form-title {
  font-size: 1.1rem;
  font-weight: 800;
  margin: 0 0 0.25rem;
  color: var(--text-primary);
}

.form-desc {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin: 0;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 1rem;
}

.field-label {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text-primary);
}

.field-input, .field-select {
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 0.6rem 0.85rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-family: inherit;
  outline: none;
  transition: all 0.15s ease;
}

.field-input:focus, .field-select:focus {
  border-color: var(--primary);
}

.field-error {
  font-size: 0.72rem;
  color: var(--danger);
  font-weight: 600;
}

.submit-btn {
  background: var(--primary);
  color: white;
  border: none;
  padding: 0.75rem 1.25rem;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  width: 100%;
  font-family: inherit;
  transition: all 0.15s ease;
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.submit-btn:not(:disabled):hover {
  background: var(--primary-hover);
}

.result-card {
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 1.25rem;
  margin-top: 1rem;
  text-align: center;
}

.res-title {
  color: var(--success);
  font-weight: 800;
  margin: 0 0 0.5rem;
}

.res-info {
  font-size: 0.85rem;
  color: var(--text-primary);
  line-height: 1.5;
  margin: 0 0 0.85rem;
}

.reset-link {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 0.4rem 0.85rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

--- ui
div.form-box
  div.form-header
    h3.form-title نموذج تفاعلي مع التحقق الفوري
    p.form-desc يجري التحقق مع كل حرف مكتوب عبر الإشارات بدون إعادة تصيير الصفحة.

  if submitted.value
    div.result-card
      h4.res-title تم إرسال البيانات بنجاح! ✓
      p.res-info مرحباً {username.value}! تم تسجيل بريدك ({email.value}) بدور {role.value}.
      button.reset-link type="button" @click=handleReset تسجيل حساب آخر
  else
    div.field
      span.field-label اسم المستخدم (3 أحرف على الأقل)
      input.field-input type="text" placeholder="مثال: ahmed_coder" $bind=username
      if username.value.length > 0 && !isUsernameValid()
        span.field-error الاسم يجب أن يتكون من 3 أحرف على الأقل!

    div.field
      span.field-label البريد الإلكتروني
      input.field-input type="email" placeholder="name@example.com" $bind=email
      if email.value.length > 0 && !isEmailValid()
        span.field-error الرجاء كتابة بريد إلكتروني صالح!

    div.field
      span.field-label الدور / التخصص
      select.field-select $bind=role
        option value="developer" مطور واجهات ويب (Frontend)
        option value="fullstack" مطور متكامل (Full-Stack)
        option value="designer" مصمم واجهات (UI/UX)
        option value="student" طالب / متعلم جديد

    button.submit-btn type="button" disabled={!isFormValid()} @click=handleSubmit إرسال التسجيل
