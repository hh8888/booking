import React from 'react';
import { supabase } from '../supabaseClient';
import { toast } from 'react-toastify';
import { BOOKING_STATUS } from '../constants/bookingConstants';
import LocationService from '../services/LocationService';

// Global variables to store alarm settings and last trigger time
let alarmSettings = {
  enableBanner: false,
  enableFlashing: false,
  enableBeepSound: false,
  alarmInterval: 60
};

let lastAlarmTime = 0;

// Queue for unconfirmed bookings
let unconfirmedBookingsQueue = [];
let currentToastId = null;

// Audio context management
let audioContext = null;
let audioEnabled = false;

// Initialize audio context on user interaction
const initializeAudioContext = async () => {
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      console.log('AudioContext created');
    } catch (error) {
      console.error('Failed to create AudioContext:', error);
      return false;
    }
  }

  if (audioContext.state === 'suspended') {
    try {
      await audioContext.resume();
      console.log('AudioContext resumed successfully');
      audioEnabled = true;
      return true;
    } catch (error) {
      console.error('Failed to resume AudioContext:', error);
      return false;
    }
  }

  audioEnabled = true;
  return true;
};

// Enable audio on user interaction (call this from UI components)
export const enableAudio = async () => {
  const success = await initializeAudioContext();
  if (success) {
    console.log('✅ Audio enabled successfully');
    // Show a success toast
    toast.success('🔊 Audio alarms enabled! You will now hear sound notifications.', {
      position: 'top-right',
      autoClose: 3000
    });
  } else {
    console.warn('❌ Failed to enable audio');
    toast.warning('⚠️ Could not enable audio. Please check your browser settings.', {
      position: 'top-right',
      autoClose: 5000
    });
  }
  return success;
};

// Check if audio is enabled
export const isAudioEnabled = () => {
  return audioEnabled && audioContext && audioContext.state === 'running';
};

// Test audio function for debugging
export const testAudio = async () => {
  console.log('🧪 Testing audio system...');
  console.log('Audio enabled:', audioEnabled);
  console.log('Audio context:', audioContext);
  console.log('Audio context state:', audioContext?.state);
  
  if (!isAudioEnabled()) {
    console.log('🔧 Audio not enabled, attempting to enable...');
    const success = await enableAudio();
    if (!success) {
      console.error('❌ Failed to enable audio for testing');
      return false;
    }
  }
  
  try {
    console.log('🎵 Playing test beep...');
    
    // Create a more audible test sound
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Configure test sound (higher frequency and longer duration)
    oscillator.frequency.setValueAtTime(1000, audioContext.currentTime); // 1000Hz
    oscillator.type = 'sine';
    
    // Set higher volume for test
    gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1.0);
    
    // Play longer test beep
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 1.0);
    
    console.log('✅ Test audio played successfully');
    
    // Show success message
    toast.success('🎵 Test audio played! If you didn\'t hear it, check your device volume and browser audio settings.', {
      position: 'top-right',
      autoClose: 5000
    });
    
    return true;
  } catch (error) {
    console.error('❌ Test audio failed:', error);
    toast.error('❌ Test audio failed. Check console for details.', {
      position: 'top-right',
      autoClose: 5000
    });
    return false;
  }
};

// Load alarm settings from database
export const loadAlarmSettings = async () => {
  try {
    console.log('Loading alarm settings from database...');
    const { data, error } = await supabase
      .from('settings')
      .select('key, value')
      .eq('category', 'booking_alarm');

    if (error) {
      console.error('Error loading alarm settings:', error);
      return;
    }

    console.log('Raw alarm settings from database:', data);

    // Update alarm settings with database values
    data.forEach(setting => {
      if (setting.key === 'enableBanner') {
        alarmSettings.enableBanner = setting.value === 'true';
      } else if (setting.key === 'enableFlashing') {
        alarmSettings.enableFlashing = setting.value === 'true';
      } else if (setting.key === 'enableBeepSound') {
        alarmSettings.enableBeepSound = setting.value === 'true';
      } else if (setting.key === 'alarmInterval') {
        alarmSettings.alarmInterval = parseInt(setting.value) || 60;
      }
    });

    console.log('Processed alarm settings:', alarmSettings);
  } catch (error) {
    console.error('Error loading alarm settings:', error);
  }
};

