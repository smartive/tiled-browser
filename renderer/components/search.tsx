import { useAppState } from "../hooks/context";
import { filterItems, findItem, Item } from "../utils/browser";

export const Search = () => {
  const [state, setState] = useAppState();

  let items = filterItems(
    state.items,
    new RegExp(state.search.split(" ").join(".*"), "i")
  );

  if (items.length === 0) {
    items = filterItems(
      state.items,
      new RegExp(state.search.split("").join(".*"), "i")
    );
  }

  return (
    <div className="z-50 fixed inset-0 flex flex-col justify-center items-center text-black bg-gray-800 bg-opacity-50">
      <div className="flex flex-col space-y-1 w-96 h-96 bg-white rounded m-2 p-2 border border-gray-900 overflow-hidden">
        <input
          className="border border-gray-500 rounded p-1"
          value={state.search}
          onChange={(e) => setState((state) => (state.search = e.target.value))}
          autoFocus
        />
        <div className="overflow-y-auto flex flex-col items-stretch">
          {items.map((item) => (
            <SearchResult key={item.id} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
};

const getParts = (string: string, search: string) => {
  let matches = new RegExp(
    `^(.*)${search
      .split(" ")
      .map((part) => `(${part})(.*)`)
      .join("")}$`,
    "i"
  ).exec(string);
  if (matches) {
    const [, ...parts] = matches;
    return parts;
  }

  matches = new RegExp(
    `^(.*)${search
      .split("")
      .map((part) => `(${part})(.*)`)
      .join("")}$`,
    "i"
  ).exec(string);
  if (matches) {
    const [, ...parts] = matches;
    return parts;
  }

  return [string];
};

const SearchResult = ({ item }: { item: Item }) => {
  const [state, setState] = useAppState();
  const parts = getParts(item.name, state.search);
  return (
    <div className="flex flex-col items-stretch">
      <div className="flex">
        <button
          title={item.name}
          className="flex-grow cursor-pointer hover:font-bold text-left whitespace-nowrap overflow-x-hidden overflow-ellipsis"
          onClick={() =>
            setState((state) => {
              for (const id of state.itemsByKey[item.id].path) {
                findItem(state.items, id).collapsed = false;
              }
              state.selectedItem = item.id;
              state.maximizedItem = undefined;
              state.search = undefined;
            })
          }
        >
          {parts.map((part, i) =>
            i % 2 ? (
              <em key={i} className="font-bold">
                {part}
              </em>
            ) : (
              part
            )
          )}
        </button>
      </div>
      {"items" in item && (
        <div className="pl-2">
          {item.items.map((subItem) => (
            <SearchResult key={subItem.id} item={subItem} />
          ))}
        </div>
      )}
    </div>
  );
};
