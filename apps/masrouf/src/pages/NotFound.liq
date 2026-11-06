--- logic
import Layout from '../components/Layout.liq';
import Card from '../components/Card.liq';
import EmptyState from '../components/EmptyState.liq';
import { t } from '../store.js';
import { navigate } from '../router.js';

--- style
.btn-home {
  background: var(--primary);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.15s ease;
}
.btn-home:hover {
  background: var(--primary-hover);
}

--- ui
Layout pageTitle={t('notFound')}
  Card
    EmptyState icon="🧭" title={t('notFound')} description={t('notFoundDesc')}
      button.btn-home type="button" @click=navigate('/') {t('backToDashboard')}
