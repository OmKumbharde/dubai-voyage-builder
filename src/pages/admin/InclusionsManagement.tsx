import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { 
  Plus, 
  Edit3, 
  Trash2,
  Save,
  X,
  Plane,
  Shield,
  Car,
  FileText
} from 'lucide-react';
import { useSupabaseData } from '../../hooks/useSupabaseData';
import { Inclusion } from '../../hooks/useSupabaseData';
import { toast } from '../../hooks/use-toast';

const InclusionsManagement = () => {
  const { inclusions, addInclusion, updateInclusion, deleteInclusion, isLoading } = useSupabaseData();
  
  const [isCreating, setIsCreating] = useState(false);
  const [editingInclusion, setEditingInclusion] = useState<Inclusion | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'other' as 'visa' | 'transfer' | 'insurance' | 'other',
    cost: 0,
    description: '',
    isOptional: true
  });

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'other',
      cost: 0,
      description: '',
      isOptional: true
    });
    setIsCreating(false);
    setEditingInclusion(null);
  };

  const handleSave = async () => {
    if (!formData.name || formData.cost < 0) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      if (editingInclusion) {
        await updateInclusion(editingInclusion.id, formData);
      } else {
        await addInclusion(formData);
      }
      resetForm();
    } catch (error) {
      console.error('Error saving inclusion:', error);
    }
  };

  const startEdit = (inclusion: Inclusion) => {
    setEditingInclusion(inclusion);
    setFormData({
      name: inclusion.name,
      type: inclusion.type,
      cost: inclusion.cost,
      description: inclusion.description,
      isOptional: inclusion.isOptional
    });
    setIsCreating(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this inclusion?')) {
      try {
        await deleteInclusion(id);
      } catch (error) {
        console.error('Error deleting inclusion:', error);
      }
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'visa': return <FileText className="h-4 w-4 text-dubai-gold" />;
      case 'transfer': return <Car className="h-4 w-4 text-dubai-gold" />;
      case 'insurance': return <Shield className="h-4 w-4 text-dubai-gold" />;
      default: return <Plane className="h-4 w-4 text-dubai-gold" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'visa': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'transfer': return 'bg-green-100 text-green-800 border-green-200';
      case 'insurance': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Plane className="h-8 w-8 text-dubai-gold" />
            Inclusions Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage additional services like visas, transfers, and insurance
          </p>
        </div>
        <Button 
          onClick={() => setIsCreating(true)}
          className="dubai-button-primary"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add New Inclusion
        </Button>
      </div>

      {isCreating && (
        <Card className="dubai-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{editingInclusion ? 'Edit Inclusion' : 'Add New Inclusion'}</span>
              <Button variant="ghost" size="sm" onClick={resetForm}>
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="name">Inclusion Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Dubai Visa Processing"
                  className="dubai-input"
                />
              </div>
              <div>
                <Label htmlFor="type">Type</Label>
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                  className="dubai-input"
                >
                  <option value="visa">Visa</option>
                  <option value="transfer">Transfer</option>
                  <option value="insurance">Insurance</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter detailed description of the inclusion"
                className="dubai-input min-h-[100px] resize-none"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="cost">Cost (AED) *</Label>
                <Input
                  id="cost"
                  type="number"
                  value={formData.cost}
                  onChange={(e) => setFormData(prev => ({ ...prev, cost: Number(e.target.value) }))}
                  placeholder="0"
                  className="dubai-input"
                />
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <input
                  type="checkbox"
                  id="isOptional"
                  checked={formData.isOptional}
                  onChange={(e) => setFormData(prev => ({ ...prev, isOptional: e.target.checked }))}
                  className="rounded"
                />
                <Label htmlFor="isOptional">Optional Service</Label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button onClick={handleSave} className="dubai-button-primary">
                <Save className="mr-2 h-4 w-4" />
                {editingInclusion ? 'Update Inclusion' : 'Create Inclusion'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inclusions List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full text-center py-12">
            <div className="text-muted-foreground">Loading inclusions...</div>
          </div>
        ) : inclusions.map((inclusion) => (
          <Card key={inclusion.id} className="dubai-card">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {getTypeIcon(inclusion.type)}
                    {inclusion.name}
                  </CardTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className={getTypeColor(inclusion.type)}>
                      {inclusion.type}
                    </Badge>
                    {!inclusion.isOptional && (
                      <Badge variant="destructive" className="text-xs">
                        Required
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex space-x-1">
                  <Button variant="ghost" size="sm" onClick={() => startEdit(inclusion)}>
                    <Edit3 className="h-3 w-3" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleDelete(inclusion.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {inclusion.description || 'No description available'}
              </p>
              
              <div className="flex items-center justify-between">
                <div className="text-lg font-semibold text-dubai-navy">
                  AED {inclusion.cost.toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {inclusion.isOptional ? 'Optional' : 'Required'}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {!isLoading && inclusions.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <Plane className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>No inclusions available. Add your first inclusion to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InclusionsManagement;