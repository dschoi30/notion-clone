import React, { useState } from 'react';
import NotificationModal from './NotificationModal';
import { Bell } from 'lucide-react';

export default function Notifications() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="flex items-center w-full px-4 py-2 border-gray-200 hover:bg-gray-50"
        onClick={() => setOpen(true)}
      >
        <Bell className="w-5 h-5 mr-2" />
        <span>알림</span>
      </button>
      {open && <NotificationModal onClose={() => setOpen(false)} />}
    </>
  );
} 