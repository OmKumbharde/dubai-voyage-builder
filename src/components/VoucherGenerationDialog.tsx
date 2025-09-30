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
    const pageHeight = pdf.internal.pageSize.height;
    let yPos = 15;

    // Header with brand colors
    pdf.setFillColor(0, 51, 102); // Dubai Navy
    pdf.rect(0, 0, pageWidth, 35, 'F');
    
    pdf.setFontSize(22);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    pdf.text('Hotel / Tour Voucher', pageWidth / 2, 15, { align: 'center' });
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Q1 Travel Tours - Your Premium Travel Partner', pageWidth / 2, 25, { align: 'center' });

    // Reset text color
    pdf.setTextColor(0, 0, 0);
    yPos = 45;

    // Booking Reference - Highlighted
    pdf.setFillColor(200, 161, 92); // Dubai Gold
    pdf.rect(15, yPos - 6, pageWidth - 30, 12, 'F');
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    pdf.text(`BOOKING REF: TKT ${quote.ticketReference}`, pageWidth / 2, yPos, { align: 'center' });
    pdf.setTextColor(0, 0, 0);

    yPos += 15;

    // Guest Information Section
    pdf.setFillColor(245, 245, 245);
    pdf.rect(15, yPos - 5, pageWidth - 30, 25, 'F');
    
    yPos += 2;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('GUEST DETAILS', 20, yPos);

    yPos += 7;
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Name: ${leadPaxName}`, 20, yPos);
    
    const totalPax = quoteAny.adults + (quoteAny.cwb || 0) + (quoteAny.cnb || 0) + (quoteAny.infants || 0);
    pdf.text(`Total PAX: ${String(totalPax).padStart(2, '0')}`, pageWidth - 80, yPos);

    yPos += 6;
    pdf.text(`Emergency Contact: ${emergencyContact}`, 20, yPos);

    // Hotel Details Section
    if (selectedHotel) {
      yPos += 15;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.setTextColor(0, 51, 102);
      pdf.text('ACCOMMODATION DETAILS', 20, yPos);
      pdf.setTextColor(0, 0, 0);

      yPos += 8;
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Hotel: ${selectedHotel.name}`, 20, yPos);

      yPos += 6;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.text(`Address: ${selectedHotel.location}`, 20, yPos);

      yPos += 5;
      pdf.text(`Confirmation Number: ${hotelConfirmationNumber}`, 20, yPos);

      yPos += 5;
      const checkIn = new Date(quoteAny.travel_dates_from);
      const checkOut = new Date(quoteAny.travel_dates_to);
      pdf.text(`CHECK IN (Standard time: 14:00 hrs): ${format(checkIn, 'do MMMM yyyy')}`, 20, yPos);

      yPos += 5;
      pdf.text(`CHECK OUT (Standard time: 12:00 noon): ${format(checkOut, 'do MMMM yyyy')}`, 20, yPos);

      yPos += 5;
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Tourism Dirham: ${tourismDirhamPaid ? 'PAID' : 'NOT PAID'}`, 20, yPos);
      pdf.setFont('helvetica', 'normal');
    }

    // Airport Transfers Section
    yPos += 12;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(0, 51, 102);
    pdf.text('AIRPORT TRANSFERS', 20, yPos);
    pdf.setTextColor(0, 0, 0);

    yPos += 7;
    
    // Table header
    pdf.setFillColor(245, 245, 245);
    pdf.rect(15, yPos - 4, pageWidth - 30, 8, 'F');
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text('SERVICE', 20, yPos);
    pdf.text('TYPE', 70, yPos);
    pdf.text('FLIGHT', 105, yPos);
    pdf.text('TIME', 130, yPos);
    pdf.text('PICK-UP', 150, yPos);
    pdf.text('DATE', 175, yPos);

    yPos += 7;
    pdf.setFont('helvetica', 'normal');
    pdf.text('Airport Pick up', 20, yPos);
    pdf.text('Private', 70, yPos);
    pdf.text('TBA', 105, yPos);
    pdf.text('TBA', 130, yPos);
    pdf.text('TBA', 150, yPos);
    pdf.text('TBA', 175, yPos);

    yPos += 6;
    pdf.text('Airport Drop Off', 20, yPos);
    pdf.text('Private', 70, yPos);
    pdf.text('TBA', 105, yPos);
    pdf.text('TBA', 130, yPos);
    pdf.text('TBA', 150, yPos);
    pdf.text('TBA', 175, yPos);

    // Important notes for airport
    yPos += 10;
    pdf.setFontSize(7);
    pdf.setTextColor(102, 102, 102);
    pdf.text('• Connect to free Wi-Fi at Dubai airport for WhatsApp communication', 20, yPos);
    yPos += 4;
    pdf.text('• Driver will be waiting at arrival hall after baggage claim with name card', 20, yPos);
    yPos += 4;
    pdf.text('• Maximum waiting time for airport pickup: 1 hour 30 minutes after landing', 20, yPos);
    pdf.setTextColor(0, 0, 0);

    // Itinerary Section
    yPos += 12;
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 51, 102);
    pdf.text('TOUR ITINERARY', 20, yPos);
    pdf.setTextColor(0, 0, 0);

    yPos += 7;
    
    // Table header
    pdf.setFillColor(245, 245, 245);
    pdf.rect(15, yPos - 4, pageWidth - 30, 8, 'F');
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text('DATE', 20, yPos);
    pdf.text('TOUR / ACTIVITY', 45, yPos);
    pdf.text('TRANSFER', 125, yPos);
    pdf.text('PICK-UP', 155, yPos);
    pdf.text('DROP-OFF', 175, yPos);

    yPos += 7;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);

    if (itineraryItems.length > 0) {
      itineraryItems.forEach((item) => {
        const tour = tours.find(t => t.id === item.tour_id);
        if (tour) {
          if (yPos > 250) {
            pdf.addPage();
            yPos = 20;
          }
          
          pdf.setFont('helvetica', 'bold');
          pdf.text(format(new Date(item.tour_date), 'dd MMM'), 20, yPos);
          pdf.setFont('helvetica', 'normal');
          
          const tourName = pdf.splitTextToSize(tour.name, 75);
          pdf.text(tourName, 45, yPos);
          
          pdf.text(tour.transferIncluded ? 'SIC' : 'Private', 125, yPos);
          pdf.text(tour.pickupTime || '09:00 AM', 155, yPos);
          pdf.text(tour.dropTime || '05:00 PM', 175, yPos);
          yPos += Math.max(7, tourName.length * 4);
        }
      });
    } else {
      pdf.text('No tours scheduled', 45, yPos);
      yPos += 7;
    }

    yPos += 5;
    pdf.setFontSize(7);
    pdf.setTextColor(102, 102, 102);
    pdf.text('* Please carry this voucher and theme park tickets during tours', 20, yPos);
    pdf.setTextColor(0, 0, 0);

    // Special Notes
    yPos += 12;
    if (yPos > 220) {
      pdf.addPage();
      yPos = 20;
    }

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 51, 102);
    pdf.text('IMPORTANT INFORMATION', 20, yPos);
    pdf.setTextColor(0, 0, 0);

    yPos += 7;
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    
    const notes = [
      '• Pickup time may vary by ±30 minutes. Please be ready at the scheduled time.',
      '• Drivers will wait maximum 5 minutes from arrival time at pickup location.',
      '• Early check-out will attract full cancellation charges.',
      '• Hotel reserves the right to charge security deposit for extras or damages.',
      '• Force Majeure conditions do not apply - standard booking terms apply.',
      '• Please carry valid ID proof during all tours and hotel check-in.'
    ];

    notes.forEach(note => {
      if (yPos > 270) {
        pdf.addPage();
        yPos = 20;
      }
      const lines = pdf.splitTextToSize(note, pageWidth - 40);
      pdf.text(lines, 20, yPos);
      yPos += lines.length * 4;
    });

    // Footer
    const footerY = pageHeight - 15;
    pdf.setFillColor(200, 161, 92);
    pdf.rect(0, footerY - 5, pageWidth, 20, 'F');
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(255, 255, 255);
    pdf.text('Thank you for choosing Q1 Travel Tours. We look forward to serving you!', pageWidth / 2, footerY, { align: 'center' });

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
