import { Outlet } from "react-router-dom";
import AddToHomeScreen from "./AddToHomeScreen";

const PublicLayout = () => {
  return (
    <>
      <Outlet />
      <AddToHomeScreen />
    </>
  );
};

export default PublicLayout;