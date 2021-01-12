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
import {
  AppState,
  DEFAULT_STATE,
  doRemoveItem,
  findItem,
  getFullState,
  getItemVertical,
  getParent,
  getStoredState,
  GroupItem,
  Item,
  newGroup,
  newTile,
  PageItem,
  switchVerticalSetting,
} from "../utils/browser";

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

const ItemComponent = ({ item }: { item: Item }) => {
  const [state, setState] = useContext(AppStateContext);
  const [newName, setNewName] = useState(item.name);
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
            src={item.favicon || `${new URL(item.url).origin}/favicon.ico`}
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
            {"title" in item && item.title && item.title !== item.name && (
              <>
                {" "}
                <span className="italic">({item.title})</span>
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
          loaded && <WebItem item={item} onFocus={focus} />
        ) : (
          <Set items={item.items} vertical={vertical} />
        )}
      </div>
    </div>
  );
};

const WebItem = ({ item, onFocus }) => {
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
        setState((state) => {
          const theItem = findItem(state.items, item.id) as PageItem;
          theItem.title = title;
          if (!theItem.name) {
            theItem.name = title;
          }
        });
      }
    });
    webView.current.addEventListener("new-window", (e) => {
      setState((state) => newTile(state, "", e.url, true));
    });
    webView.current.addEventListener("focus", onFocus);
    webView.current.addEventListener("page-favicon-updated", (e) => {
      if (e.favicons.length) {
        setState(
          (state) =>
            ((findItem(state.items, item.id) as PageItem).favicon =
              e.favicons[0])
        );
      }
    });
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
    return url;
  };

  useEffect(() => {
    if (item.url !== addressBar.current.value) {
      setUrl(item.url);
    }
  }, [item.url]);

  return (
    <>
      <div className="flex p-2 space-x-1">
        <button
          title="pin this url"
          disabled={(addressBar.current?.value || url) === item.url}
          className={`p-1 border border-transparent ${
            (addressBar.current?.value || url) === item.url
              ? "text-gray-400 cursor-default"
              : ""
          }`}
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
        <button
          title={`back to pinned url (${item.url})`}
          disabled={(addressBar.current?.value || url) === item.url}
          className={`p-1 border border-transparent ${
            (addressBar.current?.value || url) === item.url
              ? "text-gray-400 cursor-default"
              : ""
          }`}
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
          title="back"
          className="p-1 border border-transparent"
          onClick={() => webView.current.goBack()}
        >
          <FaArrowLeft />
        </button>
        <button
          title="reload"
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
              const newUrl = navigate(addressBar.current.value);
              if (url === "about:blank") {
                setState(
                  (state) =>
                    ((findItem(state.items, item.id) as PageItem).url = newUrl)
                );
              }
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
