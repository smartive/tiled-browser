import { WebviewTag } from "electron";
import produce from "immer";
import Head from "next/head";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  FaArrowLeft,
  FaChevronDown,
  FaChevronRight,
  FaEllipsisH,
  FaEllipsisV,
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
  editItemName?: string;
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

const getCurrentGroup = (state: AppState) => {
  let group = state.selectedItem && findItem(state.items, state.selectedItem);

  while (group && "url" in group) {
    const path = state.itemsByKey[group.id].path;
    const parentId = path[path.length - 2];
    group = parentId && findItem(state.items, parentId);
  }

  return group as GroupItem;
};

const newGroup = (state: AppState) => {
  let currentGroup = getCurrentGroup(state);

  const group = {
    id: ulid(),
    name: "New Group",
    items: [],
  };
  if (currentGroup) {
    currentGroup.items.push(group);
    state.itemsByKey[group.id] = {
      path: [...state.itemsByKey[currentGroup.id].path, group.id],
    };
  } else {
    state.items.push(group);
    state.itemsByKey[group.id] = { path: [group.id] };
  }
  state.selectedItem = group.id;
  state.editItemName = group.id;
};

const newTile = (
  state: AppState,
  name: string,
  url: string,
  browsing: boolean
) => {
  let group: GroupItem;

  if (!browsing) {
    group = getCurrentGroup(state);
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
  group.items.push({ id, name, url });
  state.itemsByKey[id] = { path: [group.id, id] };
  state.selectedItem = id;
};

const switchVerticalSetting = (
  verticalSetting: boolean | undefined,
  verticalComputed: boolean
): boolean | undefined => {
  if (verticalSetting === undefined) {
    return !verticalComputed;
  }
  if (verticalSetting !== verticalComputed) {
    return !verticalSetting;
  }

  return undefined;
};

type BaseItem = { id: string; name: string; h?: string; collapsed?: boolean };
type PageItem = BaseItem & { url: string };
type GroupItem = BaseItem & {
  items: Item[];
  vertical?: boolean;
};

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
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && !e.shiftKey && e.key === "n") {
        setState((state) => newTile(state, "", "about:blank", false));
      } else if (e.ctrlKey && e.shiftKey && e.key === "N") {
        setState((state) => newGroup(state));
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

const Set = ({ items, vertical = false }) => (
  <div
    className={`flex flex-grow h-full w-full ${
      vertical ? "flex-col" : "flex-row"
    } overflow-hidden`}
  >
    {items.map((item) => (
      <ItemComponent key={item.id} item={item} />
    ))}
  </div>
);

const getParent = (state: AppState, item: Item) => {
  const path = state.itemsByKey[item.id].path;
  const parentId = path[path.length - 2];
  return parentId && findItem(state.items, parentId);
};

const getItemVertical = (state: AppState, item: Item) => {
  const path = state.itemsByKey[item.id].path;
  const computedVertical = path.length > 0; // !!(path.length % 2);
  return [
    "vertical" in item && item.vertical !== undefined
      ? item.vertical
      : computedVertical,
    computedVertical,
  ];
};

const ItemComponent = ({ item }: { item: Item }) => {
  const [state, setState] = useContext(AppStateContext);
  const [newName, setNewName] = useState(item.name);
  const [title, setTitle] = useState("");
  const [loaded, setLoaded] = useState(!item.collapsed);

  const parent = getParent(state, item);
  const path = state.itemsByKey[item.id].path;
  const [parentVertical] = parent ? getItemVertical(state, parent) : [false];
  const [vertical, computedVertical] = getItemVertical(state, item);

  const verticalText = item.collapsed && !parentVertical;

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
      className={`flex flex-col
        ${
          state.selectedItem === item.id
            ? `bg-gray-200 text-black`
            : `bg-gray-900 text-white hover:bg-gray-700`
        }
        ${
          !state.maximizedItem ||
          state.itemsByKey[item.id].path.includes(state.maximizedItem) ||
          state.itemsByKey[state.maximizedItem].path.includes(item.id)
            ? ""
            : "hidden"
        }
        ${
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
          verticalText ? "flex-col flex-grow space-y-1" : "space-x-1"
        }`}
        style={
          verticalText
            ? {}
            : {
                [`paddingLeft`]: `${path.length - 0.5}rem`,
              }
        }
      >
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
          {item.collapsed && parentVertical ? (
            <FaChevronRight />
          ) : (
            <FaChevronDown />
          )}
        </button>
        {"url" in item && (
          <img
            className={`w-4 h-4 ${verticalText ? "ml-1" : "mt-1"}`}
            src={`${new URL(item.url).origin}/favicon.ico`}
          />
        )}
        {state.editItemName === item.id ? (
          <form
            className="flex flex-grow"
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setState((state) => (state.editItemName = undefined));
                setNewName(item.name);
              }
            }}
            onSubmit={(e) => {
              e.preventDefault();
              setState((state) => {
                findItem(state.items, item.id).name = newName;
                state.editItemName = undefined;
              });
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
            style={{ writingMode: verticalText ? "vertical-rl" : undefined }}
            onDoubleClick={() =>
              setState((state) => (state.editItemName = item.id))
            }
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
        {!item.collapsed && (
          <>
            {"items" in item && (
              <button
                className={`p-1 ${
                  item.vertical === undefined ? "text-gray-500" : ""
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  setState(
                    (state) =>
                      ((findItem(
                        state.items,
                        item.id
                      ) as GroupItem).vertical = switchVerticalSetting(
                        item.vertical,
                        computedVertical
                      ))
                  );
                }}
              >
                {vertical ? <FaEllipsisV /> : <FaEllipsisH />}
              </button>
            )}
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
                onClick={() =>
                  setState((state) => (state.maximizedItem = item.id))
                }
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
          </>
        )}
      </div>
      <div
        className={`flex flex-col flex-grow ${
          item.collapsed ? "hidden" : ""
        } bg-white text-black`}
      >
        {"url" in item ? (
          loaded && <WebItem item={item} setTitle={setTitle} onFocus={focus} />
        ) : (
          <Set items={item.items} vertical={vertical} />
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
