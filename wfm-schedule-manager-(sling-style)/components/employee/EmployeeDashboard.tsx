
import React from 'react';
import { User } from '../../types';
import Header from '../layout/Header';
import MySchedule from './MySchedule';
import NotificationFeed from './NotificationFeed';
import LeaveRequestModule from './LeaveRequestModule';

interface EmployeeDashboardProps {
  user: User;
}

const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({ user }) => {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Header user={user} />
      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <MySchedule user={user} />
          </div>
          <div className="space-y-8">
            <LeaveRequestModule user={user} />
            <NotificationFeed userId={user.id} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default EmployeeDashboard;