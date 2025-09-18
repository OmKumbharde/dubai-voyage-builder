import React from 'react';
import { Bell, Search } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

const Header = () => {
  return (
    <header className="h-16 border-b bg-white px-6 flex items-center justify-between shadow-sm">
      <div className="flex items-center space-x-4 flex-1">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search quotes, hotels, tours..."
            className="pl-10 dubai-input"
          />
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {/* Notifications */}
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-xs text-white flex items-center justify-center">
            3
          </span>
        </Button>

        {/* Quick Actions */}
        <Button variant="outline" size="sm" className="gradient-gold text-foreground border-0">
          New Quote
        </Button>
      </div>
    </header>
  );
};

export default Header;