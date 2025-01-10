const ServiceCard = ({ img, title }) => {
  return (
    <div className="flex flex-col items-center space-y-2 p-4 border rounded-lg shadow-md hover:shadow-lg hover:scale-105 transition-transform duration-300">
      {/* Ensure the image and alt text are properly aligned */}
      <img src={img} alt={title} className="w-20 h-20 object-contain" />
      <span className="text-center font-medium">{title}</span>
    </div>
  );
};

export default ServiceCard;
