import { object, string, date, number, array } from 'yup';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';

class FormValidationService {
  static instance = null;

  static getInstance() {
    if (!FormValidationService.instance) {
      FormValidationService.instance = new FormValidationService();
    }
    return FormValidationService.instance;
  }

  // 通用的验证规则
  validationRules = {
    // User validation rules
    user: {
      email: string().email('Please enter a valid email address').required('Email is required'),
      password: string()
        .min(6, 'Password must be at least 6 characters')
        .required('Password is required'),
      fullName: string().required('Full name is required'),
      role: string().oneOf(['admin', 'staff', 'customer'], 'Invalid role type')
    },

    // 预约相关验证规则
    booking: {
      serviceId: string().required('Please select a service'),
      customerId: string().required('Please select a customer'),
      staffId: string().required('Please select a staff member'),
      startTime: date().required('Please select start time'),
      endTime: date().required('Please select end time'),
      status: string().oneOf(['pending', 'confirmed', 'cancelled'], 'Invalid status'),
      recurringType: string().oneOf(['none', 'daily', 'weekly'], 'Invalid recurring type'),
      recurringEndDate: date().nullable()
    },

    // Service validation rules
    service: {
      name: string().required('Service name is required'),
      description: string().required('Service description is required'),
      duration: number().required('Service duration is required').min(1, 'Service duration must be greater than 0'),
      price: number().required('Service price is required').min(0, 'Service price cannot be negative'),
      staffIds: array().of(string()).min(1, 'Please select at least one staff member')
    }
  };

  // Get user form validation schema
  getUserValidationSchema() {
    return object().shape(this.validationRules.user);
  }

  // 获取预约表单验证Schema
  getBookingValidationSchema() {
    return object().shape(this.validationRules.booking);
  }

  // Get service form validation schema
  getServiceValidationSchema() {
    return object().shape(this.validationRules.service);
  }

  // 创建表单Hook
  createFormHook(schema, defaultValues = {}) {
    return useForm({
      resolver: yupResolver(schema),
      defaultValues
    });
  }

  // Create user form hook
  createUserFormHook(defaultValues = {}) {
    return this.createFormHook(this.getUserValidationSchema(), defaultValues);
  }

  // 创建预约表单Hook
  createBookingFormHook(defaultValues = {}) {
    return this.createFormHook(this.getBookingValidationSchema(), defaultValues);
  }

  // Create service form hook
  createServiceFormHook(defaultValues = {}) {
    return this.createFormHook(this.getServiceValidationSchema(), defaultValues);
  }

  // 自定义验证规则
  validateCustomField(value, rules) {
    try {
      rules.validateSync(value);
      return true;
    } catch (error) {
      return error.message;
    }
  }
}

export default FormValidationService;