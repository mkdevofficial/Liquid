--- logic
import { t } from '../i18n.js';
import { copyToClipboard } from '../store.js';
import { navigate } from '../router.js';
import LiveCounter from '../components/LiveCounter.liq';
import LiveTodo from '../components/LiveTodo.liq';
import { signal } from 'liquid';

const activeDemoTab = signal('counter');

function setTab(tab) {
  activeDemoTab.value = tab;
}

--- style
.home-page {
  display: flex;
  flex-direction: column;
  gap: 3.5rem;
  padding-bottom: 4rem;
}

.hero {
  text-align: center;
  padding: 4rem 1.5rem 2.5rem;
  max-width: 860px;
  margin: 0 auto;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--primary-glow);
  color: var(--primary);
  border: 1px solid var(--border-color);
  padding: 0.35rem 0.95rem;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
}

.hero-title {
  font-size: 3rem;
  font-weight: 900;
  line-height: 1.2;
  margin: 0 0 1.25rem;
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, var(--text-primary) 30%, var(--primary) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-desc {
  font-size: 1.15rem;
  color: var(--text-muted);
  line-height: 1.7;
  margin: 0 auto 2rem;
  max-width: 720px;
}

.hero-cta {
  display: flex;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 2.5rem;
}

.cta-btn {
  padding: 0.85rem 1.75rem;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
}

.cta-btn.primary {
  background: var(--primary);
  color: white;
  border: none;
  box-shadow: 0 8px 20px -4px var(--primary-glow);
}

.cta-btn.primary:hover {
  background: var(--primary-hover);
  transform: translateY(-2px);
}

.cta-btn.secondary {
  background: var(--bg-card);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.cta-btn.secondary:hover {
  background: var(--bg-hover);
  border-color: var(--primary);
}

.cta-btn.play {
  background: linear-gradient(135deg, #0284c7, #8b5cf6);
  color: white;
  border: none;
  box-shadow: 0 8px 24px -4px rgba(139, 92, 246, 0.5);
}

.cta-btn.play:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px -4px rgba(139, 92, 246, 0.7);
}

.terminal-card {
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 12px;
  max-width: 620px;
  margin: 0 auto;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.35);
  overflow: hidden;
  text-align: left;
  direction: ltr;
}

.terminal-header {
  background: #1e293b;
  padding: 0.6rem 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.terminal-dots {
  display: flex;
  gap: 6px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.dot.red { background: #ef4444; }
.dot.yellow { background: #f59e0b; }
.dot.green { background: #10b981; }

.terminal-label {
  font-size: 0.75rem;
  color: #94a3b8;
  font-family: 'JetBrains Mono', monospace;
}

.terminal-body {
  padding: 1.1rem 1.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.terminal-code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.95rem;
  color: #38bdf8;
  margin: 0;
}

.terminal-copy {
  background: #334155;
  border: none;
  color: #e2e8f0;
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.terminal-copy:hover {
  background: var(--primary);
  color: white;
}

/* Features Grid */
.features-section {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 1.5rem;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.feature-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 2rem;
  transition: all 0.2s ease;
  box-shadow: var(--shadow-sm);
}

.feature-card:hover {
  transform: translateY(-4px);
  border-color: var(--primary);
  box-shadow: 0 12px 30px -8px rgba(0, 0, 0, 0.15);
}

.feature-icon {
  font-size: 2.2rem;
  margin-bottom: 1rem;
  display: inline-block;
}

.feature-title {
  font-size: 1.2rem;
  font-weight: 800;
  margin: 0 0 0.6rem;
  color: var(--text-primary);
}

.feature-desc {
  font-size: 0.92rem;
  color: var(--text-muted);
  line-height: 1.6;
  margin: 0;
}

/* 3-Step Section */
.steps-section {
  max-width: 1000px;
  margin: 0 auto;
  padding: 0 1.5rem;
}

.section-head {
  text-align: center;
  margin-bottom: 2.5rem;
}

.section-title {
  font-size: 2.1rem;
  font-weight: 900;
  margin: 0 0 0.6rem;
  color: var(--text-primary);
}

.section-sub {
  font-size: 1.05rem;
  color: var(--text-muted);
  margin: 0;
}

.steps-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.step-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  padding: 1.5rem;
  display: flex;
  gap: 1.25rem;
  align-items: flex-start;
  box-shadow: var(--shadow-sm);
}

.step-badge {
  background: var(--primary);
  color: white;
  font-size: 1.2rem;
  font-weight: 900;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.step-content {
  flex: 1;
}

.step-title {
  font-size: 1.15rem;
  font-weight: 800;
  margin: 0 0 0.35rem;
  color: var(--text-primary);
}

.step-desc {
  font-size: 0.92rem;
  color: var(--text-muted);
  margin: 0 0 0.85rem;
  line-height: 1.5;
}

.step-code {
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.88rem;
  color: var(--primary);
  display: flex;
  justify-content: space-between;
  align-items: center;
  direction: ltr;
}

/* Demo Section */
.demo-section {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 1.5rem;
  width: 100%;
  box-sizing: border-box;
}

.demo-tabs {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.demo-tab-btn {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  padding: 0.6rem 1.25rem;
  border-radius: 10px;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s ease;
}

.demo-tab-btn:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.demo-tab-btn.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

@media (max-width: 600px) {
  .hero-title {
    font-size: 2.2rem;
  }
  .step-card {
    flex-direction: column;
  }
}

--- ui
div.home-page
  section.hero
    div.hero-badge
      span 🫟
      span {t('heroBadge')}

    h1.hero-title {t('heroTitle')}
    p.hero-desc {t('heroDesc')}

    div.hero-cta
      button.cta-btn.primary type="button" @click=navigate('/guide')
        span {t('btnStartLearning')}
      button.cta-btn.play type="button" @click=navigate('/play')
        span 🎮 {t('navPlay')}
      button.cta-btn.secondary type="button" @click=navigate('/playground')
        span {t('btnTryPlayground')}

    div.terminal-card
      div.terminal-header
        div.terminal-dots
          span.dot.red
          span.dot.yellow
          span.dot.green
        span.terminal-label bash — liquid-cli
      div.terminal-body
        code.terminal-code {'> ' + t('quickStartCommand')}
        button.terminal-copy type="button" @click=copyToClipboard(t('quickStartCommand')) {t('copyCode')}

  section.features-section
    div.features-grid
      div.feature-card
        span.feature-icon 📁
        h3.feature-title {t('feat1Title')}
        p.feature-desc {t('feat1Desc')}

      div.feature-card
        span.feature-icon ⚡
        h3.feature-title {t('feat2Title')}
        p.feature-desc {t('feat2Desc')}

      div.feature-card
        span.feature-icon 🚀
        h3.feature-title {t('feat3Title')}
        p.feature-desc {t('feat3Desc')}

  section.steps-section
    div.section-head
      h2.section-title {t('threeStepTitle')}
      p.section-sub في أقل من 3 دقائق ستكون جاهزاً لتطوير ونشر موقعك!

    div.steps-list
      div.step-card
        div.step-badge {t('step1Num')}
        div.step-content
          h3.step-title {t('step1Title')}
          p.step-desc {t('step1Desc')}
          div.step-code
            span npx liquid create my-site
            button.terminal-copy type="button" @click=copyToClipboard('npx liquid create my-site') {t('copyCode')}

      div.step-card
        div.step-badge {t('step2Num')}
        div.step-content
          h3.step-title {t('step2Title')}
          p.step-desc {t('step2Desc')}
          div.step-code
            span cd my-site && npm run dev
            button.terminal-copy type="button" @click=copyToClipboard('cd my-site && npm run dev') {t('copyCode')}

      div.step-card
        div.step-badge {t('step3Num')}
        div.step-content
          h3.step-title {t('step3Title')}
          p.step-desc {t('step3Desc')}
          div.step-code
            span liquid edit src/App.liq
            button.terminal-copy type="button" @click=copyToClipboard('liquid edit src/App.liq') {t('copyCode')}

  section.demo-section
    div.section-head
      h2.section-title تجربة حية فورية
      p.section-sub هذه المكونات تعمل مباشرة بكود Liquid الحقيقي في متصفحك الآن:

    div.demo-tabs
      button.demo-tab-btn class={activeDemoTab.value === 'counter' ? 'active' : ''} type="button" @click=setTab('counter') العداد التفاعلي (Counter)
      button.demo-tab-btn class={activeDemoTab.value === 'todo' ? 'active' : ''} type="button" @click=setTab('todo') قائمة المهام (Todo)

    div.demo-container
      if activeDemoTab.value === 'counter'
        LiveCounter
      else
        LiveTodo
