import React, { useState, useEffect } from 'react';
import { PlusIcon, TrashIcon, ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';

const BookingStepsEditor = ({ value, onChange, label, description }) => {
  const [steps, setSteps] = useState([]);

  useEffect(() => {
    try {
      const parsedSteps = JSON.parse(value || '[]');
      setSteps(parsedSteps);
    } catch (e) {
      setSteps([
        { id: 1, title: 'Customer makes booking online', description: 'Browse services and select your preferred time slot' },
        { id: 2, title: 'Staff will call customer to confirm details of booking', description: 'Our team will contact you to verify appointment details' }
      ]);
    }
  }, [value]);

  const updateSteps = (newSteps) => {
    setSteps(newSteps);
    onChange(JSON.stringify(newSteps));
  };

  const addStep = () => {
    const newId = Math.max(...steps.map(s => s.id), 0) + 1;
    const newSteps = [...steps, { id: newId, title: '', description: '' }];
    updateSteps(newSteps);
  };

  const removeStep = (id) => {
    const newSteps = steps.filter(step => step.id !== id);
    updateSteps(newSteps);
  };

  const updateStep = (id, field, value) => {
    const newSteps = steps.map(step => 
      step.id === id ? { ...step, [field]: value } : step
    );
    updateSteps(newSteps);
  };

  const moveStep = (id, direction) => {
    const currentIndex = steps.findIndex(step => step.id === id);
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    if (newIndex >= 0 && newIndex < steps.length) {
      const newSteps = [...steps];
      [newSteps[currentIndex], newSteps[newIndex]] = [newSteps[newIndex], newSteps[currentIndex]];
      updateSteps(newSteps);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
        {description && (
          <p className="text-sm text-gray-500 mb-3">{description}</p>
        )}
      </div>
      
      <div className="space-y-3">
        {steps.map((step, index) => (
          <div key={step.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <div className="flex items-start justify-between mb-3">
              <span className="text-sm font-medium text-gray-700">Step {index + 1}</span>
              <div className="flex space-x-1">
                <button
                  type="button"
                  onClick={() => moveStep(step.id, 'up')}
                  disabled={index === 0}
                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowUpIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => moveStep(step.id, 'down')}
                  disabled={index === steps.length - 1}
                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowDownIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => removeStep(step.id)}
                  className="p-1 text-red-400 hover:text-red-600"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={step.title}
                  onChange={(e) => updateStep(step.id, 'title', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter step title"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Description
                </label>
                <textarea
                  value={step.description}
                  onChange={(e) => updateStep(step.id, 'description', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter step description"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <button
        type="button"
        onClick={addStep}
        className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <PlusIcon className="h-4 w-4" />
        <span>Add Step</span>
      </button>
    </div>
  );
};

export default BookingStepsEditor;