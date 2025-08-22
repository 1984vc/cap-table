import { copyTextToClipboard } from "@/utils/clipboard";
import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { FaBookmark, FaRegBookmark, FaLock, FaLockOpen, FaCopy, FaClone } from "react-icons/fa6";

interface ShareProps {
  readOnlyUrl: string;
  fullAccessUrl?: string;
  hasEditAccess: boolean;
  onClone?: () => void;
  isCloning?: boolean;
}

const Share: React.FC<ShareProps> = ({ 
  readOnlyUrl, 
  fullAccessUrl, 
  hasEditAccess, 
  onClone,
  isCloning = false 
}) => {
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const readOnlyUrlRef = useRef<string>(readOnlyUrl);
  const fullAccessUrlRef = useRef<string>(fullAccessUrl || "");
  const isUpdatedRef = useRef<boolean>(false);

  if (readOnlyUrlRef.current !== readOnlyUrl || fullAccessUrlRef.current !== (fullAccessUrl || "")) {
    readOnlyUrlRef.current = readOnlyUrl;
    fullAccessUrlRef.current = fullAccessUrl || "";
    isUpdatedRef.current = true;
  }

  const onClickCopy = (url: string) => {
    setTimeout(() => {
      setCopiedUrl(null);
    }, 2500);
    copyTextToClipboard(url);
    setCopiedUrl(url);
    isUpdatedRef.current = false;
  };

  const buttonText = () => {
    if (isUpdatedRef.current) {
      return (
        <span>
          Share
          <span className="inline">
            <FaBookmark className="inline ml-2" width={20} />
          </span>
        </span>
      );
    }
    return (
      <span>
        Share
        <span className="inline">
          <FaRegBookmark className="inline ml-2" width={20} />
        </span>
      </span>
    );
  };

  const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    event.target.select();
  };

  const handleClone = () => {
    if (onClone) {
      onClone();
      setShowModal(false);
    }
  };

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showModal) {
        setShowModal(false);
      }
    };

    if (showModal) {
      document.addEventListener('keydown', handleEscKey);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'unset';
    };
  }, [showModal]);

  return (
    <div className="">
      <Button
        className={`w-28 dark:text-white cursor-pointer ${
          isUpdatedRef.current
            ? "bg-nt84orange hover:bg-nt84orangedarker focus:ring-nt84orangedarker"
            : "bg-gray-400 hover:bg-gray-500 focus:ring-gray-300"
        }`}
        onClick={() => setShowModal(true)}
      >
        {buttonText()}
      </Button>
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
          <div 
            className="fixed inset-0 bg-gray-500 opacity-75 transition-opacity"
            onClick={() => setShowModal(false)}
          ></div>

          <div className="relative z-10 bg-white dark:bg-gray-900 text-left overflow-hidden shadow-xl transform transition-all sm:max-w-2xl sm:w-full mx-4 rounded-lg">
            <div className="px-6 pt-6 pb-4">
              <h3 className="text-xl leading-6 font-medium text-gray-900 dark:text-gray-100 mb-6">
                Share this worksheet
              </h3>

              {hasEditAccess ? (
                // Read-Write Mode: Show both options
                <div className="space-y-6">
                  {/* Full Access Section */}
                  <div className="border border-green-200 dark:border-green-800 rounded-lg p-4 bg-green-50 dark:bg-green-900/20">
                    <div className="flex items-center mb-3">
                      <FaLockOpen className="text-green-600 dark:text-green-400 mr-2" />
                      <h4 className="text-lg font-semibold text-green-800 dark:text-green-200">
                        Full Access
                      </h4>
                    </div>
                    <p className="text-sm text-green-700 dark:text-green-300 mb-3">
                      Recipients can view and edit this worksheet. Changes sync in real-time.
                    </p>
                    <div className="flex gap-2">
                      <input
                        className="flex-1 px-3 py-2 border border-green-300 dark:border-green-700 rounded focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        onFocus={handleFocus}
                        onChange={() => {}}
                        value={fullAccessUrl || ""}
                        readOnly
                      />
                      <Button
                        type="button"
                        className="bg-green-600 hover:bg-green-700 text-white px-4"
                        onClick={() => onClickCopy(fullAccessUrl || "")}
                      >
                        {copiedUrl === fullAccessUrl ? (
                          "Copied!"
                        ) : (
                          <>
                            <FaCopy className="mr-1" size={14} />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Read Only Section */}
                  <div className="border border-blue-200 dark:border-blue-800 rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
                    <div className="flex items-center mb-3">
                      <FaLock className="text-blue-600 dark:text-blue-400 mr-2" />
                      <h4 className="text-lg font-semibold text-blue-800 dark:text-blue-200">
                        Read Only
                      </h4>
                    </div>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                      Recipients can view the worksheet but cannot make changes. They can clone it to create their own editable copy.
                    </p>
                    <div className="flex gap-2">
                      <input
                        className="flex-1 px-3 py-2 border border-blue-300 dark:border-blue-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        onFocus={handleFocus}
                        onChange={() => {}}
                        value={readOnlyUrl}
                        readOnly
                      />
                      <Button
                        type="button"
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4"
                        onClick={() => onClickCopy(readOnlyUrl)}
                      >
                        {copiedUrl === readOnlyUrl ? (
                          "Copied!"
                        ) : (
                          <>
                            <FaCopy className="mr-1" size={14} />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                // Read-Only Mode: Show read-only URL and clone option
                <div className="space-y-6">
                  <div className="border border-blue-200 dark:border-blue-800 rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
                    <div className="flex items-center mb-3">
                      <FaLock className="text-blue-600 dark:text-blue-400 mr-2" />
                      <h4 className="text-lg font-semibold text-blue-800 dark:text-blue-200">
                        Read Only Access
                      </h4>
                    </div>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                      You're viewing this worksheet in read-only mode. You can share this link or clone it to create your own editable copy.
                    </p>
                    <div className="flex gap-2 mb-4">
                      <input
                        className="flex-1 px-3 py-2 border border-blue-300 dark:border-blue-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        onFocus={handleFocus}
                        onChange={() => {}}
                        value={readOnlyUrl}
                        readOnly
                      />
                      <Button
                        type="button"
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4"
                        onClick={() => onClickCopy(readOnlyUrl)}
                      >
                        {copiedUrl === readOnlyUrl ? (
                          "Copied!"
                        ) : (
                          <>
                            <FaCopy className="mr-1" size={14} />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                    
                    {/* Clone Button */}
                    <div className="border-t border-blue-200 dark:border-blue-700 pt-4">
                      <Button
                        type="button"
                        className="w-full bg-nt84orange hover:bg-nt84orangedarker text-white font-medium py-3"
                        onClick={handleClone}
                        disabled={isCloning}
                      >
                        {isCloning ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Creating your copy...
                          </>
                        ) : (
                          <>
                            <FaClone className="mr-2" size={16} />
                            Clone to Edit
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 text-center">
                        This will create a new worksheet that you can edit
                      </p>
                    </div>
                  </div>
                </div>
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

export default Share;
