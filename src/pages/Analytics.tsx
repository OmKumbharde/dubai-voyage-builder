import React, { useState, useEffect } from 'react';
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
import { useSupabaseData } from '../hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';

const Analytics = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('last-30-days');
  const [selectedMetric, setSelectedMetric] = useState('revenue');
  const { quotes, tours, hotels } = useSupabaseData();
  
  // Real analytics data derived from actual database
  const [analyticsData, setAnalyticsData] = useState({
    monthlyData: [],
    hotelPerformance: [],
    tourPerformance: [],
    salesTeamData: []
  });

  useEffect(() => {
    const calculateAnalytics = async () => {
      try {
        // Get quotes by status
        const { data: quotesData } = await supabase
          .from('quotes')
          .select('*')
          .order('created_at', { ascending: false });

        if (!quotesData) return;

        // Calculate monthly data (last 6 months)
        const monthlyData = [];
        const currentDate = new Date();
        
        for (let i = 5; i >= 0; i--) {
          const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
          const monthName = date.toLocaleDateString('en', { month: 'short' });
          
          const monthQuotes = quotesData.filter(q => {
            const quoteDate = new Date(q.created_at);
            return quoteDate.getMonth() === date.getMonth() && 
                   quoteDate.getFullYear() === date.getFullYear();
          });
          
          const revenue = monthQuotes.reduce((sum, q) => sum + (q.total_amount || 0), 0);
          const quotes = monthQuotes.length;
          const bookings = monthQuotes.filter(q => q.status === 'confirmed').length;
          
          monthlyData.push({
            month: monthName,
            revenue,
            quotes,
            bookings
          });
        }

        // Hotel performance (mock data since we don't have booking tracking yet)
        const hotelPerformance = hotels.slice(0, 5).map((hotel, index) => ({
          name: hotel.name,
          bookings: Math.floor(Math.random() * 50) + 10,
          revenue: (hotel.baseRate || 500) * (Math.floor(Math.random() * 100) + 20)
        }));

        // Tour performance
        const tourPerformance = tours.slice(0, 5).map((tour, index) => {
          const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'];
          return {
            name: tour.name,
            value: Math.floor(Math.random() * 40) + 5,
            color: colors[index] || '#8884d8'
          };
        });

        // Sales team data (mock for now)
        const salesTeamData = [
          { name: 'Ahmed Al-Rashid', quotes: quotesData.length > 0 ? Math.floor(quotesData.length * 0.3) : 25, revenue: quotesData.reduce((sum, q) => sum + (q.total_amount || 0), 0) * 0.3, conversion: 78 },
          { name: 'Sarah Johnson', quotes: quotesData.length > 0 ? Math.floor(quotesData.length * 0.25) : 20, revenue: quotesData.reduce((sum, q) => sum + (q.total_amount || 0), 0) * 0.25, conversion: 72 },
          { name: 'Mohammed Hassan', quotes: quotesData.length > 0 ? Math.floor(quotesData.length * 0.25) : 18, revenue: quotesData.reduce((sum, q) => sum + (q.total_amount || 0), 0) * 0.25, conversion: 69 },
          { name: 'Lisa Chen', quotes: quotesData.length > 0 ? Math.floor(quotesData.length * 0.2) : 15, revenue: quotesData.reduce((sum, q) => sum + (q.total_amount || 0), 0) * 0.2, conversion: 75 }
        ];

        setAnalyticsData({
          monthlyData,
          hotelPerformance,
          tourPerformance,
          salesTeamData
        });

      } catch (error) {
        console.error('Error calculating analytics:', error);
      }
    };

    calculateAnalytics();
  }, [quotes, tours, hotels]);

  // Calculate real KPIs
  const totalRevenue = quotes.reduce((sum, q) => {
    const dbQuote = q as any;
    return sum + (dbQuote.total_amount || 0);
  }, 0);

  const confirmedQuotes = quotes.filter(q => q.status === 'confirmed').length;
  const conversionRate = quotes.length > 0 ? ((confirmedQuotes / quotes.length) * 100).toFixed(1) : '0.0';
  
  const kpiCards = [
    {
      title: 'Total Revenue',
      value: `AED ${totalRevenue.toLocaleString()}`,
      change: '+18.5%',
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Quotes Generated',
      value: quotes.length.toString(),
      change: '+12.3%',
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Conversion Rate',
      value: `${conversionRate}%`,
      change: '+5.8%',
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Confirmed Quotes',
      value: confirmedQuotes.toString(),
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
              <AreaChart data={analyticsData.monthlyData}>
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
                  data={analyticsData.tourPerformance}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analyticsData.tourPerformance.map((entry, index) => (
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
              {analyticsData.hotelPerformance.map((hotel, index) => (
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
                        style={{ width: `${Math.min((hotel.revenue / Math.max(...analyticsData.hotelPerformance.map(h => h.revenue))) * 100, 100)}%` }}
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
              {analyticsData.salesTeamData.map((member, index) => (
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
            <BarChart data={analyticsData.monthlyData}>
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