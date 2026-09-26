import "@create-figma-plugin/ui/css/theme.css";
import "./styles.css";
import { render } from "preact";
import { App } from "./App";

// Inside Figma, themeColors puts figma-light / figma-dark on <html> and injects the colours.
// Elsewhere (tests, previews) fall back to the library's light theme, scoped under :root.
const root = document.documentElement;
if (!root.classList.contains("figma-light") && !root.classList.contains("figma-dark")) {
  document.body.classList.add("figma-light");
}

render(<App />, document.getElementById("root")!);
