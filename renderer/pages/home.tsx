import { WebviewTag } from "electron";
import produce from "immer";
import Head from "next/head";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  FaArrowLeft,
  FaChevronDown,
  FaChevronRight,
  FaRedo,
  FaStepBackward,
  FaThumbtack,
  FaTimes,
  FaWindowMaximize,
  FaWindowRestore,
} from "react-icons/fa";
import { ulid } from "ulid";

const DEFAULT_STATE: StoredState = {
  items: [
    {
      id: "foobar",
      name: "Browsing",
      items: [
        {
          id: "xyz",
          name: "Blank",
          url: "about:blank",
        },
      ],
    },
  ],
};

type StoredState = {
  maximizedItem?: string;
  selectedItem?: string;
  items: Item[];
};

type AppState = StoredState & DerivedState;

type DerivedState = {
  itemsByKey: { [id: string]: { path: string[] } };
};

const getFullState = (state: StoredState): AppState => {
  const fullState = {
    ...state,
    itemsByKey: {},
  };
  setItemsById(fullState, fullState.items, []);
  return fullState;
};

const getStoredState = ({ maximizedItem, items }: AppState): StoredState => ({
  maximizedItem,
  items,
});

const setItemsById = (state: AppState, items: Item[], path: string[]) => {
  for (const item of items) {
    const currentPath = [...path, item.id];
    state.itemsByKey[item.id] = {
      path: currentPath,
    };
    if ("items" in item) {
      setItemsById(state, item.items, currentPath);
    }
  }
};

const findItem = (items: Item[], id: string): Item => {
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.id === id) {
      return item;
    }
    if ("items" in item) {
      let maybeItem = findItem(item.items, id);
      if (maybeItem) {
        return maybeItem;
      }
    }
  }
};

const doRemoveItem = (state: AppState, id: string) => {
  removeItem(state.items, id);
  if (state.maximizedItem === id) {
    state.maximizedItem = undefined;
  }
  if (state.selectedItem === id) {
    state.selectedItem = undefined;
  }
};

const removeItem = (items: Item[], id: string) => {
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.id === id) {
      items.splice(i, 1);
      return true;
    }
    if ("items" in item) {
      if (removeItem(item.items, id)) {
        return true;
      }
    }
  }
  return false;
};

const newTile = (
  state: AppState,
  name: string,
  url: string,
  browsing: boolean
) => {
  let group: Item;

  if (!browsing) {
    group = state.selectedItem && findItem(state.items, state.selectedItem);

    while (group && "url" in group) {
      const path = state.itemsByKey[group.id].path;
      const parentId = path[path.length - 2];
      group = parentId && findItem(state.items, parentId);
    }
  }

  if (!group) {
    group = state.items
      .filter(isGroupItem)
      .find((item) => item.name === "Browsing");
  }

  if (!group) {
    group = { id: ulid(), name: "Browsing", items: [] };
    state.items.push(group);
    state.itemsByKey[group.id] = {
      path: [group.id],
    };
  }

  const id = ulid();
  (group as GroupItem).items.push({ id, name, url });
  state.itemsByKey[id] = { path: [group.id, id] };
  state.selectedItem = id;
};

type BaseItem = { id: string; name: string; h?: string; collapsed?: boolean };

type PageItem = BaseItem & { url: string };
type GroupItem = BaseItem & { items: Item[] };

type Item = PageItem | GroupItem;

const isGroupItem = (item: Item): item is GroupItem => "items" in item;

const AppStateContext = createContext<
  [AppState, (cb: (state: AppState) => void) => void]
>([getFullState(DEFAULT_STATE), () => {}]);

const Page = () => {
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
            })
          ),
      ]}
    >
      <ActualPage />
    </AppStateContext.Provider>
  );
};

