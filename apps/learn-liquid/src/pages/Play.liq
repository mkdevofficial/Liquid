--- logic
import { signal, computed, effect } from 'liquid';
import { lang } from '../store.js';
import {
  SEASONS,
  getSeason,
  loadProfile,
  saveProfile,
  getRankInfo,
  playSound
} from '../play-data.js';

// Reactive Profile State
const profile = signal(loadProfile());

// Persist profile updates
effect(() => {
  saveProfile(profile());
});

// UI View State
const activeSeasonId = signal(profile().activeSeasonId || 1);
const activeModal = signal(null); // { type: 'episode' | 'exam' | 'cert', data: ... }
const feedbackMessage = signal('');
const feedbackType = signal(''); // 'success' | 'error' | ''
const userCode = signal('');
const quizSelectedOption = signal(null);
const quizSubmitted = signal(false);

// Exam State
const examQuestionIndex = signal(0);
const examAnswers = signal([]); // array of selected options
const examFinished = signal(false);
const examScorePercent = signal(0);

// Rank & Progress computations
const rank = computed(() => getRankInfo(profile().xp));

const progressPercent = computed(() => {
  const current = profile().xp - rank().currentBase;
  const target = rank().nextXp - rank().currentBase;
  if (target <= 0) return 100;
  return Math.min(100, Math.max(0, Math.round((current / target) * 100)));
});

const activeSeason = computed(() => getSeason(activeSeasonId()));

function toggleSound() {
  const current = profile();
  profile.set({
    ...current,
    soundEnabled: !current.soundEnabled
  });
}

function selectSeason(id) {
  if (!profile().unlockedSeasons[id]) {
    feedbackType.value = 'error';
    feedbackMessage.value = lang() === 'ar'
      ? '🔒 هذا الموسم مغلق! يجب اجتياز امتحان الموسم السابق أولاً لفتحه.'
      : '🔒 This season is locked! Pass the previous season exam to unlock it.';
    playSound('error', profile().soundEnabled);
    setTimeout(() => { feedbackMessage.value = ''; }, 3500);
    return;
  }
  activeSeasonId.value = id;
  const p = profile();
  profile.set({ ...p, activeSeasonId: id });
}

function openEpisode(ep) {
  feedbackMessage.value = '';
  feedbackType.value = '';
  quizSelectedOption.value = null;
  quizSubmitted.value = false;
  userCode.value = ep.starterCode || '';
  activeModal.value = { type: 'episode', ep };
}

function closeModal() {
  activeModal.value = null;
  examFinished.value = false;
  examQuestionIndex.value = 0;
  examAnswers.value = [];
}

function verifyCodeChallenge() {
  const modal = activeModal();
  if (!modal || modal.type !== 'episode') return;
  const ep = modal.ep;

  const result = ep.validate(userCode());
  if (result.success) {
    feedbackType.value = 'success';
    feedbackMessage.value = lang() === 'ar'
      ? `🎉 أحسنت صنعاً! الكود صحيح 100% وحصلت على +${ep.xp} XP!`
      : `🎉 Excellent! Code validated successfully. +${ep.xp} XP earned!`;

    const p = profile();
    const isFirstTime = !p.completedEpisodes[ep.id];
    const prevLevel = getRankInfo(p.xp).level;
    const newXp = isFirstTime ? p.xp + ep.xp : p.xp;
    const newLevel = getRankInfo(newXp).level;

    profile.set({
      ...p,
      xp: newXp,
      completedEpisodes: {
        ...p.completedEpisodes,
        [ep.id]: true
      }
    });

    if (newLevel > prevLevel) {
      playSound('levelup', p.soundEnabled);
    } else {
      playSound('success', p.soundEnabled);
    }
  } else {
    feedbackType.value = 'error';
    feedbackMessage.value = lang() === 'ar' ? result.msgAr : result.msgEn;
    playSound('error', profile().soundEnabled);
  }
}

function selectQuizOption(index) {
  if (quizSubmitted.value) return;
  quizSelectedOption.value = index;
}

