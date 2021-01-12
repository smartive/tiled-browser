import { ulid } from "ulid";

export const DEFAULT_STATE: StoredState = {
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

export type StoredState = {
  maximizedItem?: string;
  selectedItem?: string;
  editItemName?: string;
  items: Item[];
};

export type AppState = StoredState & DerivedState;

export type DerivedState = {
  itemsByKey: { [id: string]: { path: string[] } };
};

export type BaseItem = {
  id: string;
  name: string;
  h?: string;
  collapsed?: boolean;
};
export type PageItem = BaseItem & {
  url: string;
  favicon?: string;
  title?: string;
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
  setItemsById(fullState, fullState.items, []);
  return fullState;
};

export const getStoredState = ({
  maximizedItem,
  items,
}: AppState): StoredState => ({
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

export const newGroup = (state: AppState) => {
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

export const newTile = (
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

export const getParent = (state: AppState, item: Item) => {
  const path = state.itemsByKey[item.id].path;
  const parentId = path[path.length - 2];
  return parentId && findItem(state.items, parentId);
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
