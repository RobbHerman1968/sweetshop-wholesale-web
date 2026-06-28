export type PlaceOrder = {
  account: PlaceOrderAccount;
  cart: PlaceOrderCart;
  billingAddress: PlaceOrderBillingAddress;
  shippingAddress: PlaceOrderShippingAddress;
  items: PlaceOrderItem[];
  shippingCode?: PlaceOrderShippingCode | null;

  payment: PlaceOrderPayment;

  accountMateOrderTransactionId?: string;
  accountMateOrderNumber?: string;
  accountMateOrderMessage?: string;
};

export type PlaceOrderAccount = {
  id: number;
  emailAddress: string;
  accountMateId?: string | null;
};

export type PlaceOrderCart = {
  id: number;
  cartId: string;

  shippingMethod?: string | null;
  shippingDate?: Date | string | null;
  shippingCost?: number | null;
  comment?: string | null;
};

export type PlaceOrderBillingAddress = {
  id?: number;
  cartId?: number;

  company?: string | null;
  firstName: string;
  lastName: string;

  address1: string;
  address2?: string | null;

  city: string;
  state: string;
  zipCode: string;
  country: string;

  phoneNumber?: string | null;
};

export type PlaceOrderShippingAddress = {
  id?: number;
  cartId?: number;

  company?: string | null;
  firstName: string;
  lastName: string;

  address1: string;
  address2?: string | null;

  city: string;
  state: string;
  zipCode: string;
  country: string;

  phoneNumber?: string | null;
};

export type PlaceOrderItem = {
  id?: number;
  cartId?: number;

  itemNumber: string;
  quantity: number;
  price: number;
  weight: number;
};

export type PlaceOrderShippingCode = {
  id?: number;
  fedexCode: string;
  code?: string | null;
};

export type PlaceOrderPayment = {
  ccName?: string;
  ccNumber?: string;
  ccMonth?: string;
  ccYear?: string;
  ccCCV?: string;
  ccType?: string;

  terms?: string | null;
};
