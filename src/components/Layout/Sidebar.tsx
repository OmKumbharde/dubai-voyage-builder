import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, 
  Calculator, 
  Settings, 
  Calendar, 
  BarChart3, 
  Building2, 
  MapPin, 
  Users,
  LogOut,
  Plane,
  Navigation
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../integrations/supabase/client';

const Sidebar = () => {
  const { user, signOut } = useAuth();
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user?.id) {
        const { data } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', user.id)
          .single();
        
        setUserName(data?.name || user.email?.split('@')[0] || 'User');
      }
    };

    fetchUserProfile();
  }, [user]);

  const navigationItems = [
    { 
      name: 'Dashboard', 
      href: '/', 
      icon: Home 
    },
    { 
      name: 'Quote Tool', 
      href: '/quote', 
      icon: Calculator 
    },
    { 
      name: 'Quote Management', 
      href: '/quotes', 
      icon: Settings 
    },
    { 
      name: 'Booking Center', 
      href: '/booking', 
      icon: Calendar 
    },
    { 
      name: 'Analytics', 
      href: '/analytics', 
      icon: BarChart3 
    }
  ];

  const adminItems = [
    { 
      name: 'Hotels Management', 
      href: '/admin/hotels', 
      icon: Building2 
    },
    { 
      name: 'Tours Management', 
      href: '/admin/tours', 
      icon: MapPin 
    },
    { 
      name: 'Inclusions Management', 
      href: '/admin/inclusions', 
      icon: Plane 
    },
    { 
      name: 'Hotel Rates', 
      href: '/admin/hotel-rates', 
      icon: Calendar 
    },
    { 
      name: 'Bank Accounts', 
      href: '/admin/bank-accounts', 
      icon: Users 
    }
  ];

  return (
    <div className="flex h-screen w-64 flex-col bg-gradient-primary text-white">
      {/* Logo and Brand */}
      <div className="flex h-16 items-center justify-center border-b border-white/10">
        <div className="text-center">
    <div className="text-left mt-10 mb-10">
  <img 
    src="/logo.svg" 
    alt="Dubai Quote Tool Logo" 
    className="w-36 h-42"
  />
</div>

        </div>
      </div>

      {/* User Info */}
      <div className="border-b border-white/10 p-4">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-dubai-gold flex items-center justify-center">
              <span className="text-sm font-semibold text-dubai-navy">
                {userName?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-white">{userName}</p>
              <p className="text-xs text-white/70">Team Member</p>
            </div>
          </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        <div className="space-y-1">
          <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-3">
            Main Menu
          </h3>
          {navigationItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              end
              className={({ isActive }) =>
                `dubai-sidebar-item ${isActive ? 'active' : ''} text-white/90 hover:text-white hover:bg-white/10`
              }
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </div>

        {/* Show admin items for all users as per requirements */}
        <div className="space-y-1 pt-6">
          <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-3">
            Management
          </h3>
          {adminItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              end
              className={({ isActive }) =>
                `dubai-sidebar-item ${isActive ? 'active' : ''} text-white/90 hover:text-white hover:bg-white/10`
              }
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Logout */}
      <div className="border-t border-white/10 p-4">
        <button 
          onClick={signOut}
          className="dubai-sidebar-item w-full text-white/90 hover:text-white hover:bg-white/10"
        >
          <LogOut className="h-5 w-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;