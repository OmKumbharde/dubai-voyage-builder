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
import jsPDF from 'jspdf';

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
  
  // Parse formatted quote to get hotel options
  if (quoteAny.formatted_quote) {
    try {
      const formatted = JSON.parse(quoteAny.formatted_quote);
      if (formatted.hotelOptions && Array.isArray(formatted.hotelOptions)) {
        hotelOptions = formatted.hotelOptions;
      }
    } catch (e) {
      console.error('Error parsing formatted quote:', e);
    }
  }
  
  // Fallback: try selectedHotel if it exists
  if (hotelOptions.length === 0 && quote.selectedHotel) {
    hotelOptions = [{ hotel: quote.selectedHotel }];
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

    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.width;
    const pageHeight = pdf.internal.pageSize.height;

    // Header - Professional styling
    pdf.setFillColor(0, 51, 102); // Dark blue header
    pdf.rect(0, 0, pageWidth, 40, 'F');
    
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    pdf.text('SALES INVOICE', pageWidth / 2, 20, { align: 'center' });
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Q1 Travel Tours - Premium Travel Services', pageWidth / 2, 30, { align: 'center' });

    // Reset text color for body
    pdf.setTextColor(0, 0, 0);

    // Company and Invoice Details in two columns
    let yPos = 55;
    
    // Left column - Company details
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text('FROM:', 20, yPos);
    
    yPos += 7;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Q1 Travel Tours', 20, yPos);
    yPos += 5;
    if (selectedBankAccount) {
      pdf.text(`Branch: ${selectedBankAccount.branch_country}`, 20, yPos);
    }
    yPos += 5;
    pdf.text('Email: info@q1travel.com', 20, yPos);
    yPos += 5;
    pdf.text('Phone: +971 4 XXX XXXX', 20, yPos);

    // Right column - Invoice details
    yPos = 55;
    const rightCol = pageWidth - 80;
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('INVOICE DETAILS:', rightCol, yPos);
    
    yPos += 7;
    pdf.setFont('helvetica', 'normal');
    
    // Generate invoice number: date + reference
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const invoiceNo = `${dateStr}-${quote.ticketReference}`;
    
    pdf.text(`Invoice No.: ${invoiceNo}`, rightCol, yPos);
    yPos += 5;
    pdf.text(`Date: ${today.toLocaleDateString('en-GB')}`, rightCol, yPos);
    yPos += 5;
    pdf.text(`Reference: TKT ${quote.ticketReference}`, rightCol, yPos);

    // Horizontal line separator
    yPos = 100;
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.5);
    pdf.line(20, yPos, pageWidth - 20, yPos);

    // Bill To section
    yPos += 10;
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text('BILL TO:', 20, yPos);
    
    yPos += 7;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Guest Name: ${leadPaxName}`, 20, yPos);
    yPos += 5;
    
    const travelDatesFrom = (quote as any).travel_dates_from || quote.travelDates.startDate;
    const travelDatesTo = (quote as any).travel_dates_to || quote.travelDates.endDate;
    pdf.text(`Travel Period: ${new Date(travelDatesFrom).toLocaleDateString('en-GB')} - ${new Date(travelDatesTo).toLocaleDateString('en-GB')}`, 20, yPos);
    
    // Services table
    yPos += 15;
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text('SERVICES', 20, yPos);

    yPos += 8;
    
    // Table headers
    pdf.setFillColor(240, 240, 240);
    pdf.rect(20, yPos - 5, pageWidth - 40, 8, 'F');
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Sr.', 22, yPos);
    pdf.text('Description', 35, yPos);
    pdf.text('Dates', 110, yPos);
    pdf.text('PAX', 140, yPos);
    pdf.text('Rate', 155, yPos);
    pdf.text('Amount (USD)', 175, yPos);

    yPos += 10;
    pdf.setFont('helvetica', 'normal');
    
    const nights = Math.ceil((new Date(travelDatesTo).getTime() - new Date(travelDatesFrom).getTime()) / (1000 * 60 * 60 * 24));
    let srNo = 1;
    let totalAmount = 0;

    // Hotel accommodation by occupancy type
    const occupancies = [
      { type: 'Single', pax: singlePax, multiplier: 1 },
      { type: 'Double', pax: doublePax, multiplier: 0.5 },
      { type: 'Triple', pax: triplePax, multiplier: 0.333 }
    ];

    occupancies.forEach(({ type, pax, multiplier }) => {
      if (pax.adults > 0) {
        if (yPos > 250) {
          pdf.addPage();
          yPos = 30;
        }

        pdf.text(String(srNo), 22, yPos);
        
        const serviceDesc = `${selectedOption.hotel.name} (${type} Occupancy)`;
        const splitDesc = pdf.splitTextToSize(serviceDesc, 70);
        pdf.text(splitDesc, 35, yPos);
        
        const travelDates = `${new Date(travelDatesFrom).toLocaleDateString('en-GB')} - ${new Date(travelDatesTo).toLocaleDateString('en-GB')}`;
        pdf.text(travelDates, 110, yPos);
        
        pdf.text(String(pax.adults).padStart(2, '0'), 140, yPos);
        
        // Calculate cost
        const rooms = Math.ceil(pax.adults * multiplier);
        const hotelRate = selectedOption.hotel.baseRate || 0;
        const extraBedRate = selectedOption.hotel.extraBedRate || 100;
        let lineCost = (rooms * hotelRate + pax.cwb * extraBedRate) * nights;
        
        // Convert to USD
        lineCost = lineCost / 3.67;
        
        pdf.text(`$${lineCost.toFixed(2)}`, 155, yPos);
        pdf.text(`$${lineCost.toFixed(2)}`, 175, yPos);
        
        totalAmount += lineCost;
        yPos += 10;
        srNo++;
      }
    });

    // Tours and inclusions
    if (quote.selectedTours && quote.selectedTours.length > 0) {
      quote.selectedTours.forEach((tour) => {
        if (yPos > 250) {
          pdf.addPage();
          yPos = 30;
        }

        pdf.text(String(srNo), 22, yPos);
        pdf.text(`Tour: ${tour.name}`, 35, yPos);
        pdf.text('-', 110, yPos);
        pdf.text(String(totalDistributed).padStart(2, '0'), 140, yPos);
        
        const tourCost = (tour.costPerPerson * totalDistributed) / 3.67;
        pdf.text(`$${(tour.costPerPerson / 3.67).toFixed(2)}`, 155, yPos);
        pdf.text(`$${tourCost.toFixed(2)}`, 175, yPos);
        
        totalAmount += tourCost;
        yPos += 8;
        srNo++;
      });
    }

    // Inclusions
    yPos += 5;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Inclusions:', 22, yPos);
    yPos += 7;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    
    const inclusionsList = [
      'Daily Breakfast',
      ...quote.selectedTours.map(t => t.name),
      ...(quote.selectedInclusions?.map(i => i.name) || []),
      'All transfers on SIC basis',
      'All taxes except Tourism Dirham'
    ];

    inclusionsList.forEach(inc => {
      if (yPos > 260) {
        pdf.addPage();
        yPos = 30;
      }
      pdf.text(`• ${inc}`, 25, yPos);
      yPos += 5;
    });

    // Total
    yPos += 10;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setFillColor(240, 240, 240);
    pdf.rect(20, yPos - 7, pageWidth - 40, 10, 'F');
    pdf.text('TOTAL AMOUNT:', 110, yPos);
    pdf.text(`USD $${totalAmount.toFixed(2)}`, 175, yPos);

    // Bank Details
    if (selectedBankAccount) {
      yPos += 20;
      if (yPos > 220) {
        pdf.addPage();
        yPos = 30;
      }

      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('BANK DETAILS FOR PAYMENT:', 20, yPos);
      
      yPos += 8;
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Bank Name: ${selectedBankAccount.bank_name}`, 20, yPos);
      yPos += 5;
      pdf.text(`Account Name: ${selectedBankAccount.account_name}`, 20, yPos);
      yPos += 5;
      pdf.text(`Account Number: ${selectedBankAccount.account_number}`, 20, yPos);
      yPos += 5;
      if (selectedBankAccount.swift_code) {
        pdf.text(`SWIFT Code: ${selectedBankAccount.swift_code}`, 20, yPos);
        yPos += 5;
      }
      if (selectedBankAccount.iban) {
        pdf.text(`IBAN: ${selectedBankAccount.iban}`, 20, yPos);
        yPos += 5;
      }
      pdf.text(`Currency: ${selectedBankAccount.currency}`, 20, yPos);
    }

    // Declaration at bottom
    const declarationY = pageHeight - 35;
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('DECLARATION', 20, declarationY);
    pdf.setFont('helvetica', 'italic');
    pdf.text('We declare that this invoice shows the actual price of the services described', 20, declarationY + 5);
    pdf.text('and that all particulars are true and correct.', 20, declarationY + 10);
    
    // Footer signature line
    pdf.setFont('helvetica', 'normal');
    pdf.text('Authorized Signature: ________________', 20, declarationY + 20);
    if (selectedBankAccount) {
      pdf.text(`Place: ${selectedBankAccount.branch_country}`, pageWidth - 60, declarationY + 20);
    }

    // Save the PDF
    const fileName = `Invoice_${quote.ticketReference}_${invoiceNo}.pdf`;
    pdf.save(fileName);

    toast({
      title: "Invoice Generated",
      description: `Invoice ${fileName} has been downloaded successfully`,
    });

    onClose();
  };

  // Calculate max values from quote
  const totalAdults = quote.paxDetails.adults;
  const totalCwb = quote.paxDetails.cwb;
  const totalCnb = quote.paxDetails.cnb;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Invoice - Quote #{quote.ticketReference}</DialogTitle>
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
