import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { 
  Building2, 
  Plus, 
  Edit3, 
  Trash2, 
  Star,
  MapPin,
  Save,
  X
} from 'lucide-react';
import { useSupabaseData } from '../../hooks/useSupabaseData';
import { toast } from '../../hooks/use-toast';

// Hotel Management Component - Simplified without room types
const HotelsManagement = () => {
  const { hotels, isLoading, addHotel, updateHotel, deleteHotel } = useSupabaseData();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    description: '',
    starRating: 5,
    baseRate: 0,
    extraBedRate: 100,
    amenities: [] as string[]
  });
  const [newAmenity, setNewAmenity] = useState('');

  const handleSave = async () => {
    try {
      if (editingId && editingId !== 'new') {
        await updateHotel(editingId, formData);
      } else {
        await addHotel({
          ...formData,
          images: ['/api/placeholder/400/300'] // Default placeholder
        });
      }
      
      setEditingId(null);
      setFormData({
        name: '',
        location: '',
        description: '',
        starRating: 5,
        baseRate: 0,
        extraBedRate: 100,
        amenities: []
      });
      
      toast({
        title: "Success",
        description: editingId && editingId !== 'new' ? "Hotel updated successfully" : "Hotel added successfully"
      });
    } catch (error) {
      console.error('Error saving hotel:', error);
      toast({
        title: "Error",
        description: "Failed to save hotel. Please try again.",
        variant: "destructive"
      });
    }
  };

  const startEdit = (hotel: any) => {
    setEditingId(hotel.id);
    setFormData({
      name: hotel.name,
      location: hotel.location,
      description: hotel.description,
      starRating: hotel.starRating,
      baseRate: hotel.baseRate,
      extraBedRate: hotel.extraBedRate,
      amenities: hotel.amenities || []
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({
      name: '',
      location: '',
      description: '',
      starRating: 5,
      baseRate: 0,
      extraBedRate: 100,
      amenities: []
    });
  };

  const addAmenity = () => {
    if (newAmenity.trim() && !formData.amenities.includes(newAmenity.trim())) {
      setFormData(prev => ({
        ...prev,
        amenities: [...prev.amenities, newAmenity.trim()]
      }));
      setNewAmenity('');
    }
  };

  const removeAmenity = (amenity: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.filter(a => a !== amenity)
    }));
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this hotel?')) {
      try {
        await deleteHotel(id);
      } catch (error) {
        console.error('Error deleting hotel:', error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading hotels...</div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Building2 className="h-8 w-8 text-dubai-gold" />
            Hotels Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage hotel properties, rates, and details
          </p>
        </div>
        <Button 
          onClick={() => setEditingId('new')} 
          className="dubai-button-primary"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add New Hotel
        </Button>
      </div>

      {/* Hotel Form */}
      {(editingId === 'new' || editingId) && (
        <Card className="dubai-card">
          <CardHeader>
            <CardTitle>
              {editingId === 'new' ? 'Add New Hotel' : 'Edit Hotel'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="name">Hotel Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter hotel name"
                  className="dubai-input"
                />
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Enter location"
                  className="dubai-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Label htmlFor="starRating">Star Rating</Label>
                <select
                  id="starRating"
                  value={formData.starRating}
                  onChange={(e) => setFormData(prev => ({ ...prev, starRating: Number(e.target.value) }))}
                  className="dubai-input"
                >
                  {[1, 2, 3, 4, 5].map(star => (
                    <option key={star} value={star}>{star} Star</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="baseRate">Base Rate (AED per night)</Label>
                <Input
                  id="baseRate"
                  type="number"
                  value={formData.baseRate}
                  onChange={(e) => setFormData(prev => ({ ...prev, baseRate: Number(e.target.value) }))}
                  placeholder="Enter base rate"
                  className="dubai-input"
                />
              </div>
              <div>
                <Label htmlFor="extraBedRate">Extra Bed Rate (AED per night)</Label>
                <Input
                  id="extraBedRate"
                  type="number"
                  value={formData.extraBedRate}
                  onChange={(e) => setFormData(prev => ({ ...prev, extraBedRate: Number(e.target.value) }))}
                  placeholder="Enter extra bed rate"
                  className="dubai-input"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter hotel description"
                className="dubai-input"
                rows={3}
              />
            </div>

            {/* Amenities */}
            <div>
              <Label>Amenities</Label>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={newAmenity}
                    onChange={(e) => setNewAmenity(e.target.value)}
                    placeholder="Enter amenity"
                    className="dubai-input flex-1"
                    onKeyPress={(e) => e.key === 'Enter' && addAmenity()}
                  />
                  <Button 
                    type="button" 
                    onClick={addAmenity}
                    variant="outline"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                {formData.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.amenities.map((amenity, index) => (
                      <Badge 
                        key={index} 
                        variant="secondary" 
                        className="flex items-center gap-1"
                      >
                        {amenity}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => removeAmenity(amenity)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <Button 
                variant="outline" 
                onClick={cancelEdit}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSave} 
                className="dubai-button-primary"
                disabled={!formData.name || !formData.location}
              >
                <Save className="mr-2 h-4 w-4" />
                {editingId === 'new' ? 'Add Hotel' : 'Update Hotel'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filter */}
      <Card className="dubai-card">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <Input
              placeholder="Search hotels..."
              className="dubai-input flex-1"
            />
            <select className="dubai-input md:w-48">
              <option value="">All Categories</option>
              <option value="3">3 Star</option>
              <option value="4">4 Star</option>
              <option value="5">5 Star</option>
            </select>
            <select className="dubai-input md:w-48">
              <option value="">All Locations</option>
              <option value="Dubai">Dubai</option>
              <option value="Abu Dhabi">Abu Dhabi</option>
              <option value="Sharjah">Sharjah</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Hotels List - Table View */}
      <Card className="dubai-card">
        <CardHeader>
          <CardTitle>Hotels List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Sr. No</th>
                  <th className="text-left p-3">Hotel Name</th>
                  <th className="text-left p-3">Category</th>
                  <th className="text-left p-3">Location</th>
                  <th className="text-left p-3">Base Rate</th>
                  <th className="text-left p-3">Extra Bed Rate</th>
                  <th className="text-left p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {hotels.map((hotel, index) => (
                  <tr key={hotel.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">{index + 1}</td>
                    <td className="p-3">
                      <div>
                        <p className="font-semibold">{hotel.name}</p>
                        <div className="flex items-center mt-1">
                          {Array.from({ length: hotel.starRating }).map((_, i) => (
                            <Star key={i} className="h-3 w-3 fill-dubai-gold text-dubai-gold" />
                          ))}
                        </div>
                      </div>
                    </td>
                    <td className="p-3">{hotel.starRating} Star</td>
                    <td className="p-3">{hotel.location}</td>
                    <td className="p-3">AED {hotel.baseRate}</td>
                    <td className="p-3">AED {hotel.extraBedRate}</td>
                    <td className="p-3">
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEdit(hotel)}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(hotel.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {hotels.length === 0 && (
        <Card className="dubai-card">
          <CardContent className="text-center py-8">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Hotels Found</h3>
            <p className="text-muted-foreground mb-4">
              Start by adding your first hotel property.
            </p>
            <Button 
              onClick={() => setEditingId('new')} 
              className="dubai-button-primary"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add First Hotel
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default HotelsManagement;