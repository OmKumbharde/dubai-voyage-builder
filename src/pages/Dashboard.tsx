import React from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  FileText, 
  Calendar,
  Building2,
  MapPin,
  Star
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useAuth } from '../context/AuthContext';
import { useSupabaseData } from '../hooks/useSupabaseData';
import dubaiHero from '../assets/dubai-hero.jpg';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { user } = useAuth();
  const { hotels, tours, quotes, isLoading } = useSupabaseData();
  const navigate = useNavigate();

  const totalRevenue = quotes.reduce((sum, quote) => sum + (quote.total_amount || 0), 0);
  const confirmedQuotes = quotes.filter(q => q.status === 'confirmed');
  const conversionRate = quotes.length > 0 ? ((confirmedQuotes.length / quotes.length) * 100).toFixed(1) : '0';

  const stats = [
    {
      title: 'Total Quotes',
      value: quotes.length.toString(),
      change: '+12%',
      icon: FileText,
      color: 'text-blue-600'
    },
    {
      title: 'Revenue (AED)',
      value: `${totalRevenue.toLocaleString()}`,
      change: '+18%',
      icon: DollarSign,
      color: 'text-green-600'
    },
    {
      title: 'Active Bookings',
      value: confirmedQuotes.length.toString(),
      change: '+5%',
      icon: Calendar,
      color: 'text-purple-600'
    },
    {
      title: 'Conversion Rate',
      value: `${conversionRate}%`,
      change: '+8%',
      icon: TrendingUp,
      color: 'text-orange-600'
    }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Hero Section */}
      <div className="relative rounded-2xl overflow-hidden shadow-elegant">
        <div className="absolute inset-0">
          <img 
            src={dubaiHero} 
            alt="Dubai Skyline" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-dubai-navy/80 to-transparent"></div>
        </div>
        <div className="relative p-8 text-white">
          <h1 className="text-4xl font-bold mb-2">
            Welcome back, {user?.email?.split('@')[0]}!
          </h1>
          <p className="text-xl opacity-90">
            Your premium Dubai travel platform dashboard
          </p>
          <div className="mt-6 flex space-x-4">
            <button 
              onClick={() => navigate('/quote')}
              className="dubai-button-gold"
            >
              Create New Quote
            </button>
            <button 
              onClick={() => navigate('/analytics')}
              className="border border-white/30 text-white px-6 py-3 rounded-lg font-semibold transition-smooth hover:bg-white/10"
            >
              View Analytics
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="dubai-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-500">{stat.change}</span> from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card className="dubai-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Star className="h-5 w-5 mr-2 text-dubai-gold" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <button 
              onClick={() => navigate('/quote')}
              className="w-full text-left p-4 rounded-lg border hover:bg-gray-50 transition-smooth"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Generate Quote</h3>
                  <p className="text-sm text-muted-foreground">Create a new travel quote</p>
                </div>
                <FileText className="h-5 w-5 text-dubai-blue" />
              </div>
            </button>
            <button 
              onClick={() => navigate('/admin/hotels')}
              className="w-full text-left p-4 rounded-lg border hover:bg-gray-50 transition-smooth"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Manage Hotels</h3>
                  <p className="text-sm text-muted-foreground">Update hotel inventory</p>
                </div>
                <Building2 className="h-5 w-5 text-dubai-blue" />
              </div>
            </button>
            <button 
              onClick={() => navigate('/admin/tours')}
              className="w-full text-left p-4 rounded-lg border hover:bg-gray-50 transition-smooth"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Tour Packages</h3>
                  <p className="text-sm text-muted-foreground">Manage tour offerings</p>
                </div>
                <MapPin className="h-5 w-5 text-dubai-blue" />
              </div>
            </button>
          </CardContent>
        </Card>

        {/* Recent Quotes */}
        <Card className="dubai-card">
          <CardHeader>
            <CardTitle>Recent Quotes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoading ? (
                <div className="text-center py-4">Loading quotes...</div>
              ) : quotes.slice(0, 4).map((quote) => (
                <div 
                  key={quote.id} 
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => navigate(`/quote-management?selected=${quote.id}`)}
                >
                  <div>
                    <h4 className="font-semibold">Quote #{quote.reference_number}</h4>
                    <p className="text-sm text-muted-foreground">
                      {quote.client_name} • {quote.adults} adults
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-dubai-navy">AED {quote.total_amount?.toLocaleString()}</p>
                    <p className={`text-xs capitalize ${
                      quote.status === 'confirmed' ? 'text-green-600' : 
                      quote.status === 'draft' ? 'text-yellow-600' : 'text-blue-600'
                    }`}>
                      {quote.status}
                    </p>
                  </div>
                </div>
              ))}
              {!isLoading && quotes.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">No quotes yet</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Popular Hotels and Tours */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="dubai-card">
          <CardHeader>
            <CardTitle>Popular Hotels</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {hotels.slice(0, 3).map((hotel) => (
                <div key={hotel.id} className="flex items-center space-x-4 p-3 rounded-lg bg-gray-50">
                  <div className="w-12 h-12 rounded-lg bg-dubai-cream flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-dubai-navy" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold">{hotel.name}</h4>
                    <p className="text-sm text-muted-foreground">{hotel.location}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex">
                      {[...Array(hotel.starRating)].map((_, i) => (
                        <Star key={i} className="h-3 w-3 fill-dubai-gold text-dubai-gold" />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">95% rating</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="dubai-card">
          <CardHeader>
            <CardTitle>Top Tours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tours.map((tour) => (
                <div key={tour.id} className="flex items-center space-x-4 p-3 rounded-lg bg-gray-50">
                  <div className="w-12 h-12 rounded-lg bg-dubai-cream flex items-center justify-center">
                    <MapPin className="h-6 w-6 text-dubai-navy" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold">{tour.name}</h4>
                    <p className="text-sm text-muted-foreground">{tour.duration}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-dubai-navy">AED {tour.costPerPerson}</p>
                    <p className="text-xs text-muted-foreground capitalize">{tour.type}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;