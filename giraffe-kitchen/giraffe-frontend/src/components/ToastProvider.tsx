import { Toaster } from 'react-hot-toast';

export default function ToastProvider() {
  return (
    <Toaster
      position="top-center"
      reverseOrder={false}
      gutter={8}
      toastOptions={{
        // Default options
        duration: 4000,
        style: {
          background: '#fff',
          color: '#363636',
          padding: '16px',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
          fontFamily: 'Assistant, Heebo, sans-serif',
          direction: 'rtl',
          maxWidth: '500px',
        },

        // Success
        success: {
          duration: 3000,
          iconTheme: {
            primary: '#22c55e',
            secondary: '#fff',
          },
          style: {
            background: '#f0fdf4',
            border: '2px solid #22c55e',
            color: '#166534',
          },
        },

        // Error
        error: {
          duration: 4000,
          iconTheme: {
            primary: '#ef4444',
            secondary: '#fff',
          },
          style: {
            background: '#fef2f2',
            border: '2px solid #ef4444',
            color: '#991b1b',
          },
        },

        // Loading
        loading: {
          iconTheme: {
            primary: '#f97316',
            secondary: '#fff',
          },
          style: {
            background: '#fff7ed',
            border: '2px solid #f97316',
            color: '#9a3412',
          },
        },
      }}
    />
  );
}

// Utility functions for easy use
import toast from 'react-hot-toast';

export const notify = {
  success: (message: string) => {
    toast.success(message, {
      icon: '✅',
    });
  },

  error: (message: string) => {
    toast.error(message, {
      icon: '❌',
    });
  },

  loading: (message: string) => {
    return toast.loading(message);
  },

  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string;
    }
  ) => {
    return toast.promise(promise, messages);
  },

  custom: (message: string, icon: string = '💬') => {
    toast(message, {
      icon,
    });
  },
};