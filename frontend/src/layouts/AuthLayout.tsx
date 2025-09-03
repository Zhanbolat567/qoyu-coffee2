import React from 'react';

interface AuthLayoutProps {
  children: React.ReactNode;
}

/**
 * Центрируем формы авторизации на всех устройствах.
 * На телефонах держим компактную ширину, на планшетах/ПК — шире.
 */
const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-[100svh] bg-gray-100 flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-md sm:max-w-lg">{children}</div>
    </div>
  );
};

export default AuthLayout;
