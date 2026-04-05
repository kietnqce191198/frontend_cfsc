
export interface Order {
    orderId: number;
    orderNumber: string;
    status: 'Completed' | 'Processing' | 'Pending' | 'Cancelled';
    totalAmount: number;
    createdAt: string;
    itemsCount: number;
}

export interface OrderResponse {
    data: Order[];
    total: number;
    page: number;
    limit: number;
}