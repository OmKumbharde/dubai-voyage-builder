import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Checkbox } from '../../components/ui/checkbox';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
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
  
  // Filtered inclusions
  const filteredInclusions = inclusions.filter(inclusion => {
    const matchesSearch = inclusion.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         inclusion.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !filterType || inclusion.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="p-6 space-y-6">
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
          <CardHeader className="p-6 border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">{editingInclusion ? 'Edit Inclusion' : 'Add New Inclusion'}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {editingInclusion ? 'Update inclusion details and pricing' : 'Add a new service inclusion'}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={resetForm}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-8">
            {/* Basic Information */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground border-b pb-1">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="name" className="text-xs font-medium">Inclusion Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Dubai Visa Processing"
                    className="dubai-input h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="type" className="text-xs font-medium">Service Type *</Label>
                  <select
                    id="type"
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                    className="dubai-input h-9"
                  >
                    <option value="visa">Visa</option>
                    <option value="transfer">Transfer</option>
                    <option value="insurance">Insurance</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground border-b pb-1">Description</h3>
              <div className="space-y-1">
                <Label htmlFor="description" className="text-xs font-medium">Service Description</Label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Service description..."
                  className="dubai-input min-h-[80px] resize-none text-sm"
                  rows={3}
                />
              </div>
            </div>

            {/* Pricing & Options */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground border-b pb-1">Pricing & Options</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="cost" className="text-xs font-medium">Cost (AED) *</Label>
                  <Input
                    id="cost"
                    type="number"
                    value={formData.cost}
                    onChange={(e) => setFormData(prev => ({ ...prev, cost: Number(e.target.value) }))}
                    placeholder="0"
                    className="dubai-input h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Service Status</Label>
                  <div className="flex items-center gap-3 p-2 border rounded-lg bg-muted/30 h-9">
                    <Checkbox
                      id="isOptional"
                      checked={formData.isOptional}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isOptional: checked as boolean }))}
                    />
                    <Label htmlFor="isOptional" className="text-xs font-medium cursor-pointer">
                      Optional Service
                    </Label>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button variant="outline" size="sm" onClick={resetForm}>
                Cancel
              </Button>
              <Button onClick={handleSave} size="sm" className="dubai-button-primary">
                <Save className="mr-1 h-3 w-3" />
                {editingInclusion ? 'Update' : 'Create'}
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
              placeholder="Search inclusions..."
              className="h-9 dubai-input flex-1"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select 
              className="h-9 dubai-input md:w-48"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="">All Types</option>
              <option value="visa">Visa</option>
              <option value="transfer">Transfer</option>
              <option value="insurance">Insurance</option>
              <option value="other">Other</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Inclusions List - Table View */}
      <Card className="dubai-card">
        <CardHeader className="p-6">
          <CardTitle>Inclusions List</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4">Sr. No</th>
                  <th className="text-left p-4">Name</th>
                  <th className="text-left p-4">Type</th>
                  <th className="text-left p-4">Cost (AED)</th>
                  <th className="text-left p-4">Optional</th>
                  <th className="text-left p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8">Loading inclusions...</td>
                  </tr>
                ) : filteredInclusions.map((inclusion, index) => (
                  <tr key={inclusion.id} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="p-4">{index + 1}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(inclusion.type)}
                        <div>
                          <p className="font-semibold">{inclusion.name}</p>
                          <p className="text-sm text-muted-foreground truncate">{inclusion.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge className={getTypeColor(inclusion.type)}>
                        {inclusion.type}
                      </Badge>
                    </td>
                    <td className="p-4">AED {inclusion.cost.toFixed(2)}</td>
                    <td className="p-4">
                      <Badge variant={inclusion.isOptional ? "secondary" : "destructive"}>
                        {inclusion.isOptional ? 'Yes' : 'No'}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => startEdit(inclusion)}>
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDelete(inclusion.id)}
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
        
      {!isLoading && inclusions.length === 0 && (
        <Card className="dubai-card">
          <CardContent className="text-center py-12">
            <Plane className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Inclusions Found</h3>
            <p className="text-muted-foreground mb-4">
              Start by adding your first inclusion.
            </p>
            <Button 
              onClick={() => setIsCreating(true)} 
              className="dubai-button-primary"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add First Inclusion
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default InclusionsManagement;