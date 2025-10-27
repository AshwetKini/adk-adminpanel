'use client';
import { useEffect, useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { employeeApi } from '@/lib/api';
import { Users, UserCheck, UserX, TrendingUp } from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const list = await employeeApi.all();
        setStats({
          total: list.length,
          active: list.filter((e) => e.isActive).length,
          inactive: list.filter((e) => !e.isActive).length,
        });
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const StatCard = ({ icon: Icon, label, value, color, bgColor, textColor }) => (
    <Card className={`border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 ${bgColor}`}>
      <CardContent className="p-6 sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium text-gray-600 mb-2 truncate">{label}</p>
            <p className={`text-3xl sm:text-4xl font-bold break-words ${textColor}`}>{loading ? '...' : value}</p>
            <p className="text-xs text-gray-500 mt-2">Total in system</p>
          </div>
          <div className={`p-3 sm:p-4 rounded-full flex-shrink-0 ${color}`}>
            <Icon className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const activePercentage = stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8 px-2 sm:px-0">
        <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-sm sm:text-base text-gray-600">Welcome back! Here's your employee overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <StatCard
          icon={Users}
          label="Total Employees"
          value={stats.total}
          color="bg-blue-500"
          bgColor="bg-gradient-to-br from-blue-50 to-blue-100"
          textColor="text-blue-600"
        />
        <StatCard
          icon={UserCheck}
          label="Active Employees"
          value={stats.active}
          color="bg-green-500"
          bgColor="bg-gradient-to-br from-green-50 to-green-100"
          textColor="text-green-600"
        />
        <StatCard
          icon={UserX}
          label="Inactive Employees"
          value={stats.inactive}
          color="bg-red-500"
          bgColor="bg-gradient-to-br from-red-50 to-red-100"
          textColor="text-red-600"
        />
      </div>

      {/* Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Performance Card */}
        <Card className="lg:col-span-2 border-0 shadow-lg">
          <CardHeader className="border-b border-gray-200 px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Activity Overview</h2>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">Employee status distribution</p>
              </div>
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500 flex-shrink-0" />
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-8">
            <div className="space-y-4 sm:space-y-6">
              {/* Active Bar */}
              <div>
                <div className="flex justify-between mb-2 gap-2">
                  <span className="text-xs sm:text-sm font-medium text-gray-700">Active</span>
                  <span className="text-xs sm:text-sm font-bold text-green-600 flex-shrink-0">{stats.active}/{stats.total}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-green-400 to-green-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${activePercentage}%` }}
                  />
                </div>
              </div>

              {/* Inactive Bar */}
              <div>
                <div className="flex justify-between mb-2 gap-2">
                  <span className="text-xs sm:text-sm font-medium text-gray-700">Inactive</span>
                  <span className="text-xs sm:text-sm font-bold text-red-600 flex-shrink-0">{stats.inactive}/{stats.total}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-red-400 to-red-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${stats.total > 0 ? Math.round((stats.inactive / stats.total) * 100) : 0}%` }}
                  />
                </div>
              </div>

              {/* Stats Summary */}
              <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="bg-green-50 rounded-lg p-3 sm:p-4">
                    <p className="text-xs text-gray-600 font-medium">Active Rate</p>
                    <p className="text-xl sm:text-2xl font-bold text-green-600 mt-1">{activePercentage}%</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3 sm:p-4">
                    <p className="text-xs text-gray-600 font-medium">Inactive Rate</p>
                    <p className="text-xl sm:text-2xl font-bold text-blue-600 mt-1">{100 - activePercentage}%</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats Card */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="px-4 sm:px-6 py-4">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Quick Stats</h2>
          </CardHeader>
          <CardContent className="p-4 sm:p-8">
            <div className="space-y-3 sm:space-y-4">
              <div className="p-3 sm:p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                <p className="text-xs text-gray-600 font-medium mb-1">Total Users</p>
                <p className="text-2xl sm:text-2xl font-bold text-purple-600 break-words">{stats.total}</p>
                <p className="text-xs text-gray-500 mt-2">In the system</p>
              </div>
              <div className="p-3 sm:p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg">
                <p className="text-xs text-gray-600 font-medium mb-1">Working</p>
                <p className="text-2xl sm:text-2xl font-bold text-orange-600 break-words">{stats.active}</p>
                <p className="text-xs text-gray-500 mt-2">Active employees</p>
              </div>
              <div className="p-3 sm:p-4 bg-gradient-to-br from-pink-50 to-pink-100 rounded-lg">
                <p className="text-xs text-gray-600 font-medium mb-1">Paused</p>
                <p className="text-2xl sm:text-2xl font-bold text-pink-600 break-words">{stats.inactive}</p>
                <p className="text-xs text-gray-500 mt-2">Inactive employees</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Welcome Card */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <CardHeader className="px-4 sm:px-6 py-4">
          <h2 className="text-xl sm:text-2xl font-bold">Welcome to ADK System Admin Panel</h2>
        </CardHeader>
        <CardContent className="p-4 sm:p-8">
        
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 pt-4">
            <div className="bg-blue-500 bg-opacity-50 rounded-lg p-3 sm:p-4">
              <p className="font-semibold text-sm sm:text-base mb-2">📊 Analytics</p>
              <p className="text-xs sm:text-sm text-blue-100">Monitor employee statistics in real-time</p>
            </div>
            <div className="bg-blue-500 bg-opacity-50 rounded-lg p-3 sm:p-4">
              <p className="font-semibold text-sm sm:text-base mb-2">👥 Management</p>
              <p className="text-xs sm:text-sm text-blue-100">Full control over employee records</p>
            </div>
          
          </div>
        </CardContent>
      </Card>
    </div>
  );
}