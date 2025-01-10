import { LuBell } from "react-icons/lu";
import { IoSearch } from "react-icons/io5";
import { GiHamburgerMenu } from "react-icons/gi";
import { CiPaperplane } from "react-icons/ci";
import { useAuth } from "../../context/authContext";

export default function Header({ toggleSidebar }) {
  const { user } = useAuth();


  return (
    <header className="bg-white border-b border-gray-300 shadow-xl">
      <nav className="mx-auto flex max-w-[2000px] items-center justify-between py-2 px-6 lg:px-8">
        <div className="text-center text-[#E0E0E0] items-center flex gap-5">
          <button
            onClick={toggleSidebar}
            className="text-white text-[24px] lg:hidden focus:outline-none"
          >
            <GiHamburgerMenu />
          </button>

          <div className="max-lg:hidden">
            <h1 className="font-semibold text-lg max-sm:text-base max-sm:font-bold text-left text-[#333333]">
              {user?.name}
            </h1>
            <p className="text-sm max-sm:text-sm font-light text-[#333333]">
              Stay up-to-date with the data provided below.
            </p>
          </div>

          <img
            // src={RCCILogo}
            className="max-lg:flex max-lg:w-12 max-lg:h-12 hidden"
          />
        </div>

        <div className="flex items-center lg:justify-end gap-10 max-sm:gap-4">
          <div className="flex flex-row gap-5">
            <span>
              <IoSearch className=" max-lg:hidden text-[#333333] text-[24px] cursor-pointer transition ease-in-out duration-500 max-sm:text-[18px]" />
            </span>
            <span>
              <CiPaperplane className="lg:hidden text-[#333333] text-[24px] cursor-pointer transition ease-in-out duration-500 max-sm:text-[18px]" />
            </span>
            <span>
              <LuBell className="text-[#333333] text-[24px] cursor-pointer transition ease-in-out duration-500 max-sm:text-[18px]" />
            </span>
          </div>
          <span>{/* <DropdownUser /> */}</span>
        </div>
      </nav>
    </header>
  );
}
