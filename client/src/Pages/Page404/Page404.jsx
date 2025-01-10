import { Link } from "react-router-dom";

const Page404 = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[65vh]">
      <h1 className="text-[100px] font-bold">404</h1>
      <h2 className="text-4xl font-normal">Oops! Page Not Found</h2>
      <Link
        to="/dashboard"
        className="mt-4 px-4 py-2 border border-black text-black hover:bg-black hover:text-white transition-colors duration-300"
      >
        Go Back
      </Link>
    </div>
  );
};

export default Page404;
