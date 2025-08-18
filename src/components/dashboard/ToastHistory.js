import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

// Global toast history state
let globalToastHistory = [];
let historyUpdateCallbacks = [];

// Override toast methods at module level (before any component mounts)
const originalSuccess = toast.success;
const originalError = toast.error;
const originalInfo = toast.info;
const originalWarning = toast.warning;

const addToGlobalHistory = (message, type) => {
  let displayMessage = '';
  let summaryMessage = '';
  let collapsedTitle = '';
  
  // Handle different message types
  if (typeof message === 'string') {
    displayMessage = message;
    summaryMessage = message.length > 50 ? message.substring(0, 50) + '...' : message;
    collapsedTitle = message.length > 30 ? message.substring(0, 30) + '...' : message;
  } else if (React.isValidElement(message)) {
    // Extract text from React elements
    displayMessage = extractTextFromReactElement(message);
    summaryMessage = displayMessage.length > 50 ? displayMessage.substring(0, 50) + '...' : displayMessage;
    collapsedTitle = displayMessage.length > 30 ? displayMessage.substring(0, 30) + '...' : displayMessage;
  } else if (message && typeof message === 'object') {
    displayMessage = JSON.stringify(message);
    summaryMessage = 'Object message';
    collapsedTitle = 'Object message';
  } else {
    displayMessage = 'Toast notification';
    summaryMessage = 'Toast notification';
    collapsedTitle = 'Toast notification';
  }
  
  // Ensure collapsedTitle is never empty - use displayMessage as fallback
  if (!collapsedTitle || collapsedTitle.trim() === '') {
    collapsedTitle = displayMessage.length > 30 ? displayMessage.substring(0, 30) + '...' : displayMessage;
  }
  
  const historyItem = {
    id: Date.now() + Math.random(),
    message: displayMessage,
    summaryMessage: summaryMessage,
    collapsedTitle: collapsedTitle,
    type,
    timestamp: new Date().toLocaleTimeString(),
    originalMessage: message // Store the original message for debugging
  };
  
  globalToastHistory = [historyItem, ...globalToastHistory].slice(0, 50);
  
  // Notify all components listening for updates
  historyUpdateCallbacks.forEach(callback => callback([...globalToastHistory]));
};

// Improved helper function to extract text from React elements
const extractTextFromReactElement = (element) => {
  if (typeof element === 'string') return element;
  if (typeof element === 'number') return element.toString();
  if (!element) return '';
  
  if (React.isValidElement(element)) {
    const { props } = element;
    
    if (props && props.children) {
      if (Array.isArray(props.children)) {
        // For arrays, get text from all children and join
        const texts = props.children
          .map(child => extractTextFromReactElement(child))
          .filter(text => text.trim() !== '');
        
        // If this is the root div with multiple children, prioritize the first child (title)
        if (texts.length > 1 && element.type === 'div') {
          // Return just the first meaningful text (which should be the title)
          return texts[0];
        }
        
        return texts.join(' ');
      } else {
        return extractTextFromReactElement(props.children);
      }
    }
    
    // Handle specific props that might contain text
    if (props && props.title) {
      return props.title;
    }
    
    // Handle text nodes
    if (element.type === 'div' || element.type === 'span' || element.type === 'p') {
      if (props && props.children) {
        return extractTextFromReactElement(props.children);
      }
    }
  }
  
  // If it's a text node or primitive
  if (typeof element === 'string' || typeof element === 'number') {
    return element.toString();
  }
  
  return '';
};

// Override toast methods at module level
toast.success = (message, options) => {
  addToGlobalHistory(message, 'success');
  return originalSuccess(message, options);
};

toast.error = (message, options) => {
  addToGlobalHistory(message, 'error');
  return originalError(message, options);
};

toast.info = (message, options) => {
  addToGlobalHistory(message, 'info');
  return originalInfo(message, options);
};

toast.warning = (message, options) => {
  addToGlobalHistory(message, 'warning');
  return originalWarning(message, options);
};

