--- logic
import { shopStore } from '../store.js';
const { product } = defineProps();

function add() {
  shopStore.addToCart(product.id);
}

--- style
.card {
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  border-width: 1px;
  border-color: #e2e8f0;
}
.top-row {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
}
.emoji-box {
  font-size: 32px;
  background-color: #f8fafc;
  padding: 8px;
  border-radius: 8px;
}
.rating {
  font-size: 12px;
  font-weight: 700;
  color: #d97706;
}
.name {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  margin-top: 10px;
}
.cat-tag {
  font-size: 11px;
  color: #64748b;
  margin-top: 2px;
}
.bottom-row {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-top: 14px;
}
.price {
  font-size: 17px;
  font-weight: 700;
  color: #059669;
}
.add-btn {
  background-color: #0284c7;
  color: #ffffff;
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 700;
}

--- ui
div.card
  div.top-row
    span.emoji-box {product.emoji}
    span.rating ★ {product.rating}
  span.name {product.name}
  span.cat-tag {product.category}
  div.bottom-row
    span.price ${product.price}
    button.add-btn @click=add + Add