function submitQuizAnswer() {
  const modal = activeModal();
  if (!modal || modal.type !== 'episode') return;
  const ep = modal.ep;
  if (quizSelectedOption.value === null) return;

  quizSubmitted.value = true;
  const isCorrect = quizSelectedOption.value === ep.correctIndex;

  if (isCorrect) {
    feedbackType.value = 'success';
    feedbackMessage.value = lang() === 'ar'
      ? `🌟 إجابة صحيحة تماماً! +${ep.xp} XP`
      : `🌟 Correct answer! +${ep.xp} XP`;

    const p = profile();
    const isFirstTime = !p.completedEpisodes[ep.id];
    const prevLevel = getRankInfo(p.xp).level;
    const newXp = isFirstTime ? p.xp + ep.xp : p.xp;
    const newLevel = getRankInfo(newXp).level;

    profile.set({
      ...p,
      xp: newXp,
      completedEpisodes: {
        ...p.completedEpisodes,
        [ep.id]: true
      }
    });

    if (newLevel > prevLevel) {
      playSound('levelup', p.soundEnabled);
    } else {
      playSound('success', p.soundEnabled);
    }
  } else {
    feedbackType.value = 'error';
    feedbackMessage.value = lang() === 'ar'
      ? `❌ إجابة غير صحيحة. التوضيح: ${ep.explanationAr}`
      : `❌ Incorrect. Explanation: ${ep.explanationEn}`;
    playSound('error', profile().soundEnabled);
  }
}

// Boss Exam Handling
function startExam(season) {
  feedbackMessage.value = '';
  feedbackType.value = '';
  examQuestionIndex.value = 0;
  examAnswers.value = [];
  examFinished.value = false;
  examScorePercent.value = 0;
  activeModal.value = { type: 'exam', season };
}

function selectExamOption(qIndex, optIndex) {
  const answers = [...examAnswers()];
  answers[qIndex] = optIndex;
  examAnswers.value = answers;
}

function nextExamQuestion() {
  const modal = activeModal();
  if (!modal || modal.type !== 'exam') return;
  const total = modal.season.exam.questions.length;
  if (examQuestionIndex() < total - 1) {
    examQuestionIndex.value = examQuestionIndex() + 1;
  }
}

function prevExamQuestion() {
  if (examQuestionIndex() > 0) {
    examQuestionIndex.value = examQuestionIndex() - 1;
  }
}

function finishExam() {
  const modal = activeModal();
  if (!modal || modal.type !== 'exam') return;
  const season = modal.season;
  const questions = season.exam.questions;
  const answers = examAnswers();

  let correctCount = 0;
  questions.forEach((q, idx) => {
    if (answers[idx] === q.correct) {
      correctCount++;
    }
  });

  const percent = Math.round((correctCount / questions.length) * 100);
  examScorePercent.value = percent;
  examFinished.value = true;

  const passed = percent >= season.examThreshold;
  const p = profile();
  const isFirstPass = !p.passedExams[season.id];

  if (passed) {
    const prevLevel = getRankInfo(p.xp).level;
    const addedXp = isFirstPass ? season.exam.rewardXp : 0;
    const newXp = p.xp + addedXp;
    const newLevel = getRankInfo(newXp).level;

    const nextSeasonId = season.id + 1;
    const nextUnlocked = { ...p.unlockedSeasons };
    if (SEASONS.some(s => s.id === nextSeasonId)) {
      nextUnlocked[nextSeasonId] = true;
    }

    profile.set({
      ...p,
      xp: newXp,
      passedExams: {
        ...p.passedExams,
        [season.id]: true
      },
      examScores: {
        ...p.examScores,
        [season.id]: percent
      },
      unlockedSeasons: nextUnlocked
    });

    playSound('exam', p.soundEnabled);
  } else {
    playSound('error', p.soundEnabled);
  }
}

function resetAllProgress() {
  if (typeof window !== 'undefined') {
    const confirmMsg = lang() === 'ar'
      ? 'هل أنت متأكد من رغبتك في إعادة تعيين كافة نقاط XP والتقدم والمواسم؟'
      : 'Are you sure you want to reset all XP points, seasons, and progress?';
    if (window.confirm(confirmMsg)) {
      localStorage.removeItem('liquid_play_profile_v1');
      profile.value = loadProfile();
      activeSeasonId.value = 1;
      feedbackType.value = 'success';
      feedbackMessage.value = lang() === 'ar' ? 'تمت إعادة ضبط التقدم بنجاح.' : 'Progress reset successfully.';
      setTimeout(() => { feedbackMessage.value = ''; }, 3000);
    }
  }
}

--- style
.play-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1.25rem 5rem;
  color: var(--text-primary);
}

/* Gaming HUD Banner */
.hud-card {
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95));
  border: 1px solid rgba(56, 189, 248, 0.3);
  border-radius: 20px;
  padding: 1.75rem 2rem;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.1);
  margin-bottom: 2.5rem;
  position: relative;
  overflow: hidden;
}

