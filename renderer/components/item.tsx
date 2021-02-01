import { useEffect, useRef, useState } from "react";
import { useDrag, useDrop } from "react-dnd";
import {
  FaArrowsAltH,
  FaArrowsAltV,
  FaChevronDown,
  FaChevronRight,
  FaEllipsisH,
  FaEllipsisV,
  FaPlus,
  FaPlusSquare,
  FaTimes,
  FaWindowMaximize,
  FaWindowRestore,
} from "react-icons/fa";
import { useAppState } from "../hooks/context";
import {
  doRemoveItem,
  findItem,
  getItemVertical,
  getParent,
  GroupItem,
  Item,
  newGroup,
  newTile,
  PageItem,
  switchVerticalSetting,
} from "../utils/browser";
import { Button } from "./button";
import { WebItem } from "./web-item";

export const Set = ({ id, items, vertical = false }) => {
  const [, setState] = useAppState();

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
      });
    },
  });
  return (
    <div
      ref={dropRef}
      className={`flex flex-grow h-full w-full  ${
        vertical ? "flex-col" : "flex-row"
      } overflow-hidden`}
    >
      {items.map((item, i) => (
        <ItemComponent
          key={item.id}
          item={item}
          index={i}
          length={items.length}
        />
      ))}
    </div>
  );
};

const ItemComponent = ({
  item,
  index,
  length,
}: {
  item: Item;
  index: number;
  length: number;
}) => {
  const ref = useRef<HTMLDivElement>();
  const [state, setState] = useAppState();
  const [newName, setNewName] = useState(item.name);
  const [loaded, setLoaded] = useState(!item.collapsed);

  const parent = getParent(state, item.id);
  const path = state.itemsByKey[item.id].path;
  const [parentVertical] = parent ? getItemVertical(state, parent) : [false];
  const [vertical, computedVertical] = getItemVertical(state, item);

  const verticalText = item.collapsed && !parentVertical;
  const favicon = (() => {
    try {
      return (
        "url" in item &&
        (item.favicon !== undefined
          ? item.favicon
          : `${new URL(item.url).origin}/favicon.ico`)
      );
    } catch (e) {}
  })();

  const lastOpen = index === length - 1;
  const customSize =
    !item.collapsed &&
    ((parentVertical && item.height) || (!parentVertical && item.width)) &&
    !lastOpen &&
    !state.maximizedItem;

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
      });
    },
  });

  const [{ opacity }, dragRef, previewRef] = useDrag({
    item: { type: ITEM_TYPE, item },
    collect: (monitor) => ({
      opacity: monitor.isDragging() ? 0.5 : 1,
    }),
    begin: () => setState((state) => (state.dragItem = item.id)),
    end: () => setState((state) => (state.dragItem = undefined)),
  });

  dropRef(previewRef(ref));

  return (
    <div
      ref={ref}
      className={`group relative flex flex-col
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
          ${item.collapsed ? "flex-none" : customSize ? `` : "flex-1"}`}
      style={{
        opacity,
        ...(customSize &&
          (parentVertical ? { height: item.height } : { width: item.width })),
      }}
      onClick={(e) => {
        e.stopPropagation();
        focus();
      }}
      onDragStart={(e) => {
        if (state.resizeItem) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
    >
      <div
        ref={dragRef}
        className={`flex p-1 items-center ${
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
          <div className="flex space-x-1 invisible group-hover:visible">
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
                  onClick={(e) => {
                    e.stopPropagation();
                    setState((state) =>
                      newGroup(
                        state,
                        findItem(state.items, item.id) as GroupItem
                      )
                    );
                  }}
                >
                  <FaPlusSquare />
                </Button>
                <Button
                  title="New Tile"
                  shortcut="Ctrl-N"
                  onClick={(e) => {
                    e.stopPropagation();
                    setState((state) =>
                      newTile(
                        state,
                        "",
                        "about:blank",
                        findItem(state.items, item.id) as GroupItem
                      )
                    );
                  }}
                >
                  <FaPlus />
                </Button>
              </>
            )}
            {customSize && (
              <Button
                title={`Disable fixed ${parentVertical ? "height" : "width"}`}
                shortcut={null}
                onClick={() =>
                  setState(
                    (state) =>
                      (findItem(state.items, item.id)[
                        parentVertical ? "height" : "width"
                      ] = undefined)
                  )
                }
              >
                {parentVertical ? <FaArrowsAltV /> : <FaArrowsAltH />}
              </Button>
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
        {"items" in item ? (
          <Set id={item.id} items={item.items} vertical={vertical} />
        ) : (
          loaded && <WebItem item={item} onFocus={focus} />
        )}
      </div>
      {!item.collapsed && !lastOpen && (
        <div
          onMouseDown={(e) =>
            setState(
              (state) =>
                (state.resizeItem = {
                  id: item.id,
                  vertical: parentVertical,
                  startPos: parentVertical ? e.pageY : e.pageX,
                  startSize: parentVertical
                    ? ref.current.clientHeight
                    : ref.current.clientWidth,
                })
            )
          }
          className={`z-20 flex-none absolute transform ${
            parentVertical
              ? "w-full h-3 bottom-0 cursor-ns-resize translate-y-1/2"
              : "h-full w-3 right-0 cursor-ew-resize translate-x-1/2"
          }`}
        />
      )}
    </div>
  );
};

const ITEM_TYPE = "ITEM";
