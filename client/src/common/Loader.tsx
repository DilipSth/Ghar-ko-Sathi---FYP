import React from "react";
import { helix } from "ldrs";
import { useEffect } from "react";
import "tailwindcss/tailwind.css";

const Loader = () => {
 
  useEffect(() => {
    helix.register();
  }, []);

  return (
    <div className="fixed inset-0 flex items-center justify-center">
      <l-helix size="45" speed="2.5" color="black"></l-helix>
    </div>
  );
};

export default Loader;
