/**
 * Date Helpers Utility
 * Comprehensive date manipulation and formatting utilities
 */

class DateHelpers {
  /**
   * Get current date/time in various formats
   */
  static now() {
    return new Date();
  }

  static today() {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }

  static tomorrow() {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  static yesterday() {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  /**
   * Format date to various string formats
   */
  static format(date, format = 'YYYY-MM-DD HH:mm:ss') {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    const milliseconds = String(d.getMilliseconds()).padStart(3, '0');

    return format
      .replace('YYYY', year)
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds)
      .replace('SSS', milliseconds);
  }

  static toISOString(date) {
    return new Date(date).toISOString();
  }

  static toLocaleDate(date, locale = 'en-IN') {
    return new Date(date).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  static toLocaleDateTime(date, locale = 'en-IN') {
    return new Date(date).toLocaleString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  static toLocaleTime(date, locale = 'en-IN') {
    return new Date(date).toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  static toDateString(date) {
    return this.format(date, 'YYYY-MM-DD');
  }

  static toTimeString(date) {
    return this.format(date, 'HH:mm:ss');
  }

  static toDateTimeString(date) {
    return this.format(date, 'YYYY-MM-DD HH:mm:ss');
  }

  static toReadableDate(date) {
    const d = new Date(date);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = d.getDate();
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  }

  static toReadableDateTime(date) {
    const d = new Date(date);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = d.getDate();
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day} ${month} ${year}, ${hours}:${minutes}`;
  }

  /**
   * Time ago / relative time
   */
  static timeAgo(date) {
    const now = new Date();
    const diff = now - new Date(date);
    
    if (diff < 0) return 'in the future';
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (seconds < 60) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${days}d ago`;
    if (days < 365) return `${months}mo ago`;
    return `${years}y ago`;
  }

  static timeUntil(date) {
    const now = new Date();
    const diff = new Date(date) - now;
    
    if (diff < 0) return 'past';
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (seconds < 60) return `${seconds}s`;
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 30) return `${days}d`;
    if (days < 365) return `${months}mo`;
    return `${years}y`;
  }

  static timeAgoShort(date) {
    const now = new Date();
    const diff = now - new Date(date);
    
    if (diff < 0) return 'future';
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
  }

  static getRelativeTimeLabel(date) {
    const now = new Date();
    const diff = now - new Date(date);
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 14) return 'Last week';
    if (days < 21) return '2 weeks ago';
    if (days < 30) return '3 weeks ago';
    if (days < 60) return 'Last month';
    if (days < 90) return '2 months ago';
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)} years ago`;
  }

  /**
   * Date calculations
   */
  static addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  static addHours(date, hours) {
    const d = new Date(date);
    d.setHours(d.getHours() + hours);
    return d;
  }

  static addMinutes(date, minutes) {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() + minutes);
    return d;
  }

  static addMonths(date, months) {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
  }

  static addYears(date, years) {
    const d = new Date(date);
    d.setFullYear(d.getFullYear() + years);
    return d;
  }

  static subtractDays(date, days) {
    return this.addDays(date, -days);
  }

  static subtractHours(date, hours) {
    return this.addHours(date, -hours);
  }

  static subtractMinutes(date, minutes) {
    return this.addMinutes(date, -minutes);
  }

  static subtractMonths(date, months) {
    return this.addMonths(date, -months);
  }

  static subtractYears(date, years) {
    return this.addYears(date, -years);
  }

  /**
   * Date differences
   */
  static diffInDays(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
  }

  static diffInHours(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return Math.floor((d2 - d1) / (1000 * 60 * 60));
  }

  static diffInMinutes(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return Math.floor((d2 - d1) / (1000 * 60));
  }

  static diffInSeconds(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return Math.floor((d2 - d1) / 1000);
  }

  static diffInMilliseconds(date1, date2) {
    return new Date(date2) - new Date(date1);
  }

  static isBefore(date1, date2) {
    return new Date(date1) < new Date(date2);
  }

  static isAfter(date1, date2) {
    return new Date(date1) > new Date(date2);
  }

  static isSameDay(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  }

  static isSameMonth(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth();
  }

  static isSameYear(date1, date2) {
    return new Date(date1).getFullYear() === new Date(date2).getFullYear();
  }

  static isToday(date) {
    return this.isSameDay(date, new Date());
  }

  static isYesterday(date) {
    return this.isSameDay(date, this.subtractDays(new Date(), 1));
  }

  static isTomorrow(date) {
    return this.isSameDay(date, this.addDays(new Date(), 1));
  }

  static isFuture(date) {
    return new Date(date) > new Date();
  }

  static isPast(date) {
    return new Date(date) < new Date();
  }

  /**
   * Start/End of period
   */
  static startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  static endOfDay(date) {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  static startOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  static endOfWeek(date) {
    const d = this.startOfWeek(date);
    d.setDate(d.getDate() + 6);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  static startOfMonth(date) {
    const d = new Date(date);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  static endOfMonth(date) {
    const d = new Date(date);
    d.setMonth(d.getMonth() + 1);
    d.setDate(0);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  static startOfQuarter(date) {
    const d = new Date(date);
    const month = d.getMonth();
    const quarterMonth = Math.floor(month / 3) * 3;
    d.setMonth(quarterMonth);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  static endOfQuarter(date) {
    const d = this.startOfQuarter(date);
    d.setMonth(d.getMonth() + 3);
    d.setDate(0);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  static startOfYear(date) {
    const d = new Date(date);
    d.setMonth(0);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  static endOfYear(date) {
    const d = new Date(date);
    d.setMonth(11);
    d.setDate(31);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  /**
   * Date ranges and intervals
   */
  static getDateRange(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dates = [];
    
    let current = new Date(start);
    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  }

  static getWeekDates(date) {
    const start = this.startOfWeek(date);
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      dates.push(d);
    }
    return dates;
  }

  static getMonthDates(date) {
    const start = this.startOfMonth(date);
    const end = this.endOfMonth(date);
    return this.getDateRange(start, end);
  }

  static getQuarterDates(date) {
    const start = this.startOfQuarter(date);
    const end = this.endOfQuarter(date);
    return this.getDateRange(start, end);
  }

  static getYearDates(date) {
    const start = this.startOfYear(date);
    const end = this.endOfYear(date);
    return this.getDateRange(start, end);
  }

  /**
   * Date validations
   */
  static isValid(date) {
    if (!date) return false;
    const d = new Date(date);
    return !isNaN(d.getTime());
  }

  static isWeekend(date) {
    const d = new Date(date);
    const day = d.getDay();
    return day === 0 || day === 6;
  }

  static isWeekday(date) {
    return !this.isWeekend(date);
  }

  static isLeapYear(date) {
    const year = new Date(date).getFullYear();
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  }

  static getDaysInMonth(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = d.getMonth();
    return new Date(year, month + 1, 0).getDate();
  }

  static getDayOfYear(date) {
    const d = new Date(date);
    const start = new Date(d.getFullYear(), 0, 0);
    const diff = d - start;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  static getWeekNumber(date) {
    const d = new Date(date);
    const start = this.startOfWeek(d);
    const diff = d - start;
    return Math.ceil((diff / (1000 * 60 * 60 * 24) + 1) / 7);
  }

  /**
   * Business days
   */
  static getBusinessDays(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let count = 0;
    
    let current = new Date(start);
    while (current <= end) {
      if (!this.isWeekend(current)) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return count;
  }

  static addBusinessDays(date, days) {
    const d = new Date(date);
    let added = 0;
    
    while (added < days) {
      d.setDate(d.getDate() + 1);
      if (!this.isWeekend(d)) {
        added++;
      }
    }
    
    return d;
  }

  static getNextBusinessDay(date) {
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    while (this.isWeekend(d)) {
      d.setDate(d.getDate() + 1);
    }
    return d;
  }

  static getPreviousBusinessDay(date) {
    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    while (this.isWeekend(d)) {
      d.setDate(d.getDate() - 1);
    }
    return d;
  }

  /**
   * Age calculation
   */
  static getAge(dateOfBirth) {
    const dob = new Date(dateOfBirth);
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const monthDiff = now.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  }

  /**
   * Human readable durations
   */
  static getDuration(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = end - start;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (years > 0) {
      return `${years}y ${months % 12}mo`;
    }
    if (months > 0) {
      return `${months}mo ${days % 30}d`;
    }
    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }

  static getDurationInWords(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = end - start;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (years > 0) {
      return `${years} ${years === 1 ? 'year' : 'years'} ${months % 12 > 0 ? `and ${months % 12} ${months % 12 === 1 ? 'month' : 'months'}` : ''}`;
    }
    if (months > 0) {
      return `${months} ${months === 1 ? 'month' : 'months'} ${days % 30 > 0 ? `and ${days % 30} ${days % 30 === 1 ? 'day' : 'days'}` : ''}`;
    }
    if (days > 0) {
      return `${days} ${days === 1 ? 'day' : 'days'} ${hours % 24 > 0 ? `and ${hours % 24} ${hours % 24 === 1 ? 'hour' : 'hours'}` : ''}`;
    }
    if (hours > 0) {
      return `${hours} ${hours === 1 ? 'hour' : 'hours'} ${minutes % 60 > 0 ? `and ${minutes % 60} ${minutes % 60 === 1 ? 'minute' : 'minutes'}` : ''}`;
    }
    if (minutes > 0) {
      return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ${seconds % 60 > 0 ? `and ${seconds % 60} ${seconds % 60 === 1 ? 'second' : 'seconds'}` : ''}`;
    }
    return `${seconds} ${seconds === 1 ? 'second' : 'seconds'}`;
  }

  /**
   * Timestamp helpers
   */
  static getTimestamp() {
    return Date.now();
  }

  static getUnixTimestamp(date) {
    return Math.floor(new Date(date).getTime() / 1000);
  }

  static fromUnixTimestamp(timestamp) {
    return new Date(timestamp * 1000);
  }

  static getMongoTimestamp(date) {
    return new Date(date).toISOString();
  }

  /**
   * Holiday checking
   */
  static isHoliday(date, holidays) {
    const d = new Date(date);
    const dateString = this.toDateString(d);
    return holidays.some(h => {
      const holidayDate = this.toDateString(h.date);
      return holidayDate === dateString;
    });
  }

  static getHolidays(year, holidays) {
    return holidays.filter(h => {
      const date = new Date(h.date);
      return date.getFullYear() === year;
    });
  }

  /**
   * Quarter helpers
   */
  static getQuarter(date) {
    const month = new Date(date).getMonth();
    return Math.floor(month / 3) + 1;
  }

  static getQuarterLabel(date) {
    const quarter = this.getQuarter(date);
    const year = new Date(date).getFullYear();
    return `Q${quarter} ${year}`;
  }

  /**
   * Fiscal year helpers
   */
  static getFiscalYear(date, startMonth = 4) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = d.getMonth();
    
    if (month >= startMonth - 1) {
      return `${year}-${year + 1}`;
    } else {
      return `${year - 1}-${year}`;
    }
  }

  static getFiscalYearStart(date, startMonth = 4) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = d.getMonth();
    
    let fiscalYear = year;
    if (month < startMonth - 1) {
      fiscalYear = year - 1;
    }
    
    return new Date(fiscalYear, startMonth - 1, 1);
  }

  static getFiscalYearEnd(date, startMonth = 4) {
    const start = this.getFiscalYearStart(date, startMonth);
    const end = new Date(start);
    end.setFullYear(end.getFullYear() + 1);
    end.setDate(0);
    return end;
  }

  /**
   * Business hours helpers
   */
  static isBusinessHours(date, businessHours = { start: 9, end: 18 }) {
    const d = new Date(date);
    const hour = d.getHours();
    return hour >= businessHours.start && hour < businessHours.end;
  }

  static getBusinessHoursRemaining(date, businessHours = { start: 9, end: 18 }) {
    const d = new Date(date);
    const hour = d.getHours();
    const minutes = d.getMinutes();
    
    if (hour < businessHours.start) {
      return (businessHours.end - businessHours.start) * 60;
    }
    if (hour >= businessHours.end) {
      return 0;
    }
    
    const totalMinutes = (businessHours.end - hour) * 60 - minutes;
    return Math.max(0, totalMinutes);
  }

  /**
   * Next occurrence helpers
   */
  static getNextDayOfWeek(dayOfWeek, fromDate = new Date()) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const targetDay = days.indexOf(dayOfWeek.toLowerCase());
    if (targetDay === -1) return null;

    const d = new Date(fromDate);
    const currentDay = d.getDay();
    const diff = targetDay - currentDay;
    const addDays = diff <= 0 ? diff + 7 : diff;
    d.setDate(d.getDate() + addDays);
    return d;
  }

  static getNextMonthDay(dayOfMonth, fromDate = new Date()) {
    const d = new Date(fromDate);
    const currentDay = d.getDate();
    
    if (dayOfMonth > currentDay) {
      d.setDate(dayOfMonth);
    } else {
      d.setMonth(d.getMonth() + 1);
      const lastDay = this.getDaysInMonth(d);
      d.setDate(Math.min(dayOfMonth, lastDay));
    }
    return d;
  }

  /**
   * Batch operations
   */
  static generateDateSequence(startDate, endDate, interval = 'day', count = null) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dates = [];
    
    let current = new Date(start);
    let i = 0;
    
    while (current <= end && (count === null || i < count)) {
      dates.push(new Date(current));
      
      switch (interval) {
        case 'day':
          current.setDate(current.getDate() + 1);
          break;
        case 'week':
          current.setDate(current.getDate() + 7);
          break;
        case 'month':
          current.setMonth(current.getMonth() + 1);
          break;
        case 'year':
          current.setFullYear(current.getFullYear() + 1);
          break;
        default:
          current.setDate(current.getDate() + 1);
      }
      
      i++;
    }
    
    return dates;
  }

  /**
   * Timezone helpers
   */
  static toUTC(date) {
    return new Date(date).toUTCString();
  }

  static getTimezoneOffset(date) {
    return new Date(date).getTimezoneOffset();
  }

  static getTimezoneName() {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  /**
   * Date parsing
   */
  static parse(dateString) {
    const d = new Date(dateString);
    return this.isValid(d) ? d : null;
  }

  static parseSafe(dateString, fallback = null) {
    const d = this.parse(dateString);
    return d || fallback;
  }

  /**
   * Sorting helpers
   */
  static sortAscending(dates) {
    return dates.sort((a, b) => new Date(a) - new Date(b));
  }

  static sortDescending(dates) {
    return dates.sort((a, b) => new Date(b) - new Date(a));
  }
}

module.exports = DateHelpers;