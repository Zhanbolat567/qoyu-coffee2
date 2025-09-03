// src/components/settings/OptionGroup.tsx
import React from 'react';
import { FiEdit2, FiTrash2, FiPlus } from 'react-icons/fi';

interface OptionItem {
  name: string;
  price: number;
}

interface OptionGroupProps {
  groupName: string;
  type: 'Одиночный выбор' | 'Множественный выбор';
  isRequired?: boolean;
  options: OptionItem[];
}

const OptionGroup: React.FC<OptionGroupProps> = ({ groupName, type, isRequired, options }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-xl font-bold">{groupName}</h3>
          <div className="flex items-center text-sm text-gray-500 mt-1">
            <span>{type}</span>
            {isRequired && <span className="ml-2 bg-red-100 text-red-800 text-xs font-semibold px-2 py-0.5 rounded-full">Обязательно</span>}
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button className="text-gray-500 hover:text-blue-600"><FiEdit2 size={18} /></button>
          <button className="text-gray-500 hover:text-red-600"><FiTrash2 size={18} /></button>
        </div>
      </div>

      <div className="space-y-3">
        {options.map((option, index) => (
          <div key={index} className="flex justify-between items-center bg-gray-50 p-3 rounded-md">
            <span>{option.name}</span>
            <span className="font-semibold">+{option.price} ₸</span>
          </div>
        ))}
      </div>

      <button className="w-full mt-4 bg-gray-100 text-gray-700 font-semibold py-2 rounded-lg hover:bg-gray-200 flex items-center justify-center">
        <FiPlus className="mr-2" /> Добавить опцию
      </button>
    </div>
  );
};

export default OptionGroup;