import React, { useState, useEffect } from 'react';
import {
  Users,
  Upload,
  AlertTriangle,
  Trash2,
  CheckCircle2,
  ShieldAlert,
  Search,
  Cpu,
  RefreshCw,
  X,
  Lock,
  Unlock,
  KeyRound,
  EyeOff,
  Eye,
} from 'lucide-react';
import { CommunityCreation, Frame } from '../types';

interface CommunityGalleryProps {
  onLoadCreation: (title: string, description: string, frames: Frame[], delayMs: number) => void;
  currentFrames: Frame[];
  currentTitle: string;
  currentDelayMs: number;
}

export const CommunityGallery: React.FC<CommunityGalleryProps> = ({
  onLoadCreation,
  currentFrames,
  currentTitle,
  currentDelayMs,
}) => {
  const [creations, setCreations] = useState<CommunityCreation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'reported'>('all');
  
  // Secret Admin Authentication
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [showAdminPasswordModal, setShowAdminPasswordModal] = useState<boolean>(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState<string>('');
  const [adminPasswordError, setAdminPasswordError] = useState<string | null>(null);

  // Submit Modal
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [submitTitle, setSubmitTitle] = useState<string>(currentTitle || 'My UNO Q Creation');
  const [submitAuthor, setSubmitAuthor] = useState<string>('AdaHacker');
  const [submitCategory, setSubmitCategory] = useState<string>('Community');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Fetch creations from API
  const fetchCreations = async (adminOverride?: boolean) => {
    try {
      const admin = adminOverride !== undefined ? adminOverride : isAdminMode;
      const url = admin ? '/api/creations?admin=true' : '/api/creations';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setCreations(data);
      }
    } catch (err) {
      console.warn('Failed to load community creations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCreations();
  }, [isAdminMode]);

  // Update submit title when currentTitle changes
  useEffect(() => {
    if (currentTitle) setSubmitTitle(currentTitle);
  }, [currentTitle]);

  // Handle password submission for secret admin mode
  const handleAdminPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPasswordInput === 'MajorLeagueHacking') {
      setIsAdminMode(true);
      setShowAdminPasswordModal(false);
      setAdminPasswordInput('');
      setAdminPasswordError(null);
      setActionNotice('MLH Admin Mode activated! You can now manage and unhide reported creations.');
      fetchCreations(true);
      setTimeout(() => setActionNotice(null), 4000);
    } else {
      setAdminPasswordError('Incorrect password. Access denied.');
    }
  };

  const handleExitAdmin = () => {
    setIsAdminMode(false);
    setActiveFilter('all');
    setActionNotice('Exited Admin Mode.');
    fetchCreations(false);
    setTimeout(() => setActionNotice(null), 3000);
  };

  // Publish new creation
  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitTitle.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/creations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: submitTitle.trim(),
          author: submitAuthor.trim() || 'Hacker',
          category: submitCategory,
          frameDelayMs: currentDelayMs,
          frames: currentFrames.map((f) => ({ matrix: f.matrix })),
        }),
      });

      if (res.ok) {
        setShowSubmitModal(false);
        setActionNotice(`"${submitTitle}" published successfully!`);
        fetchCreations();
        setTimeout(() => setActionNotice(null), 4000);
      }
    } catch (err) {
      console.error('Failed to publish creation:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Report creation: immediately autohide from public view
  const handleReport = async (id: string, title: string) => {
    if (!window.confirm(`Report "${title}" for review? It will be immediately hidden.`)) return;

    // Immediately remove from public view in UI (autohide)
    setCreations((prev) => prev.filter((item) => item.id !== id));
    setActionNotice(`"${title}" has been reported and auto-hidden from the gallery. Thank you!`);
    setTimeout(() => setActionNotice(null), 5000);

    try {
      await fetch(`/api/creations/${id}/report`, { method: 'POST' });
    } catch (err) {
      console.error('Failed to report creation:', err);
    }
  };

  // Admin: Delete creation permanently
  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Admin: Permanently delete "${title}"?`)) return;

    try {
      const res = await fetch(`/api/creations/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setActionNotice(`Creation deleted permanently.`);
        fetchCreations(true);
        setTimeout(() => setActionNotice(null), 3000);
      }
    } catch (err) {
      console.error('Failed to delete creation:', err);
    }
  };

  // Admin: Unhide / restore falsely reported creation
  const handleDismissReport = async (id: string, title: string) => {
    try {
      const res = await fetch(`/api/creations/${id}/dismiss-report`, { method: 'POST' });
      if (res.ok) {
        setActionNotice(`"${title}" report dismissed and restored to public gallery!`);
        fetchCreations(true);
        setTimeout(() => setActionNotice(null), 3000);
      }
    } catch (err) {
      console.error('Failed to dismiss report:', err);
    }
  };

  // Filtered items
  const filteredCreations = creations.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());

    if (!isAdminMode) {
      // In public mode, auto-hide reported items
      return matchesSearch && !item.isReported && (item.reportsCount || 0) === 0;
    }

    if (activeFilter === 'reported') {
      return matchesSearch && (item.isReported || (item.reportsCount || 0) > 0);
    }
    return matchesSearch;
  });

  const reportedCount = creations.filter((c) => c.isReported || (c.reportsCount || 0) > 0).length;

  return (
    <div className="flex flex-col gap-6">
      
      {/* Notice Banner */}
      {actionNotice && (
        <div className="p-3.5 rounded-2xl bg-[#EAF4FF] border border-[#BFDEFF] text-xs font-semibold text-[#004B99] flex items-center justify-between shadow-xs animate-in fade-in duration-150">
          <span>{actionNotice}</span>
          <button onClick={() => setActionNotice(null)} className="text-[#0066CC] hover:text-[#004B99]">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Header Card */}
      <div className="bg-white rounded-3xl p-6 border border-[#E6DFD5] shadow-xs flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0088FF]/10 text-[#0088FF] flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[#2D2926] flex items-center gap-2">
                See What Others Made
                
                {/* SECRET ADMIN TRIGGER: Clicking this "{count} Published" text prompts for password */}
                <button
                  onClick={() => setShowAdminPasswordModal(true)}
                  className="text-xs font-bold text-[#0088FF] bg-[#E6F3FF] hover:bg-[#D6EBFF] px-2.5 py-0.5 rounded-full transition-colors cursor-pointer border border-[#B8DFFF]"
                  title="Click to view details"
                >
                  {creations.length} Published
                </button>
              </h2>
              <p className="text-xs text-[#7A7167]">
                Community designs for the Arduino UNO Q 13×8 Light Grid. Click "Load" on any card to test it on your simulator!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => setShowSubmitModal(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs bg-[#0088FF] hover:bg-[#0070D1] text-white shadow-xs transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Share My Design</span>
            </button>
          </div>
        </div>

        {/* Secret Admin Mode Banner (Only visible when unlocked with password) */}
        {isAdminMode && (
          <div className="p-4 rounded-2xl bg-[#232B30] border-2 border-[#38464F] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-md">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-amber-400 block">
                  MLH Admin Mode Active
                </span>
                <span className="text-[11px] text-gray-300">
                  You can inspect reported/auto-hidden items, unhide false reports, or permanently delete.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center bg-[#151C20] p-1 rounded-xl border border-gray-700">
                <button
                  onClick={() => setActiveFilter('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                    activeFilter === 'all'
                      ? 'bg-[#0088FF] text-white'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  All ({creations.length})
                </button>
                <button
                  onClick={() => setActiveFilter('reported')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5 ${
                    activeFilter === 'reported'
                      ? 'bg-red-600 text-white'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>Reported / Hidden ({reportedCount})</span>
                </button>
              </div>

              <button
                onClick={handleExitAdmin}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#344047] hover:bg-[#43525B] text-gray-200 transition-colors cursor-pointer"
              >
                Exit Admin
              </button>
            </div>
          </div>
        )}

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-[#A3998C]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search designs or authors..."
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#FAF6F0] border border-[#E6DFD5] text-xs text-[#2D2926] outline-none focus:border-[#0088FF]"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-[#7A7167]">
            <span>Showing {filteredCreations.length} designs</span>
            <button
              onClick={() => fetchCreations()}
              className="p-1.5 rounded-lg bg-[#FAF6F0] hover:bg-[#F2ECE1] text-[#6C6358] transition-colors cursor-pointer"
              title="Refresh creations"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Community Creations */}
      {loading ? (
        <div className="p-8 text-center bg-white rounded-3xl border border-[#E6DFD5] text-xs text-[#7A7167]">
          Loading community creations...
        </div>
      ) : filteredCreations.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-3xl border border-[#E6DFD5] text-xs text-[#7A7167]">
          {activeFilter === 'reported'
            ? 'No reported or hidden creations! Everything is clean.'
            : 'No creations found matching your search. Be the first to share one!'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredCreations.map((item) => (
            <CommunityCard
              key={item.id}
              creation={item}
              isAdminMode={isAdminMode}
              onLoad={() => {
                const converted: Frame[] = item.frames.map((f, i) => ({
                  id: `community-${item.id}-${i}`,
                  matrix: f.matrix,
                }));
                onLoadCreation(
                  item.title,
                  `Community creation by ${item.author}`,
                  converted,
                  item.frameDelayMs || 350
                );
              }}
              onReport={() => handleReport(item.id, item.title)}
              onDelete={() => handleDelete(item.id, item.title)}
              onDismissReport={() => handleDismissReport(item.id, item.title)}
            />
          ))}
        </div>
      )}

      {/* Secret Admin Password Modal */}
      {showAdminPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 border-2 border-[#E6DFD5] shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#F0EBE1]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <KeyRound className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-[#2D2926]">
                  MLH Organizer Access
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowAdminPasswordModal(false);
                  setAdminPasswordError(null);
                  setAdminPasswordInput('');
                }}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#6C6358]">
              Enter the MLH organizer password to inspect and moderate reported designs.
            </p>

            <form onSubmit={handleAdminPasswordSubmit} className="space-y-3">
              <div>
                <input
                  type="password"
                  value={adminPasswordInput}
                  onChange={(e) => {
                    setAdminPasswordInput(e.target.value);
                    setAdminPasswordError(null);
                  }}
                  placeholder="Enter password"
                  autoFocus
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF6F0] border border-[#E6DFD5] text-xs font-mono font-bold text-[#2D2926] outline-none focus:border-[#0088FF]"
                />
                {adminPasswordError && (
                  <span className="text-[11px] font-bold text-red-600 mt-1 block">
                    {adminPasswordError}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdminPasswordModal(false);
                    setAdminPasswordError(null);
                    setAdminPasswordInput('');
                  }}
                  className="flex-1 py-2 rounded-xl border border-[#E6DFD5] text-xs font-bold text-[#6C6358] hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl font-bold text-xs bg-[#0088FF] hover:bg-[#0070D1] text-white shadow-xs cursor-pointer"
                >
                  Unlock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Submit Creation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 border-2 border-[#E6DFD5] shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0EBE1]">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-[#0088FF]" />
                <h3 className="font-bold text-base text-[#2D2926]">
                  Share to "See What Others Made"
                </h3>
              </div>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePublish} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-[#6C6358] uppercase block mb-1">
                  Design Title:
                </label>
                <input
                  type="text"
                  value={submitTitle}
                  onChange={(e) => setSubmitTitle(e.target.value)}
                  placeholder="e.g. Ada's Algorithm, Fluttering Butterfly"
                  maxLength={40}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF6F0] border border-[#E6DFD5] text-xs font-bold text-[#2D2926] outline-none focus:border-[#0088FF]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#6C6358] uppercase block mb-1">
                  Your Name / Handle:
                </label>
                <input
                  type="text"
                  value={submitAuthor}
                  onChange={(e) => setSubmitAuthor(e.target.value)}
                  placeholder="e.g. AdaHacker, Grace"
                  maxLength={25}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF6F0] border border-[#E6DFD5] text-xs font-bold text-[#2D2926] outline-none focus:border-[#0088FF]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#6C6358] uppercase block mb-1">
                  Category:
                </label>
                <select
                  value={submitCategory}
                  onChange={(e) => setSubmitCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF6F0] border border-[#E6DFD5] text-xs font-medium text-[#2D2926] outline-none"
                >
                  <option value="STEM Icons">STEM Icons</option>
                  <option value="Animation">Animation</option>
                  <option value="Crafts">Crafts & Art</option>
                  <option value="Cute">Cute & Pets</option>
                  <option value="Hardware">UNO Q Hardware</option>
                  <option value="Community">Community</option>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-[#FAF6F0] border border-[#EADBCE] text-xs text-[#6C6358]">
                <span>Publishing <strong>{currentFrames.length} frame(s)</strong> currently on your Arduino UNO Q Light Grid simulator.</span>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-[#E6DFD5] text-xs font-bold text-[#6C6358] hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !submitTitle.trim()}
                  className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-[#0088FF] hover:bg-[#0070D1] text-white shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Publishing...' : 'Auto-Approve & Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

interface CommunityCardProps {
  creation: CommunityCreation;
  isAdminMode: boolean;
  onLoad: () => void;
  onReport: () => void;
  onDelete: () => void;
  onDismissReport: () => void;
}

const CommunityCard: React.FC<CommunityCardProps> = ({
  creation,
  isAdminMode,
  onLoad,
  onReport,
  onDelete,
  onDismissReport,
}) => {
  const [step, setStep] = useState<number>(0);
  const frames = creation.frames || [];
  const cols = frames[0]?.matrix[0]?.length || 13;
  const isFlagged = creation.isReported || (creation.reportsCount || 0) > 0;

  useEffect(() => {
    if (frames.length <= 1) return;
    const interval = setInterval(() => {
      setStep((prev) => (prev + 1) % frames.length);
    }, creation.frameDelayMs || 350);
    return () => clearInterval(interval);
  }, [frames.length, creation.frameDelayMs]);

  const currentFrame = frames[step] || frames[0] || {
    matrix: Array.from({ length: 8 }, () => Array(cols).fill(0)),
  };

  return (
    <div
      className={`relative bg-white rounded-3xl p-4 border-2 transition-all flex flex-col justify-between gap-3 shadow-xs ${
        isFlagged && isAdminMode
          ? 'border-red-400 bg-red-50/20'
          : 'border-[#E6DFD5] hover:border-[#0088FF]/50'
      }`}
    >
      {/* Moderation Flag Badge for Admin */}
      {isFlagged && isAdminMode && (
        <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 border border-red-300 text-red-700 text-[10px] font-bold z-10">
          <AlertTriangle className="w-3 h-3 text-red-600" />
          <span>Reported (Hidden from Public)</span>
        </div>
      )}

      {/* Mini 13x8 Matrix preview */}
      <div className="w-full aspect-[13/8] bg-[#071317] rounded-2xl p-2.5 border border-[#163842] shadow-inner flex items-center justify-center">
        <div
          className="w-full h-full gap-[1.5px]"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          }}
        >
          {currentFrame.matrix.map((row, rI) =>
            row.map((val, cI) => (
              <div
                key={`${rI}-${cI}`}
                className={`rounded-xs transition-colors duration-75 ${
                  val === 1
                    ? 'bg-[#0088FF] shadow-[0_0_3px_#0088FF]'
                    : 'bg-[#121E23]'
                }`}
              />
            ))
          )}
        </div>
      </div>

      {/* Card Info */}
      <div>
        <div className="flex items-center justify-between text-[11px] text-[#8C8275] mb-0.5">
          <span className="font-semibold text-[#0066CC]">{creation.category}</span>
          <span>{frames.length} frame(s)</span>
        </div>
        <h4 className="text-sm font-bold text-[#2D2926] truncate">
          {creation.title}
        </h4>
        <span className="text-xs text-[#6C6358]">by @{creation.author}</span>
      </div>

      {/* Action Buttons */}
      <div className="pt-2 border-t border-[#F0EBE1] flex items-center justify-between gap-2">
        <button
          onClick={onLoad}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl font-bold text-xs bg-[#FAF6F0] hover:bg-[#0088FF] text-[#2D2926] hover:text-white border border-[#E6DFD5] transition-all cursor-pointer shadow-2xs"
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>Load</span>
        </button>

        {isAdminMode ? (
          <div className="flex items-center gap-1.5">
            {isFlagged && (
              <button
                onClick={onDismissReport}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-green-100 hover:bg-green-200 text-green-800 border border-green-300 text-[11px] font-bold transition-colors cursor-pointer"
                title="Unhide and restore this design (False report)"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Unhide</span>
              </button>
            )}
            <button
              onClick={onDelete}
              className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-colors cursor-pointer"
              title="Delete permanently"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={onReport}
            className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
            title="Report inappropriate content (will auto-hide)"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
