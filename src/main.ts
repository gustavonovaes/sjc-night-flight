import { startLoop } from "./game";
import { preloadImages } from "./assets";

const BASE = import.meta.env.BASE_URL;

preloadImages({
  cloud: `${BASE}assets/cloud.png`,
}).then(() => startLoop());
