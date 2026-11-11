--- logic
import { shopStore } from '../store.js';

let nameVal = '';
let emailVal = '';
let addressVal = '';
let errorMsg = '';

function handleName(e) {
  nameVal = (e.target ? e.target.value : e).trim();
}

function handleEmail(e) {
  emailVal = (e.target ? e.target.value : e).trim();
}

function handleAddress(e) {
  addressVal = (e.target ? e.target.value : e).trim();
}

function submitOrder() {
  if (!nameVal || !emailVal || !addressVal) {
    errorMsg = 'Please fill out all shipping details.';
    return;
  }
  shopStore.placeOrder();
}

function cancel() {
  shopStore.closeCheckout();
}

--- style
.overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(15, 23, 42, 0.6);
  justify-content: center;
  align-items: center;
  padding: 20px;
}
.modal {
  background-color: #ffffff;
  border-radius: 12px;
  padding: 20px;
  width: 100%;
  max-width: 360px;
  display: flex;
  flex-direction: column;
}
.modal-title {
  font-size: 17px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 4px;
}
.modal-sub {
  font-size: 13px;
  color: #64748b;
  margin-bottom: 12px;
}
.input-field {
  padding: 10px 12px;
  border-radius: 6px;
  border-width: 1px;
  border-color: #cbd5e1;
  font-size: 14px;
  background-color: #ffffff;
  color: #0f172a;
  margin-bottom: 10px;
}
.btn-row {
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 10px;
}
.cancel-btn {
  padding: 10px 16px;
  background-color: #f1f5f9;
  color: #475569;
  border-radius: 6px;
  font-weight: 600;
  font-size: 13px;
}
.pay-btn {
  padding: 10px 16px;
  background-color: #059669;
  color: #ffffff;
  border-radius: 6px;
  font-weight: 700;
  font-size: 13px;
}
.err-text {
  font-size: 12px;
  color: #dc2626;
  font-weight: 600;
  margin-bottom: 8px;
}

--- ui
if shopStore.isCheckoutOpen
  div.overlay
    div.modal
      span.modal-title Express Checkout
      span.modal-sub Complete your order of ${shopStore.getTotal()}
      if errorMsg
        span.err-text {errorMsg}
      input.input-field placeholder="Full Name" @input=handleName
      input.input-field placeholder="Email Address" @input=handleEmail
      input.input-field placeholder="Shipping Address" @input=handleAddress
      div.btn-row
        button.cancel-btn @click=cancel Cancel
        button.pay-btn @click=submitOrder Pay ${shopStore.getTotal()}
