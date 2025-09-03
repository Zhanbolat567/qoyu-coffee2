// src/components/orders/ClosedOrderCard.tsx
import React from 'react';

interface OrderItem {
  name: string;
  quantity: number;
}

interface ClosedOrderCardProps {
  orderNumber: number;
  customerName: string;
  items: OrderItem[];
  total: number;
}

const ClosedOrderCard: React.FC<ClosedOrderCardProps> = ({
  orderNumber,
  customerName,
  items,
  total,
}) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center">
            <span className="bg-gray-200 text-gray-800 text-xl font-bold mr-3 px-3 py-1 rounded">
              {orderNumber}
            </span>
            <div>
              <h3 className="font-bold text-lg">{customerName}</h3>
            </div>
          </div>
        </div>

        <div className="space-y-2 mb-4">
            {items.map((item, index) => (
                <div key={index} className="flex justify-between text-gray-700">
                    <span>{item.name}</span>
                    <span>x{item.quantity}</span>
                </div>
            ))}
        </div>
      </div>

      <div className="border-t pt-4">
        <div className="flex justify-between font-bold text-lg">
          <span>Итого:</span>
          <span>{Number(total ?? 0).toLocaleString('ru-RU')} ₸</span>
        </div>
      </div>
    </div>
  );
};

export default ClosedOrderCard;