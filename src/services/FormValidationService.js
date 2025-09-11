import { object, string, date, number, array } from 'yup';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { VALIDATION_MESSAGES, VALIDATION_RULES, VALIDATION_STATUS_OPTIONS, VALIDATION_ROLE_OPTIONS } from '../constants/validationConstants';

class FormValidationService {
  static instance = null;

  static getInstance() {
    if (!FormValidationService.instance) {
      FormValidationService.instance = new FormValidationService();
    }
    return FormValidationService.instance;
  }

  // Validation rules using centralized constants
  validationRules = {
    // User validation rules
    user: {
      email: string().email(VALIDATION_MESSAGES.EMAIL_INVALID).required(VALIDATION_MESSAGES.EMAIL_REQUIRED),
      password: string()
        .min(VALIDATION_RULES.PASSWORD.MIN_LENGTH, VALIDATION_MESSAGES.PASSWORD_MIN_LENGTH)
        .required(VALIDATION_MESSAGES.PASSWORD_REQUIRED),
      fullName: string().required(VALIDATION_MESSAGES.FULL_NAME_REQUIRED),
      role: string().oneOf(VALIDATION_ROLE_OPTIONS, VALIDATION_MESSAGES.ROLE_INVALID)
    },

    // Booking validation rules
    booking: {
      serviceId: string().required(VALIDATION_MESSAGES.SERVICE_REQUIRED),
      customerId: string().required(VALIDATION_MESSAGES.CUSTOMER_REQUIRED),
      staffId: string().required(VALIDATION_MESSAGES.STAFF_REQUIRED),
      startTime: date().required(VALIDATION_MESSAGES.START_TIME_REQUIRED),
      endTime: date().required(VALIDATION_MESSAGES.END_TIME_REQUIRED),
      status: string().oneOf(VALIDATION_STATUS_OPTIONS, VALIDATION_MESSAGES.STATUS_INVALID),
      recurringType: string().oneOf(['none', 'daily', 'weekly'], 'Invalid recurring type'),
      recurringEndDate: date().nullable()
    },

    // Service validation rules
    service: {
      name: string().required('Service name is required'),
      description: string().required('Service description is required'),
      duration: number().required('Service duration is required').min(1, 'Service duration must be greater than 0'),
      price: number().required('Service price is required').min(0, 'Service price cannot be negative'),
      max_number: number().required('Max number value is required').min(1, 'Max number must be a positive number').max(2, 'Max number must be smaller than 3'),
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
  getServiceValidationSchema(maxBookingNumber = 2) {
    const serviceRules = {
      ...this.validationRules.service,
      max_number: number()
        .required('Max number value is required')
        .min(1, 'Max number must be a positive number')
        .max(maxBookingNumber, `Max number must be smaller than ${maxBookingNumber + 1}`)
    };
    return object().shape(serviceRules);
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
  createServiceFormHook(defaultValues = {}, maxBookingNumber = 2) {
    return this.createFormHook(this.getServiceValidationSchema(maxBookingNumber), defaultValues);
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