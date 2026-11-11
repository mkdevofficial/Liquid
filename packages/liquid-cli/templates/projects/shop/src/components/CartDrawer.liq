--- logic
import { shopStore } from '../store.js';

function inc(id) {
  shopStore.updateQuantity(id, 1);
}

function dec(id) {
  shopStore.updateQuantity(id, -1);
}

function del(id) {
  shopStore.removeFromCart(id);
}

function checkout() {
  shopStore.openCheckout();
}

function close() {
  shopStore.toggleCart();
}

--- style
.overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(15, 23, 42, 0.6);
  justify-content: flex-end;
}
.drawer {
  background-color: #ffffff;
  border-radius: 16px 16px 0 0;
  padding: 20px;
  max-height: 80%;
  display: flex;
  flex-direction: column;
}
.drawer-header {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.drawer-title {
  font-size: 17px;
  font-weight: 700;
  color: #0f172a;
}
.close-btn {
  background-color: #f1f5f9;
  color: #475569;
  padding: 6px 12px;
  border-radius: 6px;
  font-weight: 700;
}
.cart-item {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom-width: 1px;
  border-bottom-color: #f1f5f9;
}
.item-info {
  display: flex;
  flex-direction: column;
  flex: 1;
}
.item-name {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}
.item-price {
  font-size: 12px;
  color: #059669;
  font-weight: 600;
}
.qty-controls {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
}
.qty-btn {
  background-color: #f1f5f9;
  color: #0f172a;
  width: 28px;
  height: 28px;
  border-radius: 4px;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}
.qty-val {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}
.summary-box {
  background-color: #f8fafc;
  border-radius: 8px;
  padding: 14px;
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.sum-row {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
}
.sum-label {
  font-size: 13px;
  color: #64748b;
}
.sum-val {
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
}
.total-label {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}
.total-val {
  font-size: 16px;
  font-weight: 800;
  color: #059669;
}
.checkout-btn {
  background-color: #0284c7;
  color: #ffffff;
  padding: 12px;
  border-radius: 8px;
  font-weight: 700;
  font-size: 15px;
  text-align: center;
  margin-top: 14px;
}
.empty-msg {
  font-size: 14px;
  color: #94a3b8;
  padding: 24px 0;
  text-align: center;
}

--- ui
if shopStore.isCartOpen
  div.overlay
    div.drawer
      div.drawer-header
        span.drawer-title Shopping Cart ({shopStore.getCartCount()})
        button.close-btn @click=close ✕

      if shopStore.cart.length === 0
        span.empty-msg Your cart is empty
      else
        each shopStore.cart as item (item.id)
          div.cart-item
            div.item-info
              span.item-name {item.name}
              span.item-price ${item.price} each
            div.qty-controls
              button.qty-btn @click=dec(item.id) -
              span.qty-val {item.quantity}
              button.qty-btn @click=inc(item.id) +
              button.qty-btn @click=del(item.id) 🗑

        div.summary-box
          div.sum-row
            span.sum-label Subtotal
            span.sum-val ${shopStore.getSubtotal()}
          div.sum-row
            span.sum-label Shipping (Free > $100)
            span.sum-val ${shopStore.getShipping() === 0 ? 'FREE' : '$' + shopStore.getShipping()}
          div.sum-row
            span.sum-label Estimated Tax
            span.sum-val ${shopStore.getTax()}
          div.sum-row
            span.total-label Order Total
            span.total-val ${shopStore.getTotal()}

        button.checkout-btn @click=checkout Proceed to Checkout →
