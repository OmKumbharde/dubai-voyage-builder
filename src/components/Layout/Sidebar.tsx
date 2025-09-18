import React from 'react';
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
  LogOut
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

const Sidebar = () => {
  const { state } = useAppContext();
  const { user } = state;

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
      name: 'Users Management', 
      href: '/admin/users', 
      icon: Users 
    },
    { 
      name: 'System Settings', 
      href: '/admin/settings', 
      icon: Settings 
    }
  ];

  return (
    <div className="flex h-screen w-64 flex-col bg-gradient-primary text-white">
      {/* Logo and Brand */}
      <div className="flex h-16 items-center justify-center border-b border-white/10">
        <div className="text-center">
          <h1 className="text-xl font-bold text-white">Dubai Quote</h1>
          <p className="text-xs text-white/80">Premium Travel Platform</p>
        </div>
      </div>

      {/* User Info */}
      <div className="border-b border-white/10 p-4">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-full bg-dubai-gold flex items-center justify-center">
            <span className="text-sm font-semibold text-dubai-navy">
              {user?.name?.charAt(0) || 'U'}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-white">{user?.name}</p>
            <p className="text-xs text-white/70 capitalize">{user?.role}</p>
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
              className={({ isActive }) =>
                `dubai-sidebar-item ${isActive ? 'active' : ''} text-white/90 hover:text-white hover:bg-white/10`
              }
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </div>

        {user?.role === 'admin' && (
          <div className="space-y-1 pt-6">
            <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-3">
              Administration
            </h3>
            {adminItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  `dubai-sidebar-item ${isActive ? 'active' : ''} text-white/90 hover:text-white hover:bg-white/10`
                }
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </NavLink>
            ))}
          </div>
        )}
      </nav>

      {/* Logout */}
      <div className="border-t border-white/10 p-4">
        <button className="dubai-sidebar-item w-full text-white/90 hover:text-white hover:bg-white/10">
          <LogOut className="h-5 w-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;