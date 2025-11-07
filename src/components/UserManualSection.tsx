// src/components/UserManualSection.tsx
import React, { useState } from 'react';
import { Book, Package, Tag, BarChart3, Calendar } from 'lucide-react';

type ManualTab = 'shelves' | 'tags' | 'analytics' | 'calendars';

interface ManualTabConfig {
  id: ManualTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  content: React.ReactNode;
}

export function UserManualSection() {
  const [activeTab, setActiveTab] = useState<ManualTab>('shelves');

  const manualTabs: ManualTabConfig[] = [
    {
      id: 'shelves',
      label: 'Custom Shelves',
      icon: Package,
      content: <ShelvesGuide />
    },
    // Add more tabs here later
    // {
    //   id: 'tags',
    //   label: 'Tagging System',
    //   icon: Tag,
    //   content: <TagsGuide />
    // },
  ];

  return (
    <section className="bg-white rounded-lg shadow-sm border border-slate-200 w-full max-w-full overflow-hidden">
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center mb-2">
          <Book className="w-5 h-5 text-slate-600 mr-2" />
          <h2 className="text-xl font-semibold text-slate-900">User Manual</h2>
        </div>
        <p className="text-sm text-slate-600">
          Learn how to use Tagflix features effectively
        </p>
      </div>

      {/* Guide Tabs */}
      <div className="border-b border-slate-200 bg-slate-50">
        <div className="flex overflow-x-auto">
          {manualTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 bg-white'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Guide Content */}
      <div className="p-6 max-h-[600px] overflow-y-auto">
        {manualTabs.find(tab => tab.id === activeTab)?.content}
      </div>
    </section>
  );
}

// Shelves Guide Component
function ShelvesGuide() {
  return (
    <div className="prose prose-slate max-w-none">
      <h3 className="text-2xl font-bold text-slate-900 mb-4">Custom Shelves Guide</h3>
      
      {/* What Are Shelves */}
      <section className="mb-8">
        <h4 className="text-lg font-semibold text-slate-900 mb-3">What Are Shelves?</h4>
        <p className="text-slate-700 mb-4">
          <strong>Shelves</strong> (also called Collections) let you organize your physical media into custom groups 
          beyond the basic status categories. Think of them as virtual shelves where you can group movies and TV shows 
          by any theme you want!
        </p>
      </section>

      {/* Getting Started */}
      <section className="mb-8">
        <h4 className="text-lg font-semibold text-slate-900 mb-3">Getting Started with Shelves</h4>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <h5 className="font-semibold text-blue-900 mb-2">Step 1: Create Your First Shelf</h5>
          <ol className="list-decimal list-inside space-y-2 text-slate-700">
            <li>Go to <strong>My Media Library</strong> page</li>
            <li>Click <strong>"Manage Shelves"</strong> button (purple button in the top right)</li>
            <li>Click <strong>"Create New Shelf"</strong></li>
            <li>Enter shelf details:
              <ul className="list-disc list-inside ml-6 mt-1">
                <li><strong>Name</strong> (required): e.g., "4K HDR Demos", "Christmas Movies"</li>
                <li><strong>Description</strong> (optional): What this shelf is for</li>
              </ul>
            </li>
            <li>Click <strong>"Create Shelf"</strong></li>
          </ol>
          <p className="text-green-700 font-medium mt-2">✅ Your shelf is now ready to use!</p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <h5 className="font-semibold text-green-900 mb-2">Step 2: Add Items to a Shelf</h5>
          <p className="text-slate-700 mb-2">There are <strong>two ways</strong> to add items:</p>
          
          <div className="mb-3">
            <p className="font-medium text-slate-900">Method 1: From the Library View</p>
            <ol className="list-decimal list-inside space-y-1 text-slate-700 ml-2">
              <li>Find an item in your library</li>
              <li>Hover over the item's poster</li>
              <li>Click the <strong>📦 shelf icon</strong> (small button in bottom-right corner)</li>
              <li>Select which shelf(s) to add it to</li>
              <li>Click <strong>"Add to Selected"</strong></li>
            </ol>
          </div>

          <div>
            <p className="font-medium text-slate-900">Method 2: From Item Details</p>
            <ol className="list-decimal list-inside space-y-1 text-slate-700 ml-2">
              <li>Click on any item to open details</li>
              <li>Look for <strong>"Add to Shelves"</strong> button</li>
              <li>Select your shelves</li>
              <li>Click <strong>"Add to Selected"</strong></li>
            </ol>
          </div>

          <p className="text-blue-700 font-medium mt-2">💡 Tip: Items can be in multiple shelves at once!</p>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h5 className="font-semibold text-purple-900 mb-2">Step 3: View a Shelf</h5>
          
          <div className="mb-3">
            <p className="font-medium text-slate-900">Option A: Using the Shelf Filter</p>
            <ol className="list-decimal list-inside space-y-1 text-slate-700 ml-2">
              <li>In My Media Library, look for the <strong>"Shelf"</strong> dropdown filter</li>
              <li>Select any shelf from the list</li>
              <li>The grid will show only items in that shelf</li>
            </ol>
          </div>

          <div>
            <p className="font-medium text-slate-900">Option B: Direct Shelf View</p>
            <ol className="list-decimal list-inside space-y-1 text-slate-700 ml-2">
              <li>Click <strong>"Manage Shelves"</strong></li>
              <li>Click on any shelf name</li>
              <li>See all items in that shelf with full details</li>
            </ol>
          </div>
        </div>
      </section>

      {/* Managing Shelves */}
      <section className="mb-8">
        <h4 className="text-lg font-semibold text-slate-900 mb-3">Managing Your Shelves</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <h5 className="font-semibold text-slate-900 mb-2">Edit a Shelf</h5>
            <ol className="list-decimal list-inside space-y-1 text-sm text-slate-700">
              <li>Click "Manage Shelves"</li>
              <li>Find the shelf you want to edit</li>
              <li>Click the pencil icon (✏️)</li>
              <li>Update name or description</li>
              <li>Click "Update Shelf"</li>
            </ol>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <h5 className="font-semibold text-slate-900 mb-2">Delete a Shelf</h5>
            <ol className="list-decimal list-inside space-y-1 text-sm text-slate-700">
              <li>Click "Manage Shelves"</li>
              <li>Find the shelf to delete</li>
              <li>Click the trash icon (🗑️)</li>
              <li>Confirm deletion</li>
            </ol>
            <p className="text-xs text-orange-700 font-medium mt-2">
              ⚠️ Items are NOT deleted, only removed from the shelf
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <h5 className="font-semibold text-slate-900 mb-2">Remove Item from Shelf</h5>
            <ol className="list-decimal list-inside space-y-1 text-sm text-slate-700">
              <li>Open the shelf view</li>
              <li>Find the item to remove</li>
              <li>Click the item's action menu</li>
              <li>Select "Remove from Shelf"</li>
            </ol>
          </div>
        </div>
      </section>

      {/* Popular Shelf Ideas */}
      <section className="mb-8">
        <h4 className="text-lg font-semibold text-slate-900 mb-3">Popular Shelf Ideas</h4>
        <p className="text-slate-700 mb-4">Here are some creative ways to use shelves:</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h5 className="font-semibold text-blue-900 mb-2">🎬 By Theme</h5>
            <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
              <li>"Christmas Movies"</li>
              <li>"Summer Blockbusters"</li>
              <li>"Date Night Picks"</li>
              <li>"Rainy Day Comfort Films"</li>
            </ul>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h5 className="font-semibold text-purple-900 mb-2">🎨 By Quality/Purpose</h5>
            <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
              <li>"4K HDR Demos" (show off your TV)</li>
              <li>"Reference Quality Audio"</li>
              <li>"Watch with Kids"</li>
              <li>"Film School Essentials"</li>
            </ul>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h5 className="font-semibold text-green-900 mb-2">🎭 By Creator</h5>
            <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
              <li>"Christopher Nolan Collection"</li>
              <li>"Studio Ghibli Complete"</li>
              <li>"A24 Films"</li>
              <li>"Criterion Collection"</li>
            </ul>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h5 className="font-semibold text-orange-900 mb-2">📺 By Series/Franchise</h5>
            <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
              <li>"Marvel Cinematic Universe"</li>
              <li>"James Bond Complete Collection"</li>
              <li>"Star Wars Saga"</li>
              <li>"Middle-earth Films"</li>
            </ul>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h5 className="font-semibold text-red-900 mb-2">📦 By Format/Edition</h5>
            <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
              <li>"Steelbook Collection"</li>
              <li>"Limited Editions"</li>
              <li>"Director's Cuts Only"</li>
              <li>"Foreign Films with English Subs"</li>
            </ul>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h5 className="font-semibold text-yellow-900 mb-2">👥 Social Organization</h5>
            <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
              <li>"Watch Party Ready"</li>
              <li>"Show to Friends"</li>
              <li>"Solo Watch Only"</li>
              <li>"Family Movie Night"</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Tips & Best Practices */}
      <section className="mb-8">
        <h4 className="text-lg font-semibold text-slate-900 mb-3">Tips & Best Practices</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h5 className="font-semibold text-green-900 mb-2">✅ Do's</h5>
            <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
              <li>Use descriptive names</li>
              <li>Add descriptions to remember purpose</li>
              <li>Put items in multiple shelves</li>
              <li>Create seasonal shelves</li>
              <li>Make genre sub-categories</li>
            </ul>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h5 className="font-semibold text-red-900 mb-2">❌ Don'ts</h5>
            <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
              <li>Don't duplicate status categories</li>
              <li>Don't create too many at once</li>
              <li>Don't forget to use them</li>
              <li>Don't use vague names like "Shelf 1"</li>
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mb-8">
        <h4 className="text-lg font-semibold text-slate-900 mb-3">Frequently Asked Questions</h4>
        
        <div className="space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <p className="font-semibold text-slate-900 mb-1">Q: How many shelves can I create?</p>
            <p className="text-sm text-slate-700">A: Unlimited! Create as many as you need.</p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <p className="font-semibold text-slate-900 mb-1">Q: Can an item be in multiple shelves?</p>
            <p className="text-sm text-slate-700">A: Yes! That's the power of shelves - one item can belong to many groups.</p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <p className="font-semibold text-slate-900 mb-1">Q: What's the difference between Status and Shelves?</p>
            <p className="text-sm text-slate-700">A: <strong>Status</strong> (Owned, Wishlist, etc.) = Where the item physically is. <strong>Shelves</strong> = How you want to organize/group items.</p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <p className="font-semibold text-slate-900 mb-1">Q: If I delete a shelf, are my items deleted?</p>
            <p className="text-sm text-slate-700">A: No! Only the shelf is deleted. Your items remain in your library.</p>
          </div>
        </div>
      </section>

      {/* Quick Start Checklist */}
      <section className="mb-8">
        <h4 className="text-lg font-semibold text-slate-900 mb-3">Quick Start Checklist</h4>
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
          <p className="text-slate-700 mb-3">Ready to organize your library? Follow this checklist:</p>
          <ul className="space-y-2 text-slate-700">
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">□</span>
              <span>Create 3-5 shelves based on your interests</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">□</span>
              <span>Add 5-10 items to each shelf to start</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">□</span>
              <span>Use the shelf filter to browse your collections</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">□</span>
              <span>Add descriptions to remember what each shelf is for</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">□</span>
              <span>Try putting one item in multiple shelves</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">□</span>
              <span>Share your shelf ideas with other collectors!</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Get Creative */}
      <section>
        <div className="bg-gradient-to-r from-purple-100 to-blue-100 border-2 border-purple-300 rounded-lg p-6 text-center">
          <h4 className="text-xl font-bold text-purple-900 mb-2">Get Creative! 🎨</h4>
          <p className="text-slate-700">
            Shelves are YOUR organization system - use them however makes sense for your collection! 
            Some users create dozens of hyper-specific shelves, others keep it simple with just a few broad categories. 
            Both approaches work great!
          </p>
          <p className="text-lg font-semibold text-blue-900 mt-4">
            Happy organizing! 📚🎬
          </p>
        </div>
      </section>
    </div>
  );
}