import React, { useState, useEffect } from "react";
import { HiOutlineSearch } from "react-icons/hi";
import { SlMenu } from "react-icons/sl";
import { VscChromeClose } from "react-icons/vsc";
import { HiSun, HiMoon } from "react-icons/hi";
import { FiUser, FiLogOut } from "react-icons/fi";
import { useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import "./style.scss";
import ContentWrapper from "../contentWrapper/ContentWrapper";
import logo from "../../assets/vmflix-wordmark.svg";
import { useTheme } from "../../context/ThemeContext";
import { logoutUser } from "../../store/authSlice";
import LiveModal from "../liveModal/LiveModal";

const Header = () => {
  const [show, setShow] = useState("top");
  const [lastScrollY, setLastScrollY] = useState(0);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [query, setQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showLive, setShowLive] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { theme, toggleTheme } = useTheme();
  const { isLoggedIn, user } = useSelector((state) => state.user);

  useEffect(() => {
    window.scrollTo(0, 0);
    setMobileMenu(false);
    setShowSearch(false);
  }, [location]);

  const controlNavbar = () => {
    if (window.scrollY > 200) {
      if (window.scrollY > lastScrollY && !mobileMenu) {
        setShow("hide");
      } else {
        setShow("show");
      }
    } else {
      setShow("top");
    }
    setLastScrollY(window.scrollY);
  };

  useEffect(() => {
    window.addEventListener("scroll", controlNavbar);
    return () => window.removeEventListener("scroll", controlNavbar);
  }, [lastScrollY]);

  const searchQueryHandler = (event) => {
    if (event.key === "Enter" && query.length > 0) {
      navigate(`/search/${query}`);
      setTimeout(() => setShowSearch(false), 1000);
    }
  };

  const openSearch = () => {
    setMobileMenu(false);
    setShowSearch(true);
  };

  const openMobileMenu = () => {
    setMobileMenu(true);
    setShowSearch(false);
  };

  const navigationHandler = (type) => {
    navigate(`/explore/${type}`);
    setMobileMenu(false);
  };

  const handleLogout = () => {
    dispatch(logoutUser());
    toast.success("Logged out successfully.");
    navigate("/");
  };

  return (
    <>
      <header className={`header ${mobileMenu ? "mobileView" : ""} ${show}`}>
        <ContentWrapper>
          <div className="logo" onClick={() => navigate("/")}>
            <img src={logo} alt="VMFlix logo" />
          </div>

          <ul className="menuItems">
            <li className="menuItem" onClick={() => navigationHandler("movie")}>
              Movies
            </li>
            <li className="menuItem" onClick={() => navigationHandler("tv")}>
              TV Shows
            </li>
            <li className="menuItem searchIcon" onClick={openSearch}>
              <HiOutlineSearch />
            </li>
            <li className="menuItem liveBtn" onClick={() => setShowLive(true)}>
              <span className="livePulse" />
              LIVE
            </li>
            <li
              className="menuItem themeToggle"
              onClick={toggleTheme}
              title={theme === "dark" ? "Switch to Light" : "Switch to Dark"}
            >
              {theme === "dark" ? <HiSun /> : <HiMoon />}
            </li>
            {isLoggedIn ? (
              <li className="menuItem userMenu">
                <span className="userName">
                  <FiUser />
                  {user?.name?.split(" ")[0]}
                </span>
                <button className="logoutBtn" onClick={handleLogout}>
                  <FiLogOut />
                </button>
              </li>
            ) : (
              <li
                className="menuItem loginBtn"
                onClick={() => navigate("/login")}
              >
                Sign In
              </li>
            )}
          </ul>

          <div className="mobileMenuItems">
            <HiOutlineSearch onClick={openSearch} />
            <span className="themeToggleMobile" onClick={toggleTheme}>
              {theme === "dark" ? <HiSun /> : <HiMoon />}
            </span>
            {mobileMenu ? (
              <VscChromeClose onClick={() => setMobileMenu(false)} />
            ) : (
              <SlMenu onClick={openMobileMenu} />
            )}
          </div>
        </ContentWrapper>

        {showSearch && (
          <div className="searchBar">
            <ContentWrapper>
              <div className="searchInput">
                <HiOutlineSearch className="searchBarIcon" />
                <input
                  type="text"
                  placeholder="Search movies or TV shows..."
                  autoFocus
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyUp={searchQueryHandler}
                />
                <VscChromeClose
                  className="closeIcon"
                  onClick={() => setShowSearch(false)}
                />
              </div>
            </ContentWrapper>
          </div>
        )}
      </header>
      <LiveModal show={showLive} setShow={setShowLive} />
    </>
  );
};

export default Header;
