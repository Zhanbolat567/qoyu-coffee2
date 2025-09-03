// src/components/orders/ActiveOrderCard.tsx
import React, { useState, useEffect } from 'react';

interface OrderItem {
  name: string;
  quantity: number;
}

interface ActiveOrderCardProps {
  orderNumber: number;
  customerName: string;
  takeAway: boolean;
  items: OrderItem[];
  total: number;
  createdAt: Date; // Время создания заказа
}

// Вспомогательная функция для форматирования времени
const formatTime = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
};

const ActiveOrderCard: React.FC<ActiveOrderCardProps> = ({
  orderNumber,
  customerName,
  takeAway,
  items,
  total,
  createdAt,
}) => {
  const [elapsedTime, setElapsedTime] = useState(
    Math.floor((new Date().getTime() - createdAt.getTime()) / 1000)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(prevTime => prevTime + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);


  return (
    <div className="bg-white p-6 rounded-lg shadow-md flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center">
            <span className="bg-blue-100 text-blue-800 text-xl font-bold mr-3 px-3 py-1 rounded">
              {orderNumber}
            </span>
            <div>
              <h3 className="font-bold text-lg">{customerName}</h3>
              <span className="text-sm text-gray-500">{formatTime(elapsedTime)}</span>
            </div>
          </div>
          {takeAway && (
              <span className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                  с собой
              </span>
          )}
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

      <div>
        <div className="border-t pt-4 mb-4">
          <div className="flex justify-between font-bold text-lg">
            <span>Итого:</span>
            <span>{Number(total ?? 0).toLocaleString('ru-RU')} ₸</span>
          </div>
        </div>
        <button className="w-full bg-gray-200 text-gray-800 font-bold py-3 rounded-lg hover:bg-gray-300 transition-colors">
          Закрыть заказ
        </button>
      </div>
    </div>
  );
};

export default ActiveOrderCard;