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
    const date = new Date(dateTimeString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    
    let timeStr = '';
    if (this.timeFormat === '12') {
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const period = hours >= 12 ? 'PM' : 'AM';
      const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      timeStr = `${hours12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
    } else {
      timeStr = date.toLocaleTimeString('en-US', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    let result = date.toLocaleDateString();
    
    result += ` ${timeStr}`;

    if (this.showWeekday) {
      const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thur', 'Fri', 'Sat'];
      result += ` ${weekdays[date.getDay()]}`;
    }

    return result;
  }

  convertGMTStringToLocalString(value){//value is always GMT time
    var gmtDate = new Date(value);
    // var localTimeZoneOffset = new Date(Date.now()).getTimezoneOffset();//take in account for daylight saving
    var localTimeZoneOffset = new Date('2025/7/1').getTimezoneOffset();//NOT take in account for daylight saving
    gmtDate.setMinutes(gmtDate.getMinutes() - localTimeZoneOffset); //adjust to local time
    return gmtDate.toLocaleString();
  }

  convertLocalStringToGMTString(value){//value is always GMT time
    var gmtDate = new Date(value);
    var localTimeZoneOffset = new Date(Date.now()).getTimezoneOffset();//take in account for daylight saving
    gmtDate.setMinutes(gmtDate.getMinutes() + localTimeZoneOffset); //adjust to local time
    return gmtDate.toISOString();
  }
}

export default DateTimeFormatter;