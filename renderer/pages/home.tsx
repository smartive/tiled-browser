import dayJs from "dayjs";
import produce from "immer";
import Head from "next/head";
import { useEffect, useState } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import {
  FaExpand,
  FaFileExport,
  FaPlus,
  FaPlusSquare,
  FaSearch,
} from "react-icons/fa";
import { Button } from "../components/button";
import { Import } from "../components/import";
import { Group } from "../components/item";
import { Search } from "../components/search";
import { AppStateContext, useAppState } from "../hooks/context";
import {
  AppState,
  DEFAULT_STATE,
  deriveFullState,
  findItem,
  getFullState,
  getStoredState,
  newGroup,
  newTile,
} from "../utils/browser";

const Page = () => (
  <DndProvider backend={HTML5Backend}>
    <PageWithDnd />
  </DndProvider>
);

const PageWithDnd = () => {
  const [state, setState] = useState<AppState>();

  useEffect(() => {
    let state: any = localStorage.getItem("tiled-browser-state");
    if (state) {
      state = JSON.parse(state);
    } else {
      state = DEFAULT_STATE;
    }
    setState(getFullState(state));
  }, []);

  useEffect(() => {
    if (state) {
      localStorage.setItem(
        "tiled-browser-state",
        JSON.stringify(getStoredState(state), null, 2)
      );
    }
  }, [state]);

  if (!state) {
    return null;
  }

  return (
    <AppStateContext.Provider
      value={[
        state,
        (cb) =>
          setState((state) =>
            produce(state, (state) => {
              cb(state);
              deriveFullState(state);
            })
          ),
      ]}
    >
      <ActualPage />
    </AppStateContext.Provider>
  );
};

const ActualPage = () => {
  const [state, setState] = useAppState();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      setState((state) => {
        if (e.ctrlKey && e.code === "KeyN") {
          newTile(state, "", "about:blank", e.shiftKey && state);
        } else if (e.ctrlKey && e.code === "KeyG") {
          newGroup(state, e.shiftKey && state);
        } else if (state.search !== undefined && e.code === "Escape") {
          state.search = undefined;
        } else if (e.ctrlKey && e.code === "KeyF") {
          state.search = "";
          state.selectedItem = undefined;
        }
      });
    };
    window.addEventListener("keydown", onKeyDown);

    const onMouseMove = (e: MouseEvent) => {
      setState((state) => {
        if (state.resizeItem) {
          if (e.buttons === 0) {
            state.resizeItem = undefined;
          } else {
            findItem(state.items, state.resizeItem.id)[
              state.resizeItem.vertical ? "height" : "width"
            ] =
              state.resizeItem.startSize +
              (state.resizeItem.vertical ? e.pageY : e.pageX) -
              state.resizeItem.startPos;
          }
        }
      });
    };
    window.addEventListener("mousemove", onMouseMove);
    const onMouseUp = (e: MouseEvent) => {
      setState((state) => {
        if (state.resizeItem) {
          findItem(state.items, state.resizeItem.id)[
            state.resizeItem.vertical ? "height" : "width"
          ] =
            state.resizeItem.startSize +
            (state.resizeItem.vertical ? e.pageY : e.pageX) -
            state.resizeItem.startPos;
          state.resizeItem = undefined;
        }
      });
    };
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  return (
    <div className="text-sm h-screen w-screen flex overflow-x-hidden bg-gray-700 text-white">
      <Head>
        <title>
          Tiled Browser
          {state.selectedItem
            ? `- ${findItem(state.items, state.selectedItem)?.name}`
            : ""}
        </title>
      </Head>
      <Group id="root" items={state.items} />
      <div className="flex flex-col space-y-1 p-2">
        <Button
          size="normal"
          title="New Tile"
          shortcut="Ctrl-Shift-N"
          onClick={() =>
            setState((state) => newTile(state, "", "about:blank", state))
          }
        >
          <FaPlus />
        </Button>
        <Button
          size="normal"
          title="New Group"
          shortcut="Ctrl-Shift-G"
          onClick={() => setState((state) => newGroup(state, state))}
        >
          <FaPlusSquare />
        </Button>
        <Button
          size="normal"
          title="Search"
          shortcut="Ctrl-Shift-S"
          onClick={() =>
            setState((state) => {
              state.search = "";
              state.selectedSearchResult = undefined;
            })
          }
        >
          <FaSearch />
        </Button>
        <Button
          size="normal"
          title="Toggle Focus Mode"
          shortcut={null}
          onClick={() => setState((state) => (state.focus = !state.focus))}
          className={state.focus ? "" : "text-gray-500"}
        >
          <FaExpand />
        </Button>
        <Import />
        <Button
          size="normal"
          title="Export Settings"
          shortcut={null}
          onClick={() => {
            const a = document.createElement("a");
            a.href = `data:application/json;charset=utf-8,${encodeURIComponent(
              JSON.stringify(getStoredState(state), null, 2)
            )}`;
            a.download = `tiled-browser-export-${dayJs().format(
              "YYYY-MM-DD_HH-mm-ss"
            )}.json`;
            a.click();
          }}
        >
          <FaFileExport />
        </Button>
      </div>
      {state.search !== undefined && <Search />}
    </div>
  );
};

export default Page;