// Check if enough time has passed since last alarm
const shouldTriggerAlarm = () => {
  const now = Date.now();
  const intervalMs = alarmSettings.alarmInterval * 1000;
  
  console.log('Checking alarm interval:', {
    now,
    lastAlarmTime,
    intervalMs,
    timeSinceLastAlarm: now - lastAlarmTime,
    shouldTrigger: now - lastAlarmTime >= intervalMs
  });
  
  if (now - lastAlarmTime >= intervalMs) {
    lastAlarmTime = now;
    return true;
  }
  
  return false;
};

// Format booking date and time for display
const formatBookingDateTime = (booking) => {
  if (!booking.start_time) return '';
  
  const startTime = new Date(booking.start_time);
  const endTime = booking.end_time ? new Date(booking.end_time) : null;
  
  // Use Australian date format (DD/MM/YYYY) and time format
  const dateStr = startTime.toLocaleDateString('en-AU');
  const startTimeStr = startTime.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
  const endTimeStr = endTime ? endTime.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }) : '';
  
  return endTimeStr ? `${dateStr} ${startTimeStr}-${endTimeStr}` : `${dateStr} ${startTimeStr}`;
};

// Dismiss all unconfirmed booking alarms
const dismissAllUnconfirmedBookings = () => {
  console.log('Dismissing all unconfirmed booking alarms');
  // Clear the queue
  unconfirmedBookingsQueue = [];
  // Dismiss current toast if exists
  if (currentToastId) {
    toast.dismiss(currentToastId);
    currentToastId = null;
  }
  console.log('All unconfirmed booking alarms dismissed');
};

// Show next unconfirmed booking from queue
const showNextUnconfirmedBooking = () => {
  if (unconfirmedBookingsQueue.length > 0) {
    const nextBooking = unconfirmedBookingsQueue.shift(); // Remove first booking from queue
    console.log(`Showing next unconfirmed booking from queue. Remaining: ${unconfirmedBookingsQueue.length}`);
    showBannerNotification(nextBooking, true);
  } else {
    console.log('No more unconfirmed bookings in queue');
    currentToastId = null;
  }
};

// Custom banner component for unconfirmed bookings with Dismiss All button
const UnconfirmedBookingBanner = ({ booking, queueCount, onDismissAll }) => {
  const dateTime = formatBookingDateTime(booking);
  const customerName = booking.customer_name || booking.name || booking.client_name || booking.customer || 'Unknown Customer';
  const serviceName = booking.service_name || 'Service';

  return React.createElement('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    }
  }, [
    React.createElement('div', {
      key: 'message',
      style: { lineHeight: '1.4' }
    }, [
      React.createElement('div', { key: 'title', style: { fontWeight: 'bold' } }, `Unconfirmed booking: ${customerName} - ${serviceName}`),
      React.createElement('div', { key: 'datetime' }, `📅 ${dateTime}`),
      queueCount > 0 && React.createElement('div', { 
        key: 'queue', 
        style: { fontSize: '14px', opacity: '0.9', marginTop: '5px' } 
      }, `${queueCount} more unconfirmed booking${queueCount > 1 ? 's' : ''} pending`)
    ]),
    queueCount > 0 && React.createElement('div', {
      key: 'buttons',
      style: {
        display: 'flex',
        gap: '8px',
        marginTop: '5px'
      }
    }, [
      React.createElement('button', {
        key: 'dismiss-all',
        onClick: onDismissAll,
        style: {
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          cursor: 'pointer',
          fontWeight: 'bold'
        },
        onMouseOver: (e) => {
          e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
        },
        onMouseOut: (e) => {
          e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
        }
      }, 'Dismiss All')
    ])
  ]);
};

// Show banner notification
const showBannerNotification = (booking, isUnconfirmed = false) => {
  console.log('Showing banner notification for booking:', booking);
  console.log('Available customer fields:', {
    customer_name: booking.customer_name,
    name: booking.name,
    customer: booking.customer,
    client_name: booking.client_name
  });
  
  const dateTime = formatBookingDateTime(booking);
  // Try multiple possible customer name fields
  const customerName = booking.customer_name || booking.name || booking.client_name || booking.customer || 'Unknown Customer';
  const serviceName = booking.service_name || 'Service';
  
  let content;
  
  if (isUnconfirmed) {
    // Use custom component for unconfirmed bookings with Dismiss All button
    content = React.createElement(UnconfirmedBookingBanner, {
      booking,
      queueCount: unconfirmedBookingsQueue.length,
      onDismissAll: dismissAllUnconfirmedBookings
    });
  } else {
    // Use simple message for regular bookings
    content = `New booking created: ${customerName} - ${serviceName}\n📅 ${dateTime}`;
  }
  
  const toastOptions = {
    position: "top-center",
    autoClose: false, // Stay until manually dismissed
    hideProgressBar: true, // Hide progress bar since it won't auto-close
    closeOnClick: false, // Don't close when clicking the message area
    pauseOnHover: true,
    draggable: true,
    className: 'booking-alarm-banner',
    style: {
      backgroundColor: isUnconfirmed ? '#f59e0b' : '#ff6b35', // Different color for unconfirmed
      color: 'white',
      fontSize: '16px',
      fontWeight: 'bold',
      whiteSpace: 'pre-line' // Allow line breaks in message
    }
  };

  // Add onClose callback for unconfirmed bookings to show next in queue
  if (isUnconfirmed) {
    toastOptions.onClose = () => {
      console.log('Unconfirmed booking banner dismissed, checking for next booking...');
      currentToastId = null;
      // Show next booking after a short delay to avoid UI conflicts
      setTimeout(showNextUnconfirmedBooking, 500);
    };
  }

  currentToastId = toast.info(content, toastOptions);
};