.hud-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1.25rem;
  margin-bottom: 1.25rem;
}

.player-info {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.avatar-badge {
  font-size: 2.5rem;
  background: rgba(2, 132, 199, 0.2);
  border: 2px solid var(--primary);
  width: 68px;
  height: 68px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 18px;
  box-shadow: 0 0 20px rgba(2, 132, 199, 0.4);
}

.player-details h2 {
  font-size: 1.5rem;
  font-weight: 800;
  margin: 0;
  background: linear-gradient(90deg, #38bdf8, #818cf8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hud-badges {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.hud-pill {
  background: rgba(255, 255, 255, 0.08);
  padding: 0.4rem 0.85rem;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 700;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.hud-btn {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #fff;
  padding: 0.45rem 0.9rem;
  border-radius: 10px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 700;
  transition: all 0.2s ease;
}

.hud-btn:hover {
  background: rgba(255, 255, 255, 0.18);
  transform: translateY(-1px);
}

.xp-progress-bar-bg {
  width: 100%;
  height: 14px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 999px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
}

.xp-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #0284c7, #38bdf8, #818cf8);
  border-radius: 999px;
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 0 12px rgba(56, 189, 248, 0.6);
}

.xp-stats {
  display: flex;
  justify-content: space-between;
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: #94a3b8;
  font-weight: 600;
}

/* Season Navigator */
.seasons-nav {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1.25rem;
  margin-bottom: 2.5rem;
}

.season-tab {
  background: var(--bg-card);
  border: 2px solid var(--border-color);
  border-radius: 16px;
  padding: 1.25rem;
  cursor: pointer;
  transition: all 0.25s ease;
  position: relative;
  text-align: inherit;
}

.season-tab:hover {
  border-color: var(--primary);
  transform: translateY(-2px);
}

.season-tab.active {
  border-color: #38bdf8;
  background: linear-gradient(135deg, rgba(2, 132, 199, 0.12), rgba(129, 140, 248, 0.08));
  box-shadow: 0 6px 20px rgba(2, 132, 199, 0.2);
}

.season-tab.locked {
  opacity: 0.6;
  filter: grayscale(0.6);
  cursor: not-allowed;
}

.season-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.season-badge-icon {
  font-size: 1.8rem;
}

.season-trophy {
  font-size: 1.2rem;
}

.season-title {
  font-size: 1.05rem;
  font-weight: 800;
  margin: 0 0 0.4rem;
}

.season-meta {
  font-size: 0.8rem;
  color: var(--text-muted);
}

/* Episodes Grid */
.episodes-section h3 {
  font-size: 1.4rem;
  font-weight: 800;
  margin-bottom: 0.5rem;
}

.episodes-desc {
  color: var(--text-muted);
  margin-bottom: 1.5rem;
  font-size: 0.95rem;
}

.episodes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.25rem;
  margin-bottom: 2.5rem;
}

.episode-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 1.35rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.episode-card:hover {
  border-color: var(--primary);
  transform: translateY(-3px);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.15);
}

.episode-card.completed {
  border-color: rgba(16, 185, 129, 0.4);
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.04), transparent);
}

.ep-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.ep-type-pill {
  font-size: 0.75rem;
  padding: 0.25rem 0.55rem;
  border-radius: 6px;
  font-weight: 700;
  background: rgba(2, 132, 199, 0.15);
  color: var(--primary);
}

.ep-xp-pill {
  font-size: 0.8rem;
  font-weight: 800;
  color: #f59e0b;
}

.ep-title {
  font-size: 1.05rem;
  font-weight: 700;
  margin: 0 0 0.5rem;
}

.ep-summary {
  font-size: 0.85rem;
  color: var(--text-muted);
  line-height: 1.5;
  margin-bottom: 1rem;
}

.ep-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid var(--border-color);
  padding-top: 0.75rem;
  font-size: 0.85rem;
}

.btn-open-ep {
  background: var(--primary);
  color: #fff;
  border: none;
  padding: 0.45rem 0.9rem;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
}

