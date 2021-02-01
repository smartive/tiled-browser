import { WebviewTag } from "electron";
import { useEffect, useRef, useState } from "react";
import {
  FaArrowLeft,
  FaRedo,
  FaStepBackward,
  FaThumbtack,
} from "react-icons/fa";
import { useAppState } from "../hooks/context";
import { doRemoveItem, findItem, newTile, PageItem } from "../utils/browser";
import { AddressBarButton } from "./button";

export const WebItem = ({ item, onFocus }) => {
  const webView = useRef<WebviewTag>();
  const addressBar = useRef<HTMLInputElement>();
  const [url, setUrl] = useState(item.url);
  const [canGoBack, setCanGoBack] = useState(false);
  const [state, setState] = useAppState();

  useEffect(() => {
    const firstLoad = () => {
      if (item.zoom) {
        webView.current.setZoomLevel(item.zoom);
      }
      webView.current.removeEventListener("dom-ready", firstLoad);
      setCanGoBack(webView.current.canGoBack());
    };
    webView.current.addEventListener("dom-ready", firstLoad);
    webView.current.addEventListener("error", console.error);
    webView.current.addEventListener("did-navigate", (e) => {
      addressBar.current.value = e.url || webView.current.getURL();
      setCanGoBack(webView.current.canGoBack());
    });
    webView.current.addEventListener("did-navigate-in-page", (e) => {
      addressBar.current.value = e.url || webView.current.getURL();
      setCanGoBack(webView.current.canGoBack());
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
      if (e.favicons?.length) {
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
      <div className="flex items-center p-2 space-x-1">
        <AddressBarButton
          title="Pin this URL"
          shortcut={null}
          disabled={(addressBar.current?.value || url) === item.url}
          onClick={() => {
            setState((state) => {
              const theItem = findItem(state.items, item.id) as PageItem;
              theItem.url = addressBar.current.value;
              theItem.name = theItem.title;
            });
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
          disabled={!canGoBack}
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
      <div className="flex-grow relative">
        {(state.resizeItem || state.dragItem) && (
          <div className="absolute inset-0 z-20" />
        )}
        <webview
          ref={webView}
          src={url}
          className="w-full h-full"
          /*useragent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.141 Safari/537.36"*/
          /*useragent="Chrome"*/
        />
      </div>
    </>
  );
};
