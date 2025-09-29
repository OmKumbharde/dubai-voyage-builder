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
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedHotelOption, setSelectedHotelOption] = useState('');
  
  // Occupancy distribution: track how many PAX in each occupancy type
  const [occupancyDistribution, setOccupancyDistribution] = useState<{
    single: { adults: number; cwb: number; cnb: number; infants: number };
    double: { adults: number; cwb: number; cnb: number; infants: number };
    triple: { adults: number; cwb: number; cnb: number; infants: number };
  }>({
    single: { adults: 0, cwb: 0, cnb: 0, infants: 0 },
    double: { adults: 0, cwb: 0, cnb: 0, infants: 0 },
    triple: { adults: 0, cwb: 0, cnb: 0, infants: 0 }
  });
  
  const [guestNames, setGuestNames] = useState<string[]>(['']);

  const branches = ['Ghana', 'Nigeria', 'Kenya', 'Dubai'];
  
  const selectedBankAccount = bankAccounts.find(account => 
    account.branch_country.toLowerCase() === selectedBranch.toLowerCase()
  );

  const handleAddGuestName = () => {
    setGuestNames([...guestNames, '']);
  };

  const handleRemoveGuestName = (index: number) => {
    setGuestNames(guestNames.filter((_, i) => i !== index));
  };

  const handleGuestNameChange = (index: number, value: string) => {
    const newNames = [...guestNames];
    newNames[index] = value;
    setGuestNames(newNames);
  };

  const generateInvoicePDF = () => {
    if (!selectedBranch || !selectedHotelOption) {
      toast({
        title: "Missing Information",
        description: "Please select branch and hotel option",
        variant: "destructive"
      });
      return;
    }
    
    // Calculate total PAX from all occupancy types
    const totalPax = 
      Object.values(occupancyDistribution.single).reduce((a, b) => a + b, 0) +
      Object.values(occupancyDistribution.double).reduce((a, b) => a + b, 0) +
      Object.values(occupancyDistribution.triple).reduce((a, b) => a + b, 0);
    
    if (totalPax === 0) {
      toast({
        title: "Missing Information",
        description: "Please specify PAX distribution across occupancy types",
        variant: "destructive"
      });
      return;
    }

    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.width;
    const pageHeight = pdf.internal.pageSize.height;

    // Header
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('SALES INVOICE', pageWidth / 2, 30, { align: 'center' });

    // Company and Invoice Details
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Company: Q1 Travel Tours', 20, 50);
    
    // Generate invoice number: date + reference number
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const invoiceNo = `${dateStr}${quote.ticketReference.replace(/\D/g, '')}`;
    
    pdf.text(`Invoice No.: ${invoiceNo}`, 20, 65);
    pdf.text(`Address: ${selectedBranch}`, 20, 80);
    pdf.text(`Invoice Date: ${today.toLocaleDateString('en-GB')}`, 20, 95);
    pdf.text(`Guest Name: ${guestNames.filter(name => name.trim()).join(', ')}`, 20, 110);
    pdf.text(`Reference No: TKT ${quote.ticketReference}`, 20, 125);

    // Table header
    let yPos = 150;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Sr. No.', 20, yPos);
    pdf.text('Services', 50, yPos);
    pdf.text('Travel Date', 120, yPos);
    pdf.text('PAX', 150, yPos);
    pdf.text('Cost', 165, yPos);
    pdf.text('Amount', 185, yPos);

    // Table content
    yPos += 15;
    pdf.setFont('helvetica', 'normal');
    
    const travelDates = `${new Date(quote.travelDates.startDate).toLocaleDateString('en-GB')} - ${new Date(quote.travelDates.endDate).toLocaleDateString('en-GB')}`;
    
    let srNo = 1;
    
    // Add hotel services for each occupancy type that has PAX
    const occupancyTypes: Array<'single' | 'double' | 'triple'> = ['single', 'double', 'triple'];
    
    occupancyTypes.forEach(occType => {
      const occData = occupancyDistribution[occType];
      const occPax = occData.adults + occData.cwb + occData.cnb;
      
      if (occPax > 0) {
        pdf.text(`${srNo}.`, 20, yPos);
        
        const occTypeName = occType.charAt(0).toUpperCase() + occType.slice(1);
        const hotelText = `${quote.selectedHotel?.name || 'Hotel'} (${occTypeName} Occupancy)`;
        const maxWidth = 65;
        const splitHotelText = pdf.splitTextToSize(hotelText, maxWidth);
        pdf.text(splitHotelText, 50, yPos);
        
        pdf.text(travelDates, 120, yPos);
        pdf.text(occPax.toString().padStart(2, '0'), 150, yPos);
        
        // Calculate cost for this occupancy type
        const nights = Math.ceil((new Date(quote.travelDates.endDate).getTime() - new Date(quote.travelDates.startDate).getTime()) / (1000 * 60 * 60 * 24));
        const baseRate = quote.selectedHotel?.baseRate || 0;
        let occCost = 0;
        
        if (occType === 'single') {
          occCost = occData.adults * baseRate * nights;
        } else if (occType === 'double') {
          const rooms = Math.ceil(occData.adults / 2);
          occCost = rooms * baseRate * nights;
        } else if (occType === 'triple') {
          const rooms = Math.ceil(occData.adults / 3);
          occCost = rooms * baseRate * nights;
        }
        
        // Add extra bed costs
        occCost += (occData.cwb * (quote.selectedHotel?.extraBedRate || 100) * nights);
        
        pdf.text(`USD ${occCost.toFixed(2)}`, 165, yPos);
        pdf.text(`USD ${occCost.toFixed(2)}`, 185, yPos);
        
        yPos += 10;
        srNo++;
      }
    });

    // Calculate total cost from all occupancy types
    let totalCost = 0;
    const nights = Math.ceil((new Date(quote.travelDates.endDate).getTime() - new Date(quote.travelDates.startDate).getTime()) / (1000 * 60 * 60 * 24));
    const baseRate = quote.selectedHotel?.baseRate || 0;
    
    occupancyTypes.forEach(occType => {
      const occData = occupancyDistribution[occType];
      const occPax = occData.adults + occData.cwb + occData.cnb;
      
      if (occPax > 0) {
        let occCost = 0;
        if (occType === 'single') {
          occCost = occData.adults * baseRate * nights;
        } else if (occType === 'double') {
          const rooms = Math.ceil(occData.adults / 2);
          occCost = rooms * baseRate * nights;
        } else if (occType === 'triple') {
          const rooms = Math.ceil(occData.adults / 3);
          occCost = rooms * baseRate * nights;
        }
        occCost += (occData.cwb * (quote.selectedHotel?.extraBedRate || 100) * nights);
        totalCost += occCost;
      }
    });

    // Inclusions section
    yPos += 15;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Inclusions', 20, yPos);
    
    yPos += 10;
    pdf.setFont('helvetica', 'normal');
    
    // List inclusions
    const inclusions = [
      'Daily Breakfast',
      ...quote.selectedTours.map(tour => tour.name),
      ...quote.selectedInclusions.map(inclusion => inclusion.name),
      'All taxes except Tourism Dirham'
    ];

    inclusions.forEach(inclusion => {
      pdf.text(inclusion, 20, yPos);
      pdf.text('-', 120, yPos);
      pdf.text('-', 150, yPos);
      pdf.text('-', 165, yPos);
      pdf.text('-', 185, yPos);
      yPos += 10;
    });

    // Total
    yPos += 10;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Total', 20, yPos);
    pdf.text(`USD ${totalCost}`, 165, yPos);

    // Bank Details
    if (selectedBankAccount) {
      yPos += 30;
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Bank Details:', 20, yPos);
      
      yPos += 10;
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Bank Name: ${selectedBankAccount.bank_name}`, 20, yPos);
      pdf.text(`Account Name: ${selectedBankAccount.account_name}`, 20, yPos + 10);
      pdf.text(`Account Number: ${selectedBankAccount.account_number}`, 20, yPos + 20);
      if (selectedBankAccount.swift_code) {
        pdf.text(`SWIFT Code: ${selectedBankAccount.swift_code}`, 20, yPos + 30);
      }
      if (selectedBankAccount.iban) {
        pdf.text(`IBAN: ${selectedBankAccount.iban}`, 20, yPos + 40);
      }
    }

    // Declaration
    const declarationY = pageHeight - 40;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Declaration', 20, declarationY);
    pdf.setFont('helvetica', 'normal');
    pdf.text('We declare that this invoice shows the actual price of the Services described', 20, declarationY + 10);
    pdf.text('and that all Particulars are true and correct', 20, declarationY + 20);
    
    pdf.text('U.A.E.', pageWidth - 30, declarationY + 30);

    // Save the PDF
    const fileName = `Invoice_TKT_${quote.ticketReference}_${invoiceNo}.pdf`;
    pdf.save(fileName);

    toast({
      title: "Invoice Generated",
      description: `Invoice ${fileName} has been downloaded successfully`,
    });

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Invoice - Quote #{quote.ticketReference}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Branch Selection */}
          <div className="space-y-2">
            <Label htmlFor="branch">Select Branch *</Label>
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger>
                <SelectValue placeholder="Choose branch location" />
              </SelectTrigger>
              <SelectContent>
                {branches.map(branch => (
                  <SelectItem key={branch} value={branch}>{branch}</SelectItem>
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
                <SelectItem value="option1">{quote.selectedHotel?.name || 'Selected Hotel'}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Occupancy Distribution */}
          <Card>
            <CardContent className="pt-4 space-y-6">
              <div>
                <Label className="text-sm font-medium mb-4 block">PAX Distribution by Occupancy Type</Label>
                <p className="text-xs text-muted-foreground mb-4">
                  Distribute your {quote.paxDetails?.adults || 0} adults across occupancy types
                </p>
              </div>
              
              {/* Single Occupancy */}
              <div className="border rounded-lg p-4 space-y-3">
                <Label className="font-semibold">Single Occupancy</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <Label htmlFor="single-adults" className="text-xs">Adults</Label>
                    <Input
                      id="single-adults"
                      type="number"
                      min="0"
                      value={occupancyDistribution.single.adults}
                      onChange={(e) => setOccupancyDistribution(prev => ({
                        ...prev,
                        single: { ...prev.single, adults: parseInt(e.target.value) || 0 }
                      }))}
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label htmlFor="single-cwb" className="text-xs">CWB</Label>
                    <Input
                      id="single-cwb"
                      type="number"
                      min="0"
                      value={occupancyDistribution.single.cwb}
                      onChange={(e) => setOccupancyDistribution(prev => ({
                        ...prev,
                        single: { ...prev.single, cwb: parseInt(e.target.value) || 0 }
                      }))}
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label htmlFor="single-cnb" className="text-xs">CNB</Label>
                    <Input
                      id="single-cnb"
                      type="number"
                      min="0"
                      value={occupancyDistribution.single.cnb}
                      onChange={(e) => setOccupancyDistribution(prev => ({
                        ...prev,
                        single: { ...prev.single, cnb: parseInt(e.target.value) || 0 }
                      }))}
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label htmlFor="single-infants" className="text-xs">Infants</Label>
                    <Input
                      id="single-infants"
                      type="number"
                      min="0"
                      value={occupancyDistribution.single.infants}
                      onChange={(e) => setOccupancyDistribution(prev => ({
                        ...prev,
                        single: { ...prev.single, infants: parseInt(e.target.value) || 0 }
                      }))}
                      className="h-8"
                    />
                  </div>
                </div>
              </div>
              
              {/* Double Occupancy */}
              <div className="border rounded-lg p-4 space-y-3">
                <Label className="font-semibold">Double Occupancy</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <Label htmlFor="double-adults" className="text-xs">Adults</Label>
                    <Input
                      id="double-adults"
                      type="number"
                      min="0"
                      value={occupancyDistribution.double.adults}
                      onChange={(e) => setOccupancyDistribution(prev => ({
                        ...prev,
                        double: { ...prev.double, adults: parseInt(e.target.value) || 0 }
                      }))}
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label htmlFor="double-cwb" className="text-xs">CWB</Label>
                    <Input
                      id="double-cwb"
                      type="number"
                      min="0"
                      value={occupancyDistribution.double.cwb}
                      onChange={(e) => setOccupancyDistribution(prev => ({
                        ...prev,
                        double: { ...prev.double, cwb: parseInt(e.target.value) || 0 }
                      }))}
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label htmlFor="double-cnb" className="text-xs">CNB</Label>
                    <Input
                      id="double-cnb"
                      type="number"
                      min="0"
                      value={occupancyDistribution.double.cnb}
                      onChange={(e) => setOccupancyDistribution(prev => ({
                        ...prev,
                        double: { ...prev.double, cnb: parseInt(e.target.value) || 0 }
                      }))}
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label htmlFor="double-infants" className="text-xs">Infants</Label>
                    <Input
                      id="double-infants"
                      type="number"
                      min="0"
                      value={occupancyDistribution.double.infants}
                      onChange={(e) => setOccupancyDistribution(prev => ({
                        ...prev,
                        double: { ...prev.double, infants: parseInt(e.target.value) || 0 }
                      }))}
                      className="h-8"
                    />
                  </div>
                </div>
              </div>
              
              {/* Triple Occupancy */}
              <div className="border rounded-lg p-4 space-y-3">
                <Label className="font-semibold">Triple Occupancy</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <Label htmlFor="triple-adults" className="text-xs">Adults</Label>
                    <Input
                      id="triple-adults"
                      type="number"
                      min="0"
                      value={occupancyDistribution.triple.adults}
                      onChange={(e) => setOccupancyDistribution(prev => ({
                        ...prev,
                        triple: { ...prev.triple, adults: parseInt(e.target.value) || 0 }
                      }))}
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label htmlFor="triple-cwb" className="text-xs">CWB</Label>
                    <Input
                      id="triple-cwb"
                      type="number"
                      min="0"
                      value={occupancyDistribution.triple.cwb}
                      onChange={(e) => setOccupancyDistribution(prev => ({
                        ...prev,
                        triple: { ...prev.triple, cwb: parseInt(e.target.value) || 0 }
                      }))}
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label htmlFor="triple-cnb" className="text-xs">CNB</Label>
                    <Input
                      id="triple-cnb"
                      type="number"
                      min="0"
                      value={occupancyDistribution.triple.cnb}
                      onChange={(e) => setOccupancyDistribution(prev => ({
                        ...prev,
                        triple: { ...prev.triple, cnb: parseInt(e.target.value) || 0 }
                      }))}
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label htmlFor="triple-infants" className="text-xs">Infants</Label>
                    <Input
                      id="triple-infants"
                      type="number"
                      min="0"
                      value={occupancyDistribution.triple.infants}
                      onChange={(e) => setOccupancyDistribution(prev => ({
                        ...prev,
                        triple: { ...prev.triple, infants: parseInt(e.target.value) || 0 }
                      }))}
                      className="h-8"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Guest Names */}
          <div className="space-y-2">
            <Label>Guest Names</Label>
            {guestNames.map((name, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={name}
                  onChange={(e) => handleGuestNameChange(index, e.target.value)}
                  placeholder={`Guest ${index + 1} name`}
                />
                {index > 0 && (
                  <Button 
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveGuestName(index)}
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={handleAddGuestName}
            >
              Add Guest
            </Button>
          </div>

          {/* Bank Account Preview */}
          {selectedBankAccount && (
            <Card>
              <CardContent className="pt-4">
                <Label className="text-sm font-medium">Bank Account Details</Label>
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