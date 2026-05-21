import ReqHero     from "./sections/Reqhero";
import RequiredDocs from "./sections/RequiredDocs";
import PermitFees  from "./sections/PermitFees";
import AppGuide    from "./sections/AppGuide";
import Downloads   from "./sections/Downloads";
import NeedHelp    from "./sections/Needhelp";

export default function LandingRequirements() {
  return (
    <div className="w-full bg-brand-bg overflow-x-hidden">
      <ReqHero />
      <RequiredDocs />
      <PermitFees />
      <AppGuide />
      <Downloads />
      <NeedHelp />
    </div>
  );
}