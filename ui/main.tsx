import "@create-figma-plugin/ui/css/theme.css";
import "./styles.css";
import { render } from "preact";
import { App } from "./App";
import { syncTheme } from "./theme";

syncTheme();
render(<App />, document.getElementById("root")!);
