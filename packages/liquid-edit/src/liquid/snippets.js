/**
 * Common Liquid Code Snippets
 */

export const LIQUID_SNIPPETS = [
  {
    id: 'snippet.component',
    title: 'Component Skeleton',
    description: 'Standard .liq component with logic, style, and UI sections',
    text: `--- logic
import { signal } from 'liquid';

const { title = 'Liquid Component' } = defineProps();

--- style
.container {
  padding: 1rem;
}

--- ui
div.container
  h2 {title}
`
  },
  {
    id: 'snippet.each',
    title: 'Keyed Each Loop',
    description: 'Reconciled each loop with key expression',
    text: `each (items() as item (item.id))
  div.item
    span {item.title}
`
  },
  {
    id: 'snippet.ifElse',
    title: 'If / Else Block',
    description: 'Reactive conditional rendering block',
    text: `if condition()
  div.active
    span Active Content
else
  div.empty
    span Empty State
`
  },
  {
    id: 'snippet.input',
    title: 'Two-Way Bound Input',
    description: 'Form input bound to signal via $bind directive',
    text: `div.form-group
  label.form-label Name
  input.input-control type="text" $bind=name
`
  },
  {
    id: 'snippet.event',
    title: 'Event Button with Modifier',
    description: 'Button with @click.prevent modifier',
    text: `button.btn-primary type="button" @click.prevent=handleClick
  span Submit
`
  },
  {
    id: 'snippet.store',
    title: 'Reactive Store Skeleton',
    description: 'Shared signal store with actions and computed values',
    text: `import { signal, computed } from 'liquid';

export const items = signal([]);
export const count = computed(() => items().length);

export function addItem(item) {
  items.update(list => [...list, item]);
}

export function clearItems() {
  items.set([]);
}
`
  }
];
