import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import { Checkbox } from './ui/checkbox';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { Quote } from '../hooks/useSupabaseData';
import { toast } from '../hooks/use-toast';
import { supabase } from '../integrations/supabase/client';
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { AlertCircle } from 'lucide-react';

interface VoucherGenerationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  quote: Quote;
}

export const VoucherGenerationDialog: React.FC<VoucherGenerationDialogProps> = ({
  isOpen,
  onClose,
  quote
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [leadPaxName, setLeadPaxName] = useState('');
  const [hotelConfirmationNumber, setHotelConfirmationNumber] = useState('');
  const [tourismDirhamPaid, setTourismDirhamPaid] = useState(false);
  const [emergencyContact, setEmergencyContact] = useState('+971 52 939 6210');
  const [itineraryItems, setItineraryItems] = useState<any[]>([]);
  const { tours } = useSupabaseData();

  // Fetch saved itinerary
  useEffect(() => {
    const fetchItinerary = async () => {
      if (!quote?.id) return;
      
      const { data, error } = await supabase
        .from('itineraries')
        .select('*')
        .eq('quote_id', quote.id)
        .order('tour_date', { ascending: true });

      if (error) {
        console.error('Error fetching itinerary:', error);
      } else if (data) {
        setItineraryItems(data);
      }
    };

    if (isOpen) {
      fetchItinerary();
    }
  }, [isOpen, quote?.id]);

  const handleStepOneNext = () => {
    if (!leadPaxName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter the lead passenger name",
        variant: "destructive"
      });
      return;
    }
    setStep(2);
  };

  const generateVoucherPDF = () => {
    if (!hotelConfirmationNumber.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter the hotel confirmation number",
        variant: "destructive"
      });
      return;
    }

    const quoteAny = quote as any;
    const selectedHotel = quoteAny.selectedHotels?.[0] || quoteAny.selectedHotel;

    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.width;
    let yPos = 20;

    // Header
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Hotel / Tour Voucher', pageWidth / 2, yPos, { align: 'center' });

    yPos += 15;
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`BOOKING REF: TKT ${quote.ticketReference}`, 20, yPos);

    yPos += 10;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`NAME OF GUEST: ${leadPaxName}`, 20, yPos);

    yPos += 7;
    const totalPax = quoteAny.adults + (quoteAny.cwb || 0) + (quoteAny.cnb || 0) + (quoteAny.infants || 0);
    pdf.text(`PAX: ${String(totalPax).padStart(2, '0')}`, 20, yPos);

    // Hotel Details
    if (selectedHotel) {
      yPos += 10;
      pdf.setFont('helvetica', 'bold');
      pdf.text(`HOTEL: ${selectedHotel.name}`, 20, yPos);

      yPos += 7;
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Hotel Address: ${selectedHotel.location}`, 20, yPos);

      yPos += 7;
      pdf.text(`Hotel Confirmation Number: ${hotelConfirmationNumber}`, 20, yPos);

      yPos += 7;
      const checkIn = new Date(quoteAny.travel_dates_from);
      const checkOut = new Date(quoteAny.travel_dates_to);
      pdf.text(`CHECK IN (Standard Check in Time is 14.00 Hrs.): ${format(checkIn, 'do MMMM yyyy')}`, 20, yPos);

      yPos += 7;
      pdf.text(`CHECK OUT (Standard Check Out Time is 12.00 Noon): ${format(checkOut, 'do MMMM yyyy')}`, 20, yPos);

      yPos += 7;
      pdf.text(`TOURISM DHIRAM: ${tourismDirhamPaid ? 'Paid' : 'Not Paid'}`, 20, yPos);

      yPos += 7;
      pdf.text(`EMERGENCY CONTACT NUMBER: ${emergencyContact}`, 20, yPos);
    }

    // Airport Transfers Table
    yPos += 12;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    
    const transferTableY = yPos;
    pdf.text('AIRPORT TRANSFERS', 20, transferTableY);
    pdf.text('TYPE', 70, transferTableY);
    pdf.text('FLIGHT', 105, transferTableY);
    pdf.text('TIME', 130, transferTableY);
    pdf.text('PICK-UP TIME', 150, transferTableY);
    pdf.text('DATE', 180, transferTableY);

    yPos += 5;
    pdf.line(20, yPos, pageWidth - 20, yPos);

    yPos += 7;
    pdf.setFont('helvetica', 'normal');
    pdf.text('Airport Pick up', 20, yPos);
    pdf.text('Private', 70, yPos);
    pdf.text('NA', 105, yPos);
    pdf.text('-', 130, yPos);
    pdf.text('NA', 150, yPos);
    pdf.text('NA', 180, yPos);

    yPos += 7;
    pdf.text('Airport Drop Off', 20, yPos);
    pdf.text('Private', 70, yPos);
    pdf.text('NA', 105, yPos);
    pdf.text('-', 130, yPos);
    pdf.text('NA', 150, yPos);
    pdf.text('NA', 180, yPos);

    // Important notes for airport
    yPos += 10;
    pdf.setFontSize(8);
    pdf.text('• Please connect to free Wi-Fi at Dubai airport for easy WhatsApp communication', 20, yPos);
    yPos += 5;
    pdf.text('• Driver will be waiting at arrival hall after baggage reclaim with your name card', 20, yPos);
    yPos += 5;
    pdf.text('• Maximum waiting time for airport pick up is 1 hour 30 Mins after flight landing', 20, yPos);

    // Itinerary Section
    yPos += 12;
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text('ITINERARY', 20, yPos);

    yPos += 7;
    pdf.setFontSize(9);
    const itinTableY = yPos;
    pdf.text('DATE', 20, itinTableY);
    pdf.text('TOURS', 50, itinTableY);
    pdf.text('TYPE OF TRANSFER', 120, itinTableY);
    pdf.text('PICK-UP TIMING', 160, itinTableY);

    yPos += 5;
    pdf.line(20, yPos, pageWidth - 20, yPos);

    yPos += 7;
    pdf.setFont('helvetica', 'normal');

    if (itineraryItems.length > 0) {
      itineraryItems.forEach((item) => {
        const tour = tours.find(t => t.id === item.tour_id);
        if (tour) {
          if (yPos > 250) {
            pdf.addPage();
            yPos = 20;
          }
          
          pdf.text(format(new Date(item.tour_date), 'dd'), 20, yPos);
          pdf.text(tour.name, 50, yPos);
          pdf.text(tour.transferIncluded ? 'SIC' : 'Private', 120, yPos);
          pdf.text(tour.pickupTime || '09:00 AM', 160, yPos);
          yPos += 7;
        }
      });
    } else {
      pdf.text('NA', 20, yPos);
      pdf.text('NA', 50, yPos);
      pdf.text('NA', 120, yPos);
      pdf.text('NA', 160, yPos);
      yPos += 7;
    }

    yPos += 5;
    pdf.setFontSize(8);
    pdf.text('Kindly carry itinerary and theme park tickets during tour', 20, yPos);

    // Special Notes
    yPos += 12;
    if (yPos > 240) {
      pdf.addPage();
      yPos = 20;
    }

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('SPECIAL NOTES:', 20, yPos);

    yPos += 7;
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    
    const notes = [
      '1. We will no longer apply Force Majeure conditions for guests seeking to cancel or modify their booking',
      '   due to the current COVID-19 outbreak. These reservations will be treated like any standard booking.',
      '2. Please note that your pick-up will be provided within 30 minutes from the indicated pick-up time.',
      '   In order to avoid undue waiting of other guests and delays in the start of the excursion, our drivers',
      '   are under order not to wait for more than 05 minutes - starting the arrival of the driver to the pick-up location.',
      '',
      'Early Check Out will Attract Full cancellation Charge',
      '',
      'Hotel has rights to charge security deposit for any extra or damages.'
    ];

    notes.forEach(note => {
      if (yPos > 270) {
        pdf.addPage();
        yPos = 20;
      }
      pdf.text(note, 20, yPos);
      yPos += 5;
    });

    // Footer
    const footerY = pdf.internal.pageSize.height - 20;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'italic');
    pdf.text('Thank you for choosing us. We look forward to serving you soon…', pageWidth / 2, footerY, { align: 'center' });

    // Save PDF
    const fileName = `Voucher_TKT_${quote.ticketReference}.pdf`;
    pdf.save(fileName);

    toast({
      title: "Voucher Generated",
      description: `Voucher ${fileName} has been downloaded successfully`,
    });

    onClose();
    setStep(1);
    setLeadPaxName('');
    setHotelConfirmationNumber('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        setStep(1);
        setLeadPaxName('');
        setHotelConfirmationNumber('');
      }
      onClose();
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Generate Voucher - TKT {quote.ticketReference} 
            <span className="text-sm font-normal text-muted-foreground ml-2">(Step {step} of 2)</span>
          </DialogTitle>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-6">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-medium mb-1">Step 1: Guest Information</p>
                    <p>Please provide the lead passenger name and emergency contact details.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="leadPax">Lead Passenger Name *</Label>
                <Input
                  id="leadPax"
                  value={leadPaxName}
                  onChange={(e) => setLeadPaxName(e.target.value)}
                  placeholder="Enter lead passenger full name"
                  className="dubai-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergency">Emergency Contact Number *</Label>
                <Input
                  id="emergency"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  placeholder="+971 XX XXX XXXX"
                  className="dubai-input"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-4">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div className="text-sm text-green-900">
                    <p className="font-medium mb-1">Step 2: Booking Confirmation</p>
                    <p>Please provide the hotel confirmation number and verify tourism dirham payment status.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="confirmation">Hotel Confirmation Number *</Label>
                <Input
                  id="confirmation"
                  value={hotelConfirmationNumber}
                  onChange={(e) => setHotelConfirmationNumber(e.target.value)}
                  placeholder="Enter hotel confirmation number"
                  className="dubai-input"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="tourism"
                  checked={tourismDirhamPaid}
                  onCheckedChange={(checked) => setTourismDirhamPaid(checked as boolean)}
                />
                <Label htmlFor="tourism" className="cursor-pointer">
                  Tourism Dirham has been paid
                </Label>
              </div>

              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm font-medium mb-2">Summary:</p>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-muted-foreground">Guest:</span> {leadPaxName}</p>
                    <p><span className="text-muted-foreground">Emergency Contact:</span> {emergencyContact}</p>
                    <p><span className="text-muted-foreground">Confirmation:</span> {hotelConfirmationNumber || 'Not entered'}</p>
                    <p><span className="text-muted-foreground">Tourism Dirham:</span> {tourismDirhamPaid ? 'Paid' : 'Not Paid'}</p>
                    {itineraryItems.length > 0 && (
                      <p><span className="text-muted-foreground">Tours in Itinerary:</span> {itineraryItems.length}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 1 ? (
            <>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleStepOneNext} className="dubai-button-primary">
                Next Step
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={generateVoucherPDF} className="dubai-button-primary">
                Generate Voucher
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
