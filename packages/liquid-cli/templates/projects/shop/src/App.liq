--- logic
import { shopStore } from './store.js';
import Header from './components/Header.liq';
import ProductCard from './components/ProductCard.liq';
import CartDrawer from './components/CartDrawer.liq';
import CheckoutModal from './components/CheckoutModal.liq';

function setCat(c) {
  shopStore.setCategory(c);
}

function dismissOrder() {
  shopStore.resetOrder();
}

--- style
.container {
  display: flex;
  flex-direction: column;
  padding: 16px;
  background-color: #f8fafc;
  min-height: 100%;
}
.cat-scroll {
  display: flex;
  flex-direction: row;
  gap: 8px;
  margin-top: 12px;
  margin-bottom: 14px;
}
.cat-btn {
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  background-color: #f1f5f9;
  color: #475569;
}
.cat-btn-active {
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  background-color: #0284c7;
  color: #ffffff;
}
.success-banner {
  background-color: #dcfce7;
  border-radius: 8px;
  padding: 14px;
  margin-bottom: 14px;
  border-width: 1px;
  border-color: #86efac;
}
.success-title {
  font-size: 15px;
  font-weight: 700;
  color: #166534;
}
.success-desc {
  font-size: 13px;
  color: #15803d;
  margin-top: 4px;
}
.dismiss-btn {
  background-color: #166534;
  color: #ffffff;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 700;
  margin-top: 8px;
  align-self: flex-start;
}

--- ui
div.container
  Header

  if shopStore.orderPlacedId
    div.success-banner
      span.success-title 🎉 Order Confirmed!
      span.success-desc Your order #{shopStore.orderPlacedId} has been successfully processed and is being prepared.
      button.dismiss-btn @click=dismissOrder Done

  div.cat-scroll
    button class="{shopStore.category === 'All' ? 'cat-btn-active' : 'cat-btn'}" @click=setCat('All') All
    button class="{shopStore.category === 'Electronics' ? 'cat-btn-active' : 'cat-btn'}" @click=setCat('Electronics') Electronics
    button class="{shopStore.category === 'Audio' ? 'cat-btn-active' : 'cat-btn'}" @click=setCat('Audio') Audio
    button class="{shopStore.category === 'Wearables' ? 'cat-btn-active' : 'cat-btn'}" @click=setCat('Wearables') Wearables
    button class="{shopStore.category === 'Accessories' ? 'cat-btn-active' : 'cat-btn'}" @click=setCat('Accessories') Accessories

  each shopStore.getFilteredProducts() as prod (prod.id)
    ProductCard product={prod}

  CartDrawer

  CheckoutModal
