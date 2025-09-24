import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
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
import { useSupabaseData } from '../../hooks/useSupabaseData';
import { Tour } from '../../types';
import { toast } from '../../hooks/use-toast';

const ToursManagement = () => {
  const { tours, addTour, updateTour, deleteTour, isLoading } = useSupabaseData();
  
  const [isCreating, setIsCreating] = useState(false);
  const [editingTour, setEditingTour] = useState<Tour | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'group' as 'group' | 'private',
    duration: '',
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
      costPerPerson: 0,
      transferIncluded: true,
      privateTransferCost: 0,
      highlights: []
    });
    setIsCreating(false);
    setEditingTour(null);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.duration || formData.costPerPerson <= 0) {
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
        costPerPerson: formData.costPerPerson,
        transferIncluded: formData.transferIncluded,
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
      costPerPerson: tour.costPerPerson,
      transferIncluded: tour.transferIncluded,
      privateTransferCost: 0, // This would need to be stored in database
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
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{editingTour ? 'Edit Tour' : 'Add New Tour'}</span>
              <Button variant="ghost" size="sm" onClick={resetForm}>
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Tour Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter tour name"
                  className="dubai-input"
                />
              </div>
              <div>
                <Label htmlFor="duration">Duration *</Label>
                <Input
                  id="duration"
                  value={formData.duration}
                  onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                  placeholder="e.g., 6 hours, Full day"
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
                placeholder="Enter tour description"
                className="dubai-input min-h-[100px] resize-none"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="type">Tour Type</Label>
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as 'group' | 'private' }))}
                  className="dubai-input"
                >
                  <option value="group">Sharing Tour</option>
                  <option value="private">Private Tour</option>
                </select>
              </div>
              <div>
                <Label htmlFor="costPerPerson">Cost Per Person (AED) *</Label>
                <Input
                  id="costPerPerson"
                  type="number"
                  value={formData.costPerPerson}
                  onChange={(e) => setFormData(prev => ({ ...prev, costPerPerson: Number(e.target.value) }))}
                  placeholder="0"
                  className="dubai-input"
                />
              </div>
              {formData.type === 'private' && (
                <div>
                  <Label htmlFor="privateTransferCost">Private Transfer Cost (AED)</Label>
                  <Input
                    id="privateTransferCost"
                    type="number"
                    value={formData.privateTransferCost}
                    onChange={(e) => setFormData(prev => ({ ...prev, privateTransferCost: Number(e.target.value) }))}
                    placeholder="0"
                    className="dubai-input"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    This cost will be divided among all passengers
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="transferIncluded"
                checked={formData.transferIncluded}
                onChange={(e) => setFormData(prev => ({ ...prev, transferIncluded: e.target.checked }))}
                className="rounded"
              />
              <Label htmlFor="transferIncluded">
                {formData.type === 'private' ? 'Private Transfer Included' : 'Transfer Included'}
              </Label>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <Label>Tour Highlights</Label>
                <Button variant="outline" size="sm" onClick={addHighlight}>
                  <Plus className="mr-2 h-3 w-3" />
                  Add Highlight
                </Button>
              </div>
              
              <div className="space-y-2">
                {formData.highlights.map((highlight, index) => (
                  <div key={index} className="flex space-x-2">
                    <Input
                      value={highlight}
                      onChange={(e) => updateHighlight(index, e.target.value)}
                      placeholder="Enter tour highlight"
                      className="dubai-input"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeHighlight(index)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button onClick={handleSave} className="dubai-button-primary">
                <Save className="mr-2 h-4 w-4" />
                {editingTour ? 'Update Tour' : 'Create Tour'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tours List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full text-center py-8">Loading tours...</div>
        ) : tours.map((tour) => (
          <Card key={tour.id} className="dubai-card">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{tour.name}</CardTitle>
                  <div className="flex items-center text-sm text-muted-foreground mt-1">
                    <Clock className="h-3 w-3 mr-1" />
                    {tour.duration}
                  </div>
                </div>
                <div className="flex space-x-1">
                  <Button variant="ghost" size="sm" onClick={() => startEdit(tour)}>
                    <Edit3 className="h-3 w-3" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => deleteTour(tour.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {tour.description || 'No description available'}
              </p>
              
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-dubai-gold" />
                  <span className="font-semibold">AED {tour.costPerPerson}</span>
                  <span className="text-sm text-muted-foreground">per person</span>
                </div>
                <Badge variant={tour.type === 'private' ? 'default' : 'secondary'}>
                  {tour.type === 'private' ? 'Private' : 'Sharing'}
                </Badge>
              </div>

              {tour.transferIncluded && (
                <Badge variant="outline" className="text-xs">
                  Transfer Included
                </Badge>
              )}

              {tour.highlights.length > 0 && (
                <div className="mt-4">
                  <h5 className="text-sm font-semibold mb-2">Highlights:</h5>
                  <div className="space-y-1">
                    {tour.highlights.slice(0, 3).map((highlight, index) => (
                      <p key={index} className="text-xs text-muted-foreground">
                        • {highlight}
                      </p>
                    ))}
                    {tour.highlights.length > 3 && (
                      <p className="text-xs text-muted-foreground">
                        +{tour.highlights.length - 3} more highlights
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        
        {!isLoading && tours.length === 0 && (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            No tours available. Add your first tour to get started.
          </div>
        )}
      </div>
    </div>
  );
};

export default ToursManagement;