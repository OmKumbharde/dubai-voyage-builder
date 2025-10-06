import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Checkbox } from '../../components/ui/checkbox';
import { 
  MapPin,
  Plus, 
  Edit3, 
  Trash2,
  Save,
  X,
  Clock,
  DollarSign
} from 'lucide-react';
import { useSupabaseData, Tour } from '../../hooks/useSupabaseData';
import { toast } from '../../hooks/use-toast';

const ToursManagement = () => {
  const { tours, addTour, updateTour, deleteTour, isLoading } = useSupabaseData();
  
  const [isCreating, setIsCreating] = useState(false);
  const [editingTour, setEditingTour] = useState<Tour | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'group' as 'group' | 'private',
    duration: '',
    pickupTime: '09:00 AM',
    dropTime: '05:00 PM',
    costPerPerson: 0,
    transferIncluded: true,
    privateTransferCost: 0,
    highlights: [] as string[]
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'group',
      duration: '',
      pickupTime: '09:00 AM',
      dropTime: '05:00 PM',
      costPerPerson: 0,
      transferIncluded: true,
      privateTransferCost: 0,
      highlights: []
    });
    setIsCreating(false);
    setEditingTour(null);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.duration || formData.costPerPerson <= 0 || !formData.pickupTime || !formData.dropTime) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      const tourData = {
        name: formData.name,
        description: formData.description,
        type: formData.type,
        duration: formData.duration,
        pickupTime: formData.pickupTime,
        dropTime: formData.dropTime,
        costPerPerson: formData.costPerPerson,
        transferIncluded: formData.transferIncluded,
        privateTransferCost: formData.privateTransferCost,
        highlights: formData.highlights.filter(h => h.trim() !== ''),
        images: ['/api/placeholder/400/300'] // Default placeholder
      };

      if (editingTour) {
        await updateTour(editingTour.id, tourData);
      } else {
        await addTour(tourData);
      }
      resetForm();
    } catch (error) {
      console.error('Error saving tour:', error);
    }
  };

  const startEdit = (tour: Tour) => {
    setEditingTour(tour);
    setFormData({
      name: tour.name,
      description: tour.description,
      type: tour.type,
      duration: tour.duration,
      pickupTime: (tour as any).pickupTime || '09:00 AM',
      dropTime: (tour as any).dropTime || '05:00 PM',
      costPerPerson: tour.costPerPerson,
      transferIncluded: tour.transferIncluded,
      privateTransferCost: tour.privateTransferCost || 0,
      highlights: tour.highlights
    });
    setIsCreating(true);  
  };

  const addHighlight = () => {
    setFormData(prev => ({
      ...prev,
      highlights: [...prev.highlights, '']
    }));
  };

  const updateHighlight = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      highlights: prev.highlights.map((h, i) => i === index ? value : h)
    }));
  };

  const removeHighlight = (index: number) => {
    setFormData(prev => ({
      ...prev,
      highlights: prev.highlights.filter((_, i) => i !== index)
    }));
  };
  
  // Filtered tours
  const filteredTours = tours.filter(tour => {
    const matchesSearch = tour.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tour.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !filterType || tour.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center">
            <MapPin className="mr-3 h-8 w-8 text-dubai-gold" />
            Tours Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your tour packages and activities
          </p>
        </div>
        <Button 
          onClick={() => setIsCreating(true)}
          className="dubai-button-primary flex items-center"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add New Tour
        </Button>
      </div>

      {isCreating && (
        <Card className="dubai-card">
          <CardHeader className="p-6 border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">{editingTour ? 'Edit Tour' : 'Add New Tour'}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {editingTour ? 'Update tour details and pricing' : 'Create a new tour package with all details'}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={resetForm}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-8">
            {/* Basic Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <div className="h-1 w-1 rounded-full bg-dubai-gold" />
                <h3 className="text-base font-semibold text-foreground">Basic Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-semibold">Tour Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Dubai City Tour"
                    className="dubai-input h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration" className="text-sm font-semibold">Duration *</Label>
                  <Input
                    id="duration"
                    value={formData.duration}
                    onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                    placeholder="e.g., 6 hours, Full day"
                    className="dubai-input h-11"
                  />
                </div>
              </div>
            </div>

            {/* Timing Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <div className="h-1 w-1 rounded-full bg-dubai-gold" />
                <h3 className="text-base font-semibold text-foreground">Timing</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="pickupTime" className="text-sm font-semibold">Approx. Pickup Time *</Label>
                  <Input
                    id="pickupTime"
                    value={formData.pickupTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, pickupTime: e.target.value }))}
                    placeholder="e.g., 09:00 AM"
                    className="dubai-input h-11"
                  />
                  <p className="text-xs text-muted-foreground">Approximate pickup time from hotel</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dropTime" className="text-sm font-semibold">Approx. Drop-off Time *</Label>
                  <Input
                    id="dropTime"
                    value={formData.dropTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, dropTime: e.target.value }))}
                    placeholder="e.g., 05:00 PM"
                    className="dubai-input h-11"
                  />
                  <p className="text-xs text-muted-foreground">Approximate drop-off time at hotel</p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <div className="h-1 w-1 rounded-full bg-dubai-gold" />
                <h3 className="text-base font-semibold text-foreground">Description</h3>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-semibold">Tour Description</Label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Provide a detailed description of what the tour includes..."
                  className="dubai-input min-h-[120px] resize-none"
                  rows={5}
                />
                <p className="text-xs text-muted-foreground">Describe what guests can expect from this tour</p>
              </div>
            </div>

            {/* Pricing & Type */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <div className="h-1 w-1 rounded-full bg-dubai-gold" />
                <h3 className="text-base font-semibold text-foreground">Pricing & Type</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="type" className="text-sm font-semibold">Tour Type</Label>
                  <select
                    id="type"
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as 'group' | 'private' }))}
                    className="dubai-input h-11"
                  >
                    <option value="group">Sharing Tour</option>
                    <option value="private">Private Tour</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="costPerPerson" className="text-sm font-semibold">Cost Per Person (AED) *</Label>
                  <Input
                    id="costPerPerson"
                    type="number"
                    value={formData.costPerPerson}
                    onChange={(e) => setFormData(prev => ({ ...prev, costPerPerson: Number(e.target.value) }))}
                    placeholder="0"
                    className="dubai-input h-11"
                  />
                </div>
                {formData.type === 'private' && (
                  <div className="space-y-2">
                    <Label htmlFor="privateTransferCost" className="text-sm font-semibold">Private Transfer Cost (AED)</Label>
                    <Input
                      id="privateTransferCost"
                      type="number"
                      value={formData.privateTransferCost}
                      onChange={(e) => setFormData(prev => ({ ...prev, privateTransferCost: Number(e.target.value) }))}
                      placeholder="0"
                      className="dubai-input h-11"
                    />
                    <p className="text-xs text-muted-foreground">
                      This cost will be divided among all passengers
                    </p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted/30">
                <Checkbox
                  id="transferIncluded"
                  checked={formData.transferIncluded}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, transferIncluded: checked as boolean }))}
                />
                <Label htmlFor="transferIncluded" className="text-sm font-medium cursor-pointer">
                  {formData.type === 'private' ? 'Private Transfer Included' : 'Transfer Included'}
                </Label>
              </div>
            </div>

            {/* Tour Highlights */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b">
                <div className="flex items-center gap-2">
                  <div className="h-1 w-1 rounded-full bg-dubai-gold" />
                  <h3 className="text-base font-semibold text-foreground">Tour Highlights</h3>
                </div>
                <Button variant="outline" size="sm" onClick={addHighlight}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Highlight
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">Add key highlights and attractions included in this tour</p>
              
              <div className="space-y-3">
                {formData.highlights.map((highlight, index) => (
                  <div key={index} className="flex gap-3">
                    <Input
                      value={highlight}
                      onChange={(e) => updateHighlight(index, e.target.value)}
                      placeholder="e.g., Visit Burj Khalifa observation deck"
                      className="dubai-input h-11"
                    />
                    <Button
                      variant="outline"
                      size="default"
                      onClick={() => removeHighlight(index)}
                      className="px-3"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {formData.highlights.length === 0 && (
                  <div className="text-center p-8 border-2 border-dashed rounded-lg">
                    <p className="text-sm text-muted-foreground">No highlights added yet. Click "Add Highlight" to start.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" size="default" onClick={resetForm}>
                Cancel
              </Button>
              <Button onClick={handleSave} size="default" className="dubai-button-primary">
                <Save className="mr-2 h-4 w-4" />
                {editingTour ? 'Update Tour' : 'Create Tour'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filter */}
      <Card className="dubai-card">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <Input
              placeholder="Search tours..."
              className="dubai-input flex-1"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select 
              className="dubai-input md:w-48"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="">All Types</option>
              <option value="group">Sharing Tours</option>
              <option value="private">Private Tours</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Tours List - Table View */}
      <Card className="dubai-card">
        <CardHeader className="p-6">
          <CardTitle>Tours List</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4">Sr. No</th>
                  <th className="text-left p-4">Tour Name</th>
                  <th className="text-left p-4">Pickup Time</th>
                  <th className="text-left p-4">Drop Time</th>
                  <th className="text-left p-4">Type</th>
                  <th className="text-left p-4">Cost Per Person</th>
                  <th className="text-left p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8">Loading tours...</td>
                  </tr>
                ) : filteredTours.map((tour, index) => (
                  <tr key={tour.id} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="p-4">{index + 1}</td>
                    <td className="p-4">
                      <div>
                        <p className="font-semibold">{tour.name}</p>
                        <p className="text-sm text-muted-foreground truncate">{tour.description}</p>
                      </div>
                    </td>
                    <td className="p-4">{tour.pickupTime || '09:00 AM'}</td>
                    <td className="p-4">{tour.dropTime || '05:00 PM'}</td>
                    <td className="p-4">
                      <Badge variant={tour.type === 'private' ? 'default' : 'secondary'}>
                        {tour.type === 'private' ? 'Private' : 'Sharing'}
                      </Badge>
                    </td>
                    <td className="p-4">AED {tour.costPerPerson}</td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => startEdit(tour)}>
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => deleteTour(tour.id)}
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
        
      {!isLoading && tours.length === 0 && (
        <Card className="dubai-card">
          <CardContent className="text-center py-8">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Tours Found</h3>
            <p className="text-muted-foreground mb-4">
              Start by adding your first tour package.
            </p>
            <Button 
              onClick={() => setIsCreating(true)} 
              className="dubai-button-primary"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add First Tour
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ToursManagement;