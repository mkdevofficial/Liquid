--- logic
import { currentCurrency, currentLang, t } from '../store.js';
import { formatCurrency } from '../i18n.js';

const { items = [] } = defineProps();

--- style
.barchart-container {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  padding: 0.5rem 0;
}
.chart-empty {
  text-align: center;
  padding: 1.5rem 0;
  color: var(--text-muted);
  font-size: 0.85rem;
}
.chart-row {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.chart-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
}
.chart-label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-weight: 600;
  color: var(--text-primary);
}
.chart-stats {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.chart-amount {
  font-weight: 700;
  color: var(--text-primary);
}
.chart-percent {
  font-size: 0.75rem;
  color: var(--text-muted);
  min-width: 35px;
  text-align: end;
}
.chart-track {
  width: 100%;
  height: 9px;
  background: var(--bg-track);
  border-radius: 6px;
  overflow: hidden;
  position: relative;
}
.chart-bar {
  height: 100%;
  border-radius: 6px;
  transition: width 0.35s ease-out;
}

--- ui
div.barchart-container
  if items.length === 0
    div.chart-empty
      p {t('noTransactionsMonth')}
  else
    each (items as item (item.id))
      div.chart-row
        div.chart-info
          div.chart-label
            span {item.icon}
            span {item.name}
          div.chart-stats
            span.chart-amount {formatCurrency(item.amount, currentCurrency(), currentLang())}
            span.chart-percent {item.percentage}%
        div.chart-track
          div.chart-bar style={'width: ' + item.percentage + '%; background-color: ' + item.color}
