// src/components/menu/ProductCard.tsx
import React from 'react';

interface ProductCardProps {
  name: string;
  price: number;
  // В будущем можно добавить image, description и т.д.
}

const ProductCard: React.FC<ProductCardProps> = ({ name, price }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md text-center cursor-pointer hover:shadow-xl transition-shadow">
      <h3 className="text-2xl font-bold text-gray-800">{name.split(' ')[0]}</h3>
      <p className="text-gray-600 mt-1">{name}</p>
      <p className="text-lg font-semibold text-blue-600 mt-4">{price} ₸</p>
    </div>
  );
};

export default ProductCard;