const ActualPage = () => {
  const [state, setState] = useContext(AppStateContext);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.ctrlKey && e.key === "n") {
        setState((state) => newTile(state, "", "about:blank", false));
      }
    };
    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="h-screen w-screen flex overflow-x-hidden">
      <Head>
        <title>
          Tiled Browser
          {state.selectedItem
            ? `- ${findItem(state.items, state.selectedItem)?.name}`
            : ""}
        </title>
      </Head>
      <Set items={state.items} />
    </div>
  );
};

const Set = ({ items, col = false }) => {
  const [state] = useContext(AppStateContext);
  return (
    <div
      className={`flex flex-grow h-full w-full ${
        col ? "flex-col" : "flex-row"
      } overflow-hidden`}
    >
      {items.map((item) => (
        <ItemComponent key={item.id} item={item} col={col} />
      ))}
    </div>
  );
};

const ItemComponent = ({ item, col }: { item: Item; col: boolean }) => {
  const vertical = item.collapsed && !col;

  const [state, setState] = useContext(AppStateContext);
  const [editName, setEditName] = useState(false);
  const [newName, setNewName] = useState(item.name);
  const [title, setTitle] = useState("");
  const [loaded, setLoaded] = useState(!item.collapsed);

  useEffect(() => {
    if (!item.collapsed) {
      setLoaded(true);
    }
  }, [item.collapsed]);

  const focus = () => {
    setState((state) => {
      if (state.selectedItem !== item.id) {
        state.selectedItem = item.id;
        findItem(state.items, item.id).collapsed = false;
      }
    });
  };

  return (
    <div
      className={`flex flex-col ${
        !state.maximizedItem ||
        state.itemsByKey[item.id].path.includes(state.maximizedItem) ||
        state.itemsByKey[state.maximizedItem].path.includes(item.id)
          ? ""
          : "hidden"
      } ${
        item.collapsed
          ? "flex-none"
          : item.h
          ? `flex-none h-${item.h}`
          : "flex-1"
      }`}
      onClick={(e) => {
        e.stopPropagation();
        focus();
      }}
    >
      <div
        className={`flex p-2 ${
          state.selectedItem === item.id
            ? `bg-gray-200 text-black`
            : `bg-gray-900 text-white`
        } ${vertical ? "flex-col flex-grow space-y-1" : "space-x-1"}`}
      >
        {"url" in item && (
          <img
            className={`w-4 h-4 ${vertical ? "ml-1" : "mt-1"}`}
            src={`${new URL(item.url).origin}/favicon.ico`}
          />
        )}
        {editName ? (
          <form
            className="flex flex-grow"
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setEditName(false);
              }
            }}
            onSubmit={(e) => {
              e.preventDefault();
              setState(
                (state) => (findItem(state.items, item.id).name = newName)
              );
              setEditName(false);
            }}
          >
            <input
              className="flex-grow bg-transparent text-inherit border-none outline-none"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
            />
          </form>
        ) : (
          <div
            className="flex-grow cursor-pointer space-x-1"
            style={{ writingMode: vertical ? "vertical-rl" : undefined }}
            onDoubleClick={() => setEditName(true)}
          >
            <span className="font-bold">{item.name}</span>
            {title && (
              <>
                {" "}
                <span className="italic">({title})</span>
              </>
            )}
          </div>
        )}
        <button
          className="p-1"
          onClick={(e) => {
            e.stopPropagation();
            setState(
              (state) =>
                (findItem(state.items, item.id).collapsed = !item.collapsed)
            );
          }}
        >
          {item.collapsed && col ? <FaChevronRight /> : <FaChevronDown />}
        </button>
        {state.maximizedItem === item.id ? (
          <button
            className="p-1"
            onClick={() =>
              setState((state) => (state.maximizedItem = undefined))
            }
          >
            <FaWindowRestore />
          </button>
        ) : (
          <button
            className="p-1"
            onClick={() => setState((state) => (state.maximizedItem = item.id))}
          >
            <FaWindowMaximize />
          </button>
        )}
        <button
          className="p-1"
          onClick={(e) => {
            e.stopPropagation();
            setState((state) => doRemoveItem(state, item.id));
          }}
        >
          <FaTimes />
        </button>
      </div>
      <div
        className={`flex flex-col flex-grow ${item.collapsed ? "hidden" : ""}`}
      >
        {"url" in item ? (
          loaded && <WebItem item={item} setTitle={setTitle} onFocus={focus} />
        ) : (
          <Set items={item.items} col={!col} />
        )}
      </div>
    </div>
  );
};

