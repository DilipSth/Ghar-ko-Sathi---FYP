const handleMaintenanceSubmit = () => {
  if (currentRequest && socket) {
    // Calculate hourly charge based on job duration (200 Rs per hour)
    const hourlyRate = 200;
    const hourlyCharge = jobDuration * hourlyRate;
    
    // Calculate total material cost
    const materialCost = calculateMaterialCost();
    
    // Parse additional charges (or default to 0 if invalid)
    const additionalCharge = parseFloat(maintenancePrice) || 0;
    
    // Calculate total maintenance price
    const maintenanceTotal = hourlyCharge + materialCost + additionalCharge;
    
    // Create maintenance details object
    const maintenanceDetails = {
      jobDuration: jobDuration || 1,
      hourlyRate: hourlyRate,
      hourlyCharge: hourlyCharge,
      materials: materials || [],
      materialCost: materialCost,
      additionalCharge: additionalCharge,
      maintenancePrice: maintenanceTotal,
      maintenanceNotes: maintenanceNotes || ""
    };

    console.log("Sending maintenance details:", maintenanceDetails);
    
    // Emit the maintenance details update
    socket.emit("updateMaintenanceDetails", {
      bookingId: currentRequest.bookingId,
      maintenanceDetails: maintenanceDetails
    });

    // Update the current request with maintenance details
    setCurrentRequest(prev => ({
      ...prev,
      maintenanceDetails: maintenanceDetails
    }));

    // Show success message
    alert("Maintenance details saved successfully!");
  }
}; 