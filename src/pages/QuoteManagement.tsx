import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useNavigate, useSearchParams } from 'react-router-dom';
import jsPDF from 'jspdf';
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
  DollarSign,
  Copy
} from 'lucide-react';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { Quote } from '../hooks/useSupabaseData';
import { toast } from '../hooks/use-toast';
import { InvoiceGenerationDialog } from '../components/InvoiceGenerationDialog';

const QuoteManagement = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { quotes, updateQuote, isLoading } = useSupabaseData();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [quoteForInvoice, setQuoteForInvoice] = useState<Quote | null>(null);

  // Handle URL parameter for selected quote
  useEffect(() => {
    const selectedId = searchParams.get('selected');
    if (selectedId && quotes.length > 0) {
      const quote = quotes.find(q => q.id === selectedId);
      if (quote) {
        setSelectedQuote(quote);
      }
    }
  }, [searchParams, quotes]);

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
    try {
      const pdf = new jsPDF();
      
      // Header
      pdf.setFontSize(20);
      pdf.text('INVOICE', 20, 30);
      
      // Company details
      pdf.setFontSize(12);
      pdf.text('Dubai Travel Company', 20, 50);
      pdf.text('123 Business District, Dubai, UAE', 20, 60);
      pdf.text('Phone: +971 4 123 4567', 20, 70);
      pdf.text('Email: info@dubaitravel.com', 20, 80);
      
      // Invoice details
      pdf.text(`Invoice #: INV-${quote.ticketReference}`, 120, 50);
      pdf.text(`Date: ${new Date().toLocaleDateString()}`, 120, 60);
      
      // Customer details
      pdf.setFontSize(14);
      pdf.text('Bill To:', 20, 110);
      pdf.setFontSize(12);
      pdf.text(quote.customerName, 20, 125);
      if (quote.customerEmail) {
        pdf.text(quote.customerEmail, 20, 135);
      }
      
      // Quote details
      pdf.setFontSize(14);
      pdf.text('Quote Details:', 20, 165);
      pdf.setFontSize(12);
      pdf.text(`Quote Reference: ${quote.ticketReference}`, 20, 180);
      pdf.text(`Travel Dates: ${new Date(quote.travelDates.startDate).toLocaleDateString()} - ${new Date(quote.travelDates.endDate).toLocaleDateString()}`, 20, 190);
      pdf.text(`Passengers: ${quote.paxDetails.adults} Adults`, 20, 200);
      
      if (quote.selectedHotel) {
        pdf.text(`Hotel: ${quote.selectedHotel.name}`, 20, 210);
      }
      
      // Total amount
      pdf.setFontSize(16);
      pdf.text(`Total Amount: AED ${quote.calculations.totalCostAED.toLocaleString()}`, 20, 240);
      pdf.text(`(USD $${quote.calculations.totalCostUSD.toLocaleString()})`, 20, 255);
      
      // Save the PDF
      pdf.save(`invoice-${quote.ticketReference}.pdf`);
      
      toast({
        title: "Invoice Generated",
        description: `Invoice PDF downloaded for quote ${quote.ticketReference}`
      });
    } catch (error) {
      console.error('Error generating invoice:', error);
      toast({
        title: "Error",
        description: "Failed to generate invoice PDF",
        variant: "destructive"
      });
    }
  };

  const generateItinerary = (quote: Quote) => {
    try {
      const pdf = new jsPDF();
      
      // Header
      pdf.setFontSize(20);
      pdf.text('TRAVEL ITINERARY', 20, 30);
      
      // Customer details
      pdf.setFontSize(14);
      pdf.text(`Customer: ${quote.customerName}`, 20, 50);
      pdf.text(`Quote Reference: ${quote.ticketReference}`, 20, 65);
      pdf.text(`Travel Dates: ${new Date(quote.travelDates.startDate).toLocaleDateString()} - ${new Date(quote.travelDates.endDate).toLocaleDateString()}`, 20, 80);
      
      let yPos = 110;
      
      // Hotel information
      if (quote.selectedHotel) {
        pdf.setFontSize(16);
        pdf.text('ACCOMMODATION', 20, yPos);
        yPos += 15;
        pdf.setFontSize(12);
        pdf.text(`Hotel: ${quote.selectedHotel.name}`, 20, yPos);
        yPos += 10;
        pdf.text(`Location: ${quote.selectedHotel.location}`, 20, yPos);
        yPos += 10;
        pdf.text(`Rating: ${quote.selectedHotel.starRating} Stars`, 20, yPos);
        yPos += 20;
      }
      
      // Tours information
      if (quote.selectedTours.length > 0) {
        pdf.setFontSize(16);
        pdf.text('TOURS & ACTIVITIES', 20, yPos);
        yPos += 15;
        
        quote.selectedTours.forEach((tour) => {
          pdf.setFontSize(12);
          pdf.text(`• ${tour.name}`, 20, yPos);
          yPos += 10;
          pdf.text(`  Duration: ${tour.duration}`, 25, yPos);
          yPos += 10;
          pdf.text(`  Type: ${tour.type.charAt(0).toUpperCase() + tour.type.slice(1)}`, 25, yPos);
          yPos += 15;
        });
      }
      
      // Contact information
      yPos += 20;
      pdf.setFontSize(14);
      pdf.text('CONTACT INFORMATION', 20, yPos);
      yPos += 15;
      pdf.setFontSize(12);
      pdf.text('Dubai Travel Company', 20, yPos);
      yPos += 10;
      pdf.text('Phone: +971 4 123 4567', 20, yPos);
      yPos += 10;
      pdf.text('Email: info@dubaitravel.com', 20, yPos);
      
      // Save the PDF
      pdf.save(`itinerary-${quote.ticketReference}.pdf`);
      
      toast({
        title: "Itinerary Generated",
        description: `Itinerary PDF downloaded for quote ${quote.ticketReference}`
      });
    } catch (error) {
      console.error('Error generating itinerary:', error);
      toast({
        title: "Error",
        description: "Failed to generate itinerary PDF",
        variant: "destructive"
      });
    }
  };

  const editQuote = (quote: Quote) => {
    // Parse structured data from notes if available
    let structuredData: any = {};
    const dbQuote = quote as any;
    if (dbQuote.notes && dbQuote.notes.includes('---QUOTE_DATA---')) {
      try {
        const jsonPart = dbQuote.notes.split('---QUOTE_DATA---')[1];
        structuredData = JSON.parse(jsonPart);
      } catch (e) {
        console.error('Failed to parse quote data:', e);
      }
    }
    
    // Navigate to quote tool with the quote data, converting to expected format
    const editData = {
      ...quote,
      id: dbQuote.id,
      client_name: quote.customerName,
      client_email: quote.customerEmail,
      reference_number: quote.ticketReference,
      travel_dates_from: quote.travelDates.startDate,
      travel_dates_to: quote.travelDates.endDate,
      selectedOccupancies: structuredData.occupancies || ['DBL'],
      selectedHotels: structuredData.selectedHotels || (quote.selectedHotel ? [quote.selectedHotel] : []),
      selectedTours: structuredData.selectedTours || quote.selectedTours || [],
      selectedInclusions: structuredData.selectedInclusions || [],
      editableRates: structuredData.editableRates || {},
      hotelOptions: structuredData.hotelOptions,
      formattedText: dbQuote.formatted_quote,
      calculations: quote.calculations
    };
    navigate('/quote', { state: { editQuote: editData } });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'payment_received': return 'bg-emerald-100 text-emerald-800';
      case 'booking_in_process': return 'bg-yellow-100 text-yellow-800';
      case 'booking_completed': return 'bg-purple-100 text-purple-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <Clock className="h-3 w-3" />;
      case 'sent': return <Send className="h-3 w-3" />;
      case 'confirmed': return <Check className="h-3 w-3" />;
      case 'payment_received': return <DollarSign className="h-3 w-3" />;
      case 'booking_in_process': return <Clock className="h-3 w-3" />;
      case 'booking_completed': return <Check className="h-3 w-3" />;
      case 'cancelled': return <X className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  const statusOptions = [
    { value: 'draft', label: 'Draft' },
    { value: 'sent', label: 'Sent' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'payment_received', label: 'Payment Received' },
    { value: 'booking_in_process', label: 'Booking in Process' },
    { value: 'booking_completed', label: 'Booking Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

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
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
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
                  AED {quotes.reduce((sum, q) => {
                    const dbQuote = q as any;
                    return sum + (dbQuote.total_amount || q.calculations?.totalCostAED || 0);
                  }, 0).toLocaleString()}
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
              {filteredQuotes.map((quote) => {
                const dbQuote = quote as any;
                return (
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
                              <span className="capitalize">{quote.status.replace('_', ' ')}</span>
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
                                AED {(dbQuote.total_amount || quote.calculations?.totalCostAED || 0).toLocaleString()}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Total Package Cost
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
                          <Button size="sm" variant="outline" onClick={() => {
                            // View quote functionality - show formatted quote in new window with proper text copy
                            if (dbQuote.formatted_quote) {
                              const newWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes');
                              if (newWindow) {
                                newWindow.document.open();
                                newWindow.document.write(`
                                  <!DOCTYPE html>
                                  <html>
                                  <head>
                                    <title>Quote - ${quote.ticketReference}</title>
                                    <style>
                                      body { 
                                        font-family: Arial, sans-serif; 
                                        padding: 20px; 
                                        background: white;
                                        margin: 0;
                                      }
                                      .actions {
                                        position: fixed;
                                        top: 10px;
                                        right: 10px;
                                        background: white;
                                        padding: 10px;
                                        border: 1px solid #ccc;
                                        border-radius: 5px;
                                        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                                      }
                                      .actions button {
                                        margin: 0 5px;
                                        padding: 5px 10px;
                                        background: #007cba;
                                        color: white;
                                        border: none;
                                        border-radius: 3px;
                                        cursor: pointer;
                                      }
                                      .actions button:hover {
                                        background: #005a8b;
                                      }
                                      table { border-collapse: collapse; width: 100%; }
                                      td, th { border: 1px solid #000; padding: 8px; }
                                      ul { padding-left: 20px; }
                                      li { margin: 5px 0; }
                                    </style>
                                  </head>
                                  <body>
                                    <div class="actions">
                                      <button onclick="window.print()">Print</button>
                                      <button onclick="copyAsText()">Copy Text</button>
                                      <button onclick="window.close()">Close</button>
                                    </div>
                                    <div id="quote-content">
                                      ${dbQuote.formatted_quote}
                                    </div>
                                    <script>
                                      function copyAsText() {
                                        const content = document.getElementById('quote-content').innerText;
                                        navigator.clipboard.writeText(content).then(() => {
                                          alert('Quote text copied to clipboard!');
                                        });
                                      }
                                    </script>
                                  </body>
                                  </html>
                                `);
                                newWindow.document.close();
                              }
                            } else {
                              toast({
                                title: "No Quote Content", 
                                description: "This quote doesn't have formatted content to view",
                                variant: "destructive"
                              });
                            }
                          }}>
                            <Eye className="mr-2 h-3 w-3" />
                            View
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => editQuote(quote)}>
                            <Edit3 className="mr-2 h-3 w-3" />
                            Edit
                          </Button>
                        </div>
                        
                        <div className="flex space-x-2">
                          <Button 
                            size="sm" 
                            onClick={() => {
                              setQuoteForInvoice(quote);
                              setInvoiceDialogOpen(true);
                            }}
                            className="dubai-button-gold text-xs"
                          >
                            <Download className="mr-2 h-3 w-3" />
                            Invoice
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              const shareUrl = `${window.location.origin}/shared-itinerary/${quote.id}`;
                              window.open(shareUrl, '_blank');
                            }}
                            className="text-xs"
                          >
                            <Calendar className="mr-2 h-3 w-3" />
                            Itinerary
                          </Button>
                        </div>

                        {/* Status Update Dropdown */}
                        <div>
                          <Select 
                            value={quote.status} 
                            onValueChange={(newStatus) => updateQuoteStatus(quote.id, newStatus as Quote['status'])}
                          >
                            <SelectTrigger className="w-full text-xs">
                              <SelectValue placeholder="Change Status" />
                            </SelectTrigger>
                            <SelectContent>
                              {statusOptions.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              
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

      {/* Invoice Generation Dialog */}
      {quoteForInvoice && (
        <InvoiceGenerationDialog
          isOpen={invoiceDialogOpen}
          onClose={() => {
            setInvoiceDialogOpen(false);
            setQuoteForInvoice(null);
          }}
          quote={quoteForInvoice}
        />
      )}
    </div>
  );
};

export default QuoteManagement;