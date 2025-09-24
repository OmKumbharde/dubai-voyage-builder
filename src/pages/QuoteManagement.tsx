import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { 
  FileText, 
  Search, 
  Filter,
  Edit3,
  Download,
  Send,
  Eye,
  Calendar,
  Users,
  Building2,
  MapPin,
  Check,
  X,
  Clock,
  DollarSign
} from 'lucide-react';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { Quote } from '../hooks/useSupabaseData';
import { toast } from '../hooks/use-toast';

const QuoteManagement = () => {
  const { quotes, updateQuote, isLoading } = useSupabaseData();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);

  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = quote.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quote.ticketReference.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const updateQuoteStatus = async (quoteId: string, newStatus: Quote['status']) => {
    try {
      await updateQuote(quoteId, { status: newStatus });
      toast({
        title: "Status Updated",
        description: `Quote status updated to ${newStatus}`
      });
    } catch (error) {
      console.error('Error updating quote status:', error);
    }
  };

  const generateInvoice = (quote: Quote) => {
    // In a real implementation, this would generate an invoice
    toast({
      title: "Invoice Generated",
      description: `Invoice generated for quote ${quote.ticketReference}`
    });
  };

  const generateItinerary = (quote: Quote) => {
    toast({
      title: "Itinerary Generated",
      description: `Itinerary link generated for quote ${quote.ticketReference}`
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <Clock className="h-3 w-3" />;
      case 'sent': return <Send className="h-3 w-3" />;
      case 'confirmed': return <Check className="h-3 w-3" />;
      case 'cancelled': return <X className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center">
            <FileText className="mr-3 h-8 w-8 text-dubai-gold" />
            Quote Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage all quotes, generate invoices and track status
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="dubai-card">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Search Quotes</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by customer name or ticket reference..."
                  className="pl-10 dubai-input"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="status">Filter by Status</Label>
              <select
                id="status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="dubai-input"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="dubai-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Quotes</p>
                <p className="text-2xl font-bold">{quotes.length}</p>
              </div>
              <FileText className="h-8 w-8 text-dubai-blue" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="dubai-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Confirmed</p>
                <p className="text-2xl font-bold text-green-600">
                  {quotes.filter(q => q.status === 'confirmed').length}
                </p>
              </div>
              <Check className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="dubai-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {quotes.filter(q => q.status === 'sent').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="dubai-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold text-dubai-navy">
                  AED {quotes.reduce((sum, q) => sum + q.calculations.totalCostAED, 0).toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-dubai-navy" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quotes List */}
      <Card className="dubai-card">
        <CardHeader>
          <CardTitle>All Quotes</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading quotes...</div>
          ) : (
            <div className="space-y-4">
              {filteredQuotes.map((quote) => (
                <div key={quote.id} className="p-6 rounded-lg border bg-gradient-card hover:shadow-card transition-smooth">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-lg text-foreground">
                            {quote.customerName}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Quote #{quote.ticketReference}
                          </p>
                        </div>
                        <Badge className={getStatusColor(quote.status)}>
                          <span className="flex items-center space-x-1">
                            {getStatusIcon(quote.status)}
                            <span className="capitalize">{quote.status}</span>
                          </span>
                        </Badge>
                      </div>

                      {/* Quote Details */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center space-x-3">
                          <Calendar className="h-5 w-5 text-dubai-blue" />
                          <div>
                            <p className="font-medium">
                              {new Date(quote.travelDates.startDate).toLocaleDateString()} - 
                              {new Date(quote.travelDates.endDate).toLocaleDateString()}
                            </p>
                            <p className="text-sm text-muted-foreground">Travel Dates</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          <Users className="h-5 w-5 text-dubai-blue" />
                          <div>
                            <p className="font-medium">
                              {quote.paxDetails.adults} Adults
                              {quote.paxDetails.infants > 0 && `, ${quote.paxDetails.infants} Infants`}
                              {quote.paxDetails.cnb > 0 && `, ${quote.paxDetails.cnb} CNB`}
                              {quote.paxDetails.cwb > 0 && `, ${quote.paxDetails.cwb} CWB`}
                            </p>
                            <p className="text-sm text-muted-foreground">Passengers</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          <DollarSign className="h-5 w-5 text-dubai-blue" />
                          <div>
                            <p className="font-medium">
                              AED {quote.calculations.totalCostAED.toLocaleString()}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              USD ${quote.calculations.totalCostUSD.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Hotel and Tours */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {quote.selectedHotel && (
                          <div className="flex items-center space-x-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">Hotel: {quote.selectedHotel.name}</span>
                          </div>
                        )}
                        
                        {quote.selectedTours.length > 0 && (
                          <div className="flex items-center space-x-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">Tours: {quote.selectedTours.length} selected</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col space-y-2 ml-6">
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline">
                          <Eye className="mr-2 h-3 w-3" />
                          View
                        </Button>
                        <Button size="sm" variant="outline">
                          <Edit3 className="mr-2 h-3 w-3" />
                          Edit
                        </Button>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          onClick={() => generateInvoice(quote)}
                          className="dubai-button-gold text-xs"
                        >
                          <Download className="mr-2 h-3 w-3" />
                          Invoice
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => generateItinerary(quote)}
                          className="text-xs"
                        >
                          <Send className="mr-2 h-3 w-3" />
                          Itinerary
                        </Button>
                      </div>

                      {/* Status Update Buttons */}
                      <div className="flex flex-col space-y-1">
                        {quote.status === 'draft' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => updateQuoteStatus(quote.id, 'sent')}
                            className="text-xs"
                          >
                            Mark as Sent
                          </Button>
                        )}
                        {quote.status === 'sent' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => updateQuoteStatus(quote.id, 'confirmed')}
                            className="text-xs"
                          >
                            Confirm
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {filteredQuotes.length === 0 && !isLoading && (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'No quotes match your search criteria.' 
                    : 'No quotes available. Create your first quote to get started.'
                  }
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default QuoteManagement;