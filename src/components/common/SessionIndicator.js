import React, { useState } from 'react';
import { ComputerDesktopIcon, ChevronDownIcon, ClockIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '../../contexts/LanguageContext';
import { useSessionTracker } from '../../hooks/useSessionTracker';

const SessionIndicator = () => {
  const { t } = useLanguage();
  const { activeSessions, currentSessionId } = useSessionTracker();
  const [isExpanded, setIsExpanded] = useState(false);

  // Show debug info for testing - remove this in production
  const showDebug = false;
  
  // Don't show if only one session (current one) - unless debugging
  if (activeSessions.length <= 1 && !showDebug) {
    return null;
  }

  const formatTimeAgo = (seconds) => {
    if (seconds < 60) {
      return `${seconds}s ago`;
    } else if (seconds < 3600) {
      return `${Math.floor(seconds / 60)}m ago`;
    } else {
      return `${Math.floor(seconds / 3600)}h ago`;
    }
  };

  const getBrowserName = (userAgent) => {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Browser';
  };

  const getSessionDisplayName = (session) => {
    const browser = getBrowserName(session.userAgent);
    const windowName = session.windowName && session.windowName !== 'Main Window' 
      ? session.windowName 
      : 'Window';
    return `${browser} - ${windowName}`;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex items-center space-x-2 px-3 py-1 border rounded-lg text-sm transition-colors duration-200 ${
          activeSessions.length > 1 
            ? 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700'
            : 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-600'
        }`}
        title={`${activeSessions.length} active sessions${showDebug ? ' (Debug Mode)' : ''}`}
      >
        <ComputerDesktopIcon className="h-4 w-4" />
        <span className="font-medium">{activeSessions.length}</span>
        <span className="hidden sm:inline">sessions</span>
        {showDebug && <span className="text-xs bg-yellow-200 px-1 rounded">DEBUG</span>}
        <ChevronDownIcon className={`h-3 w-3 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      {isExpanded && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
              <ComputerDesktopIcon className="h-4 w-4 mr-2" />
              Active Sessions ({activeSessions.length})
            </h3>
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {activeSessions.map((session) => (
                <div
                  key={session.id}
                  className={`p-3 rounded-lg border ${
                    session.isCurrentSession
                      ? 'bg-green-50 border-green-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <ComputerDesktopIcon className="h-4 w-4 text-gray-500 flex-shrink-0" />
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {getSessionDisplayName(session)}
                        </span>
                        {session.isCurrentSession && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            Current
                          </span>
                        )}
                      </div>
                      
                      <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <ClockIcon className="h-3 w-3" />
                          <span>
                            {session.timeAgo === 0 ? 'Active now' : formatTimeAgo(session.timeAgo)}
                          </span>
                        </div>
                      </div>
                      
                      {session.url && (
                        <div className="mt-1 text-xs text-gray-400 truncate">
                          {new URL(session.url).pathname}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Sessions are tracked per browser window/tab. Each window maintains its own session identifier.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionIndicator;