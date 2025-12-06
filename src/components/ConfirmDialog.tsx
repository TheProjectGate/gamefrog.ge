import React from 'react';
import { CloseIcon } from './Icons';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'info',
}) => {
  if (!isOpen) return null;

  const variantColors = {
    danger: 'bg-red-500 hover:bg-red-600',
    warning: 'bg-yellow-500 hover:bg-yellow-600',
    info: 'bg-blue-500 hover:bg-blue-600',
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4 animate-fade-in"
      onClick={onCancel}
    >
      <div
        className="relative bg-white border-4 border-black w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onCancel}
          className="absolute top-3 right-3 text-black hover:text-[#FF0000] transition-colors"
          aria-label="Close dialog"
        >
          <CloseIcon className="w-6 h-6" />
        </button>

        <h3 className="text-2xl font-display uppercase text-black mb-4 pr-8">{title}</h3>
        <p className="text-black/80 mb-6">{message}</p>

        <div className="flex gap-4 justify-end">
          <button
            onClick={onCancel}
            className="bg-gray-200 text-black font-bold py-2 px-6 border-4 border-black hover:bg-gray-300 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`${variantColors[variant]} text-white font-bold py-2 px-6 border-4 border-black transition-colors`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;

