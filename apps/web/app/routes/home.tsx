import { HomePage } from "../features/home/home-page.js";

export function meta() {
  return [{ title: "AI Studio" }];
}

export default function HomeRoute() {
  return <HomePage />;
}
