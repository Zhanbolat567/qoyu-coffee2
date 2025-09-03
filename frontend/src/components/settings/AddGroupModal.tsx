// src/components/settings/AddGroupModal.tsx
import React from 'react';
import { FiX } from 'react-icons/fi';

interface AddGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddGroupModal: React.FC<AddGroupModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800">
          <FiX size={24} />
        </button>

        <h2 className="text-2xl font-bold mb-6">Добавить группу опций</h2>

        <form>
          <div className="mb-4">
            <label htmlFor="group-name" className="block text-sm font-medium text-gray-700 mb-1">Название группы</label>
            <input type="text" id="group-name" placeholder="например, Сиропы" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Тип выбора</label>
            <div className="flex">
              <button type="button" className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-l-md z-10">Одиночный</button>
              <button type="button" className="flex-1 bg-white border border-gray-300 -ml-px text-gray-700 py-2 px-4 rounded-r-md hover:bg-gray-50">Множественный</button>
            </div>
          </div>

          <div className="flex items-center mb-6">
            <input id="is-required" type="checkbox" className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
            <label htmlFor="is-required" className="ml-2 block text-sm text-gray-900">Обязательная группа</label>
          </div>

          <div className="flex justify-end gap-4">
            <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 font-bold py-2 px-6 rounded-lg hover:bg-gray-300">
              Отмена
            </button>
            <button type="submit" className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700">
              Сохранить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddGroupModal;