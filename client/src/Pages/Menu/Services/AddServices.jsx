import axios from "axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const AddServices = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    ser_name: "",
    image: null,
  });
  const [previewImage, setPreviewImage] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "image" && files.length > 0) {
      const file = files[0];
      setFormData({ ...formData, image: file });
      setPreviewImage(URL.createObjectURL(file));
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      setFormData({ ...formData, image: file });
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setFormData({ ...formData, image: null });
    setPreviewImage(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formDataObj = new FormData();
    formDataObj.append("ser_name", formData.ser_name);
    if (formData.image) {
      formDataObj.append("image", formData.image);
    }

    try {
      const response = await axios.post(
        "http://localhost:8000/api/services/add",
        formDataObj,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data?.success) {
        navigate("/dashboard/menu/services");
      } else {
        alert(response.data.error || "Failed to add service.");
      }
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.error || "An unexpected error occurred.");
    }
  };

  return (
    <div className="p-6 h-full w-full flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">Add New Service</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Service Name Input */}
          <div>
            <label
              htmlFor="ser_name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Service Name
            </label>
            <input
              id="ser_name"
              name="ser_name"
              type="text"
              placeholder="Enter service name"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={handleChange}
              required
            />
          </div>

          {/* Image Upload */}
          <div>
            <label
              htmlFor="image"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Upload Image
            </label>
            <div
              className={`w-full h-40 border-2 ${
                isDragging ? "border-blue-500" : "border-gray-300"
              } rounded-lg flex flex-col justify-center items-center gap-2 bg-gray-50 hover:bg-gray-100 transition-colors`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {previewImage ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  <img
                    src={previewImage}
                    alt="Selected"
                    className="object-contain h-full w-full rounded-lg"
                  />
                  <button
                    type="button"
                    className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-semibold hover:bg-red-600"
                    onClick={handleRemoveImage}
                  >
                    Change
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-gray-500 text-sm">
                    Drag & Drop an image here or click to select
                  </p>
                  <input
                    id="image"
                    type="file"
                    name="image"
                    className="hidden"
                    onChange={handleChange}
                    accept="image/*"
                  />
                  <label
                    htmlFor="image"
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-blue-600"
                  >
                    Browse
                  </label>
                </>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Add Service
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddServices;
