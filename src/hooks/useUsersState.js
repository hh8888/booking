import { useReducer, useCallback } from 'react';
import { toast } from 'react-toastify';
import UserService from '../services/UserService';

// Define action types
const ACTIONS = {
  SET_USERS: 'SET_USERS',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  SET_SELECTED_ROWS: 'SET_SELECTED_ROWS',
  SET_EDIT_ITEM: 'SET_EDIT_ITEM',
  SET_IS_CREATING: 'SET_IS_CREATING',
  SET_ROLE_FILTER: 'SET_ROLE_FILTER',
  SET_REQUIRED_FIELDS: 'SET_REQUIRED_FIELDS',
  SET_SHOW_AVAILABILITY_FORM: 'SET_SHOW_AVAILABILITY_FORM',
  SET_SELECTED_STAFF_ID: 'SET_SELECTED_STAFF_ID'
};

// Initial state
const initialState = {
  users: [],
  selectedRows: [],
  loading: true,
  error: null,
  editItem: null,
  isCreating: false,
  roleFilter: 'all',
  requiredFields: ['email', 'full_name', 'post_code'],
  showAvailabilityForm: false,
  selectedStaffId: null
};

// Reducer function
function usersReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_USERS:
      return { ...state, users: action.payload };
    case ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload };
    case ACTIONS.SET_ERROR:
      return { ...state, error: action.payload };
    case ACTIONS.SET_SELECTED_ROWS:
      return { ...state, selectedRows: action.payload };
    case ACTIONS.SET_EDIT_ITEM:
      return { ...state, editItem: action.payload };
    case ACTIONS.SET_IS_CREATING:
      return { ...state, isCreating: action.payload };
    case ACTIONS.SET_ROLE_FILTER:
      return { ...state, roleFilter: action.payload };
    case ACTIONS.SET_REQUIRED_FIELDS:
      return { ...state, requiredFields: action.payload };
    case ACTIONS.SET_SHOW_AVAILABILITY_FORM:
      return { ...state, showAvailabilityForm: action.payload };
    case ACTIONS.SET_SELECTED_STAFF_ID:
      return { ...state, selectedStaffId: action.payload };
    default:
      return state;
  }
}

export function useUsersState(initialUsers) {
  const [state, dispatch] = useReducer(usersReducer, {
    ...initialState,
    users: initialUsers || [],
    loading: !initialUsers
  });

  const fetchUsers = useCallback(async () => {
    try {
      const userService = UserService.getInstance();
      const data = await userService.fetchUsers();
      dispatch({ type: ACTIONS.SET_USERS, payload: data });
    } catch (error) {
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
    } finally {
      dispatch({ type: ACTIONS.SET_LOADING, payload: false });
    }
  }, []);

  const fetchRequiredFields = useCallback(async () => {
    try {
      const userService = UserService.getInstance();
      const requiredUserFields = await userService.fetchRequiredFields();
      dispatch({ type: ACTIONS.SET_REQUIRED_FIELDS, payload: requiredUserFields });
    } catch (error) {
      console.error('Error fetching required fields:', error);
    }
  }, []);

  const handleSave = useCallback(async (itemData) => {
    try {
      const userService = UserService.getInstance();
      
      if (itemData.birthday === '') {
        itemData.birthday = null;
      }
      
      if (state.isCreating) {
        const newUser = await userService.createUser(itemData);
        dispatch({ type: ACTIONS.SET_USERS, payload: [newUser, ...state.users] });
        dispatch({ type: ACTIONS.SET_IS_CREATING, payload: false });
        dispatch({ type: ACTIONS.SET_EDIT_ITEM, payload: null });
        toast.success('User created successfully');
      } else {
        await userService.updateUser(itemData);
        dispatch({
          type: ACTIONS.SET_USERS,
          payload: state.users.map((item) => 
            item.id === itemData.id ? { ...item, ...itemData } : item
          )
        });
        dispatch({ type: ACTIONS.SET_EDIT_ITEM, payload: null });
        toast.success('User updated successfully');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(`Error: ${error.message}`);
    }
  }, [state.users, state.isCreating]);

  const handleDeleteSelected = useCallback(async () => {
    try {
      const userService = UserService.getInstance();
      await userService.deleteUsers(state.selectedRows);
      dispatch({
        type: ACTIONS.SET_USERS,
        payload: state.users.filter((item) => !state.selectedRows.includes(item.id))
      });
      dispatch({ type: ACTIONS.SET_SELECTED_ROWS, payload: [] });
    } catch (error) {
      toast.error(`Error deleting users: ${error.message}`);
    }
  }, [state.users, state.selectedRows]);

  return {
    state,
    dispatch,
    ACTIONS,
    fetchUsers,
    fetchRequiredFields,
    handleSave,
    handleDeleteSelected
  };
}