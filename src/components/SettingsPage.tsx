// src/components/SettingsPage.tsx
import React, { useState } from 'react';
import { 
  Settings, 
  User, 
  Bell, 
  Download, 
  Upload, 
  FileText, 
  Trash2, 
  Link, 
  Palette, 
  Sun, 
  Moon, 
  Monitor, 
  Shield,
  Package,
  Disc3,
  Sparkles,
  Eye,
  TrendingUp,
  LogOut
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { UserManualSection } from './UserManualSection';
import { Book } from 'lucide-react';

type SettingsTab = 'account' | 'collections' | 'notifications' | 'data' | 'display' | 'privacy' | 'manual';

export function SettingsPage() {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('account');
  
  // Settings state
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('light');
  const [cardsPerRow, setCardsPerRow] = useState('4');
  const [showRatings, setShowRatings] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);

  // Collections settings state
  const [includeWishlistItems, setIncludeWishlistItems] = useState(false);
  const [focusOnCollectionGaps, setFocusOnCollectionGaps] = useState(true);
  const [formatUpgradeSuggestions, setFormatUpgradeSuggestions] = useState(true);
  const [maxRecommendations, setMaxRecommendations] = useState('12');
  const [confidenceThreshold, setConfidenceThreshold] = useState('0.5');

  const tabs: { id: SettingsTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'collections', label: 'Collections', icon: Package },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'data', label: 'Data Management', icon: Download },
    { id: 'display', label: 'Display', icon: Palette },
    { id: 'privacy', label: 'Privacy', icon: Shield },
    { id: 'manual', label: 'User Manual', icon: Book },
  ];

  const handleImportMyLists = () => {
    console.log('Import functionality coming soon');
  };

  const handleExportWatchlists = () => {
    console.log('Export functionality coming soon');
  };

  const handleBackupData = () => {
    console.log('Backup functionality coming soon');
  };

  const handleClearAllData = () => {
    if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      console.log('Clear data functionality coming soon');
    }
  };

  const handleFixTechnicalSpecs = () => {
    alert('Technical specs linking tool coming soon!');
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      // Note: Navigation will handle redirecting to search page
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center space-x-3">
          <Settings className="h-8 w-8 text-slate-600" />
          <span>Settings</span>
        </h1>
        <p className="text-slate-600 mt-2">
          Manage your account, preferences, and data
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar - Fixed width, won't shrink */}
        <div className="w-full lg:w-64 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700 border-blue-300'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-3" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Account Settings */}
          {activeTab === 'account' && (
            <section className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 w-full max-w-full overflow-hidden">
              <div className="flex items-center mb-6">
                <User className="w-5 h-5 text-slate-600 mr-2" />
                <h2 className="text-xl font-semibold text-slate-900">Account Information</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full px-3 py-2 border border-slate-300 rounded-md bg-slate-50 text-slate-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">User ID</label>
                  <input
                    type="text"
                    value={user?.id || ''}
                    disabled
                    className="w-full px-3 py-2 border border-slate-300 rounded-md bg-slate-50 text-slate-500 font-mono text-xs"
                  />
                </div>
                
                <div className="pt-4 border-t border-slate-200">
                  <h3 className="text-lg font-medium text-slate-900 mb-4">Account Actions</h3>
                  <div className="space-y-3">
                    <div>
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                        Change Password
                      </button>
                    </div>
                    <div>
                      <button
                        onClick={handleSignOut}
                        className="flex items-center space-x-2 px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700 transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                    <div>
                      <button className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors">
                        Delete Account
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Collections Settings */}
          {activeTab === 'collections' && (
            <div className="space-y-6 w-full max-w-full">
              <section className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 w-full max-w-full overflow-hidden">
                <div className="flex items-center mb-6">
                  <Sparkles className="w-5 h-5 text-purple-600 mr-2" />
                  <h2 className="text-xl font-semibold text-slate-900">Recommendation Preferences</h2>
                </div>
                
                <div className="space-y-6 w-full">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                    <div className="flex items-center justify-between min-w-0 overflow-hidden">
                      <div className="pr-2 break-words min-w-0 flex-1">
                        <label className="text-sm font-medium text-slate-900">Include wishlist items</label>
                        <p className="text-xs text-slate-600">Show recommendations even if they're already in your wishlist</p>
                      </div>
                      <input 
                        type="checkbox" 
                        className="rounded" 
                        checked={includeWishlistItems}
                        onChange={(e) => setIncludeWishlistItems(e.target.checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-slate-900">Focus on collection gaps</label>
                        <p className="text-xs text-slate-600">Prioritize missing movies from series you already own</p>
                      </div>
                      <input 
                        type="checkbox" 
                        className="rounded" 
                        checked={focusOnCollectionGaps}
                        onChange={(e) => setFocusOnCollectionGaps(e.target.checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-slate-900">Format upgrade suggestions</label>
                        <p className="text-xs text-slate-600">Suggest 4K/Blu-ray upgrades for DVDs you own</p>
                      </div>
                      <input 
                        type="checkbox" 
                        className="rounded" 
                        checked={formatUpgradeSuggestions}
                        onChange={(e) => setFormatUpgradeSuggestions(e.target.checked)}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-900 mb-1">
                        Maximum recommendations per session
                      </label>
                      <select 
                        className="w-full p-2 border border-slate-300 rounded-md"
                        value={maxRecommendations}
                        onChange={(e) => setMaxRecommendations(e.target.value)}
                      >
                        <option value="6">6 recommendations</option>
                        <option value="12">12 recommendations</option>
                        <option value="18">18 recommendations</option>
                        <option value="24">24 recommendations</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-900 mb-1">
                        Minimum confidence threshold
                      </label>
                      <select 
                        className="w-full p-2 border border-slate-300 rounded-md"
                        value={confidenceThreshold}
                        onChange={(e) => setConfidenceThreshold(e.target.value)}
                      >
                        <option value="0.3">Low (30%)</option>
                        <option value="0.5">Medium (50%)</option>
                        <option value="0.7">High (70%)</option>
                        <option value="0.8">Very High (80%)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </section>

              <section className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 w-full max-w-full overflow-hidden">
                <div className="flex items-center mb-6">
                  <Disc3 className="w-5 h-5 text-blue-600 mr-2" />
                  <h2 className="text-xl font-semibold text-slate-900">Collection Management</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button 
                    onClick={handleFixTechnicalSpecs}
                    className="flex items-center justify-center px-4 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                  >
                    <Link className="w-4 h-4 mr-2" />
                    Fix Technical Specs
                  </button>
                  
                  <button 
                    className="flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Auto-Organize Collection
                  </button>
                  
                  <button 
                    className="flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Scan for Duplicates
                  </button>
                  
                  <button 
                    className="flex items-center justify-center px-4 py-3 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
                  >
                    <Package className="w-4 h-4 mr-2" />
                    Collection Health Check
                  </button>
                </div>
              </section>
            </div>
          )}

          {/* Notifications Settings */}
          {activeTab === 'notifications' && (
            <section className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 w-full max-w-full overflow-hidden">
              <div className="flex items-center mb-6">
                <Bell className="w-5 h-5 text-slate-600 mr-2" />
                <h2 className="text-xl font-semibold text-slate-900">Notification Preferences</h2>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-slate-900">Email notifications</label>
                    <p className="text-xs text-slate-600">Receive updates about your collection via email</p>
                  </div>
                  <input 
                    type="checkbox" 
                    className="rounded" 
                    checked={emailNotifications}
                    onChange={(e) => setEmailNotifications(e.target.checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-slate-900">Push notifications</label>
                    <p className="text-xs text-slate-600">Get notified about new recommendations and updates</p>
                  </div>
                  <input 
                    type="checkbox" 
                    className="rounded" 
                    checked={pushNotifications}
                    onChange={(e) => setPushNotifications(e.target.checked)}
                  />
                </div>
              </div>
            </section>
          )}

          {/* Data Management Settings */}
          {activeTab === 'data' && (
            <section className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 w-full max-w-full overflow-hidden">
              <div className="flex items-center mb-6">
                <Download className="w-5 h-5 text-slate-600 mr-2" />
                <h2 className="text-xl font-semibold text-slate-900">Data Management</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                  onClick={handleImportMyLists}
                  className="flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Import My Lists
                </button>
                
                <button 
                  onClick={handleExportWatchlists}
                  className="flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Watchlists
                </button>
                
                <button 
                  onClick={handleBackupData}
                  className="flex items-center justify-center px-4 py-3 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Backup Data
                </button>
                
                <button 
                  onClick={handleClearAllData}
                  className="flex items-center justify-center px-4 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear All Data
                </button>
              </div>
            </section>
          )}

          {/* Display Settings */}
          {activeTab === 'display' && (
            <section className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 w-full max-w-full overflow-hidden">
              <div className="flex items-center mb-6">
                <Palette className="w-5 h-5 text-slate-600 mr-2" />
                <h2 className="text-xl font-semibold text-slate-900">Display Settings</h2>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Theme</label>
                  <div className="flex space-x-4">
                    <button 
                      onClick={() => setTheme('light')}
                      className={`flex items-center px-4 py-2 rounded-md border transition-colors ${
                        theme === 'light' 
                          ? 'border-blue-500 bg-blue-50 text-blue-700' 
                          : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Sun className="w-4 h-4 mr-2" />
                      Light
                    </button>
                    <button 
                      onClick={() => setTheme('dark')}
                      className={`flex items-center px-4 py-2 rounded-md border transition-colors ${
                        theme === 'dark' 
                          ? 'border-blue-500 bg-blue-50 text-blue-700' 
                          : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Moon className="w-4 h-4 mr-2" />
                      Dark
                    </button>
                    <button 
                      onClick={() => setTheme('auto')}
                      className={`flex items-center px-4 py-2 rounded-md border transition-colors ${
                        theme === 'auto' 
                          ? 'border-blue-500 bg-blue-50 text-blue-700' 
                          : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Monitor className="w-4 h-4 mr-2" />
                      Auto
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Cards per row</label>
                  <select 
                    value={cardsPerRow}
                    onChange={(e) => setCardsPerRow(e.target.value)}
                    className="px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="3">3 cards</option>
                    <option value="4">4 cards</option>
                    <option value="5">5 cards</option>
                    <option value="6">6 cards</option>
                  </select>
                </div>

                <div className="flex items-center">
                  <input 
                    type="checkbox" 
                    id="show-ratings"
                    checked={showRatings}
                    onChange={(e) => setShowRatings(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="show-ratings" className="ml-2 text-sm text-slate-700">
                    Show ratings on cards
                  </label>
                </div>
              </div>
            </section>
          )}

          {/* Privacy Settings */}
          {activeTab === 'privacy' && (
            <section className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 w-full max-w-full overflow-hidden">
              <div className="flex items-center mb-6">
                <Shield className="w-5 h-5 text-slate-600 mr-2" />
                <h2 className="text-xl font-semibold text-slate-900">Security & Privacy</h2>
              </div>
              
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <h3 className="font-medium text-slate-900 mb-2">Data Privacy</h3>
                  <p className="text-sm text-slate-600 mb-3">
                    Your collection data is stored securely and is never shared with third parties.
                  </p>
                  <button className="text-sm text-blue-600 hover:text-blue-800">
                    View Privacy Policy
                  </button>
                </div>
                
                <div className="p-4 bg-slate-50 rounded-lg">
                  <h3 className="font-medium text-slate-900 mb-2">Data Retention</h3>
                  <p className="text-sm text-slate-600 mb-3">
                    Collection data is retained until you delete your account.
                  </p>
                  <button className="text-sm text-blue-600 hover:text-blue-800">
                    Request Data Export
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* User Manual */}
          {activeTab === 'manual' && <UserManualSection />}
          
        </div>
      </div>
    </div>
  );
}