import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Button } from '../components/ui/button';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import { 
  TrendingUp, 
  DollarSign, 
  FileText, 
  Users,
  Calendar,
  Download,
  Filter
} from 'lucide-react';

const Analytics = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('last-30-days');
  const [selectedMetric, setSelectedMetric] = useState('revenue');

  // Demo analytics data
  const monthlyData = [
    { month: 'Jan', revenue: 185000, quotes: 45, bookings: 32 },
    { month: 'Feb', revenue: 220000, quotes: 52, bookings: 38 },
    { month: 'Mar', revenue: 280000, quotes: 67, bookings: 45 },
    { month: 'Apr', revenue: 310000, quotes: 73, bookings: 52 },
    { month: 'May', revenue: 355000, quotes: 89, bookings: 64 },
    { month: 'Jun', revenue: 420000, quotes: 98, bookings: 71 }
  ];

  const hotelPerformance = [
    { name: 'Burj Al Arab', bookings: 45, revenue: 450000 },
    { name: 'Atlantis The Palm', bookings: 67, revenue: 335000 },
    { name: 'Jumeirah Beach Hotel', bookings: 34, revenue: 280000 },
    { name: 'One&Only Royal Mirage', bookings: 23, revenue: 230000 },
    { name: 'Four Seasons Resort', bookings: 29, revenue: 290000 }
  ];

  const tourPerformance = [
    { name: 'Desert Safari', value: 35, color: '#8884d8' },
    { name: 'Dubai City Tour', value: 28, color: '#82ca9d' },
    { name: 'Burj Khalifa Tour', value: 20, color: '#ffc658' },
    { name: 'Marina Cruise', value: 12, color: '#ff7c7c' },
    { name: 'Abu Dhabi Tour', value: 5, color: '#8dd1e1' }
  ];

  const salesTeamData = [
    { name: 'Ahmed Al-Rashid', quotes: 89, revenue: 890000, conversion: 78 },
    { name: 'Sarah Johnson', quotes: 76, revenue: 760000, conversion: 72 },
    { name: 'Mohammed Hassan', quotes: 65, revenue: 650000, conversion: 69 },
    { name: 'Lisa Chen', quotes: 58, revenue: 580000, conversion: 75 }
  ];

  const kpiCards = [
    {
      title: 'Total Revenue',
      value: 'AED 2,850,000',
      change: '+18.5%',
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Quotes Generated',
      value: '847',
      change: '+12.3%',
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Conversion Rate',
      value: '73.2%',
      change: '+5.8%',
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Active Customers',
      value: '324',
      change: '+8.9%',
      icon: Users,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center">
            <BarChart className="mr-3 h-8 w-8 text-dubai-gold" />
            Analytics Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Performance insights and business intelligence
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last-7-days">Last 7 days</SelectItem>
              <SelectItem value="last-30-days">Last 30 days</SelectItem>
              <SelectItem value="last-90-days">Last 90 days</SelectItem>
              <SelectItem value="last-year">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="flex items-center">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map((kpi, index) => (
          <Card key={index} className="dubai-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{kpi.title}</p>
                  <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                  <p className="text-xs text-green-600 mt-1">{kpi.change} from last period</p>
                </div>
                <div className={`p-3 rounded-lg ${kpi.bgColor}`}>
                  <kpi.icon className={`h-6 w-6 ${kpi.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <Card className="dubai-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Revenue Trend</span>
              <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="revenue">Revenue</SelectItem>
                  <SelectItem value="quotes">Quotes</SelectItem>
                  <SelectItem value="bookings">Bookings</SelectItem>
                </SelectContent>
              </Select>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => selectedMetric === 'revenue' ? `AED ${value.toLocaleString()}` : value} />
                <Area 
                  type="monotone" 
                  dataKey={selectedMetric}
                  stroke="hsl(var(--dubai-navy))"
                  fill="url(#gradient)"
                />
                <defs>
                  <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--dubai-navy))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--dubai-navy))" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tour Performance Pie Chart */}
        <Card className="dubai-card">
          <CardHeader>
            <CardTitle>Popular Tours Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={tourPerformance}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {tourPerformance.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Performance Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hotel Performance */}
        <Card className="dubai-card">
          <CardHeader>
            <CardTitle>Top Performing Hotels</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {hotelPerformance.map((hotel, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div>
                    <h4 className="font-semibold">{hotel.name}</h4>
                    <p className="text-sm text-muted-foreground">{hotel.bookings} bookings</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-dubai-navy">AED {hotel.revenue.toLocaleString()}</p>
                    <div className="w-20 bg-gray-200 rounded-full h-2 mt-1">
                      <div 
                        className="bg-dubai-gold h-2 rounded-full" 
                        style={{ width: `${(hotel.revenue / 450000) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sales Team Performance */}
        <Card className="dubai-card">
          <CardHeader>
            <CardTitle>Sales Team Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {salesTeamData.map((member, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-dubai-cream flex items-center justify-center">
                      <span className="text-sm font-semibold text-dubai-navy">
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-semibold">{member.name}</h4>
                      <p className="text-sm text-muted-foreground">{member.quotes} quotes</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-dubai-navy">AED {(member.revenue / 1000).toFixed(0)}K</p>
                    <p className="text-xs text-green-600">{member.conversion}% conversion</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Performance Chart */}
      <Card className="dubai-card">
        <CardHeader>
          <CardTitle>Monthly Performance Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="revenue" fill="hsl(var(--dubai-navy))" name="Revenue (AED)" />
              <Bar yAxisId="right" dataKey="quotes" fill="hsl(var(--dubai-gold))" name="Quotes Generated" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;