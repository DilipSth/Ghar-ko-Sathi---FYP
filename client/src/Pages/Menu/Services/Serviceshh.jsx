import ServiceCard from "./ServiceCard";

import ApplianceRepairImg from "../../../assets/Services-folder/appliance-repair.png";
import Electrician from "../../../assets/Services-folder/electrician.png";
import AirPurifier from "../../../assets/Services-folder/air-purifier.png";
import Mobiles from "../../../assets/Services-folder/repairing.png";
import CCTV from "../../../assets/Services-folder/repairing.png";
import Computer from "../../../assets/Services-folder/software-application.png";
import Medical from "../../../assets/Services-folder/surgery-room.png";
import Drone from "../../../assets/Services-folder/maintenance.png";
import Carpenter from "../../../assets/Services-folder/carpenter.png";
import Cleaning from "../../../assets/Services-folder/cleaning.png";
import Sofa from "../../../assets/Services-folder/seater-sofa.png";

// Ensure paths are correct and consistent based on your file structure
const ourServices = [
  { img: ApplianceRepairImg, title: "Appliances Repairs" },
  { img: Electrician, title: "Electrician & Plumber" },
  { img: AirPurifier, title: "Air-Purifier/Humidifier" },
  { img: Mobiles, title: "Mobiles & Tabs" },
  { img: CCTV, title: "CCTV Repair Service" },
  { img: Computer, title: "Computer/Printer" },
  { img: Medical, title: "Medical Equipment" },
  { img: Drone, title: "Drone Repair" },
  { img: Carpenter, title: "Carpenter Service" },
  { img: Cleaning, title: "Cleaning & Pest Control" },
  { img: Sofa, title: "Sofa & Chair Repair" },
];

const Services = () => {
  return (
    <div className="p-4 pt-6 h-full w-full">
      <div className="bg-white p-4 rounded-lg shadow-md h-full w-full flex flex-col">
        <h1 className="text-2xl font-bold text-center mb-6">Our Services</h1>
        {/* Responsive grid layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 cursor-pointer">
          {ourServices.map((service, index) => (
            <ServiceCard key={index} img={service.img} title={service.title} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Services;
