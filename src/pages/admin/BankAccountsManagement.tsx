import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { 
  Building, 
  Plus, 
  Edit3, 
  Trash2,
  Save,
  X,
  DollarSign,
  MapPin
} from 'lucide-react';
import { useSupabaseData } from '../../hooks/useSupabaseData';
import { toast } from '../../hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface BankAccount {
  id: string;
  branchName: string;
  branchCountry: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  swiftCode?: string;
  iban?: string;
  currency: string;
  exchangeRate: number;
  bankAddress?: string;
}

const BankAccountsManagement = () => {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    branchName: '',
    branchCountry: '',
    accountName: '',
    accountNumber: '',
    bankName: '',
    swiftCode: '',
    iban: '',
    currency: 'USD',
    exchangeRate: 1.0,
    bankAddress: ''
  });

  // Fetch bank accounts
  React.useEffect(() => {
    fetchBankAccounts();
  }, []);

  const fetchBankAccounts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setBankAccounts(data.map(account => ({
        id: account.id,
        branchName: account.branch_name,
        branchCountry: account.branch_country,
        accountName: account.account_name,
        accountNumber: account.account_number,
        bankName: account.bank_name,
        swiftCode: account.swift_code,
        iban: account.iban,
        currency: account.currency,
        exchangeRate: account.exchange_rate,
        bankAddress: account.bank_address
      })));
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch bank accounts",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const accountData = {
        branch_name: formData.branchName,
        branch_country: formData.branchCountry,
        account_name: formData.accountName,
        account_number: formData.accountNumber,
        bank_name: formData.bankName,
        swift_code: formData.swiftCode,
        iban: formData.iban,
        currency: formData.currency,
        exchange_rate: formData.exchangeRate,
        bank_address: formData.bankAddress
      };

      if (editingId && editingId !== 'new') {
        const { error } = await supabase
          .from('bank_accounts')
          .update(accountData)
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('bank_accounts')
          .insert(accountData);

        if (error) throw error;
      }
      
      setEditingId(null);
      resetForm();
      fetchBankAccounts();
      
      toast({
        title: "Success",
        description: editingId && editingId !== 'new' ? "Bank account updated successfully" : "Bank account added successfully"
      });
    } catch (error) {
      console.error('Error saving bank account:', error);
      toast({
        title: "Error",
        description: "Failed to save bank account. Please try again.",
        variant: "destructive"
      });
    }
  };

  const startEdit = (account: BankAccount) => {
    setEditingId(account.id);
    setFormData({
      branchName: account.branchName,
      branchCountry: account.branchCountry,
      accountName: account.accountName,
      accountNumber: account.accountNumber,
      bankName: account.bankName,
      swiftCode: account.swiftCode || '',
      iban: account.iban || '',
      currency: account.currency,
      exchangeRate: account.exchangeRate,
      bankAddress: account.bankAddress || ''
    });
  };

  const resetForm = () => {
    setFormData({
      branchName: '',
      branchCountry: '',
      accountName: '',
      accountNumber: '',
      bankName: '',
      swiftCode: '',
      iban: '',
      currency: 'USD',
      exchangeRate: 1.0,
      bankAddress: ''
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this bank account?')) {
      try {
        const { error } = await supabase
          .from('bank_accounts')
          .delete()
          .eq('id', id);

        if (error) throw error;

        fetchBankAccounts();
        toast({
          title: "Success",
          description: "Bank account deleted successfully"
        });
      } catch (error) {
        console.error('Error deleting bank account:', error);
        toast({
          title: "Error",
          description: "Failed to delete bank account",
          variant: "destructive"
        });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading bank accounts...</div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Building className="h-8 w-8 text-dubai-gold" />
            Bank Accounts Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage bank accounts for different branches and exchange rates
          </p>
        </div>
        <Button 
          onClick={() => setEditingId('new')} 
          className="dubai-button-primary"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add New Bank Account
        </Button>
      </div>

      {/* Bank Account Form */}
      {(editingId === 'new' || editingId) && (
        <Card className="dubai-card">
          <CardHeader>
            <CardTitle>
              {editingId === 'new' ? 'Add New Bank Account' : 'Edit Bank Account'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="branchName">Branch Name</Label>
                <Input
                  id="branchName"
                  value={formData.branchName}
                  onChange={(e) => setFormData(prev => ({ ...prev, branchName: e.target.value }))}
                  placeholder="e.g., Dubai Office, Ghana Branch"
                  className="dubai-input"
                />
              </div>
              <div>
                <Label htmlFor="branchCountry">Branch Country</Label>
                <select
                  id="branchCountry"
                  value={formData.branchCountry}
                  onChange={(e) => setFormData(prev => ({ ...prev, branchCountry: e.target.value }))}
                  className="dubai-input"
                >
                  <option value="">Select Country</option>
                  <option value="UAE">UAE</option>
                  <option value="Ghana">Ghana</option>
                  <option value="Nigeria">Nigeria</option>
                  <option value="Kenya">Kenya</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="accountName">Account Name</Label>
                <Input
                  id="accountName"
                  value={formData.accountName}
                  onChange={(e) => setFormData(prev => ({ ...prev, accountName: e.target.value }))}
                  placeholder="Enter account holder name"
                  className="dubai-input"
                />
              </div>
              <div>
                <Label htmlFor="bankName">Bank Name</Label>
                <Input
                  id="bankName"
                  value={formData.bankName}
                  onChange={(e) => setFormData(prev => ({ ...prev, bankName: e.target.value }))}
                  placeholder="Enter bank name"
                  className="dubai-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="accountNumber">Account Number</Label>
                <Input
                  id="accountNumber"
                  value={formData.accountNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, accountNumber: e.target.value }))}
                  placeholder="Enter account number"
                  className="dubai-input"
                />
              </div>
              <div>
                <Label htmlFor="swiftCode">SWIFT Code</Label>
                <Input
                  id="swiftCode"
                  value={formData.swiftCode}
                  onChange={(e) => setFormData(prev => ({ ...prev, swiftCode: e.target.value }))}
                  placeholder="Enter SWIFT code"
                  className="dubai-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Label htmlFor="currency">Currency</Label>
                <select
                  id="currency"
                  value={formData.currency}
                  onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                  className="dubai-input"
                >
                  <option value="USD">USD</option>
                  <option value="AED">AED</option>
                  <option value="GHS">GHS</option>
                  <option value="NGN">NGN</option>
                  <option value="KES">KES</option>
                </select>
              </div>
              <div>
                <Label htmlFor="exchangeRate">Exchange Rate</Label>
                <Input
                  id="exchangeRate"
                  type="number"
                  step="0.0001"
                  value={formData.exchangeRate}
                  onChange={(e) => setFormData(prev => ({ ...prev, exchangeRate: Number(e.target.value) }))}
                  placeholder="1.0000"
                  className="dubai-input"
                />
              </div>
              <div>
                <Label htmlFor="iban">IBAN (Optional)</Label>
                <Input
                  id="iban"
                  value={formData.iban}
                  onChange={(e) => setFormData(prev => ({ ...prev, iban: e.target.value }))}
                  placeholder="Enter IBAN"
                  className="dubai-input"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="bankAddress">Bank Address</Label>
              <Textarea
                id="bankAddress"
                value={formData.bankAddress}
                onChange={(e) => setFormData(prev => ({ ...prev, bankAddress: e.target.value }))}
                placeholder="Enter bank address"
                className="dubai-input"
                rows={3}
              />
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
                disabled={!formData.branchName || !formData.accountName || !formData.bankName}
              >
                <Save className="mr-2 h-4 w-4" />
                {editingId === 'new' ? 'Add Bank Account' : 'Update Bank Account'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bank Accounts List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bankAccounts.map((account) => (
          <Card key={account.id} className="dubai-card">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{account.branchName}</CardTitle>
                  <div className="flex items-center text-sm text-muted-foreground mt-1">
                    <MapPin className="h-4 w-4 mr-1" />
                    {account.branchCountry}
                  </div>
                </div>
                <Badge variant="outline">{account.currency}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium">Bank:</span>
                  <p className="text-sm text-muted-foreground">{account.bankName}</p>
                </div>
                <div>
                  <span className="text-sm font-medium">Account:</span>
                  <p className="text-sm text-muted-foreground">{account.accountName}</p>
                  <p className="text-sm font-mono">{account.accountNumber}</p>
                </div>
                {account.swiftCode && (
                  <div>
                    <span className="text-sm font-medium">SWIFT:</span>
                    <p className="text-sm font-mono">{account.swiftCode}</p>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Exchange Rate:</span>
                  <div className="flex items-center">
                    <DollarSign className="h-3 w-3 mr-1 text-dubai-gold" />
                    <span className="text-sm">{account.exchangeRate}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => startEdit(account)}
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(account.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {bankAccounts.length === 0 && (
        <Card className="dubai-card">
          <CardContent className="text-center py-8">
            <Building className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Bank Accounts Found</h3>
            <p className="text-muted-foreground mb-4">
              Start by adding bank accounts for different branches.
            </p>
            <Button 
              onClick={() => setEditingId('new')} 
              className="dubai-button-primary"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add First Bank Account
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BankAccountsManagement;