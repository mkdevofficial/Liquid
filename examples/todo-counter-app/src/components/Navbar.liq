--- logic
const { title = 'Liquid 🫟' } = defineProps();

--- style
nav.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: #0f172a;
  color: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}
.brand {
  font-size: 1.25rem;
  font-weight: 700;
  color: #38bdf8;
  text-decoration: none;
}
.links {
  display: flex;
  gap: 1rem;
}
.nav-link {
  color: #94a3b8;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.15s;
}
.nav-link:hover {
  color: white;
}
.slot-container {
  display: flex;
  align-items: center;
}

--- ui
nav.navbar
  a.brand href="#/" {title}
  div.links
    a.nav-link href="#/" Counter
    a.nav-link href="#/todos" Todos
    a.nav-link href="#/arabic" العربية (RTL)
  div.slot-container
    slot
