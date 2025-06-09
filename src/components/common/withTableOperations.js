import React, { useState } from 'react';
import DatabaseService from '../services/DatabaseService';
import { toast } from 'react-toastify';

const withTableOperations = (WrappedComponent, resourceName, supabaseTable) => {
  return function WithTableOperations(props) {
    const [selectedRows, setSelectedRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [isCreating, setIsCreating] = useState(false);

    const handleSave = async (itemData) => {
      try {
        const dbService = DatabaseService.getInstance();
        
        if (isCreating) {
          // Use DatabaseService to create new item
          const newItem = await dbService.createItem(supabaseTable.name, itemData, resourceName);

          // Check if setItems function exists before calling it
          if (typeof props.setItems === 'function') {
            props.setItems([newItem, ...(props.items || [])]);
          }
          setIsCreating(false);
        } else {
          // Use DatabaseService to update item
          await dbService.updateItem(supabaseTable.name, itemData, resourceName);

          // Check if setItems function exists before calling it
          if (typeof props.setItems === 'function') {
            props.setItems((props.items || []).map((item) => 
              item.id === itemData.id ? itemData : item
            ));
          }
          setEditItem(null);
        }
      } catch (error) {
        console.error('Error:', error);
        toast.error(`Error: ${error.message}`);
      }
      return null;
    };

    const handleDeleteSelected = async () => {
      try {
        const dbService = DatabaseService.getInstance();
        
        // Use DatabaseService to delete selected items
        await dbService.deleteItems(supabaseTable.name, selectedRows, resourceName);

        // Check if setItems function exists before calling it
        if (typeof props.setItems === 'function') {
          props.setItems((props.items || []).filter((item) => 
            !selectedRows.includes(item.id)
          ));
        }
        setSelectedRows([]);
      } catch (error) {
        console.error(`Error deleting ${resourceName.toLowerCase()}s:`, error);
        toast.error(`Error: ${error.message}`);
      }
    };

    const enhancedProps = {
      ...props,
      selectedRows,
      setSelectedRows,
      loading,
      setLoading,
      editItem,
      setEditItem,
      isCreating,
      setIsCreating,
      handleSave,
      handleDeleteSelected
    };

    return <WrappedComponent {...enhancedProps} />;
  };
};

export default withTableOperations;