/* eslint-disable @typescript-eslint/no-explicit-any */
'use server';

import moment from 'moment';
import { Order } from '../entities/order-entity';

export async function orderMapper(data: any): Promise<Order> {
    const order: Order = {} as Order;
    order.id = data.id;
    order.accountId = data.accountId;
    order.orderNumber = data.orderNumber;
    order.orderDate = moment(data.orderDate).utc().toDate();
    order.subTotal = data.subTotal;
    order.shipping = data.shipping;
    order.tax = data.tax;
    order.promotionCode = data.promotionCode;
    order.promotionDiscount = data.promotionDiscount;
    order.total = data.total;
    order.ccLastFour = data.ccLastFour;
    order.ccExp = data.ccExp;
    order.ccType = data.ccType;
    order.comment = data.comment;
    order.expectedDeliveryDate = moment(data.expectedDeliveryDate).utc().toDate();
    order.shippingCode = data.shippingCode;
    order.accountMateReturnStatus = data.accountMateReturnStatus;
    order.accountMateTransactionId = data.accountMateTransactionId;
    order.isNewCustomerOrder = data.isNewCustomerOrder;
    order.accountMateOrderNumber = data.accountMateOrderNumber;

    return order;
}
