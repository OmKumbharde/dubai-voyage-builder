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

    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.width;
    const pageHeight = pdf.internal.pageSize.height;

    // Modern gradient header
    pdf.setFillColor(0, 51, 102); // Dubai Navy
    pdf.rect(0, 0, pageWidth, 45, 'F');
    
    // Accent stripe
    pdf.setFillColor(200, 161, 92); // Dubai Gold
    pdf.rect(0, 45, pageWidth, 3, 'F');
    
    pdf.setFontSize(26);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    pdf.text('SALES INVOICE', pageWidth / 2, 20, { align: 'center' });
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Q1 Travel Tours', pageWidth / 2, 30, { align: 'center' });
    pdf.setFontSize(8);
    pdf.text('Premium Travel Experiences | Dubai, UAE', pageWidth / 2, 37, { align: 'center' });

    // Reset text color for body
    pdf.setTextColor(0, 0, 0);

    // Company and Invoice Details in two columns with modern styling
    let yPos = 60;
    
    // Left column box - Company details
    pdf.setDrawColor(0, 51, 102);
    pdf.setLineWidth(0.5);
    pdf.setFillColor(248, 249, 250);
    pdf.roundedRect(15, yPos - 5, 80, 35, 2, 2, 'FD');
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 51, 102);
    pdf.text('FROM', 20, yPos);
    
    yPos += 6;
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text('Q1 Travel Tours', 20, yPos);
    yPos += 5;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    if (selectedBankAccount) {
      pdf.text(selectedBankAccount.branch_country, 20, yPos);
      yPos += 4;
    }
    pdf.text('Email: info@q1travel.com', 20, yPos);
    yPos += 4;
    pdf.text('Tel: +971 4 XXX XXXX', 20, yPos);

    // Right column box - Invoice details
    yPos = 55;
    const rightCol = pageWidth - 95;
    
    pdf.setDrawColor(200, 161, 92);
    pdf.setFillColor(255, 253, 245);
    pdf.roundedRect(rightCol, yPos, 80, 35, 2, 2, 'FD');
    
    yPos += 5;
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(200, 161, 92);
    pdf.text('INVOICE DETAILS', rightCol + 5, yPos);
    pdf.setTextColor(0, 0, 0);
    
    yPos += 6;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    
    // Generate invoice number: date + reference
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const invoiceNo = `INV-${dateStr}-${quote.ticketReference}`;
    
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Invoice No.:`, rightCol + 5, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.text(invoiceNo, rightCol + 30, yPos);
    yPos += 5;
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Date:`, rightCol + 5, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.text(format(today, 'dd MMM yyyy'), rightCol + 30, yPos);
    yPos += 5;
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Ref:`, rightCol + 5, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`TKT ${quote.ticketReference}`, rightCol + 30, yPos);

    // Separator line
    yPos = 102;
    pdf.setDrawColor(200, 161, 92);
    pdf.setLineWidth(1);
    pdf.line(15, yPos, pageWidth - 15, yPos);

    // Bill To section with modern box
    yPos += 8;
    pdf.setDrawColor(0, 51, 102);
    pdf.setLineWidth(0.5);
    pdf.setFillColor(248, 249, 250);
    pdf.roundedRect(15, yPos, pageWidth - 30, 20, 2, 2, 'FD');
    
    yPos += 5;
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 51, 102);
    pdf.text('BILL TO', 20, yPos);
    pdf.setTextColor(0, 0, 0);
    
    yPos += 6;
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text(leadPaxName, 20, yPos);
    
    yPos += 5;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    const travelDatesFrom = (quote as any).travel_dates_from || quote.travelDates.startDate;
    const travelDatesTo = (quote as any).travel_dates_to || quote.travelDates.endDate;
    pdf.text(`Travel: ${format(new Date(travelDatesFrom), 'dd MMM yyyy')} - ${format(new Date(travelDatesTo), 'dd MMM yyyy')}`, 20, yPos);
    
    // Services table with modern header
    yPos += 12;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 51, 102);
    pdf.text('SERVICES & BREAKDOWN', 20, yPos);
    pdf.setTextColor(0, 0, 0);

    yPos += 7;
    
    // Table headers with gradient
    pdf.setFillColor(0, 51, 102);
    pdf.rect(15, yPos - 5, pageWidth - 30, 9, 'F');
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    pdf.text('#', 18, yPos);
    pdf.text('DESCRIPTION', 28, yPos);
    pdf.text('DATES', 105, yPos);
    pdf.text('PAX', 135, yPos);
    pdf.text('RATE', 150, yPos);
    pdf.text('AMOUNT (USD)', 170, yPos);
    pdf.setTextColor(0, 0, 0);

    yPos += 8;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    
    const nights = Math.ceil((new Date(travelDatesTo).getTime() - new Date(travelDatesFrom).getTime()) / (1000 * 60 * 60 * 24));
    let srNo = 1;
    let totalAmount = 0;
    
    // Alternating row colors for better readability
    let isAlternate = false;

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

        // Alternating row background
        if (isAlternate) {
          pdf.setFillColor(248, 249, 250);
          pdf.rect(15, yPos - 4, pageWidth - 30, 8, 'F');
        }
        isAlternate = !isAlternate;

        pdf.setFont('helvetica', 'normal');
        pdf.text(String(srNo), 18, yPos);
        
        const serviceDesc = `${selectedOption.hotel.name} - ${type} Occupancy`;
        const splitDesc = pdf.splitTextToSize(serviceDesc, 72);
        pdf.text(splitDesc, 28, yPos);
        
        pdf.setFontSize(7);
        const travelDates = `${format(new Date(travelDatesFrom), 'dd MMM')} - ${format(new Date(travelDatesTo), 'dd MMM yyyy')}`;
        pdf.text(travelDates, 105, yPos);
        pdf.setFontSize(8);
        
        pdf.text(String(pax.adults).padStart(2, '0'), 137, yPos);
        
        // Calculate cost
        const rooms = Math.ceil(pax.adults * multiplier);
        const hotelRate = selectedOption.hotel.baseRate || 0;
        const extraBedRate = selectedOption.hotel.extraBedRate || 100;
        let lineCost = (rooms * hotelRate + pax.cwb * extraBedRate) * nights;
        
        // Convert to USD
        lineCost = lineCost / 3.67;
        
        pdf.text(`$${(lineCost / pax.adults).toFixed(2)}`, 150, yPos);
        pdf.text(`$${lineCost.toFixed(2)}`, 172, yPos);
        
        totalAmount += lineCost;
        yPos += Math.max(8, splitDesc.length * 4);
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

        // Alternating row background
        if (isAlternate) {
          pdf.setFillColor(248, 249, 250);
          pdf.rect(15, yPos - 4, pageWidth - 30, 8, 'F');
        }
        isAlternate = !isAlternate;

        pdf.text(String(srNo), 18, yPos);
        const tourDesc = pdf.splitTextToSize(`Tour: ${tour.name}`, 72);
        pdf.text(tourDesc, 28, yPos);
        pdf.text('-', 107, yPos);
        pdf.text(String(totalDistributed).padStart(2, '0'), 137, yPos);
        
        const tourCost = (tour.costPerPerson * totalDistributed) / 3.67;
        pdf.text(`$${(tour.costPerPerson / 3.67).toFixed(2)}`, 150, yPos);
        pdf.text(`$${tourCost.toFixed(2)}`, 172, yPos);
        
        totalAmount += tourCost;
        yPos += Math.max(8, tourDesc.length * 4);
        srNo++;
      });
    }

    // Inclusions section
    yPos += 8;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(0, 51, 102);
    pdf.text('INCLUSIONS:', 18, yPos);
    pdf.setTextColor(0, 0, 0);
    yPos += 6;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    
    const inclusionsList = [
      'Daily Breakfast at hotel',
      ...quote.selectedTours.map(t => t.name),
      ...(quote.selectedInclusions?.map(i => i.name) || []),
      'All transfers on SIC basis',
      'All applicable taxes (Tourism Dirham excluded)'
    ];

    inclusionsList.forEach(inc => {
      if (yPos > 265) {
        pdf.addPage();
        yPos = 30;
      }
      pdf.text(`• ${inc}`, 22, yPos);
      yPos += 4;
    });

    // Total with modern styling
    yPos += 8;
    pdf.setDrawColor(200, 161, 92);
    pdf.setLineWidth(0.5);
    pdf.setFillColor(255, 253, 245);
    pdf.roundedRect(15, yPos - 5, pageWidth - 30, 12, 2, 2, 'FD');
    
    yPos += 2;
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 51, 102);
    pdf.text('TOTAL AMOUNT:', 105, yPos);
    pdf.setTextColor(200, 161, 92);
    pdf.setFontSize(13);
    pdf.text(`USD $${totalAmount.toFixed(2)}`, 170, yPos);
    pdf.setTextColor(0, 0, 0);

    // Bank Details with modern box
    if (selectedBankAccount) {
      yPos += 18;
      if (yPos > 215) {
        pdf.addPage();
        yPos = 30;
      }

      pdf.setDrawColor(0, 51, 102);
      pdf.setLineWidth(0.5);
      pdf.setFillColor(248, 249, 250);
      pdf.roundedRect(15, yPos - 3, pageWidth - 30, 45, 2, 2, 'FD');

      yPos += 2;
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 51, 102);
      pdf.text('BANK DETAILS FOR PAYMENT', 20, yPos);
      pdf.setTextColor(0, 0, 0);
      
      yPos += 7;
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      
      const bankDetails = [
        { label: 'Bank Name', value: selectedBankAccount.bank_name },
        { label: 'Account Name', value: selectedBankAccount.account_name },
        { label: 'Account Number', value: selectedBankAccount.account_number },
        ...(selectedBankAccount.swift_code ? [{ label: 'SWIFT Code', value: selectedBankAccount.swift_code }] : []),
        ...(selectedBankAccount.iban ? [{ label: 'IBAN', value: selectedBankAccount.iban }] : []),
        { label: 'Currency', value: selectedBankAccount.currency }
      ];

      bankDetails.forEach(detail => {
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${detail.label}:`, 20, yPos);
        pdf.setFont('helvetica', 'normal');
        pdf.text(detail.value, 60, yPos);
        yPos += 5;
      });
    }

    // Declaration and footer
    const declarationY = pageHeight - 40;
    
    pdf.setFillColor(248, 249, 250);
    pdf.rect(0, declarationY - 8, pageWidth, 30, 'F');
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 51, 102);
    pdf.text('DECLARATION', 20, declarationY);
    pdf.setTextColor(0, 0, 0);
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.text('We declare that this invoice shows the actual price of the services described and that all particulars are true and correct.', 20, declarationY + 5);
    
    // Signature and place
    pdf.setFontSize(8);
    pdf.text('Authorized Signature: ___________________', 20, declarationY + 15);
    if (selectedBankAccount) {
      pdf.text(`Place: ${selectedBankAccount.branch_country}`, pageWidth - 55, declarationY + 15);
    }
    pdf.text(`Date: ${format(today, 'dd/MM/yyyy')}`, pageWidth - 55, declarationY + 20);

    // Footer stripe
    pdf.setFillColor(200, 161, 92);
    pdf.rect(0, pageHeight - 10, pageWidth, 10, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'italic');
    pdf.text('Thank you for choosing Q1 Travel Tours', pageWidth / 2, pageHeight - 5, { align: 'center' });

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