const WebItem = ({ item, setTitle, onFocus }) => {
  const webView = useRef<WebviewTag>();
  const addressBar = useRef<HTMLInputElement>();
  const [url, setUrl] = useState(item.url);
  const [state, setState] = useContext(AppStateContext);

  useEffect(() => {
    const firstLoad = () => {
      webView.current.setZoomLevel(-1);
      webView.current.removeEventListener("dom-ready", firstLoad);
    };
    webView.current.addEventListener("dom-ready", firstLoad);
    webView.current.addEventListener("will-navigate", (e) => {
      addressBar.current.value = (e as any).url;
    });
    webView.current.addEventListener("did-navigate", (e) => {
      addressBar.current.value = (e as any).url;
    });

    webView.current.addEventListener("page-title-updated", (e) => {
      const title = webView.current.getTitle();
      if (title) {
        setTitle(title);
      }
    });
    webView.current.addEventListener("new-window", (e) => {
      setState((state) => newTile(state, "", e.url, true));
    });
    webView.current.addEventListener("focus", onFocus);
  }, []);

  const navigate = (url: string, force = false) => {
    if (!/^\w+:\/\//.test(url)) {
      if (/\.\w{2,3}$/.test(url)) {
        url = `https://${url}`;
      } else {
        url = `https://www.google.com/search?q=${encodeURIComponent(
          url
        ).replaceAll("%20", "+")}`;
      }
    }
    addressBar.current.value = url;
    if (force) {
      webView.current.loadURL(url);
    } else {
      setUrl(url);
    }
  };

  useEffect(() => {
    if (item.url !== addressBar.current.value) {
      setUrl(item.url);
    }
  }, [item.url]);

  return (
    <>
      <div className="flex p-2 space-x-1">
        {(addressBar.current?.value || url) !== item.url && (
          <>
            <button
              className="p-1 border border-transparent"
              onClick={() => {
                navigate(
                  item.url,
                  url === item.url && url !== webView.current.getURL()
                );
              }}
            >
              <FaStepBackward />
            </button>
            <button
              className="p-1 border border-transparent"
              onClick={() => {
                setState(
                  (state) =>
                    ((findItem(state.items, item.id) as PageItem).url =
                      addressBar.current.value)
                );
              }}
            >
              <FaThumbtack />
            </button>
          </>
        )}
        <button
          className="p-1 border border-transparent"
          onClick={() => webView.current.goBack()}
        >
          <FaArrowLeft />
        </button>
        <button
          className="p-1 border border-transparent"
          onClick={() => webView.current.reload()}
        >
          <FaRedo />
        </button>
        <div className="flex flex-grow">
          <form
            className="flex flex-grow"
            onSubmit={(e) => {
              e.preventDefault();
              navigate(addressBar.current.value);
            }}
          >
            <input
              ref={addressBar}
              className="flex-grow border border-gray-500 rounded p-1"
              defaultValue={item.url}
              autoFocus
              onFocus={(e) => e.target.setSelectionRange(0, -1)}
              onKeyDown={(e) => {
                if (e.ctrlKey && e.key === "w") {
                  e.preventDefault();
                  e.stopPropagation();
                  setState((state) => doRemoveItem(state, item.id));
                }
              }}
            />
          </form>
        </div>
      </div>
      <webview
        ref={webView}
        src={url}
        className="flex-grow"
        useragent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.131 Safari/537.36"
        /*useragent="Chrome"*/
      />
    </>
  );
};

export default Page;
