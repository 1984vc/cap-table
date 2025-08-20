import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FaClock, FaLock, FaLockOpen, FaTrash, FaMagnifyingGlass } from "react-icons/fa6";
import { 
  getHistory, 
  removeFromHistory, 
  clearHistory, 
  formatRelativeTime, 
  formatFullDateTime,
  type HistoryEntry 
} from "@/services/historyService";

interface HistoryProps {
  currentObjectId?: string;
}

const History: React.FC<HistoryProps> = ({ currentObjectId }) => {
  const [showModal, setShowModal] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<HistoryEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Load history when modal opens
  useEffect(() => {
    if (showModal) {
      const loadedHistory = getHistory();
      setHistory(loadedHistory);
      setFilteredHistory(loadedHistory);
      setSearchTerm("");
      setShowClearConfirm(false);
    }
  }, [showModal]);

  // Filter history based on search term
  useEffect(() => {
    if (searchTerm) {
      const filtered = history.filter(entry => 
        entry.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredHistory(filtered);
    } else {
      setFilteredHistory(history);
    }
  }, [searchTerm, history]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showModal) {
        setShowModal(false);
      }
    };

    if (showModal) {
      document.addEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'unset';
    };
  }, [showModal]);

  const handleNavigate = (entry: HistoryEntry) => {
    // Navigate to the worksheet
    if (entry.editKey) {
      window.location.hash = `${entry.objectId}-${entry.editKey}`;
    } else {
      window.location.hash = entry.objectId;
    }
    setShowModal(false);
  };

  const handleRemove = (objectId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation
    removeFromHistory(objectId);
    const updatedHistory = history.filter(entry => entry.objectId !== objectId);
    setHistory(updatedHistory);
  };

  const handleClearHistory = () => {
    clearHistory();
    setHistory([]);
    setShowClearConfirm(false);
  };

  return (
    <div>
      <Button
        className="w-28 bg-gray-500 hover:bg-gray-600 text-white dark:text-white cursor-pointer"
        onClick={() => setShowModal(true)}
      >
        <span>
          History
          <FaClock className="inline ml-2" width={20} />
        </span>
      </Button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
          <div 
            className="fixed inset-0 bg-gray-500 opacity-75 transition-opacity"
            onClick={() => setShowModal(false)}
          ></div>

          <div className="relative z-10 bg-white dark:bg-gray-900 text-left overflow-hidden shadow-xl transform transition-all sm:max-w-3xl sm:w-full mx-4 rounded-lg">
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl leading-6 font-medium text-gray-900 dark:text-gray-100">
                  Worksheet History
                </h3>
                {history.length > 0 && (
                  <div className="flex items-center gap-2">
                    {!showClearConfirm ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowClearConfirm(true)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Clear All
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-red-600">Are you sure?</span>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleClearHistory}
                          className="text-red-600 hover:text-red-700"
                        >
                          Yes, Clear
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setShowClearConfirm(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {history.length === 0 ? (
                <div className="text-center py-12">
                  <FaClock className="mx-auto text-gray-400 dark:text-gray-600 mb-4" size={48} />
                  <p className="text-gray-600 dark:text-gray-400">
                    No worksheets in history yet
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                    Your recently accessed worksheets will appear here
                  </p>
                </div>
              ) : (
                <>
                  {/* Search Bar */}
                  <div className="mb-4 relative">
                    <FaMagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Search worksheets..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {/* History List */}
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {filteredHistory.length === 0 ? (
                      <p className="text-center py-8 text-gray-500 dark:text-gray-400">
                        No worksheets match your search
                      </p>
                    ) : (
                      filteredHistory.map((entry) => (
                        <div
                          key={entry.objectId}
                          onClick={() => handleNavigate(entry)}
                          className={`
                            p-4 rounded-lg border cursor-pointer transition-all
                            ${entry.objectId === currentObjectId 
                              ? 'border-nt84orange bg-orange-50 dark:bg-orange-900/20' 
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                            }
                          `}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                {entry.editKey ? (
                                  <FaLockOpen className="text-green-600 dark:text-green-400" size={14} />
                                ) : (
                                  <FaLock className="text-blue-600 dark:text-blue-400" size={14} />
                                )}
                                <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                                  {entry.name}
                                </h4>
                                {entry.objectId === currentObjectId && (
                                  <span className="text-xs bg-nt84orange text-white px-2 py-0.5 rounded">
                                    Current
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                                <span title={formatFullDateTime(entry.lastAccessed)}>
                                  {formatRelativeTime(entry.lastAccessed)}
                                </span>
                                <span className="text-xs">
                                  {entry.editKey ? 'Full Access' : 'Read Only'}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={(e) => handleRemove(entry.objectId, e)}
                              className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                              title="Remove from history"
                            >
                              <FaTrash size={14} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Summary */}
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">
                    Showing {filteredHistory.length} of {history.length} worksheet{history.length !== 1 ? 's' : ''}
                  </div>
                </>
              )}
            </div>
            
            <div className="bg-gray-200 dark:bg-gray-800 px-6 py-4 flex justify-end">
              <Button
                type="button"
                variant="secondary"
                className="px-6"
                onClick={() => setShowModal(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default History;
