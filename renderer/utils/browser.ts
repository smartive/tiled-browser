import { ulid } from "ulid";

export const DEFAULT_STATE: StoredState = {
  items: [
    {
      id: "foobar",
      name: "",
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

export type StoredState = {
  maximizedItem?: string;
  selectedItem?: string;
  editItemName?: string;
  search?: string;
  selectedSearchResult?: string;
  resizeItem?: {
    id: string;
    vertical?: boolean;
    startPos: number;
    startSize: number;
  };
  dragItem?: string;
  items: Item[];
};

export type AppState = StoredState & DerivedState;

export type DerivedState = {
  itemsByKey: { [id: string]: { path: string[] } };
};

export type BaseItem = {
  id: string;
  name: string;
  width?: number;
  height?: number;
  collapsed?: boolean;
};
export type PageItem = BaseItem & {
  url: string;
  favicon?: string;
  title?: string;
  zoom?: number;
};
export type GroupItem = BaseItem & {
  items: Item[];
  vertical?: boolean;
};

export type Item = PageItem | GroupItem;

export const getFullState = (state: StoredState): AppState => {
  const fullState = {
    ...state,
    itemsByKey: {},
  };
  deriveFullState(fullState);
  return fullState;
};

export const getStoredState = ({
  maximizedItem,
  selectedItem,
  items,
  search,
}: AppState): StoredState => ({
  maximizedItem,
  selectedItem,
  search,
  items,
});

export const deriveFullState = (state: AppState) => {
  setItemsById(state, state.items, []);
};

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

export const findItem = (items: Item[], id: string): Item => {
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

export const filterItems = (items: Item[], search: RegExp): Item[] => {
  const result = [];
  for (const item of items) {
    let filteredItem = item;
    let add = search.test(item.name);
    if ("items" in item) {
      filteredItem = {
        ...item,
        items: filterItems(item.items, search),
      };
      add = add || !!filteredItem.items.length;
    }
    if (add) {
      result.push(filteredItem);
    }
  }
  return result;
};

export const doRemoveItem = (state: AppState, id: string) => {
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

export const newGroup = (state: AppState, parent: { items: Item[] }) => {
  const group = {
    id: ulid(),
    name: "",
    items: [],
  };

  if (!parent) {
    parent = getCurrentGroup(state);
  }

  if (!parent) {
    parent = state;
  }

  parent.items.push(group);

  state.selectedItem = group.id;
  state.editItemName = group.id;
};

export const newTile = (
  state: AppState,
  name: string,
  url: string,
  group?: { items: Item[] }
) => {
  if (!group) {
    group = getCurrentGroup(state);
  }

  if (!group) {
    group = state;
  }
  // alternatively, create new group...
  // if (!group) {
  //   group = state.items.filter(isGroupItem).find((item) => item.name === "");
  // }

  // if (!group) {
  //   group = { id: ulid(), name: "", items: [] };
  //   state.items.push(group);
  // }

  const id = ulid();
  group.items.push({ id, name, url });
  state.selectedItem = id;
};

export const switchVerticalSetting = (
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

const isGroupItem = (item: Item): item is GroupItem => "items" in item;

export const getParent = (state: AppState, id: string): GroupItem => {
  const path = state.itemsByKey[id].path;
  const parentId = path[path.length - 2];
  return parentId && (findItem(state.items, parentId) as GroupItem);
};

export const getItemVertical = (state: AppState, item: Item) => {
  const path = state.itemsByKey[item.id].path;
  const computedVertical = path.length > 0; // !!(path.length % 2);
  return [
    "vertical" in item && item.vertical !== undefined
      ? item.vertical
      : computedVertical,
    computedVertical,
  ];
};