// Trigger page flashing effect
const triggerPageFlashing = () => {
  console.log('Triggering page flashing effect');
  const flashOverlay = document.createElement('div');
  flashOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(255, 107, 53, 0.3);
    z-index: 9999;
    pointer-events: none;
    animation: flashAnimation 0.5s ease-in-out 3;
  `;

  // Add CSS animation if not already present
  if (!document.getElementById('flash-animation-style')) {
    const style = document.createElement('style');
    style.id = 'flash-animation-style';
    style.textContent = `
      @keyframes flashAnimation {
        0%, 100% { opacity: 0; }
        50% { opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(flashOverlay);

  // Remove overlay after animation
  setTimeout(() => {
    if (flashOverlay.parentNode) {
      flashOverlay.parentNode.removeChild(flashOverlay);
    }
  }, 1500);
};

// Play beep sound
const playBeepSound = async () => {
  try {
    console.log('🔊 Playing beep sound (audio already verified as enabled)');
    console.log('🔍 Audio debug info:', {
      audioEnabled,
      audioContext: !!audioContext,
      audioContextState: audioContext?.state,
      isAudioEnabled: isAudioEnabled()
    });
    
    // Audio should already be enabled at this point, but double-check for safety
    if (!isAudioEnabled()) {
      console.error('❌ Audio not enabled - this should not happen at this point');
      showVisualBeepIndicator();
      return;
    }
    
    // Create oscillator for beep sound
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Configure beep sound with more audible settings
    oscillator.frequency.setValueAtTime(1000, audioContext.currentTime); // Higher frequency (1000Hz)
    oscillator.type = 'square'; // Square wave is more noticeable than sine
    
    // Set higher volume and longer duration
    gainNode.gain.setValueAtTime(0.5, audioContext.currentTime); // Higher volume
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8); // Longer duration
    
    // Play the beep
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.8);
    
    console.log('✅ Beep sound played successfully');
    console.log('🔊 Sound details:', {
      frequency: '1000Hz',
      type: 'square',
      volume: '0.5',
      duration: '0.8s'
    });
  } catch (error) {
    console.error('❌ Error playing beep sound:', error);
    console.warn('🔄 Falling back to visual beep indicator');
    showVisualBeepIndicator();
  }
};