const ToastHistory = () => {
  const [toastHistory, setToastHistory] = useState(globalToastHistory);
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedItems, setExpandedItems] = useState(new Set());

  useEffect(() => {
    // Register this component to receive history updates
    const updateCallback = (newHistory) => {
      setToastHistory(newHistory);
    };
    
    historyUpdateCallbacks.push(updateCallback);
    
    // Initialize with current history
    setToastHistory([...globalToastHistory]);
    
    return () => {
      // Remove this component's callback when unmounting
      const index = historyUpdateCallbacks.indexOf(updateCallback);
      if (index > -1) {
        historyUpdateCallbacks.splice(index, 1);
      }
    };
  }, []);

  const clearHistory = () => {
    globalToastHistory = [];
    setExpandedItems(new Set());
    historyUpdateCallbacks.forEach(callback => callback([]));
  };

  const toggleItemExpansion = (itemId) => {
    const newExpandedItems = new Set(expandedItems);
    if (newExpandedItems.has(itemId)) {
      newExpandedItems.delete(itemId);
    } else {
      newExpandedItems.add(itemId);
    }
    setExpandedItems(newExpandedItems);
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '📝';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'warning': return 'text-yellow-600';
      case 'info': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  // Function to render the original message if it's a React element
  const renderMessage = (item, isExpanded) => {
    if (React.isValidElement(item.originalMessage) && isExpanded) {
      // Clone the original React element but with smaller styling
      return (
        <div className="text-sm text-gray-700 break-words mt-2">
          {React.cloneElement(item.originalMessage, {
            style: { fontSize: '0.875rem', lineHeight: '1.25rem' }
          })}
        </div>
      );
    }
    
    // Show summary or full message based on expansion state
    const messageToShow = isExpanded ? item.message : item.summaryMessage;
    return (
      <div className="text-sm text-gray-700 break-words">
        {messageToShow || 'Toast notification'}
      </div>
    );
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="bg-blue-500 text-white px-3 py-2 rounded-lg shadow-lg hover:bg-blue-600 transition-colors"
      >
        📋 History ({toastHistory.length})
      </button>
      
      {isExpanded && (
        <div className="absolute bottom-12 right-0 w-96 max-h-96 bg-white border rounded-lg shadow-xl overflow-hidden">
          <div className="bg-gray-100 px-3 py-2 border-b flex justify-between items-center">
            <span className="font-semibold">Toast History</span>
            <button
              onClick={clearHistory}
              className="text-red-500 hover:text-red-700 text-sm"
            >
              Clear
            </button>
          </div>
          
          <div className="overflow-y-auto max-h-80">
            {toastHistory.length === 0 ? (
              <div className="p-4 text-gray-500 text-center">
                No messages yet
              </div>
            ) : (
              toastHistory.map((item) => {
                const isItemExpanded = expandedItems.has(item.id);
                const hasMoreContent = item.message.length > 50 || React.isValidElement(item.originalMessage);
                
                return (
                  <div key={item.id} className="p-3 border-b border-gray-100 hover:bg-gray-50">
                    <div className="flex items-start gap-2">
                      <span className="text-lg flex-shrink-0">{getTypeIcon(item.type)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${getTypeColor(item.type)}`}>
                              {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                            </span>
                            <span className="text-sm font-medium text-gray-800">
                              {item.collapsedTitle || 'Message'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-xs text-gray-500">
                              {item.timestamp}
                            </div>
                            {hasMoreContent && (
                              <button
                                onClick={() => toggleItemExpansion(item.id)}
                                className="text-blue-500 hover:text-blue-700 transition-colors"
                              >
                                <ChevronDownIcon className={`h-4 w-4 transition-transform duration-200 ${isItemExpanded ? 'rotate-180' : ''}`} />
                              </button>
                            )}
                          </div>
                        </div>
                        {isItemExpanded && (
                          <div className="mt-2">
                            {renderMessage(item, isItemExpanded)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ToastHistory;