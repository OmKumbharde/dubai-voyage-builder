import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent } from './ui/card';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { Quote } from '../hooks/useSupabaseData';
import { toast } from '../hooks/use-toast';
import { format } from 'date-fns';

interface InvoiceGenerationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  quote: Quote;
}

export const InvoiceGenerationDialog: React.FC<InvoiceGenerationDialogProps> = ({
  isOpen,
  onClose,
  quote
}) => {
  const { bankAccounts } = useSupabaseData();
  const [selectedBankAccountId, setSelectedBankAccountId] = useState('');
  const [selectedHotelOption, setSelectedHotelOption] = useState<string>('');
  const [leadPaxName, setLeadPaxName] = useState('');
  
  // PAX distribution by occupancy
  const [singlePax, setSinglePax] = useState({ adults: 0, cwb: 0, cnb: 0 });
  const [doublePax, setDoublePax] = useState({ adults: 0, cwb: 0, cnb: 0 });
  const [triplePax, setTriplePax] = useState({ adults: 0, cwb: 0, cnb: 0 });
  
  const selectedBankAccount = bankAccounts.find(account => account.id === selectedBankAccountId);

  // Get available hotel options from quote
  const quoteAny = quote as any;
  let hotelOptions: any[] = [];
  
  // Try to extract structured data from notes field
  if (quoteAny.notes) {
    try {
      // More flexible regex to match the JSON data
      const quoteDataMatch = quoteAny.notes.match(/---QUOTE_DATA---\s*\n\s*({[\s\S]*})\s*$/);
      if (quoteDataMatch && quoteDataMatch[1]) {
        const quoteData = JSON.parse(quoteDataMatch[1]);
        if (quoteData.hotelOptions && Array.isArray(quoteData.hotelOptions)) {
          hotelOptions = quoteData.hotelOptions;
        }
      }
    } catch (e) {
      console.error('Error parsing structured quote data:', e);
    }
  }
  
  // Fallback: Check formatted_quote for backward compatibility
  if (hotelOptions.length === 0 && quoteAny.formatted_quote) {
    try {
      const formatted = JSON.parse(quoteAny.formatted_quote);
      if (formatted.hotelOptions && Array.isArray(formatted.hotelOptions)) {
        hotelOptions = formatted.hotelOptions;
      }
    } catch (e) {
      // Not JSON, probably HTML - try to use selectedHotels as fallback
    }
  }
  
  // Final fallback: create from selectedHotels if available
  if (hotelOptions.length === 0 && quoteAny.selectedHotels && Array.isArray(quoteAny.selectedHotels)) {
    hotelOptions = quoteAny.selectedHotels.map((hotel: any) => ({
      hotel: hotel,
      occupancyOptions: [{ occupancyType: 'DBL' }]
    }));
  }

  const generateInvoicePDF = () => {
    if (!selectedBankAccountId || !selectedHotelOption || !leadPaxName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields: bank account, hotel option, and lead passenger name",
        variant: "destructive"
      });
      return;
    }
    
    // Calculate total PAX from distribution
    const totalDistributed = 
      singlePax.adults + singlePax.cwb + singlePax.cnb +
      doublePax.adults + doublePax.cwb + doublePax.cnb +
      triplePax.adults + triplePax.cwb + triplePax.cnb;
    
    if (totalDistributed === 0) {
      toast({
        title: "Missing Information",
        description: "Please specify PAX distribution across occupancy types",
        variant: "destructive"
      });
      return;
    }

    const selectedOption = hotelOptions.find((opt: any) => opt.hotel.id === selectedHotelOption);
    if (!selectedOption) {
      toast({
        title: "Error",
        description: "Selected hotel option not found",
        variant: "destructive"
      });
      return;
    }

    const travelDatesFrom = (quote as any).travel_dates_from || quote.travelDates.startDate;
    const travelDatesTo = (quote as any).travel_dates_to || quote.travelDates.endDate;
    const nights = Math.ceil((new Date(travelDatesTo).getTime() - new Date(travelDatesFrom).getTime()) / (1000 * 60 * 60 * 24));
    
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const tktRef = (quote as any).ticket_reference || (quote as any).reference_number || quote.ticketReference;
    const invoiceNo = `INV-${dateStr}-${tktRef}`;

    // Calculate services
    const occupancies = [
      { type: 'Single', pax: singlePax, multiplier: 1 },
      { type: 'Double', pax: doublePax, multiplier: 0.5 },
      { type: 'Triple', pax: triplePax, multiplier: 0.333 }
    ];

    let serviceRows = '';
    let srNo = 1;
    let totalAmount = 0;

    occupancies.forEach(({ type, pax, multiplier }) => {
      if (pax.adults > 0) {
        const rooms = Math.ceil(pax.adults * multiplier);
        const hotelRate = selectedOption.hotel.baseRate || 0;
        const extraBedRate = selectedOption.hotel.extraBedRate || 100;
        let lineCost = (rooms * hotelRate + pax.cwb * extraBedRate) * nights;
        lineCost = lineCost / 3.67; // Convert to USD
        
        serviceRows += `
          <tr>
            <td style="font-weight: 600;">${srNo}</td>
            <td>${selectedOption.hotel.name} - ${type} Occupancy</td>
            <td>${format(new Date(travelDatesFrom), 'dd MMM')} - ${format(new Date(travelDatesTo), 'dd MMM yyyy')}</td>
            <td>${pax.adults}</td>
            <td>$${(lineCost / pax.adults).toFixed(2)}</td>
            <td style="font-weight: 600;">$${lineCost.toFixed(2)}</td>
          </tr>
        `;
        totalAmount += lineCost;
        srNo++;
      }
    });

    if (quote.selectedTours && quote.selectedTours.length > 0) {
      quote.selectedTours.forEach((tour) => {
        const tourCost = (tour.costPerPerson * totalDistributed) / 3.67;
        serviceRows += `
          <tr>
            <td style="font-weight: 600;">${srNo}</td>
            <td>Tour: ${tour.name}</td>
            <td>-</td>
            <td>${totalDistributed}</td>
            <td>$${(tour.costPerPerson / 3.67).toFixed(2)}</td>
            <td style="font-weight: 600;">$${tourCost.toFixed(2)}</td>
          </tr>
        `;
        totalAmount += tourCost;
        srNo++;
      });
    }

    const inclusionsList = [
      'Daily Breakfast at hotel',
      ...quote.selectedTours.map(t => t.name),
      ...(quote.selectedInclusions?.map(i => i.name) || []),
      'All transfers on SIC basis',
      'All applicable taxes (Tourism Dirham excluded)'
    ];

    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(`
        <html>
          <head>
            <title>Sales Invoice - ${invoiceNo}</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                padding: 40px; 
                line-height: 1.6;
                color: #333;
                background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
              }
              .container {
                max-width: 1000px;
                margin: 0 auto;
                background: white;
                padding: 40px;
                border-radius: 12px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.1);
              }
              .header { 
                text-align: center; 
                margin-bottom: 40px;
                padding-bottom: 20px;
                border-bottom: 3px solid #C8A15C;
              }
              .header h1 {
                color: #003366;
                font-size: 32px;
                margin-bottom: 10px;
                letter-spacing: 1px;
              }
              .header h2 {
                color: #C8A15C;
                font-size: 18px;
                font-weight: 500;
              }
              .section {
                margin-bottom: 30px;
              }
              .section-title {
                color: #003366;
                font-size: 18px;
                font-weight: 600;
                margin-bottom: 15px;
                padding-bottom: 8px;
                border-bottom: 2px solid #f0f0f0;
              }
              .info-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 20px;
                margin-bottom: 20px;
              }
              .info-item {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 8px;
                border-left: 4px solid #C8A15C;
              }
              .info-label {
                font-weight: 600;
                color: #003366;
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 5px;
              }
              .info-value {
                color: #333;
                font-size: 16px;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 15px;
                background: white;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 2px 8px rgba(0,0,0,0.05);
              }
              thead {
                background: linear-gradient(135deg, #003366 0%, #004488 100%);
                color: white;
              }
              th {
                padding: 12px;
                text-align: left;
                font-weight: 600;
                font-size: 13px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              td {
                padding: 12px;
                border-bottom: 1px solid #f0f0f0;
              }
              tr:last-child td {
                border-bottom: none;
              }
              tbody tr:hover {
                background: #f8f9fa;
              }
              .total-row {
                background: #fff3cd;
                font-weight: 700;
                font-size: 18px;
                color: #003366;
              }
              .inclusions-box {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 8px;
                margin-top: 20px;
              }
              .inclusions-box h4 {
                color: #003366;
                margin-bottom: 10px;
              }
              .inclusions-box ul {
                margin-left: 20px;
                column-count: 2;
              }
              .inclusions-box li {
                margin-bottom: 5px;
                font-size: 13px;
              }
              .bank-details {
                background: linear-gradient(135deg, #003366 0%, #004488 100%);
                color: white;
                padding: 20px;
                border-radius: 8px;
                margin-top: 20px;
              }
              .bank-details h4 {
                margin-bottom: 15px;
                font-size: 16px;
              }
              .bank-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 10px;
              }
              .bank-item {
                display: flex;
                gap: 10px;
              }
              .bank-label {
                font-weight: 600;
                min-width: 120px;
              }
              .declaration {
                background: #fff3cd;
                padding: 15px;
                border-radius: 8px;
                margin-top: 30px;
                border-left: 4px solid #ffc107;
              }
              .declaration h4 {
                color: #856404;
                margin-bottom: 10px;
              }
              .signature-section {
                display: flex;
                justify-content: space-between;
                margin-top: 20px;
                padding-top: 40px;
              }
              .btn-container {
                margin-top: 40px;
                text-align: center;
                padding-top: 20px;
                border-top: 2px solid #f0f0f0;
              }
              button {
                padding: 12px 30px;
                margin: 0 10px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
                transition: all 0.3s ease;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              .btn-print {
                background: linear-gradient(135deg, #003366 0%, #004488 100%);
                color: white;
              }
              .btn-print:hover {
                box-shadow: 0 4px 15px rgba(0, 51, 102, 0.3);
                transform: translateY(-2px);
              }
              .btn-close {
                background: #6c757d;
                color: white;
              }
              .btn-close:hover {
                background: #5a6268;
              }
              @media print {
                body { 
                  background: white; 
                  padding: 0; 
                }
                .container {
                  box-shadow: none;
                  padding: 20px;
                }
                .btn-container { 
                  display: none; 
                }
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>SALES INVOICE</h1>
                <h2>Invoice No: ${invoiceNo}</h2>
                <p style="color: #666; margin-top: 10px;">Q1 Travel Tours | Premium Travel Experiences | Dubai, UAE</p>
              </div>

              <div class="section">
                <div class="info-grid">
                  <div class="info-item">
                    <div class="info-label">From</div>
                    <div class="info-value">
                      <strong>Q1 Travel Tours</strong><br>
                      ${selectedBankAccount ? selectedBankAccount.branch_country + '<br>' : ''}
                      Email: info@q1travel.com<br>
                      Tel: +971 4 XXX XXXX
                    </div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Invoice Details</div>
                    <div class="info-value">
                      <strong>Date:</strong> ${format(today, 'dd MMM yyyy')}<br>
                      <strong>Reference:</strong> ${tktRef ? `TKT ${tktRef}` : `Ref ${(quote as any).reference_number}`}
                    </div>
                  </div>
                </div>
              </div>

              <div class="section">
                <div class="section-title">Bill To</div>
                <div class="info-item" style="border-left: 4px solid #003366;">
                  <div style="font-size: 18px; font-weight: 600; margin-bottom: 10px;">${leadPaxName}</div>
                  <div>Travel Period: ${format(new Date(travelDatesFrom), 'dd MMM yyyy')} - ${format(new Date(travelDatesTo), 'dd MMM yyyy')}</div>
                </div>
              </div>

              <div class="section">
                <div class="section-title">Services & Breakdown</div>
                <table>
                  <thead>
                    <tr>
                      <th style="width: 5%;">#</th>
                      <th style="width: 35%;">Description</th>
                      <th style="width: 20%;">Dates</th>
                      <th style="width: 10%;">PAX</th>
                      <th style="width: 15%;">Rate</th>
                      <th style="width: 15%;">Amount (USD)</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${serviceRows}
                    <tr class="total-row">
                      <td colspan="5" style="text-align: right; padding-right: 20px;">TOTAL AMOUNT:</td>
                      <td>USD $${totalAmount.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
                
                <div class="inclusions-box">
                  <h4>Inclusions</h4>
                  <ul>
                    ${inclusionsList.map(inc => `<li>${inc}</li>`).join('')}
                  </ul>
                </div>
              </div>

              ${selectedBankAccount ? `
              <div class="bank-details">
                <h4>Bank Details for Payment</h4>
                <div class="bank-grid">
                  <div class="bank-item">
                    <span class="bank-label">Bank Name:</span>
                    <span>${selectedBankAccount.bank_name}</span>
                  </div>
                  <div class="bank-item">
                    <span class="bank-label">Account Name:</span>
                    <span>${selectedBankAccount.account_name}</span>
                  </div>
                  <div class="bank-item">
                    <span class="bank-label">Account Number:</span>
                    <span>${selectedBankAccount.account_number}</span>
                  </div>
                  <div class="bank-item">
                    <span class="bank-label">Currency:</span>
                    <span>${selectedBankAccount.currency}</span>
                  </div>
                  ${selectedBankAccount.swift_code ? `
                  <div class="bank-item">
                    <span class="bank-label">SWIFT Code:</span>
                    <span>${selectedBankAccount.swift_code}</span>
                  </div>
                  ` : ''}
                  ${selectedBankAccount.iban ? `
                  <div class="bank-item">
                    <span class="bank-label">IBAN:</span>
                    <span>${selectedBankAccount.iban}</span>
                  </div>
                  ` : ''}
                </div>
              </div>
              ` : ''}

              <div class="declaration">
                <h4>DECLARATION</h4>
                <p>We declare that this invoice shows the actual price of the services described and that all particulars are true and correct.</p>
                <div class="signature-section">
                  <div>
                    <strong>Authorized Signature:</strong><br>
                    _________________________
                  </div>
                  <div style="text-align: right;">
                    <strong>Place:</strong> ${selectedBankAccount ? selectedBankAccount.branch_country : 'Dubai'}<br>
                    <strong>Date:</strong> ${format(today, 'dd/MM/yyyy')}
                  </div>
                </div>
              </div>

              <div class="btn-container">
                <button onclick="window.print()" class="btn-print">Print Invoice</button>
                <button onclick="window.close()" class="btn-close">Close</button>
              </div>
            </div>
          </body>
        </html>
      `);
      newWindow.document.close();
      
      toast({
        title: "Invoice Generated",
        description: "Invoice has been opened in a new window",
      });
    }

    onClose();
  };

  // Calculate max values from quote
  const totalAdults = quote.paxDetails.adults;
  const totalCwb = quote.paxDetails.cwb;
  const totalCnb = quote.paxDetails.cnb;
  const tktRef = (quote as any).ticket_reference || (quote as any).reference_number || quote.ticketReference;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Invoice - {tktRef ? `TKT ${tktRef}` : `Ref ${(quote as any).reference_number}`}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Bank Account Selection */}
          <div className="space-y-2">
            <Label htmlFor="bankAccount">Select Bank Account *</Label>
            <Select value={selectedBankAccountId} onValueChange={setSelectedBankAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose bank account" />
              </SelectTrigger>
              <SelectContent>
                {bankAccounts.map(account => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.bank_name} - {account.branch_country} ({account.currency})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Hotel Option Selection */}
          <div className="space-y-2">
            <Label htmlFor="hotel">Select Hotel Option *</Label>
            <Select value={selectedHotelOption} onValueChange={setSelectedHotelOption}>
              <SelectTrigger>
                <SelectValue placeholder="Choose hotel option" />
              </SelectTrigger>
              <SelectContent>
                {hotelOptions.length > 0 ? (
                  hotelOptions.map((option: any) => (
                    <SelectItem key={option.hotel.id} value={option.hotel.id}>
                      {option.hotel.name}
                    </SelectItem>
                  ))
                ) : quote.selectedHotel ? (
                  <SelectItem value={quote.selectedHotel.id}>
                    {quote.selectedHotel.name}
                  </SelectItem>
                ) : (
                  <SelectItem value="none" disabled>No hotel selected in quote</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Lead Passenger Name */}
          <div className="space-y-2">
            <Label htmlFor="leadPax">Lead Passenger Name *</Label>
            <Input
              id="leadPax"
              value={leadPaxName}
              onChange={(e) => setLeadPaxName(e.target.value)}
              placeholder="Enter lead passenger full name"
            />
          </div>

          {/* PAX Distribution */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div>
                <Label className="text-sm font-medium">PAX Distribution by Occupancy</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Available: {totalAdults} Adults, {totalCwb} CWB, {totalCnb} CNB
                </p>
              </div>
              
              <div className="space-y-2">
                {/* Single Occupancy */}
                <div className="flex items-center gap-3 p-2 border rounded-md">
                  <span className="text-sm font-medium w-24">Single</span>
                  <div className="flex gap-2 flex-1">
                    <div className="flex items-center gap-1">
                      <Label className="text-xs text-muted-foreground">Adults:</Label>
                      <Input
                        type="number"
                        min="0"
                        max={totalAdults}
                        value={singlePax.adults}
                        onChange={(e) => setSinglePax(prev => ({ ...prev, adults: parseInt(e.target.value) || 0 }))}
                        className="h-7 w-16 text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <Label className="text-xs text-muted-foreground">CWB:</Label>
                      <Input
                        type="number"
                        min="0"
                        max={totalCwb}
                        value={singlePax.cwb}
                        onChange={(e) => setSinglePax(prev => ({ ...prev, cwb: parseInt(e.target.value) || 0 }))}
                        className="h-7 w-16 text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <Label className="text-xs text-muted-foreground">CNB:</Label>
                      <Input
                        type="number"
                        min="0"
                        max={totalCnb}
                        value={singlePax.cnb}
                        onChange={(e) => setSinglePax(prev => ({ ...prev, cnb: parseInt(e.target.value) || 0 }))}
                        className="h-7 w-16 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Double Occupancy */}
                <div className="flex items-center gap-3 p-2 border rounded-md">
                  <span className="text-sm font-medium w-24">Double</span>
                  <div className="flex gap-2 flex-1">
                    <div className="flex items-center gap-1">
                      <Label className="text-xs text-muted-foreground">Adults:</Label>
                      <Input
                        type="number"
                        min="0"
                        max={totalAdults}
                        value={doublePax.adults}
                        onChange={(e) => setDoublePax(prev => ({ ...prev, adults: parseInt(e.target.value) || 0 }))}
                        className="h-7 w-16 text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <Label className="text-xs text-muted-foreground">CWB:</Label>
                      <Input
                        type="number"
                        min="0"
                        max={totalCwb}
                        value={doublePax.cwb}
                        onChange={(e) => setDoublePax(prev => ({ ...prev, cwb: parseInt(e.target.value) || 0 }))}
                        className="h-7 w-16 text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <Label className="text-xs text-muted-foreground">CNB:</Label>
                      <Input
                        type="number"
                        min="0"
                        max={totalCnb}
                        value={doublePax.cnb}
                        onChange={(e) => setDoublePax(prev => ({ ...prev, cnb: parseInt(e.target.value) || 0 }))}
                        className="h-7 w-16 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Triple Occupancy */}
                <div className="flex items-center gap-3 p-2 border rounded-md">
                  <span className="text-sm font-medium w-24">Triple</span>
                  <div className="flex gap-2 flex-1">
                    <div className="flex items-center gap-1">
                      <Label className="text-xs text-muted-foreground">Adults:</Label>
                      <Input
                        type="number"
                        min="0"
                        max={totalAdults}
                        value={triplePax.adults}
                        onChange={(e) => setTriplePax(prev => ({ ...prev, adults: parseInt(e.target.value) || 0 }))}
                        className="h-7 w-16 text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <Label className="text-xs text-muted-foreground">CWB:</Label>
                      <Input
                        type="number"
                        min="0"
                        max={totalCwb}
                        value={triplePax.cwb}
                        onChange={(e) => setTriplePax(prev => ({ ...prev, cwb: parseInt(e.target.value) || 0 }))}
                        className="h-7 w-16 text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <Label className="text-xs text-muted-foreground">CNB:</Label>
                      <Input
                        type="number"
                        min="0"
                        max={totalCnb}
                        value={triplePax.cnb}
                        onChange={(e) => setTriplePax(prev => ({ ...prev, cnb: parseInt(e.target.value) || 0 }))}
                        className="h-7 w-16 text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bank Account Preview */}
          {selectedBankAccount && (
            <Card>
              <CardContent className="pt-4">
                <Label className="text-sm font-medium">Selected Bank Account</Label>
                <div className="mt-2 text-sm space-y-1">
                  <p><strong>Bank:</strong> {selectedBankAccount.bank_name}</p>
                  <p><strong>Account:</strong> {selectedBankAccount.account_name}</p>
                  <p><strong>Number:</strong> {selectedBankAccount.account_number}</p>
                  {selectedBankAccount.swift_code && (
                    <p><strong>SWIFT:</strong> {selectedBankAccount.swift_code}</p>
                  )}
                  <p><strong>Currency:</strong> {selectedBankAccount.currency}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={generateInvoicePDF} className="dubai-button-primary">
            Generate Invoice PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