// Visual fallback when audio is blocked
const showVisualBeepIndicator = () => {
  console.log('Showing visual beep indicator');
  
  // Create a temporary visual indicator
  const indicator = document.createElement('div');
  indicator.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #ff4444;
    color: white;
    padding: 10px 20px;
    border-radius: 5px;
    font-weight: bold;
    z-index: 10000;
    animation: pulse 0.5s ease-in-out 3;
  `;
  indicator.textContent = '🔊 BEEP!';
  
  // Add pulse animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.1); opacity: 0.8; }
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(indicator);
  
  // Remove after 2 seconds
  setTimeout(() => {
    if (indicator.parentNode) {
      indicator.parentNode.removeChild(indicator);
    }
    if (style.parentNode) {
      style.parentNode.removeChild(style);
    }
  }, 2000);
};

// Check for unconfirmed bookings and trigger alarms
export const checkUnconfirmedBookings = async () => {
  try {
    console.log('=== CHECKING FOR UNCONFIRMED BOOKINGS ===');
    console.log('Current alarm settings:', alarmSettings);
    
    // Check if any alarm is enabled
    if (!alarmSettings.enableBanner && !alarmSettings.enableFlashing && !alarmSettings.enableBeepSound) {
      console.log('❌ No alarms enabled, skipping unconfirmed booking check');
      console.log('To enable alarms, go to Settings > Booking Alarm Settings');
      return;
    }

    console.log('✅ At least one alarm is enabled, proceeding with check...');

    // Get current location for filtering
    const locationService = LocationService.getInstance();
    const currentLocationId = locationService.getSelectedLocationId();
    
    console.log('📍 Current location ID for alarm filtering:', currentLocationId);

    // Build query with location filter
    let query = supabase
      .from('bookings')
      .select(`
        *,
        services(name),
        customer:users!customer_id(full_name)
      `)
      .eq('status', BOOKING_STATUS.PENDING)
      .gte('start_time', new Date().toISOString()) // Only future bookings
      .order('start_time', { ascending: true });

    // Add location filter if a location is selected
    if (currentLocationId) {
      query = query.eq('location', currentLocationId);
      console.log('🔍 Filtering unconfirmed bookings by location:', currentLocationId);
    } else {
      console.log('⚠️ No location selected, showing unconfirmed bookings from all locations');
    }

    const { data: unconfirmedBookings, error } = await query;

    if (error) {
      console.error('❌ Error fetching unconfirmed bookings:', error);
      return;
    }

    console.log(`📊 Database query completed. Found ${unconfirmedBookings?.length || 0} unconfirmed bookings:`, unconfirmedBookings);

    if (unconfirmedBookings && unconfirmedBookings.length > 0) {
      console.log(`🚨 Found ${unconfirmedBookings.length} unconfirmed booking(s)`);
      
      // Check if audio is enabled by user action - required for all alarms
      if (!isAudioEnabled()) {
        console.warn('🚫 Audio not enabled by user action. Skipping unconfirmed booking alarms.');
        console.log('💡 Unconfirmed bookings found but alarms disabled until user enables audio');
        
        // Show a one-time notification about unconfirmed bookings without triggering alarms
        toast.info(
          <div>
            <div>📋 {unconfirmedBookings.length} unconfirmed booking(s) found</div>
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
              Enable audio to receive alarm notifications
            </div>
            <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
              <button 
                onClick={enableAudio}
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Enable Audio
              </button>
            </div>
          </div>,
          {
            position: 'top-right',
            autoClose: 8000,
            closeOnClick: false
          }
        );
        return;
      }

      console.log('✅ Audio enabled by user - proceeding with unconfirmed booking alarms');
      
      // Format all booking data for display
      const formattedBookings = unconfirmedBookings.map(booking => ({
        ...booking,
        customer_name: booking.customer?.full_name || 'Unknown Customer',
        service_name: booking.services?.name || booking.service_name,
        staff_name: booking.staff_name // Use direct field since users relationship is ambiguous
      }));

      // If there's already a banner showing, add new bookings to queue
      if (currentToastId && unconfirmedBookingsQueue.length === 0) {
        // First booking is already showing, add the rest to queue
        unconfirmedBookingsQueue = formattedBookings.slice(1);
        console.log(`📋 Added ${unconfirmedBookingsQueue.length} bookings to queue`);
      } else if (!currentToastId) {
        // No banner currently showing, show first booking and queue the rest
        const firstBooking = formattedBookings[0];
        unconfirmedBookingsQueue = formattedBookings.slice(1);
        
        console.log(`🚨 Triggering alarm for first unconfirmed booking. ${unconfirmedBookingsQueue.length} more in queue`);

        // Trigger enabled alarms for unconfirmed booking (bypass interval check for unconfirmed bookings)
        if (alarmSettings.enableBanner) {
          console.log('📢 Banner alarm enabled, showing unconfirmed booking notification');
          showBannerNotification(firstBooking, true);
        }

        if (alarmSettings.enableFlashing) {
          console.log('⚡ Flashing alarm enabled, triggering flash for unconfirmed booking');
          triggerPageFlashing();
        }

        if (alarmSettings.enableBeepSound) {
          console.log('🔊 Beep sound alarm enabled, playing sound for unconfirmed booking');
          playBeepSound();
        }
      } else {
        // Update queue with latest bookings
        unconfirmedBookingsQueue = formattedBookings;
        console.log(`📋 Updated queue with ${unconfirmedBookingsQueue.length} unconfirmed bookings`);
      }

      console.log('✅ Unconfirmed booking alarm system updated successfully');
    } else {
      console.log('✅ No unconfirmed bookings found - all bookings are confirmed');
      // Clear queue if no unconfirmed bookings
      unconfirmedBookingsQueue = [];
      currentToastId = null;
    }
  } catch (error) {
    console.error('❌ Error checking unconfirmed bookings:', error);
    console.error('Stack trace:', error.stack);
  }
};

// Main function to trigger booking alarm
export const triggerBookingAlarm = async (booking, isUnconfirmed = false) => {
  console.log('triggerBookingAlarm called with:', booking, 'isUnconfirmed:', isUnconfirmed);
  console.log('Current alarm settings:', alarmSettings);
  
  // Check if any alarm is enabled
  if (!alarmSettings.enableBanner && !alarmSettings.enableFlashing && !alarmSettings.enableBeepSound) {
    console.log('No alarms enabled, skipping');
    return;
  }

  // For new bookings (not unconfirmed), check if enough time has passed since last alarm
  if (!isUnconfirmed && !shouldTriggerAlarm()) {
    console.log('Not enough time passed since last alarm, skipping');
    return;
  }

  // Check if audio is enabled by user action - required for all alarms
  if (!isAudioEnabled()) {
    console.warn('🚫 Audio not enabled by user action. Showing notification to enable audio first.');
    
    // Show a toast notification requiring user to enable audio first
    toast.warning(
      <div>
        <div>🔊 Audio must be enabled to receive booking alarms</div>
        <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
          Click &quot;Enable Audio&quot; to activate all alarm notifications
        </div>
        <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
          <button 
            onClick={enableAudio}
            style={{
              padding: '6px 12px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold'
            }}
          >
            Enable Audio
          </button>
          <button 
            onClick={testAudio}
            style={{
              padding: '6px 12px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Test Audio
          </button>
        </div>
      </div>,
      {
        position: 'top-right',
        autoClose: 15000,
        closeOnClick: false
      }
    );
    
    // Show visual indicator as fallback
    showVisualBeepIndicator();
    return;
  }

  console.log('✅ Audio enabled by user - triggering booking alarm for:', booking);

  // Trigger enabled alarms
  if (alarmSettings.enableBanner) {
    console.log('Banner alarm enabled, showing notification');
    showBannerNotification(booking, isUnconfirmed);
  }

  if (alarmSettings.enableFlashing) {
    console.log('Flashing alarm enabled, triggering flash');
    triggerPageFlashing();
  }

  if (alarmSettings.enableBeepSound) {
    console.log('Beep sound alarm enabled, playing sound');
    playBeepSound();
  }
};

// Reload alarm settings (called when settings are updated)
export const reloadAlarmSettings = async () => {
  console.log('Reloading alarm settings...');
  await loadAlarmSettings();
};

// Get current alarm settings
export const getAlarmSettings = () => {
  return { ...alarmSettings };
};

// Reset alarm state for testing purposes
export const resetAlarmState = () => {
  console.log('🔄 Resetting alarm state for testing...');
  
  // Clear the unconfirmed bookings queue
  unconfirmedBookingsQueue = [];
  
  // Dismiss any current toast
  if (currentToastId) {
    toast.dismiss(currentToastId);
    currentToastId = null;
  }
  
  // Dismiss all toasts to ensure clean state
  toast.dismiss();
  
  console.log('✅ Alarm state reset completed');
};





// Initialize alarm settings on module load
// Set up audio initialization on user interaction
const setupAudioInitialization = () => {
  const events = ['click', 'touchstart', 'keydown'];
  
  const initAudio = async () => {
    if (!audioEnabled) {
      const success = await initializeAudioContext();
      if (success) {
        console.log('🎵 Audio context initialized on user interaction');
        // Remove event listeners after successful initialization
        events.forEach(event => {
          document.removeEventListener(event, initAudio);
        });
      }
    }
  };
  
  // Add event listeners for user interaction
  events.forEach(event => {
    document.addEventListener(event, initAudio, { once: false });
  });
  
  console.log('🎧 Audio initialization listeners set up');
};

console.log('Initializing alarm settings...');
loadAlarmSettings();

// Set up audio initialization
setupAudioInitialization();

// Make functions available globally for debugging
if (typeof window !== 'undefined') {
  window.testAlarmAudio = testAudio;
  window.enableAlarmAudio = enableAudio;
  window.isAlarmAudioEnabled = isAudioEnabled;
  window.resetAlarmState = resetAlarmState;
  
  console.log('🔧 Debug functions available:');
  console.log('  - window.testAlarmAudio() - Test audio playbook');
  console.log('  - window.enableAlarmAudio() - Enable audio manually');
  console.log('  - window.isAlarmAudioEnabled() - Check audio status');
  console.log('  - window.resetAlarmState() - Reset alarm state for testing');
}