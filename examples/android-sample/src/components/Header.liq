--- logic
const { title = 'Liquid App' } = defineProps();

--- style
header.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: #0f172a;
  color: #f8fafc;
  border-radius: 12px;
}
h1.logo {
  font-size: 1.5rem;
  margin: 0;
}

--- ui
header.header
  h1.logo 🫟 {title}
  div.actions
    slot
