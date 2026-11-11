import { createStore } from 'liquid';

const initialProducts = [
  { id: 1, name: 'Liquid Mechanical Keyboard', category: 'Electronics', price: 129, emoji: '⌨️', rating: '4.9' },
  { id: 2, name: 'Wireless Noise-Canceling Buds', category: 'Audio', price: 89, emoji: '🎧', rating: '4.8' },
  { id: 3, name: 'Ergonomic Vertical Mouse', category: 'Electronics', price: 49, emoji: '🖱️', rating: '4.7' },
  { id: 4, name: 'Smart Fitness Tracker v2', category: 'Wearables', price: 79, emoji: '⌚', rating: '4.6' },
  { id: 5, name: 'Studio Monitoring Headphones', category: 'Audio', price: 159, emoji: '🎙️', rating: '5.0' },
  { id: 6, name: 'Minimalist Aluminum Stand', category: 'Accessories', price: 35, emoji: '📱', rating: '4.8' }
];

export const shopStore = createStore({
  products: initialProducts,
  category: 'All', // All | Electronics | Audio | Wearables | Accessories
  cart: [],
  isCartOpen: false,
  isCheckoutOpen: false,
  orderPlacedId: null,

  getFilteredProducts() {
    if (this.category === 'All') return this.products;
    return this.products.filter(p => p.category === this.category);
  },

  getCartCount() {
    return this.cart.reduce((sum, item) => sum + item.quantity, 0);
  },

  getSubtotal() {
    return this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  },

  getShipping() {
    const sub = this.getSubtotal();
    if (sub === 0) return 0;
    return sub >= 100 ? 0 : 10;
  },

  getTax() {
    return Math.round(this.getSubtotal() * 0.08);
  },

  getTotal() {
    return this.getSubtotal() + this.getShipping() + this.getTax();
  },

  addToCart(productId) {
    const prod = this.products.find(p => p.id === productId);
    if (!prod) return;
    const existing = this.cart.find(c => c.id === productId);
    if (existing) {
      this.cart = this.cart.map(c => c.id === productId ? { ...c, quantity: c.quantity + 1 } : c);
    } else {
      this.cart = [...this.cart, { ...prod, quantity: 1 }];
    }
  },

  updateQuantity(productId, delta) {
    this.cart = this.cart
      .map(c => c.id === productId ? { ...c, quantity: c.quantity + delta } : c)
      .filter(c => c.quantity > 0);
  },

  removeFromCart(productId) {
    this.cart = this.cart.filter(c => c.id !== productId);
  },

  clearCart() {
    this.cart = [];
  },

  toggleCart() {
    this.isCartOpen = !this.isCartOpen;
  },

  openCheckout() {
    this.isCartOpen = false;
    this.isCheckoutOpen = true;
  },

  closeCheckout() {
    this.isCheckoutOpen = false;
  },

  placeOrder() {
    const id = 'LQ-' + Math.floor(100000 + Math.random() * 900000);
    this.orderPlacedId = id;
    this.cart = [];
    this.isCheckoutOpen = false;
  },

  resetOrder() {
    this.orderPlacedId = null;
  },

  setCategory(cat) {
    this.category = cat;
  }
});
