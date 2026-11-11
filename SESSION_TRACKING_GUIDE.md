# Multi-Window Session Tracking Feature

## Overview

This feature enables monitoring and displaying active browser sessions when the same user account is logged in across multiple browser windows or tabs. The session information is displayed in the dashboard header next to the user dropdown.

## How It Works

### Technical Implementation

1. **Session Identification**: <mcreference link="https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage" index="1">Each browser window/tab gets a unique session ID stored in sessionStorage</mcreference>
2. **Cross-Tab Communication**: <mcreference link="https://javascript.info/localstorage" index="4">Uses localStorage and storage events for real-time communication between tabs</mcreference>
3. **Activity Tracking**: Monitors user interactions (clicks, keystrokes, scrolling) to update session activity
4. **Automatic Cleanup**: <mcreference link="https://stackoverflow.com/questions/29486532/how-to-detect-if-user-has-open-more-than-one-window-or-tab-on-the-same-session" index="2">Removes inactive sessions after 30 seconds of inactivity</mcreference>

### Components Added

#### 1. `useSessionTracker.js` Hook
- **Location**: `src/hooks/useSessionTracker.js`
- **Purpose**: Manages session tracking logic
- **Features**:
  - Generates unique session IDs for each window/tab
  - Tracks user activity and last activity timestamps
  - Handles cross-tab communication via localStorage
  - Automatically cleans up expired sessions
  - Provides real-time session data

#### 2. `SessionIndicator.js` Component
- **Location**: `src/components/common/SessionIndicator.js`
- **Purpose**: Displays active sessions in the dashboard header
- **Features**:
  - Shows session count badge
  - Expandable dropdown with session details
  - Browser detection and window identification
  - Current session highlighting
  - Responsive design

### Integration Points

The SessionIndicator has been integrated into all dashboard headers:
- **AdminDashboard.js**: Added to admin dashboard header
- **StaffDashboard.js**: Added to staff dashboard header
- **CustomerDashboard.js**: Added to customer dashboard header

## Testing the Feature

### Prerequisites
1. Start the development server: `npm start`
2. Navigate to the application in your browser
3. Log in with any user account

### Test Scenarios

#### Scenario 1: Multiple Browser Windows
1. Open the application in your primary browser window
2. Log in with a user account
3. Open a new browser window (Ctrl+N or Cmd+N)
4. Navigate to the same application URL
5. **Expected Result**: You should see a session indicator showing "2 sessions" in the header

#### Scenario 2: Multiple Browser Tabs
1. Open the application in a browser tab
2. Log in with a user account
3. Open new tabs (Ctrl+T or Cmd+T) and navigate to the application
4. **Expected Result**: Each tab should show the total number of active sessions

#### Scenario 3: Session Activity Tracking
1. Open multiple windows/tabs as above
2. Click on the session indicator to expand the dropdown
3. **Expected Result**: You should see:
   - List of all active sessions
   - Browser type detection (Chrome, Firefox, Safari, Edge)
   - "Current" badge on the active session
   - Last activity timestamps
   - Current URL path for each session

#### Scenario 4: Session Cleanup
1. Open multiple sessions
2. Close one of the browser windows/tabs
3. Wait for 30 seconds
4. **Expected Result**: The session count should decrease, and the closed session should disappear from the list

#### Scenario 5: Cross-Tab Real-Time Updates
1. Open multiple tabs
2. In one tab, click the session indicator to expand it
3. In another tab, perform some actions (click, scroll, etc.)
4. **Expected Result**: The session list should update in real-time showing recent activity

## User Interface

### Session Indicator Appearance
- **Hidden State**: When only one session is active, the indicator is hidden
- **Visible State**: Shows a blue badge with session count and computer icon
- **Expanded State**: Dropdown showing detailed session information

### Session Information Displayed
- Browser type (Chrome, Firefox, Safari, Edge)
- Window identifier
- Last activity time ("Active now", "5s ago", "2m ago", etc.)
- Current URL path
- "Current" badge for the active session

## Security Considerations

1. **Data Storage**: <mcreference link="https://stackoverflow.com/questions/20325763/browser-sessionstorage-share-between-tabs" index="3">Session data is stored locally in the browser and not transmitted to servers</mcreference>
2. **Privacy**: No sensitive user information is stored in session tracking
3. **Cleanup**: Sessions are automatically cleaned up when windows are closed
4. **Isolation**: Each user's sessions are isolated and not visible to other users

## Limitations

1. **Same Browser Only**: <mcreference link="https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage" index="1">Sessions are tracked per browser instance, not across different browsers</mcreference>
2. **Local Storage Dependency**: Requires localStorage support in the browser
3. **Network Independence**: Works independently of Supabase session management
4. **Browser Restart**: Sessions are cleared when the browser is completely closed and reopened

## Troubleshooting

### Session Indicator Not Showing
- Ensure you have multiple windows/tabs open with the same user logged in
- Check browser console for any JavaScript errors
- Verify localStorage is enabled in browser settings

### Sessions Not Updating
- Check if localStorage events are being fired (browser developer tools)
- Ensure the useSessionTracker hook is properly imported
- Verify that user activity is being detected

### Performance Issues
- The feature uses throttled updates (5-second intervals) to minimize performance impact
- Session cleanup runs every 10 seconds
- Consider reducing update frequency if needed

## Future Enhancements

1. **Server-Side Integration**: Could be enhanced to work with Supabase's session management
2. **Device Detection**: Add mobile/desktop device type detection
3. **Geographic Location**: Show approximate location of sessions (with user permission)
4. **Session Actions**: Add ability to remotely sign out specific sessions
5. **Notifications**: Alert users when new sessions are detected

## Code Structure

```
src/
├── hooks/
│   └── useSessionTracker.js          # Session tracking logic
├── components/
│   └── common/
│       └── SessionIndicator.js        # UI component
├── AdminDashboard.js                  # Updated with SessionIndicator
├── StaffDashboard.js                  # Updated with SessionIndicator
└── components/customer/
    └── CustomerDashboard.js           # Updated with SessionIndicator
```

This implementation provides a robust, user-friendly way to monitor multiple browser sessions while maintaining security and performance standards.