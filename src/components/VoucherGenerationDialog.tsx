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
    const totalPax = quoteAny.adults + (quoteAny.cwb || 0) + (quoteAny.cnb || 0) + (quoteAny.infants || 0);
    const checkIn = new Date(quoteAny.travel_dates_from);
    const checkOut = new Date(quoteAny.travel_dates_to);
    const tktRef = quoteAny.ticket_reference || quoteAny.reference_number || (quote as any).ticketReference;

    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(`
        <html>
          <head>
            <title>Hotel Tour Voucher - ${tktRef ? `TKT ${tktRef}` : 'Voucher'}</title>
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
                max-width: 900px;
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
                font-size: 20px;
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
              .note-box {
                background: #fff3cd;
                border-left: 4px solid #ffc107;
                padding: 15px;
                margin-top: 20px;
                border-radius: 4px;
              }
              .note-box ul {
                margin-left: 20px;
                margin-top: 10px;
              }
              .note-box li {
                margin-bottom: 8px;
                font-size: 14px;
              }
              .important-box {
                background: #d1ecf1;
                border-left: 4px solid #0c5460;
                padding: 15px;
                margin-top: 20px;
                border-radius: 4px;
              }
              .important-box h4 {
                color: #0c5460;
                margin-bottom: 10px;
              }
              .important-box ul {
                margin-left: 20px;
              }
              .important-box li {
                margin-bottom: 8px;
                font-size: 13px;
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
                <h1>HOTEL / TOUR VOUCHER</h1>
                <h2>${tktRef ? `TKT ${tktRef}` : 'Voucher'}</h2>
              </div>

              <div class="section">
                <div class="section-title">Guest Information</div>
                <div class="info-grid">
                  <div class="info-item">
                    <div class="info-label">Guest Name</div>
                    <div class="info-value">${leadPaxName}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Total PAX</div>
                    <div class="info-value">${totalPax} Person${totalPax !== 1 ? 's' : ''}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Emergency Contact</div>
                    <div class="info-value">${emergencyContact}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Booking Status</div>
                    <div class="info-value" style="color: #10b981; font-weight: 600;">CONFIRMED</div>
                  </div>
                </div>
              </div>

              ${selectedHotel ? `
              <div class="section">
                <div class="section-title">Accommodation Details</div>
                <div class="info-grid">
                  <div class="info-item" style="grid-column: 1 / -1;">
                    <div class="info-label">Hotel Name</div>
                    <div class="info-value" style="font-size: 18px; font-weight: 600;">${selectedHotel.name}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Address</div>
                    <div class="info-value">${selectedHotel.location}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Confirmation Number</div>
                    <div class="info-value" style="font-weight: 600; color: #C8A15C;">${hotelConfirmationNumber}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Check In</div>
                    <div class="info-value">${format(checkIn, 'EEEE, do MMMM yyyy')} <span style="color: #666; font-size: 14px;">(Standard: 14:00)</span></div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Check Out</div>
                    <div class="info-value">${format(checkOut, 'EEEE, do MMMM yyyy')} <span style="color: #666; font-size: 14px;">(Standard: 12:00)</span></div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Tourism Dirham</div>
                    <div class="info-value" style="font-weight: 600; color: ${tourismDirhamPaid ? '#10b981' : '#ef4444'};">${tourismDirhamPaid ? 'PAID' : 'NOT PAID'}</div>
                  </div>
                </div>
              </div>
              ` : ''}

              <div class="section">
                <div class="section-title">Airport Transfers</div>
                <table>
                  <thead>
                    <tr>
                      <th>Service</th>
                      <th>Type</th>
                      <th>Flight</th>
                      <th>Time</th>
                      <th>Pick-up</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style="font-weight: 600;">Airport Pick-up</td>
                      <td>Private</td>
                      <td>TBA</td>
                      <td>TBA</td>
                      <td>TBA</td>
                      <td>TBA</td>
                    </tr>
                    <tr>
                      <td style="font-weight: 600;">Airport Drop-off</td>
                      <td>Private</td>
                      <td>TBA</td>
                      <td>TBA</td>
                      <td>TBA</td>
                      <td>TBA</td>
                    </tr>
                  </tbody>
                </table>
                <div class="note-box">
                  <strong>Airport Transfer Notes:</strong>
                  <ul>
                    <li>Connect to free Wi-Fi at Dubai airport for easy WhatsApp communication</li>
                    <li>Driver will be waiting at arrival hall after baggage claim with your name card</li>
                    <li>Maximum waiting time for airport pick-up: 1 hour 30 minutes after flight landing</li>
                  </ul>
                </div>
              </div>

              ${itineraryItems && itineraryItems.length > 0 ? `
              <div class="section">
                <div class="section-title">Tour Itinerary</div>
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Tour / Activity</th>
                      <th>Transfer Type</th>
                      <th>Pick-up Time</th>
                      <th>Drop-off Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itineraryItems.map(item => {
                      const tour = tours.find(t => t.id === item.tour_id);
                      return `
                        <tr>
                          <td style="font-weight: 600;">${format(new Date(item.tour_date), 'EEE, do MMM')}</td>
                          <td>${tour?.name || 'Unknown Tour'}</td>
                          <td>${tour?.transferIncluded ? 'SIC' : 'Private'}</td>
                          <td>${tour?.pickupTime || '09:00 AM'}</td>
                          <td>${tour?.dropTime || '05:00 PM'}</td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
                <div class="note-box">
                  <strong>Important:</strong> Please carry this voucher and theme park tickets during tours
                </div>
              </div>
              ` : ''}

              <div class="important-box">
                <h4>IMPORTANT INFORMATION</h4>
                <ul>
                  <li>Pick-up time may vary by ±30 minutes. Please be ready at the scheduled time.</li>
                  <li>Drivers will wait maximum 5 minutes from arrival time at pick-up location.</li>
                  <li>Early check-out will attract full cancellation charges.</li>
                  <li>Hotel reserves the right to charge security deposit for extras or damages.</li>
                  <li>Force Majeure conditions do not apply - standard booking terms apply.</li>
                  <li>Please carry valid ID proof during all tours and hotel check-in.</li>
                </ul>
              </div>

              <div class="btn-container">
                <button onclick="window.print()" class="btn-print">Print Voucher</button>
                <button onclick="window.close()" class="btn-close">Close</button>
              </div>
            </div>
          </body>
        </html>
      `);
      newWindow.document.close();
      
      toast({
        title: "Voucher Generated",
        description: "Voucher has been opened in a new window",
      });
    }

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
            Generate Voucher - {((quote as any).ticket_reference) ? `TKT ${(quote as any).ticket_reference}` : `Ref ${(quote as any).reference_number}`}
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
