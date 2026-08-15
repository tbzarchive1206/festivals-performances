import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import archiveData from "../app/data/archive.generated.json";
import { FestivalArchive, type RawArchive } from "./FestivalArchive";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode><FestivalArchive data={archiveData as RawArchive} /></StrictMode>,
);
