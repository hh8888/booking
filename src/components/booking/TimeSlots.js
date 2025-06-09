import React from 'react';
import DateTimeFormatter from '../../utils/DateTimeFormatter';

export default function TimeSlots({ selectedHour, selectedMinute, onTimeSelect, bookedSlots = [], duration = 30, availableSlots = [], allSlots = [] }) {
  console.log('Available Slots:', availableSlots);
  console.log('Booked Slots:', bookedSlots);
  console.log('All Slots:', allSlots);


  const isTimeInSelectedRange = (hour, minute) => {
    if (!selectedHour || !selectedMinute) return false;
    
    const slotTime = new Date(2000, 0, 1, parseInt(hour), parseInt(minute));
    const selectedTime = new Date(2000, 0, 1, parseInt(selectedHour), parseInt(selectedMinute));
    const endTime = new Date(selectedTime.getTime() + duration * 60000);
    
    return slotTime >= selectedTime && slotTime < endTime;
  };

  const hasBookingConflict = (hour, minute) => {
    const timeSlot = `${hour}:${minute}`;
    const isInCurrentBookingRange = selectedHour && selectedMinute && isTimeInSelectedRange(hour, minute);
    
    // 如果时间槽不在可用列表中
    if (!availableSlots.includes(timeSlot)) {
      return true;
    }
    
    const currentSlotTime = new Date(2000, 0, 1, parseInt(hour), parseInt(minute));
    const currentSlotEndTime = new Date(currentSlotTime.getTime() + duration * 60000);
    
    // 检查是否与其他预约时间冲突
    for (const bookedSlot of bookedSlots) {
      const [bookedHour, bookedMinute] = bookedSlot.split(':');
      const bookedTime = new Date(2000, 0, 1, parseInt(bookedHour), parseInt(bookedMinute));
      const bookedEndTime = new Date(bookedTime.getTime() + duration * 60000);
      
      // 检查当前时间槽是否与已预约时间有任何重叠
      // 情况1：当前时间槽的开始时间落在已预约时间范围内
      // 情况2：当前时间槽的结束时间落在已预约时间范围内
      // 情况3：当前时间槽完全包含已预约时间
      if (!isInCurrentBookingRange && 
          ((currentSlotTime >= bookedTime && currentSlotTime < bookedEndTime) ||
           (currentSlotEndTime > bookedTime && currentSlotEndTime <= bookedEndTime) ||
           (currentSlotTime <= bookedTime && currentSlotEndTime >= bookedEndTime))) {
        return true;
      }
    }
    
    return false;
  };

  const wouldCauseOverlap = (hour, minute) => {
    const selectedTime = new Date(2000, 0, 1, parseInt(hour), parseInt(minute));
    const endTime = new Date(selectedTime.getTime() + duration * 60000);
    
    // Check if selecting this slot would cause any part of the duration to overlap with booked slots
    for (let i = 0; i < duration; i += 5) { // Assuming 5-minute intervals
      const checkTime = new Date(selectedTime.getTime() + i * 60000);
      const checkHour = checkTime.getHours().toString().padStart(2, '0');
      const checkMinute = checkTime.getMinutes().toString().padStart(2, '0');
      const timeSlot = `${checkHour}:${checkMinute}`;
      
      if (bookedSlots.includes(timeSlot)) {
        return true;
      }
    }
    return false;
  };

  // Use allSlots if provided, otherwise fall back to availableSlots
  const slotsToRender = allSlots.length > 0 ? allSlots : availableSlots;

  return (
    <div className="mt-4">
      <div className="grid grid-cols-4 gap-2">
        {slotsToRender.length > 0 ? (
          slotsToRender.map((slot, index) => {
            const [hour, minute] = slot.split(':');
            const isInSelectedRange = isTimeInSelectedRange(hour, minute);
            const isBooked = bookedSlots.includes(slot);
            const isAvailable = availableSlots.includes(slot);
            const formattedTime = `${hour === '00' ? '12' : (parseInt(hour) > 12 ? parseInt(hour) - 12 : hour)}:${minute}${parseInt(hour) >= 12 ? 'PM' : 'AM'}`;
            
            return (
              <button
                key={index}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const isInCurrentBookingRange = selectedHour && selectedMinute && isTimeInSelectedRange(hour, minute);
                  const wouldOverlap = wouldCauseOverlap(hour, minute);
                  
                  if ((isBooked && !isInCurrentBookingRange) || !isAvailable || wouldOverlap) {
                    const message = wouldOverlap 
                      ? 'Selecting this time would cause the booking duration to overlap with existing bookings.'
                      : 'This time slot is not available. Please select another time.';
                    alert(message);
                    return;
                  }
                  onTimeSelect(hour, minute);
                }}
                onDoubleClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                disabled={isBooked && !(selectedHour && selectedMinute && isTimeInSelectedRange(hour, minute))}
                className={`
                  py-2 px-3 text-sm rounded-md transition-colors duration-200
                  ${isInSelectedRange
                    ? 'bg-blue-600 text-white ring-2 ring-blue-300'
                    : isBooked
                      ? 'bg-red-100 text-red-800 cursor-not-allowed opacity-75'
                      : !isAvailable
                        ? 'bg-gray-100 text-gray-500 cursor-not-allowed opacity-50'
                        : wouldCauseOverlap(hour, minute)
                          ? 'bg-orange-100 text-orange-800 cursor-not-allowed opacity-75'
                          : 'bg-green-100 text-green-800 hover:bg-green-200 cursor-pointer'}
                  ${isAvailable && !isBooked && !wouldCauseOverlap(hour, minute) ? 'hover:shadow-sm' : ''}
                `}
                title={
                  isBooked 
                    ? 'This time slot is already booked' 
                    : !isAvailable 
                      ? 'This time slot is not available'
                      : wouldCauseOverlap(hour, minute)
                        ? 'Selecting this time would cause duration overlap with existing bookings'
                        : ''
                }
              >
                {formattedTime}
                {isBooked && (
                  <span className="ml-1 text-xs">🚫</span>
                )}
                {!isAvailable && !isBooked && (
                  <span className="ml-1 text-xs">⏰</span>
                )}
              </button>
            );
          })
        ) : (
          <div className="col-span-4 text-center text-gray-500 py-4">
            No time slots available for this date
          </div>
        )}
      </div>
    </div>
  );
}