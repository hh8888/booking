# Custom Hooks Documentation

This directory contains custom hooks that extract shared logic across dashboard components, improving code reusability and maintainability.

## Available Hooks

### 1. `useAuthStateMonitor(initialUserId)`

**Purpose**: Monitors authentication state changes and automatically signs out when a different user is detected.

**Parameters**:
- `initialUserId` (string|null): The initial user ID to compare against

**Usage**:
```javascript
import { useAuthStateMonitor } from '../hooks/useAuthStateMonitor';

function Dashboard() {
  const [currentUserId, setCurrentUserId] = useState(null);
  
  // Monitor auth state changes
  useAuthStateMonitor(currentUserId);
  
  // ... rest of component
}
```

### 2. `useBusinessInfo(defaultName)`

**Purpose**: Fetches and manages business information from the database.

**Parameters**:
- `defaultName` (string): Default business name fallback

**Returns**:
```javascript
{
  businessName: string,
  loading: boolean,
  error: string|null,
  refetch: function
}
```

**Usage**:
```javascript
import { useBusinessInfo } from '../hooks/useBusinessInfo';

function Dashboard() {
  const { businessName, loading, error } = useBusinessInfo();
  
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  
  return <h1>{businessName}</h1>;
}
```

### 3. `useDashboardUser()`

**Purpose**: Fetches and manages dashboard user information with built-in authentication monitoring.

**Returns**:
```javascript
{
  userEmail: string,
  userRole: string,
  userName: string,
  currentUserId: string|null,
  loading: boolean,
  error: string|null,
  refetch: function
}
```

**Usage**:
```javascript
import { useDashboardUser } from '../hooks/useDashboardUser';

function Dashboard() {
  const { userEmail, userRole, userName, currentUserId, loading } = useDashboardUser();
  
  if (loading) return <LoadingSpinner />;
  
  return (
    <UserDropdown 
      userEmail={userEmail}
      userRole={userRole}
      userName={userName}
      currentUserId={currentUserId}
    />
  );
}
```

### 4. `useUsersData(options)`

**Purpose**: Fetches and manages users data with filtering and error handling.

**Parameters**:
```javascript
options = {
  roleFilter: Array<string>, // e.g., ['customer', 'staff']
  autoFetch: boolean         // default: true
}
```

**Returns**:
```javascript
{
  users: Array,
  setUsers: function,
  loading: boolean,
  error: string|null,
  networkError: string|null,
  refetch: function,
  retryFetch: function
}
```

**Usage**:
```javascript
import { useUsersData } from '../hooks/useUsersData';

function StaffDashboard() {
  // Only fetch customers and staff for staff dashboard
  const { users, loading, networkError, retryFetch } = useUsersData({
    roleFilter: ['customer', 'staff']
  });
  
  if (loading) return <LoadingSpinner />;
  if (networkError) return <ErrorWithRetry onRetry={retryFetch} />;
  
  return <UsersTable users={users} />;
}
```

## Benefits Achieved

### 1. **Code Deduplication**
- Removed ~200 lines of duplicated code across AdminDashboard, StaffDashboard, and CustomerDashboard
- Centralized authentication monitoring logic
- Unified error handling patterns

### 2. **Improved Maintainability**
- Single source of truth for shared logic
- Easier to update authentication or data fetching logic
- Consistent behavior across all dashboards

### 3. **Enhanced Testability**
- Hooks can be tested in isolation
- Easier to mock dependencies
- Better separation of concerns

### 4. **Better Error Handling**
- Centralized error handling in hooks
- Consistent error states across components
- Built-in retry mechanisms

### 5. **Performance Benefits**
- Reduced bundle size through code deduplication
- Optimized re-renders with proper dependency management
- Built-in loading states

## Migration Example

**Before** (AdminDashboard.js):
```javascript
export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [businessName, setBusinessName] = useState('Booking Management System');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState('');
  const [userName, setUserName] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);
  const [networkError, setNetworkError] = useState(null);
  
  useEffect(() => {
    // 80+ lines of duplicated logic for:
    // - Fetching business info
    // - Fetching user info
    // - Fetching users data
    // - Setting up auth monitoring
  }, []);
  
  // ... rest of component
}
```

**After** (AdminDashboard.js):
```javascript
export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Use custom hooks for shared logic
  const { businessName } = useBusinessInfo();
  const { userEmail, userRole, userName, currentUserId } = useDashboardUser();
  const { users, setUsers, loading, networkError, retryFetch } = useUsersData();
  
  // ... rest of component (much cleaner!)
}
```

## Best Practices

1. **Always handle loading states** when using these hooks
2. **Check for errors** and provide appropriate fallbacks
3. **Use roleFilter** in `useUsersData` when you don't need all users
4. **Leverage refetch functions** for manual data refresh
5. **Combine hooks** for comprehensive dashboard functionality

## Future Enhancements

- Add caching mechanisms to reduce API calls
- Implement optimistic updates for better UX
- Add pagination support to `useUsersData`
- Create specialized hooks for booking and service data
- Add TypeScript definitions for better type safety