/* Boss Exam Card */
.boss-banner {
  background: linear-gradient(135deg, #1e1b4b, #31104b);
  border: 2px solid #8b5cf6;
  border-radius: 20px;
  padding: 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1.5rem;
  box-shadow: 0 12px 32px rgba(139, 92, 246, 0.25);
}

.boss-title {
  font-size: 1.4rem;
  font-weight: 800;
  color: #f3e8ff;
  margin: 0 0 0.5rem;
}

.boss-desc {
  color: #d8b4fe;
  font-size: 0.95rem;
  margin: 0;
  max-width: 600px;
}

.btn-boss {
  background: linear-gradient(90deg, #8b5cf6, #ec4899);
  color: #fff;
  border: none;
  padding: 0.85rem 1.75rem;
  border-radius: 12px;
  font-size: 1.05rem;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 6px 20px rgba(236, 72, 153, 0.4);
  transition: transform 0.2s ease;
}

.btn-boss:hover {
  transform: scale(1.03);
}

/* Modal Overlay */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  animation: fadeIn 0.2s ease-out;
}

.modal-content {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  max-width: 800px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
}

.modal-header {
  padding: 1.25rem 1.75rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 800;
}

.modal-close {
  background: transparent;
  border: none;
  font-size: 1.5rem;
  color: var(--text-muted);
  cursor: pointer;
}

.modal-body {
  padding: 1.5rem 1.75rem;
  overflow-y: auto;
}

.lesson-box {
  background: rgba(2, 132, 199, 0.08);
  border: 1px solid rgba(2, 132, 199, 0.2);
  border-radius: 12px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
  font-size: 0.95rem;
  line-height: 1.6;
}

.challenge-box {
  border-top: 1px solid var(--border-color);
  padding-top: 1.25rem;
}

.code-editor-area {
  width: 100%;
  height: 140px;
  background: #0f172a;
  color: #38bdf8;
  font-family: 'Fira Code', monospace;
  font-size: 0.9rem;
  padding: 1rem;
  border-radius: 10px;
  border: 1px solid #334155;
  resize: vertical;
  margin-bottom: 1rem;
  box-sizing: border-box;
}

.quiz-option-btn {
  width: 100%;
  text-align: inherit;
  padding: 1rem 1.25rem;
  margin-bottom: 0.75rem;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  background: var(--bg-card);
  color: var(--text-primary);
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.quiz-option-btn:hover {
  border-color: var(--primary);
  background: var(--primary-glow);
}

.quiz-option-btn.selected {
  border-color: #38bdf8;
  background: rgba(56, 189, 248, 0.15);
  font-weight: 700;
}

.feedback-alert {
  padding: 0.9rem 1.25rem;
  border-radius: 10px;
  font-weight: 700;
  margin-bottom: 1rem;
  font-size: 0.95rem;
}

.feedback-alert.success {
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid #10b981;
  color: #10b981;
}

.feedback-alert.error {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid #ef4444;
  color: #ef4444;
}

.btn-primary-action {
  background: var(--primary);
  color: #fff;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 10px;
  font-weight: 800;
  font-size: 1rem;
  cursor: pointer;
}

/* Exam Screen */
.exam-header-bar {
  display: flex;
  justify-content: space-between;
  margin-bottom: 1rem;
  color: var(--text-muted);
  font-size: 0.9rem;
  font-weight: 700;
}

.exam-nav-btns {
  display: flex;
  justify-content: space-between;
  margin-top: 1.5rem;
}

.exam-summary-card {
  text-align: center;
  padding: 2rem 1rem;
}

.exam-result-score {
  font-size: 3.5rem;
  font-weight: 900;
  margin: 1rem 0;
  background: linear-gradient(90deg, #10b981, #06b6d4);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

--- ui
div.play-page
  if feedbackMessage.value
    div.feedback-alert class={feedbackType.value} {feedbackMessage.value}

  // --- Gaming HUD Header ---
  div.hud-card
    div.hud-top
      div.player-info
        div.avatar-badge {activeSeason().badge}
        div.player-details
          h2 {lang() === 'ar' ? rank().titleAr : rank().titleEn}
          p style="margin: 0; color: #94a3b8; font-size: 0.85rem;" {lang() === 'ar' ? 'أكاديمية ليكويد التفاعلية — المستوى ' + rank().level : 'Liquid Academy — Level ' + rank().level}

      div.hud-badges
        span.hud-pill 🔥 {profile().streak} {lang() === 'ar' ? 'أيام متتالية' : 'Day Streak'}
        span.hud-pill 🏆 {Object.keys(profile().passedExams).length} / 4 {lang() === 'ar' ? 'مواسم مكتملة' : 'Seasons'}
        button.hud-btn type="button" @click=toggleSound title="الصوت / Sound"
          span {profile().soundEnabled ? '🔊 صوت مفعّل' : '🔇 صامت'}
        button.hud-btn type="button" @click=resetAllProgress title="إعادة التعيين" 🔄

    div.xp-progress-bar-bg
      div.xp-progress-fill style={"width: " + progressPercent() + "%;"}

    div.xp-stats
      span {profile().xp} XP
      span {lang() === 'ar' ? 'المستوى القادم: ' + rank().nextXp + ' XP' : 'Next Level: ' + rank().nextXp + ' XP'}

  // --- Seasons Navigator Tabs ---
  div.seasons-nav
    each SEASONS as s (s.id)
      div.season-tab class={(activeSeasonId() === s.id ? 'active' : '') + (!profile().unlockedSeasons[s.id] ? ' locked' : '')} @click=selectSeason(s.id)
        div.season-header-row
          span.season-badge-icon {s.badge}
          if profile().passedExams[s.id]
            span.season-trophy 🏆
          elseif !profile().unlockedSeasons[s.id]
            span.season-trophy 🔒
        h4.season-title {lang() === 'ar' ? s.titleAr : s.titleEn}
        p.season-meta {s.episodes.length} {lang() === 'ar' ? 'كبسولات تفاعلية' : 'Micro-lessons'} • {s.totalXp} XP

  // --- Active Season Content & Episodes ---
  div.episodes-section
    h3 {lang() === 'ar' ? activeSeason().titleAr : activeSeason().titleEn}
    p.episodes-desc {lang() === 'ar' ? activeSeason().descriptionAr : activeSeason().descriptionEn}

    div.episodes-grid
      each activeSeason().episodes as ep (ep.id)
        div.episode-card class={profile().completedEpisodes[ep.id] ? 'completed' : ''} @click=openEpisode(ep)
          div
            div.ep-header
              span.ep-type-pill {ep.type === 'code' ? (lang() === 'ar' ? '💻 تحدي برمجي' : '💻 Code') : (lang() === 'ar' ? '🧠 اختبار سريع' : '🧠 Quiz')}
              span.ep-xp-pill +{ep.xp} XP
            h4.ep-title {lang() === 'ar' ? ep.titleAr : ep.titleEn}
            p.ep-summary {lang() === 'ar' ? ep.summaryAr : ep.summaryEn}
          div.ep-footer
            if profile().completedEpisodes[ep.id]
              span style="color: #10b981; font-weight: 700;" ✓ {lang() === 'ar' ? 'تم الإنجاز' : 'Completed'}
            else
              span style="color: var(--text-muted);" ⏳ {lang() === 'ar' ? 'جاهز للتحدي' : 'Ready'}
            button.btn-open-ep {profile().completedEpisodes[ep.id] ? (lang() === 'ar' ? 'مراجعة' : 'Review') : (lang() === 'ar' ? 'ابدأ الكبسولة' : 'Start')}

    // --- End-of-Season Boss Exam Banner ---
    div.boss-banner
      div
        h4.boss-title {lang() === 'ar' ? activeSeason().exam.titleAr : activeSeason().exam.titleEn}
        p.boss-desc {lang() === 'ar' ? 'اختبر كل ما تعلمته في هذا الموسم! النجاح بنسبة 80% يفتح الموسم التالي ويمنحك شارة التميز و +' + activeSeason().exam.rewardXp + ' XP.' : 'Test everything in this season! Passing at 80% unlocks the next season and grants +' + activeSeason().exam.rewardXp + ' XP.'}
      div
        if profile().passedExams[activeSeason().id]
          button.btn-boss @click=startExam(activeSeason()) 🏆 {lang() === 'ar' ? 'إعادة الاختبار (النتيجة: ' + profile().examScores[activeSeason().id] + '%)' : 'Retake Exam (' + profile().examScores[activeSeason().id] + '%)'}
        else
          button.btn-boss @click=startExam(activeSeason()) ⚔️ {lang() === 'ar' ? 'بدء امتحان نهاية الموسم' : 'Start Boss Exam'}

  // --- Modal: Episode Interactive Challenge ---
  if activeModal() && activeModal().type === 'episode'
    div.modal-overlay
      div.modal-content
        div.modal-header
          h3 {lang() === 'ar' ? activeModal().ep.titleAr : activeModal().ep.titleEn}
          button.modal-close @click=closeModal ✕
        div.modal-body
          div.lesson-box
            p style="margin: 0; white-space: pre-line;" {lang() === 'ar' ? activeModal().ep.theoryAr : activeModal().ep.theoryEn}

          if feedbackMessage.value
            div.feedback-alert class={feedbackType.value} {feedbackMessage.value}

          div.challenge-box
            if activeModal().ep.type === 'code'
              p style="font-weight: 700; margin-bottom: 0.5rem;" {lang() === 'ar' ? activeModal().ep.challengePromptAr : activeModal().ep.challengePromptEn}
              textarea.code-editor-area $bind=userCode
              button.btn-primary-action @click=verifyCodeChallenge 🚀 {lang() === 'ar' ? 'فحص الكود والترجمة المباشرة' : 'Verify & Live Compile'}
            else
              p style="font-weight: 700; margin-bottom: 1rem;" {lang() === 'ar' ? activeModal().ep.questionAr : activeModal().ep.questionEn}
              each activeModal().ep.options as opt (opt)
                button.quiz-option-btn class={quizSelectedOption() === activeModal().ep.options.indexOf(opt) ? 'selected' : ''} @click=selectQuizOption(activeModal().ep.options.indexOf(opt)) {opt}
              div style="margin-top: 1rem;"
                button.btn-primary-action @click=submitQuizAnswer 🎯 {lang() === 'ar' ? 'تأكيد الإجابة' : 'Submit Answer'}

  // --- Modal: Boss Exam Arena ---
  if activeModal() && activeModal().type === 'exam'
    div.modal-overlay
      div.modal-content
        div.modal-header
          h3 {lang() === 'ar' ? activeModal().season.exam.titleAr : activeModal().season.exam.titleEn}
          button.modal-close @click=closeModal ✕
        div.modal-body
          if !examFinished()
            div.exam-header-bar
              span {lang() === 'ar' ? 'السؤال ' + (examQuestionIndex() + 1) + ' من ' + activeModal().season.exam.questions.length : 'Question ' + (examQuestionIndex() + 1) + ' of ' + activeModal().season.exam.questions.length}
              span ⚔️ {lang() === 'ar' ? 'نسبة النجاح المطلوبة: ' + activeModal().season.examThreshold + '%' : 'Pass: ' + activeModal().season.examThreshold + '%'}

            h4 style="font-size: 1.15rem; margin-bottom: 1.25rem;" {lang() === 'ar' ? activeModal().season.exam.questions[examQuestionIndex()].qAr : activeModal().season.exam.questions[examQuestionIndex()].qEn}

            each activeModal().season.exam.questions[examQuestionIndex()].options as opt (opt)
              button.quiz-option-btn class={examAnswers()[examQuestionIndex()] === activeModal().season.exam.questions[examQuestionIndex()].options.indexOf(opt) ? 'selected' : ''} @click=selectExamOption(examQuestionIndex(), activeModal().season.exam.questions[examQuestionIndex()].options.indexOf(opt)) {opt}

            div.exam-nav-btns
              if examQuestionIndex() > 0
                button.hud-btn @click=prevExamQuestion ← {lang() === 'ar' ? 'السابق' : 'Previous'}
              else
                span
              if examQuestionIndex() < activeModal().season.exam.questions.length - 1
                button.btn-primary-action @click=nextExamQuestion {lang() === 'ar' ? 'التالي' : 'Next'} →
              else
                button.btn-primary-action @click=finishExam 🏁 {lang() === 'ar' ? 'إنهاء وحساب النتيجة' : 'Finish & Grade'}
          else
            div.exam-summary-card
              div.exam-result-score {examScorePercent()}%
              if examScorePercent() >= activeModal().season.examThreshold
                h3 style="color: #10b981; margin: 0 0 0.5rem;" 🎉 {lang() === 'ar' ? 'مبارك! لقد اجتزت امتحان الموسم بنجاح!' : 'Congratulations! You passed the season exam!'}
                p style="color: var(--text-muted); margin-bottom: 1.5rem;" {lang() === 'ar' ? 'تم فتح الموسم التالي وحصلت على +' + activeModal().season.exam.rewardXp + ' XP و ' + activeModal().season.badgeNameAr : 'Next season unlocked! +' + activeModal().season.exam.rewardXp + ' XP earned.'}
              else
                h3 style="color: #ef4444; margin: 0 0 0.5rem;" 🔄 {lang() === 'ar' ? 'لم تجتز النسبة المطلوبة (80%)' : 'Did not pass (80% required)'}
                p style="color: var(--text-muted); margin-bottom: 1.5rem;" {lang() === 'ar' ? 'راجع كبسولات الموسم وحاول مجدداً لتفوز بالشارة!' : 'Review the season lessons and retry to win the badge!'}

              button.btn-primary-action @click=closeModal {lang() === 'ar' ? 'إغلاق ومتابعة التعلم' : 'Close and Continue'}
