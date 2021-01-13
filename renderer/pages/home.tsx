import { WebviewTag } from "electron";
import produce from "immer";
import Head from "next/head";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import {
  FaArrowLeft,
  FaChevronDown,
  FaChevronRight,
  FaEllipsisH,
  FaEllipsisV,
  FaPlus,
  FaPlusSquare,
  FaRedo,
  FaStepBackward,
  FaThumbtack,
  FaTimes,
  FaWindowMaximize,
  FaWindowRestore,
} from "react-icons/fa";
import { AddressBarButton, Button } from "../components/button";
import {
  AppState,
  DEFAULT_STATE,
  deriveFullState,
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
  const [state, setState] = useContext(AppStateContext);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.code === "KeyN") {
        setState((state) =>
          newTile(state, "", "about:blank", e.shiftKey && state)
        );
      } else if (e.ctrlKey && e.code === "KeyG") {
        setState((state) => newGroup(state, e.shiftKey && state));
      }
    };
    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="h-screen w-screen flex overflow-x-hidden bg-gray-700 text-white">
      <Head>
        <title>
          Tiled Browser
          {state.selectedItem
            ? `- ${findItem(state.items, state.selectedItem)?.name}`
            : ""}
        </title>
      </Head>
      <Set id="root" items={state.items} />
      <div className="text-lg flex flex-col p-2">
        <Button
          size="lg"
          title="New Tile"
          shortcut="Ctrl-Shift-N"
          onClick={() =>
            setState((state) => newTile(state, "", "about:blank", state))
          }
        >
          <FaPlus />
        </Button>
        <Button
          size="lg"
          title="New Group"
          shortcut="Ctrl-Shift-G"
          onClick={() => setState((state) => newGroup(state, state))}
        >
          <FaPlusSquare />
        </Button>
      </div>
    </div>
  );
};

const Set = ({ id, items, vertical = false }) => {
  const [, setState] = useContext(AppStateContext);

  const [, dropRef] = useDrop<any, any, any>({
    accept: ITEM_TYPE,
    drop: ({ item: droppedItem }: { item: Item }, monitor) => {
      if (droppedItem.id === id) {
        return;
      }
      if (monitor.didDrop()) {
        return;
      }

      setState((state) => {
        const parent = getParent(state, droppedItem.id) || state;
        const index = parent.items.findIndex(
          (other) => other.id === droppedItem.id
        );
        const [splicedItem] = parent.items.splice(index, 1);
        const newParent = (findItem(state.items, id) as GroupItem) || state;
        newParent.items.push(splicedItem);
        console.log("mooooved");
      });
    },
  });
  return (
    <div
      ref={dropRef}
      className={`flex flex-grow h-full w-full divide-gray-300 ${
        vertical ? "flex-col divide-y" : "flex-row divide-x"
      } overflow-hidden`}
    >
      {items.map((item) => (
        <ItemComponent key={item.id} item={item} />
      ))}
    </div>
  );
};

