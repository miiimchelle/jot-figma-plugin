import type { AuthorDisplay, JournalEntry } from "../logic";

// Messages the UI sends to the plugin (code.ts handlers).
export type OutMessage =
  | { type: "GET_JOURNAL" }
  | { type: "GET_FILE_KEY" }
  | { type: "GET_PREFS" }
  | { type: "SET_PREFS"; display: AuthorDisplay }
  | { type: "SET_FILE_KEY"; fileKey: string }
  | { type: "ADD_ENTRY"; entryType: string; heading: string; note: string; display: AuthorDisplay }
  | { type: "UPDATE_ENTRY"; id: string; entryType: string; heading: string; note: string; display: AuthorDisplay }
  | { type: "DELETE_ENTRY"; id: string }
  | { type: "LINK_ENTRY"; id: string }
  | { type: "UNLINK_ENTRY"; id: string }
  | { type: "GO_TO_ENTRY"; id: string; nodeId: string }
  | { type: "EXPORT_MD" };

// Messages the plugin sends to the UI.
export type InMessage =
  | { type: "ERROR"; message: string }
  | { type: "FILE_KEY"; fileKey: string }
  | { type: "JOURNAL"; entries: JournalEntry[] }
  | { type: "EXPORT_MD_RESULT"; markdown: string }
  | { type: "PREFS"; display: AuthorDisplay };

export function send(msg: OutMessage) {
  parent.postMessage({ pluginMessage: msg }, "*");
}
