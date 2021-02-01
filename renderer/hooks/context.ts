import { createContext, useContext } from "react";
import { AppState, DEFAULT_STATE, getFullState } from "../utils/browser";

export const AppStateContext = createContext<
  [AppState, (cb: (state: AppState) => void) => void]
>([getFullState(DEFAULT_STATE), () => {}]);

export const useAppState = () => useContext(AppStateContext);