const ItemComponent = ({ item }: { item: Item }) => {
  const ref = useRef<HTMLDivElement>();
  const [state, setState] = useContext(AppStateContext);
  const [newName, setNewName] = useState(item.name);
  const [loaded, setLoaded] = useState(!item.collapsed);

  const parent = getParent(state, item.id);
  const path = state.itemsByKey[item.id].path;
  const [parentVertical] = parent ? getItemVertical(state, parent) : [false];
  const [vertical, computedVertical] = getItemVertical(state, item);

  const verticalText = item.collapsed && !parentVertical;
  const favicon =
    "url" in item &&
    (item.favicon !== undefined
      ? item.favicon
      : `${new URL(item.url).origin}/favicon.ico`);

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

  const [, dropRef] = useDrop<any, any, any>({
    accept: ITEM_TYPE,
    drop: ({ item: droppedItem }: { item: Item }, monitor) => {
      if (droppedItem.id === item.id) {
        return;
      }
      if (monitor.didDrop()) {
        return;
      }
      const hoverBoundingRect = ref.current.getBoundingClientRect();
      const hoverMiddle =
        (parentVertical
          ? hoverBoundingRect.bottom - hoverBoundingRect.top
          : hoverBoundingRect.right - hoverBoundingRect.left) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClient = parentVertical
        ? clientOffset.y - hoverBoundingRect.top
        : clientOffset.x - hoverBoundingRect.left;

      setState((state) => {
        const parent = getParent(state, droppedItem.id) || state;
        const index = parent.items.findIndex(
          (other) => other.id === droppedItem.id
        );
        const [splicedItem] = parent.items.splice(index, 1);
        const newParent = getParent(state, item.id) || state;
        const newIndex =
          newParent.items.findIndex((other) => other.id === item.id) +
          +(hoverClient > hoverMiddle);
        newParent.items.splice(newIndex, 0, splicedItem);
        console.log(
          "moved",
          ["id" in parent ? parent.id : "root", index],
          ["id" in newParent ? newParent.id : "root", newIndex]
        );
      });
    },
  });

  const [{ opacity }, dragRef, previewRef] = useDrag({
    item: { type: ITEM_TYPE, item },
    collect: (monitor) => ({
      opacity: monitor.isDragging() ? 0.5 : 1,
    }),
  });

  dropRef(previewRef(ref));

  return (
    <div
      ref={ref}
      className={`group flex flex-col
        ${
          state.selectedItem === item.id
            ? `bg-gray-200 text-black`
            : `bg-gray-800 text-white hover:bg-gray-700`
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
      style={{ opacity }}
      onClick={(e) => {
        e.stopPropagation();
        focus();
      }}
    >
      <div
        ref={dragRef}
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
        <Button
          title={item.collapsed ? "Expand" : "Collapse"}
          shortcut={null}
          onClick={(e) => {
            e.stopPropagation();
            setState((state) => {
              const newCollapsed = !item.collapsed;
              findItem(state.items, item.id).collapsed = newCollapsed;
              if (newCollapsed) {
                if (state.selectedItem === item.id) {
                  state.selectedItem = undefined;
                }
                if (state.maximizedItem === item.id) {
                  state.maximizedItem = undefined;
                }
                if (state.editItemName === item.id) {
                  state.editItemName = undefined;
                }
              }
            });
          }}
        >
          {item.collapsed && parentVertical ? (
            <FaChevronRight />
          ) : (
            <FaChevronDown />
          )}
        </Button>
        {favicon && (
          <img
            onError={(e) => {
              console.log(e);
              setState(
                (state) =>
                  ((findItem(state.items, item.id) as PageItem).favicon = null)
              );
            }}
            className={`w-4 h-4 ${verticalText ? "ml-1" : "mt-1"}`}
            src={favicon}
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
              onFocus={(e) => e.target.setSelectionRange(0, -1)}
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
            {item.name ? (
              <span className="font-bold">{item.name}</span>
            ) : "url" in item ? (
              "New Tile"
            ) : (
              "New Group"
            )}
            {"title" in item && item.title && item.title !== item.name && (
              <>
                {" "}
                <span className="italic">({item.title})</span>
              </>
            )}
          </div>
        )}
        {!item.collapsed && (
          <div className="flex space-x-1 opacity-0 group-hover:opacity-100">
            {"items" in item && (
              <>
                <Button
                  title="Toggle Children Layout"
                  shortcut={null}
                  className={item.vertical === undefined ? "text-gray-500" : ""}
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
                </Button>
                <Button
                  title="New Subgroup"
                  shortcut="Ctrl-G"
                  onClick={() =>
                    setState((state) =>
                      newGroup(
                        state,
                        findItem(state.items, item.id) as GroupItem
                      )
                    )
                  }
                >
                  <FaPlusSquare />
                </Button>
                <Button
                  title="New Tile"
                  shortcut="Ctrl-N"
                  onClick={() =>
                    setState((state) =>
                      newTile(
                        state,
                        "",
                        "about:blank",
                        findItem(state.items, item.id) as GroupItem
                      )
                    )
                  }
                >
                  <FaPlus />
                </Button>
              </>
            )}
            {state.maximizedItem === item.id ? (
              <Button
                title="Restore"
                shortcut={null}
                onClick={() =>
                  setState((state) => (state.maximizedItem = undefined))
                }
              >
                <FaWindowRestore />
              </Button>
            ) : (
              <Button
                title="Maximize"
                shortcut={null}
                onClick={() =>
                  setState((state) => (state.maximizedItem = item.id))
                }
              >
                <FaWindowMaximize />
              </Button>
            )}
            <Button
              title="Close"
              shortcut="Ctrl-W"
              onClick={(e) => {
                e.stopPropagation();
                setState((state) => doRemoveItem(state, item.id));
              }}
            >
              <FaTimes />
            </Button>
          </div>
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
          <Set id={item.id} items={item.items} vertical={vertical} />
        )}
      </div>
    </div>
  );
};

const ITEM_TYPE = "ITEM";

const WebItem = ({ item, onFocus }) => {
  const webView = useRef<WebviewTag>();
  const addressBar = useRef<HTMLInputElement>();
  const [url, setUrl] = useState(item.url);
  const [ready, setReady] = useState(false);
  const [state, setState] = useContext(AppStateContext);

  useEffect(() => {
    const firstLoad = () => {
      webView.current.setZoomLevel(-1);
      webView.current.removeEventListener("dom-ready", firstLoad);
      setReady(true);
    };
    webView.current.addEventListener("dom-ready", firstLoad);
    webView.current.addEventListener("error", console.error);
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
      setState((state) => newTile(state, "", e.url, state));
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
        <AddressBarButton
          title="Pin this URL"
          shortcut={null}
          disabled={(addressBar.current?.value || url) === item.url}
          onClick={() => {
            setState(
              (state) =>
                ((findItem(state.items, item.id) as PageItem).url =
                  addressBar.current.value)
            );
          }}
        >
          <FaThumbtack />
        </AddressBarButton>
        <AddressBarButton
          title={`Back to pinned url (${item.url})`}
          shortcut={null}
          disabled={(addressBar.current?.value || url) === item.url}
          onClick={() => {
            navigate(
              item.url,
              url === item.url && url !== webView.current.getURL()
            );
          }}
        >
          <FaStepBackward />
        </AddressBarButton>
        <AddressBarButton
          title="Back"
          shortcut={null}
          onClick={() => webView.current.goBack()}
          disabled={!ready || !webView.current.canGoBack()}
        >
          <FaArrowLeft />
        </AddressBarButton>
        <AddressBarButton
          title="Reload"
          shortcut={null}
          onClick={() => webView.current.reload()}
        >
          <FaRedo />
        </AddressBarButton>
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
