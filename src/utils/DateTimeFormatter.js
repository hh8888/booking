import DatabaseService from '../services/DatabaseService';

class DateTimeFormatter {
  static instance = null;
  timeFormat = '24'; // default 24-hour format
  showWeekday = true; // default show weekday

  constructor() {
    if (DateTimeFormatter.instance) {
      return DateTimeFormatter.instance;
    }
    DateTimeFormatter.instance = this;
    this.initSettings();
  }

  static getInstance() {
    if (!DateTimeFormatter.instance) {
      DateTimeFormatter.instance = new DateTimeFormatter();
    }
    return DateTimeFormatter.instance;
  }

  async initSettings() {
    try {
      const dbService = DatabaseService.getInstance();
      const [timeFormat, showWeekday] = await Promise.all([
        dbService.getSettingsByKey('datetime', 'timeFormat'),
        dbService.getSettingsByKey('datetime', 'showWeekday')
      ]);

      if (timeFormat) {
        this.timeFormat = timeFormat;
      }
      if (showWeekday !== null) {
        this.showWeekday = showWeekday === 'true';
      }
    } catch (error) {
      console.error('Error initializing date time settings:', error);
    }
  }

  formatDateTime(dateTimeString) {
    if(dateTimeString===undefined) return '';
    // Convert GMT time to local time for display
    const localDate = new Date(dateTimeString);
    if (isNaN(localDate.getTime())) return 'Invalid Date';
    
    let timeStr = '';
    if (this.timeFormat === '12') {
      const hours = localDate.getHours();
      const minutes = localDate.getMinutes();
      const period = hours >= 12 ? 'PM' : 'AM';
      const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      timeStr = `${hours12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
    } else {
      timeStr = localDate.toLocaleTimeString('en-US', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    let result = localDate.toLocaleDateString();
    
    result += ` ${timeStr}`;

    if (this.showWeekday) {
      const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thur', 'Fri', 'Sat'];
      result += ` ${weekdays[localDate.getDay()]}`;
    }

    return result;
  }

  formatTime(dateTimeString) {
    let dt = this.formatDateTime(dateTimeString);
    let dts = dt.split(' ');
    dts.shift();
    return dts.join(' ');
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleDateString();
  }

  // convertGMTStringToLocalString(value){//value is always GMT time
  //   var gmtDate = new Date(value);
  //   // var localTimeZoneOffset = new Date(Date.now()).getTimezoneOffset();//take in account for daylight saving
  //   var localTimeZoneOffset = new Date('2025/7/1').getTimezoneOffset();//NOT take in account for daylight saving
  //   gmtDate.setMinutes(gmtDate.getMinutes() - localTimeZoneOffset); //adjust to local time
  //   return gmtDate.toLocaleString();
  // }

  // convertLocalStringToGMTString(value){//value is always GMT time
  //   var gmtDate = new Date(value);
  //   var localTimeZoneOffset = new Date(Date.now()).getTimezoneOffset();//take in account for daylight saving
  //   gmtDate.setMinutes(gmtDate.getMinutes() + localTimeZoneOffset); //adjust to local time
  //   return gmtDate.toISOString();
  // }

  to12HourFormat = (hour24) => {
    const hour = parseInt(hour24);
    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${hour12} ${period}`; // Remove padStart as hour value doesn't need zero padding
  };

  /**
   * Get the start of yesterday as an ISO string
   * @returns {string} ISO string representing the start of yesterday
   */
  static getYesterdayStart() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0); // Start of yesterday
    return yesterday.toISOString();
  }

  /**
   * Extract local date from GMT datetime string
   * @param {string} gmtDateTimeString - GMT datetime string
   * @returns {string} Local date in YYYY-MM-DD format
   */
  static getLocalDateFromGMT(gmtDateTimeString) {
    if (!gmtDateTimeString) return '';
    const localDate = new Date(gmtDateTimeString);
    if (isNaN(localDate.getTime())) return '';
    
    // Get local date components
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, '0');
    const day = String(localDate.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }
}

export default DateTimeFormatter;