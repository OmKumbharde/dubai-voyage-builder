import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { 
  Building2, 
  Plus, 
  Edit3, 
  Trash2, 
  Star,
  MapPin,
  Camera,
  Save,
  X
} from 'lucide-react';
import { useSupabaseData } from '../../hooks/useSupabaseData';
import { Hotel } from '../../types';
import { toast } from '../../hooks/use-toast';

const HotelsManagement = () => {
  const { hotels, addHotel, updateHotel, deleteHotel, isLoading } = useSupabaseData();
  
  const [isCreating, setIsCreating] = useState(false);
  const [editingHotel, setEditingHotel] = useState<Hotel | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    description: '',
    starRating: 5,
    baseRate: 500,
    amenities: [] as string[]
  });

  const resetForm = () => {
    setFormData({
      name: '',
      location: '',
      description: '',
      starRating: 5,
      baseRate: 500,
      amenities: []
    });
    setIsCreating(false);
    setEditingHotel(null);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.location) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const hotelData = {
      name: formData.name,
      location: formData.location,
      description: formData.description,
      starRating: formData.starRating,
      baseRate: formData.baseRate,
      amenities: formData.amenities,
      images: ['/api/placeholder/400/300']
    };

    try {
      if (editingHotel) {
        await updateHotel(editingHotel.id, hotelData);
      } else {
        await addHotel(hotelData);
      }
      resetForm();
    } catch (error) {
      console.error('Error saving hotel:', error);
    }
  };

  const addHotelRooms = async (hotelId: string, rooms: Room[]) => {
    try {
      for (const room of rooms) {
        const roomData = {
          hotel_id: hotelId,
          room_type: room.type,
          capacity: room.capacity,
          extra_bed_capacity: room.extraBedCapacity,
          base_rate: room.baseRate,
          extra_bed_rate: room.extraBedRate
        };
        
        const { error } = await supabase
          .from('hotel_rooms')
          .insert([roomData]);
        
        if (error) throw error;
      }
    } catch (error) {
      console.error('Error adding hotel rooms:', error);
      toast({
        title: "Error",
        description: "Failed to save hotel rooms",
        variant: "destructive"
      });
    }
  };

  const updateHotelRooms = async (hotelId: string, rooms: Room[]) => {
    try {
      // Delete existing rooms for this hotel
      await supabase
        .from('hotel_rooms')
        .delete()
        .eq('hotel_id', hotelId);

      // Add new rooms
      await addHotelRooms(hotelId, rooms);
    } catch (error) {
      console.error('Error updating hotel rooms:', error);
      toast({
        title: "Error", 
        description: "Failed to update hotel rooms",
        variant: "destructive"
      });
    }
  };

  const startEdit = (hotel: Hotel) => {
    setEditingHotel(hotel);
    setFormData({
      name: hotel.name,
      location: hotel.location,
      description: hotel.description,
      starRating: hotel.starRating,
      amenities: hotel.amenities,
      rooms: hotel.rooms
    });
    setIsCreating(true);
  };

  const addRoom = () => {
    const newRoom: Room = {
      id: `${Date.now()}-${Math.random()}`,
      type: 'Standard Room',
      capacity: 2,
      extraBedCapacity: 1,
      baseRate: 500,
      extraBedRate: 100
    };
    setFormData(prev => ({
      ...prev,
      rooms: [...prev.rooms, newRoom]
    }));
  };

  const updateRoom = (index: number, field: keyof Room, value: any) => {
    setFormData(prev => ({
      ...prev,
      rooms: prev.rooms.map((room, i) => 
        i === index ? { ...room, [field]: value } : room
      )
    }));
  };

  const removeRoom = (index: number) => {
    setFormData(prev => ({
      ...prev,
      rooms: prev.rooms.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center">
            <Building2 className="mr-3 h-8 w-8 text-dubai-gold" />
            Hotels Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your hotel inventory and room configurations
          </p>
        </div>
        <Button 
          onClick={() => setIsCreating(true)}
          className="dubai-button-primary flex items-center"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add New Hotel
        </Button>
      </div>

      {isCreating && (
        <Card className="dubai-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{editingHotel ? 'Edit Hotel' : 'Add New Hotel'}</span>
              <Button variant="ghost" size="sm" onClick={resetForm}>
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Hotel Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter hotel name"
                  className="dubai-input"
                />
              </div>
              <div>
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Enter location"
                  className="dubai-input"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter hotel description"
                className="dubai-input min-h-[100px] resize-none"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="starRating">Star Rating</Label>
                <select
                  id="starRating"
                  value={formData.starRating}
                  onChange={(e) => setFormData(prev => ({ ...prev, starRating: Number(e.target.value) }))}
                  className="dubai-input"
                >
                  {[1, 2, 3, 4, 5, 6, 7].map(rating => (
                    <option key={rating} value={rating}>{rating} Star{rating > 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="baseRate">Base Rate (AED) *</Label>
                <Input
                  id="baseRate"
                  type="number"
                  value={formData.baseRate}
                  onChange={(e) => setFormData(prev => ({ ...prev, baseRate: Number(e.target.value) }))}
                  placeholder="Enter base rate"
                  className="dubai-input"
                />
              </div>
            </div>


            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button onClick={handleSave} className="dubai-button-primary">
                <Save className="mr-2 h-4 w-4" />
                {editingHotel ? 'Update Hotel' : 'Create Hotel'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hotels List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {hotels.map((hotel) => (
          <Card key={hotel.id} className="dubai-card">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    {hotel.name}
                    <div className="ml-2 flex">
                      {[...Array(hotel.starRating)].map((_, i) => (
                        <Star key={i} className="h-3 w-3 fill-dubai-gold text-dubai-gold" />
                      ))}
                    </div>
                  </CardTitle>
                  <div className="flex items-center text-sm text-muted-foreground mt-1">
                    <MapPin className="h-3 w-3 mr-1" />
                    {hotel.location}
                  </div>
                </div>
                <div className="flex space-x-1">
                  <Button variant="ghost" size="sm" onClick={() => startEdit(hotel)}>
                    <Edit3 className="h-3 w-3" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => deleteHotel(hotel.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {hotel.description || 'No description available'}
              </p>
              
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-dubai-gold/10 to-dubai-primary/10 rounded-lg mb-4">
                <span className="font-semibold text-sm">Base Rate</span>
                <Badge variant="outline" className="bg-white">AED {hotel.baseRate}</Badge>
              </div>

              <div className="mt-4 flex flex-wrap gap-1">
                {hotel.amenities.slice(0, 3).map((amenity, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {amenity}
                  </Badge>
                ))}
                {hotel.amenities.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{hotel.amenities.length - 3} more
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default HotelsManagement;