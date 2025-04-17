const calculateBookingCharge = (durationInHours) => {
  const MINIMUM_CHARGE = 200;
  const HOURLY_RATE = 200;
  
  // If duration is less than 1 hour, charge minimum
  if (durationInHours <= 1) {
    return MINIMUM_CHARGE;
  }
  
  // For durations longer than 1 hour, charge minimum for first hour
  // and then charge per hour for remaining time
  const remainingHours = durationInHours - 1;
  const remainingCharge = Math.ceil(remainingHours) * HOURLY_RATE;
  return MINIMUM_CHARGE + remainingCharge;
};

module.exports = {
  calculateBookingCharge
}; 